import { LeetCodeAdapter, SubmissionCallback } from "./types.js";
import { extractAllMetadata, extractSourceCode } from "./extractor.js";
import { detectSubmission } from "./detector.js";

export const leetcodeAdapter: LeetCodeAdapter = {
  detectSubmission: (callback: SubmissionCallback) => {
    detectSubmission(callback);
  },
  extractMetadata: () => {
    return extractAllMetadata();
  },
  extractSourceCode: async () => {
    // Retry up to 3 times, with a 500ms delay if source is undefined
    const maxRetries = 3;
    const delayMs = 500;
    
    for (let i = 0; i < maxRetries; i++) {
      const source = await extractSourceCode();
      if (source) {
        return source;
      }
      if (i < maxRetries - 1) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
    
    return undefined;
  }
};
