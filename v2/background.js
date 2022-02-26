'use strict';

const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;

const os = {
  linux: navigator.userAgent.indexOf('Linux') !== -1,
  mac: navigator.userAgent.indexOf('Mac') !== -1
};

function error(response) {
  window.alert(`Cannot communicate with the native client, or the Firefox browser is not located!
Make sure the native-client is installed, and the Firefox path is set correctly on the options page.

-----
Exit Code: ${response.code}
STD Output: ${response.stdout}
STD Error: ${response.stderr}`);
}

function response(res, success = () => {}) {
  // windows batch file returns 1
  if (res && (res.code !== 0 && (res.code !== 1 || res.stderr !== ''))) {
    error(res);
  }
  else if (!res) {
    const url = chrome.runtime.getURL('/data/helper-firefox/index.html');
    chrome.tabs.query({
      url
    }, tabs => {
      if (tabs && tabs.length) {
        const {id, windowId} = tabs[0];
        chrome.tabs.update(id, {
          active: true
        }, () => {
          chrome.windows.update(windowId, {
            focused: true
          });
        });
      }
      else {
        chrome.tabs.create({
          url: 'data/helper-firefox/index.html'
        });
      }
    });
  }
  else {
    success();
  }
}

function exec(command, args, c, properties = {}) {
  if (command) {
    chrome.runtime.sendNativeMessage('com.add0n.node', {
      arguments: args,
      command,
      cmd: 'exec',
      properties
    }, res => (c || response)(res));
  }
  else {
    alert(`Please set the "Firefox" browser path on the options page`);
    chrome.runtime.openOptionsPage();
  }
}

function find(callback) {
  chrome.runtime.sendNativeMessage('com.add0n.node', {
    cmd: 'env'
  }, res => {
    if (res && res.env && res.env.ProgramFiles) {
      chrome.storage.local.set({
        path: '%ProgramFiles(x86)%\\Mozilla Firefox\\firefox.exe'
          .replace('%LOCALAPPDATA%', res.env.LOCALAPPDATA)
          .replace('%ProgramFiles(x86)%', res.env['ProgramFiles(x86)'])
          .replace('%ProgramFiles%', res.env.ProgramFiles)
      }, callback);
    }
    else {
      response(res);
    }
  });
}

/* open each tab with a pre-defined delay */
const delayOpen = tabs => {
  chrome.storage.local.get({
    multiple: true
  }, prefs => {
    if (prefs.multiple) {
      return open(tabs.map(t => t.url), tabs.map(t => t.id));
    }
    const tab = tabs.shift();
    if (tab) {
      open([tab.url], [tab.id]);
      window.setTimeout(delayOpen, delayOpen.timeout, tabs);
    }
  });
};
delayOpen.timeoout = 1000;

const open = (urls, closeIDs = []) => {
  chrome.storage.local.get({
    path: null,
    closeme: false
  }, prefs => {
    const close = () => {
      if (prefs.closeme && closeIDs.length) {
        chrome.tabs.remove(closeIDs);
      }
    };
    const runtime = {
      mac: {
        args: ['-a', 'firefox']
      },
      linux: {
        name: 'firefox'
      },
      windows: {
        name: 'cmd',
        args: ['/s/c', 'start', 'firefox "%url;"'],
        prgfiles: '%ProgramFiles(x86)%\\Mozilla Firefox\\firefox.exe'
      }
    };

    if (os.mac) {
      if (prefs.path) {
        const length = runtime.mac.args.length;
        runtime.mac.args[length - 1] = prefs.path;
      }
      exec('open', [...runtime.mac.args, ...urls], r => response(r, close));
    }
    else if (os.linux) {
      exec(prefs.path || runtime.linux.name, urls, r => response(r, close));
    }
    else {
      if (prefs.path) {
        exec(prefs.path, [...(runtime.windows.args2 || []), ...urls], r => response(r, close));
      }
      else {
        const args = runtime.windows.args
          .map(a => a.replace('%url;', urls.join(' ')))
          // Firefox is not detaching the process on Windows
          .map(s => s.replace('start', isFirefox ? 'start /WAIT' : 'start'));
        exec(runtime.windows.name, args, res => {
          // use old method
          if (res && res.code !== 0) {
            find(() => open(urls, closeIDs));
          }
          else {
            response(res, close);
          }
        }, {
          windowsVerbatimArguments: true
        });
      }
    }
  });
};
// browser action
chrome.browserAction.onClicked.addListener(() => chrome.tabs.query({
  currentWindow: true,
  active: true
}, tabs => open(tabs.map(t => t.url), tabs.map(t => t.id))));
// message passing
chrome.runtime.onMessage.addListener(({cmd, url}, sender) => {
  if (cmd === 'open-in') {
    open([url], [sender.tab.id]);
  }
});
// context menu
{
  const callback = () => {
    chrome.contextMenus.create({
      id: 'open-all',
      title: 'Open all Tabs in Firefox Browser',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      id: 'open-current',
      title: 'Open Link in Firefox Browser',
      contexts: ['link'],
      documentUrlPatterns: ['*://*/*']
    });
    chrome.contextMenus.create({
      id: 'open-text',
      title: 'Extract and Open Text Links in Firefox Browser',
      contexts: ['selection'],
      documentUrlPatterns: ['*://*/*']
    });
    chrome.contextMenus.create({
      id: 'open-call',
      title: 'Open all Tabs in Firefox Browser (Current window)',
      contexts: ['browser_action']
    });
  };
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
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
    chrome.tabs.query({
      url: ['*://*/*'],
      currentWindow: true
    }, delayOpen);
  }
  else if (menuItemId === 'open-all') {
    chrome.tabs.query({
      url: ['*://*/*']
    }, delayOpen);
  }
  else {
    console.warn('command is not supported', menuItemId);
  }
});


/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '&version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '&rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
