import { SubmissionStatus, CapturedSubmission } from "../../types/messages.js";
import { SubmissionCallback } from "./types.js";
import { logger } from "../../lib/logger.js";

type DetectionState = "IDLE" | "SUBMISSION_STARTED" | "WAITING_FOR_RESULT";
let currentState: DetectionState = "IDLE";
let oldResultElement: Element | null = null;

export function normalizeStatus(rawStatus: string): SubmissionStatus | "pending" {
  const normalized = rawStatus.trim().toLowerCase();
  
  if (normalized === "accepted") {
    return "accepted";
  }
  
  if (normalized.includes("pending") || normalized.includes("judging")) {
    return "pending";
  }
  
  if (
    normalized.includes("wrong answer") ||
    normalized.includes("runtime error") ||
    normalized.includes("compile error") ||
    normalized.includes("time limit exceeded") ||
    normalized.includes("memory limit exceeded") ||
    normalized.includes("limit exceeded") ||
    normalized.includes("error")
  ) {
    return "rejected";
  }
  
  return "unknown";
}

export function detectSubmission(callback: SubmissionCallback): void {
  function startSubmission() {
    logger.info("Submission intent detected via UI");
    callback({
      status: "unknown",
      submittedAt: new Date().toISOString(),
      source: "leetcode"
    });
  }

  // Track user intent to submit
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-e2e-locator="console-submit-button"]') || target.closest('button[data-cy="submit-code-btn"]') || target.closest('button.submit__2ISl')) {
      startSubmission();
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      startSubmission();
    }
  });

  logger.info("LeetCode submission detector initialized (intent-only).");
}
