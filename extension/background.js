// This script runs in the background and tracks website usage.

let activeTabUrl = null;
let startTime = null;

// Function to get the domain from a URL
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

// Function to update the time spent on a domain
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

  // Reset start time for the current tab
  startTime = new Date().getTime();
}

// --- Event Listeners ---

// Fired when the active tab in a window changes.
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateTime(); // Update time for the previous tab
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      activeTabUrl = tab.url;
      startTime = new Date().getTime();
    } else {
      activeTabUrl = null;
      startTime = null;
    }
  });
});

// Fired when a tab is updated.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the tab is active and the URL has changed
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        if (activeTabs.length > 0 && activeTabs[0].id === tabId && changeInfo.url) {
            updateTime();
            activeTabUrl = changeInfo.url;
            startTime = new Date().getTime();
        }
    });
});


// Fired when a window is focused.
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Window lost focus, stop tracking
        updateTime();
        activeTabUrl = null;
        startTime = null;
    } else {
        // Window gained focus, start tracking active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0 && tabs[0].url) {
                activeTabUrl = tabs[0].url;
                startTime = new Date().getTime();
            }
        });
    }
});

// Detect when the system is idle
chrome.idle.onStateChanged.addListener((newState) => {
    if (newState === 'idle' || newState === 'locked') {
        updateTime();
        activeTabUrl = null;
        startTime = null;
    } else if (newState === 'active') {
         chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0 && tabs[0].url) {
                activeTabUrl = tabs[0].url;
                startTime = new Date().getTime();
            }
        });
    }
});

// Set an interval to update time periodically to catch cases where events are missed
setInterval(updateTime, 5000);