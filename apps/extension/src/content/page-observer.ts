import { logger } from "../lib/logger.js";

type NavigationCallback = (newUrl: string) => void;

export function observePageNavigation(onNavigate: NavigationCallback): void {
  let lastUrl = window.location.href;

  // Modern SPAs often use History API
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    handleNavigation();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    handleNavigation();
  };

  window.addEventListener("popstate", () => {
    handleNavigation();
  });

  // Fallback observer for title changes which often indicate navigation in SPAs
  const titleObserver = new MutationObserver(() => {
    handleNavigation();
  });
  
  const titleElement = document.querySelector('title');
  if (titleElement) {
    titleObserver.observe(titleElement, { subtree: true, characterData: true, childList: true });
  }

  function handleNavigation() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      logger.info(`Page navigation detected: ${currentUrl}`);
      lastUrl = currentUrl;
      onNavigate(currentUrl);
    }
  }

  logger.info("Page navigation observer initialized.");
}
