# LeetBranch Browser Extension

This is the Manifest V3 Chrome extension for LeetBranch. Its primary responsibility is to detect accepted LeetCode submissions directly from the browser, extract relevant problem metadata, and eventually pass this data to the local LeetBranch backend for synchronization.

## Extension Architecture

The extension is strictly partitioned into several domains:
1. **Background Service Worker (`src/background/`)**: Manages long-lived events, local storage coordination, and acts as the central message router.
2. **Content Scripts (`src/content/`)**: Injected directly into `leetcode.com` pages to coordinate detection and data extraction.
3. **LeetCode Adapter (`src/integrations/leetcode/`)**: An abstraction boundary. The rest of the extension does NOT interact directly with LeetCode DOM selectors. All DOM traversal, extraction strategies, and observer mechanics are isolated behind `LeetCodeAdapter`.
4. **Libraries (`src/lib/`)**: Shared utilities for structured logging and typed storage.

## Build Instructions

To build the extension:

1. Ensure dependencies are installed in the `apps/extension` directory:
   ```bash
   npm install
   ```
2. Run the TypeScript compiler to emit the `dist/` bundle:
   ```bash
   npm run build
   ```

To run unit tests (using Vitest):
```bash
npm run test
```

## Loading the Unpacked Extension

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left.
4. Select the `apps/extension` directory (the folder containing `manifest.json`).
5. Open a LeetCode problem, open the Chrome Developer Tools Console, and look for `[LeetBranch]` logs.

## Current Detection Strategy

The extension avoids aggressive `setInterval` polling. Instead, it uses a `MutationObserver` targeted at the main content area of the LeetCode IDE. When a submission is processed, the observer detects the appearance of result containers (e.g., classes like `.success__3Ai7` or elements with `data-e2e-locator="submission-result"`) and normalizes the text content (e.g., "Accepted" -> `accepted`).

## Supported Metadata

The extension currently supports capturing:
- `problemSlug`: Parsed deterministically from the URL.
- `problemTitle`: Extracted from OpenGraph meta tags or the page title.
- `language`: Extracted from the language dropdown UI.
- `status`: Normalized to `accepted`, `rejected`, or `unknown`.
- `sourceCode`: Attempted extraction from the Monaco editor `.view-line` elements.

## Known Limitations

- **Source Code Extraction**: LeetCode's Monaco editor uses virtualized DOM rendering. Extracting source code directly from `.view-line` elements may fail to capture the entire file if the solution is very long and scrolled out of view. Currently, if the DOM cannot reliably yield the full source, the system gracefully degrades (leaving `sourceCode` undefined) rather than scraping garbage.
- **Dynamic Selectors**: The LeetCode frontend updates frequently. The `extractor` and `detector` logic may need maintenance if class names change.

## Future Backend Integration

**Backend synchronization is NOT implemented in Phase 1, Step 3.**
Currently, submissions are logged to the console and saved to `chrome.storage.local`. In upcoming phases, the Background Service Worker will securely route these validated payloads to the local `apps/api` FastAPI backend via authenticated internal requests.
