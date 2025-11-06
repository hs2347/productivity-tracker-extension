// hs2347/productivity-tracker-extension/productivity-tracker-extension-bdc8975e9f4e4c0f20270cc3e3c4342366bf6954/extension/background.js

// Import all module initializers and functions
import { initTimeTracker, clearTrackingData } from './modules/timeTracker.js';
import {
  initBlockerCleanup,
  addBlock,
  clearBlockingRules,
  unblockAllTabs,
} from './modules/siteBlocker.js';

// --- Initialize Modules ---
// Sets up all event listeners for time tracking (tabs, windows, idle)
initTimeTracker();
// Sets up listeners for onStartup and onInstalled to clear rules
initBlockerCleanup();

// --- Central Message Listener ---
// Handles all communication from the popup UI

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Use an async IIFE (Immediately Invoked Function Expression)
  // to handle async logic and use sendResponse correctly.
  (async () => {
    try {
      if (request.type === 'addBlock') {
        await addBlock(request.domain);
        sendResponse({ success: true, domain: request.domain });
      } else if (request.type === 'resetSession') {
        // This now correctly coordinates both modules
        await clearTrackingData();
        await clearBlockingRules();
        await unblockAllTabs();
        sendResponse({ success: true });
      }
    } catch (e) {
      console.error('Failed to handle message:', request.type, e);
      sendResponse({ success: false, error: e.message });
    }
  })();

  // Return true to indicate that sendResponse will be called asynchronously
  return true;
});
