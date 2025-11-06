import { getDomain } from './utils.js';

// Module-level state (no longer global)
let activeTabUrl = null;
let startTime = null;

function updateTime() {
  if (!activeTabUrl || !startTime) {
    return;
  }

  const domain = getDomain(activeTabUrl);
  if (!domain) {
    return;
  }

  const endTime = new Date().getTime();
  const timeSpent = Math.round((endTime - startTime) / 1000); // in seconds

  if (timeSpent > 0) {
    chrome.storage.local.get([domain], (result) => {
      const totalTime = (result[domain] || 0) + timeSpent;
      chrome.storage.local.set({ [domain]: totalTime });
    });
  }
  startTime = new Date().getTime(); // Reset start time for the next interval
}

// --- Event Handlers ---

function handleTabActivated(activeInfo) {
  updateTime();
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url && (tab.url.startsWith('http') || tab.url.startsWith('chrome://'))) {
      activeTabUrl = tab.url;
      startTime = new Date().getTime();
    } else {
      activeTabUrl = null;
      startTime = null;
    }
  });
}

function handleTabUpdated(tabId, changeInfo, tab) {
  chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    if (activeTabs.length > 0 && activeTabs[0].id === tabId && changeInfo.url) {
      if (tab.url.startsWith('http') || tab.url.startsWith('chrome://')) {
        updateTime();
        activeTabUrl = changeInfo.url;
        startTime = new Date().getTime();
      } else {
        activeTabUrl = null;
        startTime = null;
      }
    }
  });
}

function handleWindowFocusChanged(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    updateTime();
    activeTabUrl = null;
    startTime = null;
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].url && (tabs[0].url.startsWith('http') || tabs[0].url.startsWith('chrome://'))) {
        activeTabUrl = tabs[0].url;
        startTime = new Date().getTime();
      }
    });
  }
}

function handleIdleStateChanged(newState) {
  if (newState === 'idle' || newState === 'locked') {
    updateTime();
    activeTabUrl = null;
    startTime = null;
  } else if (newState === 'active') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].url && (tabs[0].url.startsWith('http') || tabs[0].url.startsWith('chrome://'))) {
        activeTabUrl = tabs[0].url;
        startTime = new Date().getTime();
      }
    });
  }
}

// --- Public API ---

/**
 * Attaches all event listeners required for time tracking.
 */
export function initTimeTracker() {
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
  chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);
  chrome.idle.onStateChanged.addListener(handleIdleStateChanged);

  // Set up the recurring time update
  setInterval(updateTime, 5000);
  
  // Initialize state on load
  handleWindowFocusChanged(chrome.windows.WINDOW_ID_NONE); // Assume unfocused to start
}

/**
 * Clears all time tracking data from storage.
 */
export async function clearTrackingData() {
  // We can't just clear() because the block list is also in storage.
  // We must get all keys, remove the block list key, and then remove the rest.
  const allItems = await chrome.storage.local.get(null);
  const keysToRemove = Object.keys(allItems).filter(
    (key) => key !== 'sessionBlockedDomains'
  );
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
  
  console.log('Time tracking data cleared.');
}