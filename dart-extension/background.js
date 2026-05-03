let activeTabData = { url: '', title: '', startTime: Date.now() };
let activityLog = [];

function getDomain(url) {
  try {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return null;
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch (e) { return null; }
}

function getPageTitle(title, url) {
  if (!title) return getDomain(url) || 'Unknown';
  // Clean up title - remove site name suffix
  return title.replace(/ [-|] YouTube$/, '').replace(/ - Google$/, '').trim() || getDomain(url);
}

function flushCurrent() {
  const now = Date.now();
  const seconds = Math.round((now - activeTabData.startTime) / 1000);
  const domain = getDomain(activeTabData.url);
  
  if (domain && seconds >= 3) {
    activityLog.push({
      site: domain,
      title: activeTabData.title,
      seconds: seconds,
      timestamp: new Date().toISOString()
    });
  }
  activeTabData.startTime = now;
}

// Tab changed
chrome.tabs.onActivated.addListener(async (info) => {
  flushCurrent();
  try {
    const tab = await chrome.tabs.get(info.tabId);
    activeTabData = {
      url: tab.url || '',
      title: getPageTitle(tab.title, tab.url),
      startTime: Date.now()
    };
  } catch (e) {}
});

// Tab updated (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id === tabId) {
        flushCurrent();
        activeTabData = {
          url: tab.url || '',
          title: getPageTitle(tab.title, tab.url),
          startTime: Date.now()
        };
      }
    });
  }
});

// Window focus changed
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    flushCurrent();
  } else {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs[0]) {
        flushCurrent();
        activeTabData = {
          url: tabs[0].url || '',
          title: getPageTitle(tabs[0].title, tabs[0].url),
          startTime: Date.now()
        };
      }
    });
  }
});

// Every 30 seconds send data to localhost
setInterval(() => {
  flushCurrent();
  if (activityLog.length === 0) return;

  const toSend = [...activityLog];
  activityLog = [];

  fetch('http://localhost:9876/chrome-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activities: toSend })
  }).catch(() => {
    // If failed, put back
    activityLog = [...toSend, ...activityLog];
  });
}, 30000);