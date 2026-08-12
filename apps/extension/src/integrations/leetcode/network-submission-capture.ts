import { logger } from "../../lib/logger.js";
import { resolveSubmissionResult } from "./result-resolver.js";
import { storage } from "../../lib/storage.js";
import { CapturedSubmission } from "../../types/messages.js";
import { apiClient } from "../../lib/api-client.js";

export interface PendingSubmission {
  sourceCode: string;
  language?: string;
  problemSlug: string;
  problemTitle?: string;
  timestamp: number;
  tabId: number;
  submissionId?: string;
  contestSlug?: string;
}

// Map of tabId to PendingSubmission
const pendingSubmissions = new Map<number, PendingSubmission>();
const trackedSubmissionIds = new Set<string>();

export function getPendingSubmission(tabId: number): PendingSubmission | undefined {
  return pendingSubmissions.get(tabId);
}

export function clearPendingSubmission(tabId: number, submissionIdToClear?: string): void {
  const pending = pendingSubmissions.get(tabId);
  if (pending) {
    if (submissionIdToClear && pending.submissionId !== submissionIdToClear) {
      return; // Do not clear if a newer submission has replaced it
    }
    pendingSubmissions.delete(tabId);
  }
}

export function updatePendingSubmissionMetadata(tabId: number, metadata: { problemTitle?: string, problemSlug?: string }): void {
  const pending = pendingSubmissions.get(tabId);
  if (pending) {
    if (metadata.problemTitle) pending.problemTitle = metadata.problemTitle;
    if (metadata.problemSlug && !pending.problemSlug) pending.problemSlug = metadata.problemSlug;
  }
}

async function fetchProblemMetadata(slug: string): Promise<{ difficulty?: string, topics?: string[], title?: string }> {
  try {
    const query = `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          title
          difficulty
          topicTags {
            name
          }
        }
      }
    `;
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { titleSlug: slug }
      })
    });
    const json = await res.json();
    if (json.data?.question) {
      const difficulty = json.data.question.difficulty;
      const topics = json.data.question.topicTags?.map((tag: any) => tag.name) || [];
      const title = json.data.question.title;
      return { difficulty, topics, title };
    }
  } catch (error) {
    logger.warn(`Failed to fetch metadata for ${slug}`, error);
  }
  return {};
}

async function startResultResolution(pending: PendingSubmission, submissionId: string) {
  try {
    logger.info(`Starting result resolution for submission ${submissionId}`);
    
    // Fetch extended metadata concurrently
    const [result, metadata] = await Promise.all([
      resolveSubmissionResult(submissionId),
      fetchProblemMetadata(pending.problemSlug)
    ]);
    
    if (result.status === "accepted" || result.status === "rejected" || result.status === "unknown") {
      const fullSubmission: CapturedSubmission = {
        problemSlug: pending.problemSlug,
        problemTitle: pending.problemTitle || metadata.title || pending.problemSlug,
        status: result.status,
        source: "leetcode",
        submittedAt: result.resolvedAt,
        sourceCode: pending.sourceCode,
        language: pending.language,
        difficulty: metadata.difficulty,
        topics: metadata.topics,
        contestSlug: pending.contestSlug,
        submissionId: submissionId
      };
      
      logger.info("Captured final submission", { ...fullSubmission, sourceCode: fullSubmission.sourceCode ? `[${fullSubmission.sourceCode.length} chars]` : undefined });
      await storage.saveLatestSubmission(fullSubmission);
      // Sync to backend (was previously missing)
      await apiClient.syncSubmission(fullSubmission);
    }
  } finally {
    trackedSubmissionIds.delete(submissionId);
    clearPendingSubmission(pending.tabId, submissionId);
  }
}

export function initializeNetworkCapture(): void {
  logger.info("Initializing network capture...");
  try {
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        const url = details.url;
        const tabId = details.tabId;

        // Diagnostic logging for ANY submit/check/graphql related URL
        if (url.includes("/submit") || url.includes("/check") || url.includes("/graphql")) {
          // Parse operationName if GraphQL
          let operationName = "unknown";
          if (url.includes("/graphql") && details.method === "POST" && details.requestBody && details.requestBody.raw && details.requestBody.raw[0]) {
            try {
              const rawBytes = details.requestBody.raw[0].bytes;
              if (rawBytes) {
                const decoder = new TextDecoder('utf-8');
                const jsonString = decoder.decode(rawBytes);
                const jsonBody = JSON.parse(jsonString);
                if (jsonBody.operationName) {
                  operationName = jsonBody.operationName;
                }
              }
            } catch (e) {}
          }

          // Only log relevant GraphQL mutations/queries or all submit/check
          if (!url.includes("/graphql") || operationName === "submitCode" || operationName === "checkSubmission" || operationName.toLowerCase().includes("submit")) {
            logger.info(`[DIAGNOSTIC] url: ${new URL(url).pathname} | method: ${details.method} | op: ${operationName}`);
          }
        }

        // Handle POST /submit/
        if (details.method === "POST" && url.includes("/submit/")) {
          if (tabId < 0) return; // Ignore requests not associated with a tab

          const match = url.match(/\/problems\/([^/]+)\/submit/);
          if (!match || !match[1]) return;
          const problemSlug = match[1];

          logger.info("Submit captured");
          logger.info(`requestId: ${details.requestId}`);
          logger.info(`tabId: ${details.tabId}`);
          logger.info(`timeStamp: ${details.timeStamp}`);

          let sourceCode: string | undefined = undefined;
          let language: string | undefined = undefined;

          const requestBody = details.requestBody;
          if (requestBody) {
            if (requestBody.formData) {
              if (requestBody.formData.typed_code && requestBody.formData.typed_code[0]) {
                sourceCode = requestBody.formData.typed_code[0];
              }
              if (requestBody.formData.lang && requestBody.formData.lang[0]) {
                language = requestBody.formData.lang[0];
              }
            } else if (requestBody.raw && requestBody.raw[0] && requestBody.raw[0].bytes) {
              try {
                const rawBytes = requestBody.raw[0].bytes;
                const decoder = new TextDecoder('utf-8');
                const jsonString = decoder.decode(rawBytes);
                const jsonBody = JSON.parse(jsonString);

                if (jsonBody.typed_code) {
                  sourceCode = jsonBody.typed_code;
                  logger.info("Candidate source field: typed_code (JSON)");
                }
                if (jsonBody.lang) {
                  language = jsonBody.lang;
                }
              } catch (error) {
                logger.warn("Failed to parse raw request body as JSON", error);
              }
            }
          }

          if (sourceCode) {
            logger.info(`source length: ${sourceCode.length}`);
            
            // Try to extract contest slug if this is a contest submission
            const contestMatch = url.match(/\/contest\/(?:api\/)?([^/]+)\//);
            const contestSlug = contestMatch ? contestMatch[1] : undefined;

            // Preserve problemTitle if we already received it from the content script
            const existing = pendingSubmissions.get(tabId);
            const pending: PendingSubmission = {
              sourceCode,
              language,
              problemSlug,
              problemTitle: existing?.problemTitle,
              timestamp: Date.now(),
              tabId,
              contestSlug
            };
            
            pendingSubmissions.set(tabId, pending);
          }
        }
        
        if (details.method === "GET" && url.includes("/check")) {
          const match = url.match(/\/submissions\/detail\/([^/]+)\/(?:v2\/)?check\/?/);
          if (!match || !match[1]) return;
          const submissionId = match[1];
          
          if (submissionId.startsWith("runcode_")) return; // Ignore "Run Code" submissions
          
          if (trackedSubmissionIds.has(submissionId)) return;
          
          logger.info("Submission check observed");
          logger.info(`submissionId: ${submissionId}`);
          logger.info(`tabId: ${tabId}`);
          
          if (tabId >= 0) {
            const pending = pendingSubmissions.get(tabId);
            if (pending && !pending.submissionId) {
              pending.submissionId = submissionId;
              trackedSubmissionIds.add(submissionId);
              
              // Start background resolution without awaiting
              startResultResolution(pending, submissionId).catch(err => {
                logger.error(`Error resolving submission ${submissionId}`, err);
              });
            }
          }
        }
      },
      {
        urls: [
          "https://leetcode.com/*"
        ]
      },
      ["requestBody"]
    );
    logger.info("LeetCode network capture listener registered");
  } catch (error) {
    logger.error("FAILED to register network capture listener", error);
  }
}
