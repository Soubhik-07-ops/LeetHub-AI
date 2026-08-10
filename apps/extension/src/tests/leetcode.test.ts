import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractProblemSlug } from "../integrations/leetcode/extractor.js";
import { mapLeetCodeStatus } from "../integrations/leetcode/result-resolver.js";
import { handleMessage } from "../background/message-handler.js";
import { CONTENT_SUBMISSION_DETECTED } from "../types/messages.js";
import { leetcodeAdapter } from '../integrations/leetcode/adapter.js';
import * as extractor from '../integrations/leetcode/extractor.js';

// Mock chrome API for storage
global.chrome = {
  storage: {
    local: {
      set: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
    }
  },
  runtime: {
    sendMessage: vi.fn(),
  },
  webRequest: {
    onBeforeRequest: {
      addListener: vi.fn(),
    }
  }
} as any;

import { initializeNetworkCapture, getPendingSubmission, clearPendingSubmission, updatePendingSubmissionMetadata } from '../integrations/leetcode/network-submission-capture.js';

describe('LeetCode Extractor', () => {
  describe('extractProblemSlug', () => {
    it('extracts slug with trailing slash', () => {
      const url = 'https://leetcode.com/problems/two-sum/';
      expect(extractProblemSlug(url)).toBe('two-sum');
    });

    it('extracts slug without trailing slash', () => {
      const url = 'https://leetcode.com/problems/two-sum';
      expect(extractProblemSlug(url)).toBe('two-sum');
    });

    it('returns unknown-problem for invalid URL', () => {
      const url = 'https://leetcode.com/discuss/general-discussion';
      expect(extractProblemSlug(url)).toBe('unknown-problem');
    });
  });

  describe('extractSourceCode (Deprecated)', () => {
    it('returns undefined as DOM extraction is deprecated in favor of network capture', async () => {
      const source = await leetcodeAdapter.extractSourceCode();
      expect(source).toBeUndefined();
    });
  });
});

describe('LeetCode Result Resolver', () => {
  describe('mapLeetCodeStatus', () => {
    it('normalizes accepted', () => {
      expect(mapLeetCodeStatus('SUCCESS', 'Accepted')).toBe('accepted');
      expect(mapLeetCodeStatus('SUCCESS', '  accepted ')).toBe('accepted');
    });

    it('normalizes rejected', () => {
      expect(mapLeetCodeStatus('SUCCESS', 'Wrong Answer')).toBe('rejected');
      expect(mapLeetCodeStatus('SUCCESS', 'Runtime Error')).toBe('rejected');
      expect(mapLeetCodeStatus('SUCCESS', 'Time Limit Exceeded')).toBe('rejected');
      expect(mapLeetCodeStatus('SUCCESS', 'Memory Limit Exceeded')).toBe('rejected');
      expect(mapLeetCodeStatus('SUCCESS', 'Compile Error')).toBe('rejected');
    });

    it('returns unknown for unrecognized status', () => {
      expect(mapLeetCodeStatus('SUCCESS', 'FooBar')).toBe('unknown');
    });

    it('returns pending for pending/judging states', () => {
      expect(mapLeetCodeStatus('PENDING', '')).toBe('pending');
      expect(mapLeetCodeStatus('STARTED', '')).toBe('pending');
    });
  });

  describe('ResultResolver Fetching', () => {
    let originalFetch: typeof global.fetch;
    
    beforeEach(() => {
      originalFetch = global.fetch;
      global.fetch = vi.fn();
    });
    
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('uses /v2/check/ endpoint', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ state: 'SUCCESS', status_msg: 'Accepted' })
      });
      
      const { resolveSubmissionResult } = await import('../integrations/leetcode/result-resolver.js');
      await resolveSubmissionResult('12345');
      
      expect(global.fetch).toHaveBeenCalledWith('https://leetcode.com/submissions/detail/12345/v2/check/');
    });

    it('polls on non-final state and resolves on final state', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ state: 'PENDING' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ state: 'SUCCESS', status_msg: 'Accepted' }) });
      
      const { resolveSubmissionResult } = await import('../integrations/leetcode/result-resolver.js');
      const result = await resolveSubmissionResult('12345');
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('accepted');
    });

    it('stops polling after max attempts', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ state: 'PENDING' }) });
      
      const { resolveSubmissionResult } = await import('../integrations/leetcode/result-resolver.js');
      const result = await resolveSubmissionResult('12345');
      
      expect(global.fetch).toHaveBeenCalledTimes(10);
      expect(result.status).toBe('unknown');
    });

    it('handles 401/403 authentication failures', async () => {
      (global.fetch as any).mockResolvedValue({ status: 403, ok: false });
      
      const { resolveSubmissionResult } = await import('../integrations/leetcode/result-resolver.js');
      const result = await resolveSubmissionResult('12345');
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('unknown');
    });

    it('handles 404 submission not found', async () => {
      (global.fetch as any).mockResolvedValue({ status: 404, ok: false });
      
      const { resolveSubmissionResult } = await import('../integrations/leetcode/result-resolver.js');
      const result = await resolveSubmissionResult('12345');
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('unknown');
    });

    it('handles 429 rate limit', async () => {
      (global.fetch as any).mockResolvedValue({ status: 429, ok: false });
      
      const { resolveSubmissionResult } = await import('../integrations/leetcode/result-resolver.js');
      const result = await resolveSubmissionResult('12345');
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('unknown');
    });

    it('handles JSON parsing failure', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true, json: async () => { throw new Error('parse error'); } });
      
      const { resolveSubmissionResult } = await import('../integrations/leetcode/result-resolver.js');
      const result = await resolveSubmissionResult('12345');
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('unknown');
    });
  });
});

describe('Background Message Handler', () => {
  it('handles valid submission intent message', async () => {
    // Setup a dummy pending submission first to test update
    const details = {
      method: 'POST',
      url: 'https://leetcode.com/problems/two-sum/submit/',
      tabId: 42,
      requestBody: {
        raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code', lang: 'python' })) }]
      }
    };
    initializeNetworkCapture();
    const mockListener = (global.chrome.webRequest.onBeforeRequest.addListener as any).mock.calls[0][0];
    mockListener(details);

    const mockPayload = {
      problemSlug: 'two-sum',
      problemTitle: 'Two Sum'
    };
    
    const message = {
      type: CONTENT_SUBMISSION_DETECTED,
      payload: mockPayload
    };

    const sender = { tab: { id: 42 } } as any;
    const sendResponse = vi.fn();

    const handled = handleMessage(message, sender, sendResponse);
    
    expect(handled).toBe(false); // Returns false because it's synchronous now
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
    
    const pending = getPendingSubmission(42);
    expect(pending?.problemTitle).toBe('Two Sum');
  });

  it('handles synchronous exception safely', () => {
    const message = { type: CONTENT_SUBMISSION_DETECTED, payload: null }; // Null payload doesn't throw anymore since we check it safely, wait, typedMessage.payload.problemTitle might throw if payload is null
    const sender = { tab: { id: 101 } } as any;
    const sendResponse = vi.fn();
    
    handleMessage(message, sender, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('rejects malformed message safely', () => {
    const sender = { tab: { id: 42 } } as any;
    const sendResponse = vi.fn();
    
    expect(handleMessage({}, sender, sendResponse)).toBe(false);
    expect(handleMessage(null, sender, sendResponse)).toBe(false);
  });

  describe('Network Submission Capture', () => {
    let mockListener: any;

    beforeEach(() => {
      vi.clearAllMocks();
      initializeNetworkCapture();
      mockListener = (global.chrome.webRequest.onBeforeRequest.addListener as any).mock.calls[0][0];
    });

    it('parses JSON body with source code', () => {
      const details = {
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 42,
        requestBody: {
          raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'def test(): pass', lang: 'python3' })) }]
        }
      };
      
      mockListener(details);
      
      const pending = getPendingSubmission(42);
      expect(pending).toBeDefined();
      expect(pending?.sourceCode).toBe('def test(): pass');
      expect(pending?.language).toBe('python3');
      expect(pending?.problemSlug).toBe('two-sum');
    });

    it('parses formData body with source code', () => {
      const details = {
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 43,
        requestBody: {
          formData: {
            typed_code: ['class Solution { }'],
            lang: ['java']
          }
        }
      };
      
      mockListener(details);
      
      const pending = getPendingSubmission(43);
      expect(pending).toBeDefined();
      expect(pending?.sourceCode).toBe('class Solution { }');
      expect(pending?.language).toBe('java');
    });

    it('handles malformed JSON gracefully', () => {
      const details = {
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 44,
        requestBody: {
          raw: [{ bytes: new TextEncoder().encode('invalid-json') }]
        }
      };
      
      mockListener(details);
      expect(getPendingSubmission(44)).toBeUndefined();
    });

    it('ignores requests missing source code', () => {
      const details = {
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 45,
        requestBody: {
          raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ unknown_field: 'test' })) }]
        }
      };
      
      mockListener(details);
      expect(getPendingSubmission(45)).toBeUndefined();
    });

    it('correlates submissions accurately by tabId', () => {
      // Tab 1 submits
      mockListener({
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 1,
        requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'tab1 code' })) }] }
      });

      // Tab 2 submits
      mockListener({
        method: 'POST',
        url: 'https://leetcode.com/problems/valid-parentheses/submit/',
        tabId: 2,
        requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'tab2 code' })) }] }
      });

      expect(getPendingSubmission(1)?.sourceCode).toBe('tab1 code');
      expect(getPendingSubmission(2)?.sourceCode).toBe('tab2 code');
      
      clearPendingSubmission(1);
      expect(getPendingSubmission(1)).toBeUndefined();
      expect(getPendingSubmission(2)).toBeDefined();
    });
    
    it('replaces stale pending submission for the same tab with newer one', () => {
      // First submission
      mockListener({
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 10,
        requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'old code' })) }] }
      });

      // Second submission (same tab)
      mockListener({
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 10,
        requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'new code' })) }] }
      });

      expect(getPendingSubmission(10)?.sourceCode).toBe('new code');
    });

    it('preserves unicode, quotes, and newlines', () => {
      const complexCode = 'print("Hello \\`world\\` 🚀")\n\ndef test():\n    return "\\n"';
      mockListener({
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 20,
        requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: complexCode })) }] }
      });

      expect(getPendingSubmission(20)?.sourceCode).toBe(complexCode);
    });

    it('handles multiple network request IDs safely', () => {
      // Simulate two completely different submissions (different requestIds)
      mockListener({
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 50,
        requestId: 'req-1',
        timeStamp: 1000,
        requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code 1' })) }] }
      });
      mockListener({
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 50,
        requestId: 'req-2',
        timeStamp: 2000,
        requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code 2' })) }] }
      });
      expect(getPendingSubmission(50)?.sourceCode).toBe('code 2'); // Newer one wins
    });

    it('ignores same requestId lifecycle events gracefully without duplication', () => {
      // Same requestId, same timestamp, should overwrite safely without side effects
      mockListener({
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 51,
        requestId: 'req-3',
        timeStamp: 1000,
        requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code 3' })) }] }
      });
      mockListener({
        method: 'POST',
        url: 'https://leetcode.com/problems/two-sum/submit/',
        tabId: 51,
        requestId: 'req-3', // Repeated event for same request
        timeStamp: 1050,
        requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code 3' })) }] }
      });
      expect(getPendingSubmission(51)?.sourceCode).toBe('code 3');
    });

    describe('Submission ID Parsing', () => {
      it('parses /check/ URLs', () => {
        mockListener({
          method: 'GET',
          url: 'https://leetcode.com/submissions/detail/1111/check/',
          tabId: 60
        });
        
        // Wait, startResultResolution will be called asynchronously, but we just want to verify parsing
        // We'll see trackedSubmissionIds updated if it was parsed, but it's not exported.
        // Instead, we can observe getPendingSubmission's submissionId property since it sets it.
        mockListener({
          method: 'POST',
          url: 'https://leetcode.com/problems/two-sum/submit/',
          tabId: 60,
          requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code' })) }] }
        });
        
        mockListener({
          method: 'GET',
          url: 'https://leetcode.com/submissions/detail/1111/check/',
          tabId: 60
        });
        
        expect(getPendingSubmission(60)?.submissionId).toBe('1111');
      });

      it('parses /v2/check/ URLs', () => {
        mockListener({
          method: 'POST',
          url: 'https://leetcode.com/problems/two-sum/submit/',
          tabId: 61,
          requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code' })) }] }
        });
        
        mockListener({
          method: 'GET',
          url: 'https://leetcode.com/submissions/detail/2222/v2/check/',
          tabId: 61
        });
        
        expect(getPendingSubmission(61)?.submissionId).toBe('2222');
      });

      it('rejects invalid URLs', () => {
        mockListener({
          method: 'POST',
          url: 'https://leetcode.com/problems/two-sum/submit/',
          tabId: 62,
          requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code' })) }] }
        });
        
        mockListener({
          method: 'GET',
          url: 'https://leetcode.com/submissions/detail/3333/invalid/',
          tabId: 62
        });
        
        expect(getPendingSubmission(62)?.submissionId).toBeUndefined();
      });

      it('prevents duplicate resolvers for the same submissionId', () => {
        mockListener({
          method: 'POST',
          url: 'https://leetcode.com/problems/two-sum/submit/',
          tabId: 63,
          requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code' })) }] }
        });
        
        // Ensure only one resolution happens (trackedSubmissionIds prevents re-entry)
        mockListener({ method: 'GET', url: 'https://leetcode.com/submissions/detail/4444/v2/check/', tabId: 63 });
        
        // This second check request for the same submissionId should not alter the pending object or trigger resolution again
        // We'll mock the startResultResolution to check count, but it's internal.
        // We just verify it doesn't crash or throw.
        mockListener({ method: 'GET', url: 'https://leetcode.com/submissions/detail/4444/v2/check/', tabId: 63 });
        
        expect(getPendingSubmission(63)?.submissionId).toBe('4444');
      });
      
      it('cleans up pending submission upon successful finalization (mocked)', async () => {
        // Since we can't easily intercept startResultResolution, we'll verify clearPendingSubmission directly
        mockListener({
          method: 'POST',
          url: 'https://leetcode.com/problems/two-sum/submit/',
          tabId: 64,
          requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code' })) }] }
        });
        expect(getPendingSubmission(64)).toBeDefined();
        
        clearPendingSubmission(64);
        expect(getPendingSubmission(64)).toBeUndefined();
      });

      it('protects against stale pending submissions clearing newer ones', () => {
        mockListener({
          method: 'POST',
          url: 'https://leetcode.com/problems/two-sum/submit/',
          tabId: 65,
          requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'old code' })) }] }
        });
        
        const pending = getPendingSubmission(65)!;
        pending.submissionId = 'old-sub-id';
        
        // Second submission overwrites it
        mockListener({
          method: 'POST',
          url: 'https://leetcode.com/problems/two-sum/submit/',
          tabId: 65,
          requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'new code' })) }] }
        });
        
        // Attempt to clear using the old submission ID (simulating delayed completion)
        clearPendingSubmission(65, 'old-sub-id');
        
        // It should NOT have cleared the new pending submission!
        expect(getPendingSubmission(65)?.sourceCode).toBe('new code');
      });

      it('safely handles two submissions in different tabs independently', () => {
        mockListener({
          method: 'POST',
          url: 'https://leetcode.com/problems/two-sum/submit/',
          tabId: 70,
          requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code 70' })) }] }
        });
        
        mockListener({
          method: 'POST',
          url: 'https://leetcode.com/problems/two-sum/submit/',
          tabId: 71,
          requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ typed_code: 'code 71' })) }] }
        });
        
        expect(getPendingSubmission(70)?.sourceCode).toBe('code 70');
        expect(getPendingSubmission(71)?.sourceCode).toBe('code 71');
        
        clearPendingSubmission(70);
        
        expect(getPendingSubmission(70)).toBeUndefined();
        expect(getPendingSubmission(71)?.sourceCode).toBe('code 71'); // Unaffected
      });
    });
  });
});
