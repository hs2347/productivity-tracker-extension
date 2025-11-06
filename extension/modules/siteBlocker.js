import { getDomain } from './utils.js';

const SESSION_RULE_ID_PREFIX = 1000;
const blockPageUrl = chrome.runtime.getURL('block.html');

/**
 * Updates the session blocking rules.
 * @param {string[]} blockedDomains - An array of domains to block.
 */
async function updateBlockingRules(blockedDomains) {
  const currentRules = await chrome.declarativeNetRequest.getSessionRules();
  const oldRuleIds = currentRules
    .map((rule) => rule.id)
    .filter((id) => id >= SESSION_RULE_ID_PREFIX);

  const newRules = blockedDomains.map((domain, index) => ({
    id: SESSION_RULE_ID_PREFIX + index,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { url: blockPageUrl },
    },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: ['main_frame'],
    },
  }));

  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: oldRuleIds,
    addRules: newRules,
  });
}

/**
 * Actively updates existing tabs to show the block page if they match the new domain.
 * @param {string} domain - The domain that was just blocked.
 */
async function updateExistingTabs(domain) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    const tabDomain = getDomain(tab.url);
    if (tabDomain) {
      if (tabDomain === domain || tabDomain.endsWith('.' + domain)) {
        chrome.tabs.update(tab.id, { url: blockPageUrl });
      }
    }
  }
}

// --- Public API ---

/**
 * Adds a new domain to the block list and updates the rules.
 * @param {string} domain - The domain to block.
 */
export async function addBlock(domain) {
  if (!domain) {
    throw new Error('No domain provided');
  }

  const data = await chrome.storage.local.get(['sessionBlockedDomains']);
  const blockedList = data.sessionBlockedDomains || [];

  if (!blockedList.includes(domain)) {
    const newList = [...blockedList, domain];
    await chrome.storage.local.set({ sessionBlockedDomains: newList });
    await updateBlockingRules(newList);
    await updateExistingTabs(domain); // Actively block open tabs
  }
}

/**
 * Clears all session blocking rules from declarativeNetRequest and storage.
 */
export async function clearBlockingRules() {
  const currentRules = await chrome.declarativeNetRequest.getSessionRules();
  const oldRuleIds = currentRules
    .map((rule) => rule.id)
    .filter((id) => id >= SESSION_RULE_ID_PREFIX);

  if (oldRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: oldRuleIds,
    });
  }
  await chrome.storage.local.remove('sessionBlockedDomains');
  console.log('Session blocking rules and storage cleared.');
}

/**
 * Navigates any tabs showing the block page back to safety (new tab page).
 */
export async function unblockAllTabs() {
  const blockedTabs = await chrome.tabs.query({ url: blockPageUrl });
  for (const tab of blockedTabs) {
    // Don't go back. Explicitly update the tab to a safe page.
    chrome.tabs.update(tab.id, { url: 'chrome://newtab' });
  }
}

/**
 * Attaches listeners to clear rules on browser startup or extension install.
 */
export function initBlockerCleanup() {
  // Clear rules when the extension is installed/updated or browser starts
  chrome.runtime.onStartup.addListener(clearBlockingRules);
  chrome.runtime.onInstalled.addListener(clearBlockingRules);
}