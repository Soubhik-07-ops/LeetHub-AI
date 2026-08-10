import { CapturedSubmission, SubmissionStatus } from "../../types/messages.js";

export interface LeetCodeMetadata {
  problemSlug: string;
  problemTitle?: string;
  language?: string;
}

export type SubmissionCallback = (result: Partial<CapturedSubmission>) => void;

export interface LeetCodeAdapter {
  detectSubmission(callback: SubmissionCallback): void;
  extractMetadata(): LeetCodeMetadata;
  extractSourceCode(): Promise<string | undefined>;
}
