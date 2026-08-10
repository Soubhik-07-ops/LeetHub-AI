import { logger } from "../lib/logger.js";
import { handleMessage } from "./message-handler.js";
import { initializeNetworkCapture } from "../integrations/leetcode/network-submission-capture.js";

logger.info("Background service worker initialized");

initializeNetworkCapture();
chrome.runtime.onMessage.addListener(handleMessage);
