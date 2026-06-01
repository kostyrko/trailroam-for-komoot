const appUrl = chrome.runtime.getURL('app/index.html');
chrome.tabs.create({ url: appUrl });
window.close();
