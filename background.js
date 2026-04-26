let totalBlocked = 0;
let tabBlockedCounts = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ITEM_BLOCKED') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId) {
      tabBlockedCounts[tabId] = (tabBlockedCounts[tabId] || 0) + 1;
      totalBlocked++;
      
      // Update badge text for this specific tab
      chrome.action.setBadgeText({
        text: tabBlockedCounts[tabId].toString(),
        tabId: tabId
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#dc3545',
        tabId: tabId
      });
      
      // Save total to storage
      chrome.storage.local.set({ 
        totalBlocked: totalBlocked,
        tabBlockedCounts: tabBlockedCounts
      });
    }
  } else if (request.type === 'GET_STATS') {
    // Popup requests stats
    sendResponse({
      totalBlocked: totalBlocked,
      tabBlockedCounts: tabBlockedCounts
    });
  }
});

// Clean up tab counts when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabBlockedCounts[tabId]) {
    delete tabBlockedCounts[tabId];
    chrome.storage.local.set({ tabBlockedCounts: tabBlockedCounts });
  }
});
