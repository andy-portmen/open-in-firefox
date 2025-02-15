/* global builder */

self.importScripts('builder.js');
self.importScripts('context.js');
self.importScripts('convert.js', 'urlFilters.js');

const os = {
  linux: navigator.userAgent.includes('Linux'),
  mac: navigator.userAgent.includes('Mac')
};

const notify = async title => {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  if (tabs && tabs.length) {
    chrome.action.setBadgeText({
      tabId: tabs[0].id,
      text: 'E'
    });
    chrome.action.setTitle({
      tabId: tabs[0].id,
      title
    });
  }
};

function error(response) {
  console.warn(response);
  notify(`Cannot communicate with the native client, or the Firefox browser is not located!
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
    chrome.tabs.query({
      url: chrome.runtime.getURL('*')
    }, tbs => {
      if (tbs && tbs.length) {
        chrome.windows.update(tbs[0].windowId, {
          focused: true
        });
        chrome.tabs.update(tbs[0].id, {
          active: true
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
    chrome.storage.local.get({
      'native': 'com.add0n.node'
    }, prefs => chrome.runtime.sendNativeMessage(prefs.native, {
      arguments: args,
      command,
      cmd: 'exec',
      properties
    }, res => (c || response)(res, chrome.runtime.lastError)));
  }
  else {
    notify(`Please set the "Firefox" browser path on the options page`);
    chrome.runtime.openOptionsPage();
  }
}

function find(callback) {
  chrome.storage.local.get({
    'native': 'com.add0n.node'
  }, prefs => chrome.runtime.sendNativeMessage(prefs.native, {
    cmd: 'env'
  }, res => {
    if (res && res.env && res.env.ProgramFiles) {
      chrome.storage.local.set({
        path: '%ProgramFiles%\\Mozilla Firefox\\firefox.exe'
          .replace(/%localappdata%/ig, res.env.LOCALAPPDATA)
          .replace(/%programfiles\(x86\)%/ig, res.env['ProgramFiles(x86)'])
          .replace(/%programfiles%/ig, res.env.ProgramFiles)
      }, callback);
    }
    else {
      response(res);
    }
  }));
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
    args: '',
    closeme: false
  }, prefs => {
    const close = () => {
      if (prefs.closeme && closeIDs.length) {
        chrome.tabs.remove(closeIDs);
      }
    };

    const {command, args, options = {}} = builder.generate(os, prefs.path, prefs.args);
    args.forEach((arg, n) => {
      if (arg === '&Expanded-URLs;') {
        args[n] = urls;
      }
      else if (arg.includes('&Separated-URLs;')) {
        args[n] = arg.replace('&Separated-URLs;', urls.join(' '));
      }
    });

    console.info('[command]', command);
    console.info('[arguments]', args.flat());

    exec(command, args.flat(), r => {
      if (os.mac === false && os.linux === false) {
        if (!prefs.path) {
          if (r && r.code !== 0) {
            find(() => open(urls, closeIDs));
            return;
          }
        }
      }
      response(r, close);
    }, options);
  });
};
// action button
chrome.storage.local.get({
  'custom-icon': ''
}, prefs => {
  if (prefs['custom-icon']) {
    fetch(prefs['custom-icon']).then(r => r.blob()).then(b => {
      return createImageBitmap(b);
    }).then(img => {
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      chrome.action.setIcon({imageData});
    });
  }
});

chrome.action.onClicked.addListener(async tab => {
  const tabs = await chrome.tabs.query({
    currentWindow: true,
    highlighted: true
  }).then(tabs => tabs.filter(t => t.url));

  if (tabs.length) {
    open(tabs.map(t => t.url), tabs.map(t => t.id));
  }
  else {
    open([tab.url], [tab.id]);
  }
});
// message passing
chrome.runtime.onMessage.addListener(({cmd, url}, sender) => {
  if (cmd === 'open-in') {
    open([url], [sender.tab.id]);
  }
  else if (cmd === 'close-me') {
    chrome.tabs.remove(sender.tab.id);
  }
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
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
