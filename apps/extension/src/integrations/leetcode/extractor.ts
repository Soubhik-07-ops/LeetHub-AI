import { LeetCodeMetadata } from "./types.js";
import { logger } from "../../lib/logger.js";

/**
 * Extracts the problem slug from the URL.
 * e.g., https://leetcode.com/problems/two-sum/ -> two-sum
 */
export function extractProblemSlug(url: string = window.location.href): string {
  try {
    const match = url.match(/\/problems\/([^/]+)/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (error) {
    logger.warn("Failed to extract problem slug from URL", url);
  }
  return "unknown-problem";
}

/**
 * Attempts to extract the title from the page metadata or DOM.
 */
export function extractProblemTitle(): string | undefined {
  try {
    // Try meta tag first
    const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
    if (ogTitle && ogTitle.content) {
      // Typically "Two Sum - LeetCode"
      return ogTitle.content.split(" - ")[0].trim();
    }
    
    // Fallback to title tag
    const title = document.title;
    if (title) {
      return title.split(" - ")[0].trim();
    }
  } catch (error) {
    logger.warn("Failed to extract problem title", error);
  }
  return undefined;
}

/**
 * Source code extraction via DOM is deprecated.
 * Source is now captured via network request in the background service worker.
 */
export async function extractSourceCode(): Promise<string | undefined> {
  return undefined;
}

/**
 * Attempts to extract the current selected language.
 */
export function extractLanguage(): string | undefined {
  try {
    // Find the language selector button. It usually contains the current language text.
    // E.g., a button inside the editor toolbar
    const langButton = document.querySelector('button[id^="headlessui-listbox-button"]');
    if (langButton && langButton.textContent) {
      return langButton.textContent.trim();
    }
    
    // Alternative selector
    const langDiv = document.querySelector('.lang-select__32-V .ant-select-selection-selected-value');
    if (langDiv && langDiv.textContent) {
      return langDiv.textContent.trim();
    }
  } catch (error) {
    logger.warn("Failed to extract language", error);
  }
  return undefined;
}

export function extractAllMetadata(): LeetCodeMetadata {
  return {
    problemSlug: extractProblemSlug(),
    problemTitle: extractProblemTitle(),
    language: extractLanguage()
  };
}
