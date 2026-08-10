import { logger } from "../lib/logger.js";
import { observePageNavigation } from "./page-observer.js";
import { initializeSubmissionDetector } from "./submission-detector.js";

logger.info("LeetHub-AI Content Script initialized");

// Initialize submission detection
initializeSubmissionDetector();

// Handle SPA navigations to re-evaluate state if needed
observePageNavigation((newUrl) => {
  // In a robust implementation, we might re-bind observers or reset state here.
  // For V1, the MutationObserver in the adapter is attached to the body or main container,
  // so it typically survives SPA navigation.
  logger.info(`Navigated to: ${newUrl}. Detector is still running.`);
});
