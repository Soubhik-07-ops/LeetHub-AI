import { leetcodeAdapter } from "../integrations/leetcode/adapter.js";
import { buildSubmissionPayload } from "./metadata-extractor.js";
import { CONTENT_SUBMISSION_DETECTED, ExtensionMessage } from "../types/messages.js";
import { logger } from "../lib/logger.js";

export function initializeSubmissionDetector(): void {
  leetcodeAdapter.detectSubmission(async (partialSubmission) => {
    const fullSubmission = await buildSubmissionPayload(partialSubmission);
    
    // Log locally
    logger.logSubmission(fullSubmission);
    
    // Send to background service worker
    const message: ExtensionMessage = {
      type: CONTENT_SUBMISSION_DETECTED,
      payload: fullSubmission
    };
    
    try {
      chrome.runtime.sendMessage(message).catch((error) => {
        logger.warn("Failed to send background message (channel may be closed)", error);
      });
      logger.info(`Dispatched ${CONTENT_SUBMISSION_DETECTED} message`);
    } catch (error) {
      logger.error("Error dispatching submission message to background script", error);
    }
  });
}
