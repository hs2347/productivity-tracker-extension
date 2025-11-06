// --- Time Tracking Logic (Your original code) ---
let activeTabUrl = null;
let startTime = null;

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

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
  startTime = new Date().getTime();
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  updateTime();
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url && tab.url.startsWith('http')) {
      activeTabUrl = tab.url;
      startTime = new Date().getTime();
    } else {
      activeTabUrl = null;
      startTime = null;
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    if (activeTabs.length > 0 && activeTabs[0].id === tabId && changeInfo.url) {
      if (tab.url.startsWith('http')) {
        updateTime();
        activeTabUrl = changeInfo.url;
        startTime = new Date().getTime();
      } else {
        activeTabUrl = null;
        startTime = null;
      }
    }
  });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    updateTime();
    activeTabUrl = null;
    startTime = null;
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].url && tabs[0].url.startsWith('http')) {
        activeTabUrl = tabs[0].url;
        startTime = new Date().getTime();
      }
    });
  }
});

chrome.idle.onStateChanged.addListener((newState) => {
  if (newState === 'idle' || newState === 'locked') {
    updateTime();
    activeTabUrl = null;
    startTime = null;
  } else if (newState === 'active') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].url && tabs[0].url.startsWith('http')) {
        activeTabUrl = tabs[0].url;
        startTime = new Date().getTime();
      }
    });
  }
});

setInterval(updateTime, 5000);

// --- NEW BLOCKER LOGIC ---

// A unique ID for our set of rules
const SESSION_RULE_ID_PREFIX = 1000;

// Get the URL for the block.html page
const blockPageUrl = chrome.runtime.getURL('block.html');

/**
 * Updates the session blocking rules.
 * @param {string[]} blockedDomains - An array of domains to block.
 */
async function updateBlockingRules(blockedDomains) {
  // Get existing rules
  const currentRules = await chrome.declarativeNetRequest.getSessionRules();
  
  // Prepare rule removal (all our old rules)
  const oldRuleIds = currentRules
    .map(rule => rule.id)
    .filter(id => id >= SESSION_RULE_ID_PREFIX);

  // Prepare new rules
  const newRules = blockedDomains.map((domain, index) => {
    return {
      id: SESSION_RULE_ID_PREFIX + index, // Assign a unique ID
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { url: blockPageUrl },
      },
      condition: {
        // Block the domain and all its subdomains
        urlFilter: `||${domain}`,
        resourceTypes: ['main_frame'],
      },
    };
  });

  // Update the rules in the session
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: oldRuleIds,
    addRules: newRules,
  });
}

/**
 * Clears all session blocking rules and storage.
 */
async function clearSession() {
  const currentRules = await chrome.declarativeNetRequest.getSessionRules();
  const oldRuleIds = currentRules
    .map(rule => rule.id)
    .filter(id => id >= SESSION_RULE_ID_PREFIX);

  if (oldRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: oldRuleIds,
    });
  }
  
  // Also clear the list from storage
  await chrome.storage.local.remove('sessionBlockedDomains');
  console.log('Session blocking rules and storage cleared.');
}

// --- Message Listener ---
// --- Message Listener ---

// --- Message Listener ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Use an async function to handle promises
  (async () => {
    if (request.type === 'addBlock') {
      try {
        const domain = request.domain;
        if (!domain) {
          throw new Error('No domain provided');
        }

        // Get the current list from storage
        const data = await chrome.storage.local.get(['sessionBlockedDomains']);
        const blockedList = data.sessionBlockedDomains || [];

        // Add the new domain if it's not already there
        if (!blockedList.includes(domain)) {
          const newList = [...blockedList, domain];
          
          // Save the new list to storage
          await chrome.storage.local.set({ sessionBlockedDomains: newList });
          
          // Update the blocking rules
          await updateBlockingRules(newList);

          // --- FIX: Actively update existing tabs ---
          const blockPageUrl = chrome.runtime.getURL('block.html');
          const tabs = await chrome.tabs.query({});
          for (const tab of tabs) {
            const tabDomain = getDomain(tab.url);
            if (tabDomain) {
              // Check if tabDomain is the blocked domain or a subdomain
              if (tabDomain === domain || tabDomain.endsWith('.' + domain)) {
                // Actively update the tab's URL to our block page.
                // This is more reliable than reload() and ensures
                // your custom block.html is shown.
                chrome.tabs.update(tab.id, { url: blockPageUrl });
              }
            }
          }
          // --- END FIX ---
        }
        
        sendResponse({ success: true, domain: domain });
      } catch (e) {
        console.error('Failed to add block rule:', e);
        sendResponse({ success: false, error: e.message });
      }
    } else if (request.type === 'resetSession') {
      try {
        // Clear all tracking data
        await chrome.storage.local.clear();
        
        // Clear blocking rules
        await clearSession();
        
        // Un-block any tabs currently showing the block page
        const blockPageUrl = chrome.runtime.getURL('block.html');
        const blockedTabs = await chrome.tabs.query({ url: blockPageUrl });
        for (const tab of blockedTabs) {
          chrome.tabs.goBack(tab.id, () => {
            if (chrome.runtime.lastError) {
              chrome.tabs.update(tab.id, { url: 'chrome://newtab' });
            }
          });
        }

        sendResponse({ success: true });
      } catch (e) {
        console.error('Failed to reset session:', e);
        sendResponse({ success: false, error: e.message });
      }
    }
  })();
  
  // Return true to indicate you will send a response asynchronously
  return true; 
});

// Clear all session rules on extension startup
chrome.runtime.onStartup.addListener(() => {
  clearSession();
});

// Clear rules when the extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  clearSession();
});
