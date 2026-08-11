import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../lib/api-client';
import { logger } from '../lib/logger';
import { CapturedSubmission } from '../types/messages';

// Mock the logger to avoid polluting test output and track calls
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockChromeStorageGet = vi.fn();
(global as any).chrome = {
  storage: {
    local: {
      get: mockChromeStorageGet
    }
  }
};

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChromeStorageGet.mockResolvedValue({ leethub_credential: 'test_token' });
  });

  const baseSubmission: CapturedSubmission = {
    submissionId: 'test-123',
    problemSlug: 'two-sum',
    status: 'accepted',
    source: 'leetcode',
    sourceCode: 'print(1)',
    submittedAt: '2026-08-10T00:00:00Z'
  };

  it('successfully handles created response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ operation: 'created' })
    });

    await apiClient.syncSubmission(baseSubmission);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/leetcode/submissions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"submissionId":"test-123"')
      })
    );
    expect(logger.info).toHaveBeenCalledWith('Submission synced to backend: created');
    
    // verify no source code in log
    const errorLogs = (logger.error as any).mock.calls;
    expect(errorLogs.length).toBe(0);
  });

  it('successfully handles duplicate response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ operation: 'duplicate' })
    });

    await apiClient.syncSubmission(baseSubmission);

    expect(logger.info).toHaveBeenCalledWith('Submission already exists in backend: duplicate');
  });

  it('retries on HTTP 500 and eventually logs failure', async () => {
    vi.stubGlobal('setTimeout', (cb: Function) => cb());
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500
    });

    await apiClient.syncSubmission(baseSubmission);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledWith('Backend transport failed (HTTP 500) on attempt 1');
    expect(logger.warn).toHaveBeenCalledWith('Backend transport failed (HTTP 500) on attempt 2');
    expect(logger.warn).toHaveBeenCalledWith('Backend transport failed (HTTP 500) on attempt 3');
    expect(logger.error).toHaveBeenCalledWith('[LeetHub-AI] Backend transport failed for submission test-123');
    vi.unstubAllGlobals();
  });

  it('retries on network failure and eventually logs failure', async () => {
    vi.stubGlobal('setTimeout', (cb: Function) => cb());
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await apiClient.syncSubmission(baseSubmission);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledWith('Backend transport failed (Network error) on attempt 1');
    expect(logger.error).toHaveBeenCalledWith('[LeetHub-AI] Backend transport failed for submission test-123');
    vi.unstubAllGlobals();
  });

  it('skips sync if status is unknown or pending', async () => {
    await apiClient.syncSubmission({ ...baseSubmission, status: 'unknown' });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Skipping backend sync for submission test-123: status is unknown');
  });

  it('skips sync if submissionId is missing', async () => {
    const { submissionId, ...noIdSubmission } = baseSubmission;
    await apiClient.syncSubmission(noIdSubmission as any);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Skipping backend sync: Missing submissionId');
  });
});
