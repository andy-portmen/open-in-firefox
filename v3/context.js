/* global delayOpen */
{
  const once = () => chrome.contextMenus.removeAll(() => {
    chrome.storage.local.get({
      'brand-name': 'Firefox',
      'show-open-current': true,
      'show-open-text': true
    }, prefs => {
      chrome.contextMenus.create({
        id: 'open-all',
        title: 'Open all Tabs in ' + prefs['brand-name'],
        contexts: ['action']
      });
      chrome.contextMenus.create({
        id: 'open-call',
        title: 'Open all Tabs in ' + prefs['brand-name'] + ' (Current window)',
        contexts: ['action']
      });
      chrome.contextMenus.create({
        id: 'open-current',
        title: 'Open Link in ' + prefs['brand-name'],
        contexts: ['link'],
        documentUrlPatterns: ['*://*/*'],
        visible: prefs['show-open-current']
      });
      chrome.contextMenus.create({
        id: 'open-text',
        title: 'Extract and Open Text Links in ' + prefs['brand-name'],
        contexts: ['selection'],
        documentUrlPatterns: ['*://*/*'],
        visible: prefs['show-open-text']
      });
    });
  });

  chrome.runtime.onInstalled.addListener(once);
  chrome.runtime.onStartup.addListener(once);
  chrome.storage.onChanged.addListener(prefs => {
    if (prefs['brand-name'] || prefs['show-open-text'] || prefs['show-open-current']) {
      once();
    }
  });
}
chrome.contextMenus.onClicked.addListener(({menuItemId, linkUrl, pageUrl, selectionText}) => {
  if (menuItemId === 'open-current') {
    open([linkUrl || pageUrl], []);
  }
  else if (menuItemId === 'open-text') {
    const links = [];

    selectionText.replace(/\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|]/ig, a => {
      links.push(a);
    });
    if (links.length) {
      delayOpen(links.map(url => ({
        url,
        id: undefined
      })));
    }
  }
  else if (menuItemId === 'open-call') {
    chrome.permissions.request({
      permissions: ['tabs']
    }, granted => granted && chrome.tabs.query({
      url: ['*://*/*'],
      currentWindow: true
    }, delayOpen));
  }
  else if (menuItemId === 'open-all') {
    chrome.permissions.request({
      permissions: ['tabs']
    }, granted => granted && chrome.tabs.query({
      url: ['*://*/*']
    }, delayOpen));
  }
  else {
    console.warn('command is not supported', menuItemId);
  }
});
