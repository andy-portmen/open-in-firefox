/* global URLPattern */
'use strict';

let port;
try {
  port = document.getElementById('open-in-firefox-port');
  port.remove();
}
catch (e) {
  port = document.createElement('span');
  port.id = 'open-in-firefox-port';
  document.documentElement.append(port);
}
port.addEventListener('open', e => {
  if (e.detail.url) {
    chrome.runtime.sendMessage({
      cmd: 'open-in',
      url: e.detail.url
    });
  }
  if (e.detail.close) {
    chrome.runtime.sendMessage({
      cmd: 'close-me'
    });
  }
});

const config = {
  'enabled': false,
  'button': 0,
  'ctrlKey': false,
  'altKey': true,
  'metaKey': false,
  'shiftKey': true,
  'urls': [],
  'hosts': [],
  'keywords': [],
  'reverse': false,
  'topRedict': false,
  'nostop': false,
  'custom-validation': '' // user-defined custom function to validate open in
};
chrome.storage.onChanged.addListener(e => {
  Object.keys(e).forEach(n => config[n] = e[n].newValue);
  if (e['custom-validation']) {
    port.dataset.script = e['custom-validation'].newValue;
    port.dispatchEvent(new Event('update'));
  }
});

const validate = (a, callback, isTop = false) => {
  if (config.hosts.length) {
    const host = a.hostname;
    if (host) {
      if (config.hosts.some(h => h.endsWith(host) || host.endsWith(h))) {
        return config.reverse ? '' : callback(a.href);
      }
    }
  }
  // URL matching
  if (config.urls.length) {
    const href = a.href;

    try {
      for (const h of config.urls) {
        let m;
        try {
          m = new URLPattern(h);
        }
        catch (e) {
          try {
            m = new URLPattern({hostname: h});
          }
          catch (e) {
            m = new URLPattern({pathname: h});
          }
        }

        if (m.test(href)) {
          return config.reverse ? '' : callback(a.href);
        }
      }
    }
    catch (e) {
      console.warn('Cannot use URLPattern', e);
      if (href && config.urls.some(h => href.startsWith(h))) {
        return config.reverse ? '' : callback(a.href);
      }
    }
  }
  // keyword matching
  if (config.keywords.length) {
    const href = a.href;
    if (href && config.keywords.some(w => href.indexOf(w) !== -1)) {
      return config.reverse ? '' : callback(a.href);
    }
  }
  // reverse mode
  if (config.reverse) {
    if (a.href && (a.href.startsWith('http') || a.href.startsWith('file'))) {
      if ((a.getAttribute('href') || '').startsWith('#') === false || isTop) {
        return callback(a.href);
      }
    }
  }
};
chrome.storage.local.get(config, prefs => {
  port.dataset.script = prefs['custom-validation'];
  port.dispatchEvent(new Event('update'));

  Object.assign(config, prefs);
  // managed
  chrome.storage.managed.get({
    urls: [],
    hosts: [],
    reverse: false
  }, prefs => {
    if (!chrome.runtime.lastError) {
      config.hosts.push(...prefs.hosts);
      config.urls.push(...prefs.urls);
      config.reverse = config.reverse || prefs.reverse;
    }
    // top level redirect
    if (window.top === window && config.topRedict) {
      validate(location, url => {
        if (history.length) {
          history.back();
        }
        else {
          window.stop();
        }
        chrome.runtime.sendMessage({
          cmd: 'open-in',
          url
        });
      }, true);
    }
  });
});

document.addEventListener('click', e => {
  const redirect = url => {
    if (config.nostop !== true) {
      e.stopPropagation();
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    chrome.runtime.sendMessage({
      cmd: 'open-in',
      url
    });
    return false;
  };

  // hostname on left-click
  if (e.button === 0 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    if (config.hosts.length || config.urls.length || config.keywords.length || config.reverse) {
      let a = e.target.closest('a');
      if (a) {
        if (a.href.startsWith('https://www.google') && a.href.indexOf('&url=') !== -1) {
          const link = decodeURIComponent(a.href.split('&url=')[1].split('&')[0]);
          a = new URL(link);
        }
        validate(a, redirect);
      }
    }
  }
  // click + modifier
  if (
    config.enabled && e.button === config.button &&
    e.altKey === config.altKey && e.metaKey === config.metaKey &&
    e.ctrlKey === config.ctrlKey && e.shiftKey === config.shiftKey
  ) {
    const a = e.target.closest('a');
    if (a && a.href) {
      return redirect(a.href);
    }
  }
}, true);
