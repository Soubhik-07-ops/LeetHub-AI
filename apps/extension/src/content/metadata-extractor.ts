import { leetcodeAdapter } from "../integrations/leetcode/adapter.js";
import { CapturedSubmission } from "../types/messages.js";

export async function buildSubmissionPayload(partialSubmission: Partial<CapturedSubmission>): Promise<CapturedSubmission> {
  const metadata = leetcodeAdapter.extractMetadata();
  const sourceCode = await leetcodeAdapter.extractSourceCode();

  return {
    problemSlug: metadata.problemSlug,
    problemTitle: metadata.problemTitle,
    language: metadata.language,
    status: partialSubmission.status || "unknown",
    sourceCode: sourceCode,
    submittedAt: partialSubmission.submittedAt || new Date().toISOString(),
    source: "leetcode"
  };
}
