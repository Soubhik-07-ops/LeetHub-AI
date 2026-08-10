import { ExtensionMessage, CONTENT_SUBMISSION_DETECTED } from "../types/messages.js";
import { logger } from "../lib/logger.js";
import { updatePendingSubmissionMetadata } from "../integrations/leetcode/network-submission-capture.js";

export function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  if (!message || !message.type) {
    logger.warn("Received malformed message", message);
    return false;
  }

  const typedMessage = message as ExtensionMessage;

  if (typedMessage.type === CONTENT_SUBMISSION_DETECTED) {
    try {
      const tabId = sender.tab?.id;
      if (tabId) {
        logger.info(`Received submission intent for tabId: ${tabId}`);
        updatePendingSubmissionMetadata(tabId, {
          problemTitle: typedMessage.payload.problemTitle,
          problemSlug: typedMessage.payload.problemSlug
        });
      }
      sendResponse({ success: true });
    } catch (error) {
      logger.error("Synchronous error before sendResponse", error);
      sendResponse({ success: false, error: String(error) });
    }
    // We can respond synchronously now because we just update in-memory state
    return false;
  }

  logger.warn(`Unknown message type: ${message.type}`);
  return false;
}
