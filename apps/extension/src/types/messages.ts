export type SubmissionStatus = "accepted" | "rejected" | "unknown";

export interface CapturedSubmission {
  submissionId?: string;
  problemSlug: string;
  problemTitle?: string;
  language?: string;
  status: SubmissionStatus;
  sourceCode?: string;
  submittedAt: string;
  source: "leetcode";
}

export const CONTENT_SUBMISSION_DETECTED = "CONTENT_SUBMISSION_DETECTED";

export interface SubmissionDetectedMessage {
  type: typeof CONTENT_SUBMISSION_DETECTED;
  payload: CapturedSubmission;
}

export type ExtensionMessage = SubmissionDetectedMessage;
