'use strict';

const config = {
  enabled: false,
  button: 0,
  ctrlKey: false,
  altKey: true,
  metaKey: false,
  shiftKey: true,
  urls: [],
  hosts: [],
  keywords: [],
  reverse: false,
  topRedict: false,
  nostop: false
};
chrome.storage.onChanged.addListener(e => {
  Object.keys(e).forEach(n => config[n] = e[n].newValue);
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
  else {
    const href = a.href;
    if (href) {
      if (config.urls.some(h => href.startsWith(h))) {
        return config.reverse ? '' : callback(a.href);
      }
      if (config.keywords.some(w => href.indexOf(w) !== -1)) {
        return config.reverse ? '' : callback(a.href);
      }
    }
  }
  // reverse mode
  if (config.reverse && a.href && (a.href.indexOf('#') === -1 || isTop)) {
    if (a.href.startsWith('http') || a.href.startsWith('file')) {
      return callback(a.href);
    }
  }
};
chrome.storage.local.get(config, prefs => {
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
    // Gmail attachments
    // https://github.com/andy-portmen/open-in/issues/42
    if (window.top === window && location.hostname === 'mail.google.com') {
      validate(location, () => {
        const script = document.createElement('script');
        script.textContent = `{
          const hps = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
          const script = document.currentScript;
          Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
            set(v) {
              if (v && v.indexOf('&view=att&') !== -1) {
                script.dispatchEvent(new CustomEvent('open-request', {
                  detail: v
                }));
              }
              else {
                hps.set.call(this, v);
              }
            }
          });
        }`;
        script.addEventListener('open-request', e => {
          e.stopPropagation();
          e.preventDefault();
          chrome.runtime.sendMessage({
            cmd: 'open-in',
            url: e.detail
          });
        });
        document.documentElement.appendChild(script);
        script.remove();
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
