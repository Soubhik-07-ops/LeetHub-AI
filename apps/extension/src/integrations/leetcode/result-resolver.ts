import { SubmissionStatus } from "../../types/messages.js";
import { logger } from "../../lib/logger.js";

export interface SubmissionResult {
  status: SubmissionStatus | "unknown";
  submissionId: string;
  resolvedAt: string;
}

const MAX_POLLING_ATTEMPTS = 10;
const POLLING_INTERVAL_MS = 500;

export function mapLeetCodeStatus(state: string, statusMsg: string): SubmissionStatus | "pending" | "unknown" {
  if (state === "PENDING" || state === "STARTED") {
    return "pending";
  }
  
  if (state !== "SUCCESS") {
    return "unknown";
  }

  const normalized = statusMsg.trim().toLowerCase();
  
  if (normalized === "accepted") {
    return "accepted";
  }
  
  if (
    normalized.includes("wrong answer") ||
    normalized.includes("runtime error") ||
    normalized.includes("time limit exceeded") ||
    normalized.includes("memory limit exceeded") ||
    normalized.includes("compile error") ||
    normalized.includes("limit exceeded") ||
    normalized.includes("error") ||
    normalized.includes("rejected")
  ) {
    return "rejected";
  }

  return "unknown";
}

export async function resolveSubmissionResult(submissionId: string): Promise<SubmissionResult> {
  logger.info("Result resolver started");
  logger.info(`submissionId: ${submissionId}`);
  
  let attempts = 0;
  
  while (attempts < MAX_POLLING_ATTEMPTS) {
    attempts++;
    logger.info(`Resolver attempt: ${attempts}`);
    
    try {
      const response = await fetch(`https://leetcode.com/submissions/detail/${submissionId}/v2/check/`);
      logger.info(`Resolver HTTP status: ${response.status}`);
      
      if (response.status === 401 || response.status === 403) {
        logger.info("Resolver authentication failure");
        break; // Terminal error
      }
      
      if (response.status === 404) {
        logger.info("Resolver submission not found");
        break; // Terminal error
      }
      
      if (response.status === 429) {
        logger.info("Resolver rate limited");
        break; // Terminal error
      }

      if (!response.ok) {
        logger.info("Resolver HTTP failure");
        break; // Terminal error
      }
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        logger.info("Resolver response was not JSON");
        break; // Terminal error
      }
      
      logger.info("Resolver response parsed successfully");
      
      const state = data.state;
      const statusMsg = data.status_msg || "";
      
      const mappedStatus = mapLeetCodeStatus(state, statusMsg);
      
      if (mappedStatus !== "pending") {
        logger.info(`Resolver status_msg: ${statusMsg}`);
        return {
          status: mappedStatus === "unknown" ? "unknown" : mappedStatus,
          submissionId,
          resolvedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.info("Resolver HTTP failure");
      break; // Network or other catastrophic failure
    }
    
    if (attempts < MAX_POLLING_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
    }
  }
  
  return {
    status: "unknown",
    submissionId,
    resolvedAt: new Date().toISOString()
  };
}
