/* global runtime */
'use strict';

let os = 'windows';
if (navigator.userAgent.indexOf('Mac') !== -1) {
  os = 'mac';
}
else if (navigator.userAgent.indexOf('Linux') !== -1) {
  os = 'linux';
}
document.body.dataset.os = (os === 'mac' || os === 'linux') ? 'linux' : 'windows';

if (os !== 'linux' && os !== 'mac') {
  document.querySelector('option[value="org.webextension.bun"]').disabled = true;
}

if (['Lin', 'Win', 'Mac'].indexOf(navigator.platform.substr(0, 3)) === -1) {
  alert(`Sorry! The "native client" only supports the following operating systems at the moment:

Windows, Mac, and Linux`);
}

document.getElementById('extension').textContent = chrome.runtime.id;

const start = () => chrome.runtime.sendNativeMessage(runtime.value, {
  cmd: 'version'
}, response => {
  if (response) {
    document.title = 'Native Client is installed!';
    document.body.dataset.installed = true;
  }
  else {
    document.title = 'One Extra Step :: Open in Firefox';
    document.body.dataset.installed = false;
  }
});

runtime.onchange = e => chrome.storage.local.set({
  native: runtime.value
}, start);

const notify = (() => {
  const parent = document.getElementById('notify');
  const elems = [];
  return {
    show: function(type, msg, delay) {
      const elem = document.createElement('div');
      elem.textContent = msg;
      elem.dataset.type = type;
      parent.appendChild(elem);
      window.setTimeout(() => {
        try {
          parent.removeChild(elem);
        }
        catch (e) {}
      }, delay || 3000);
      elems.push(elem);
    },
    destroy: function() {
      elems.forEach(elem => {
        try {
          parent.removeChild(elem);
        }
        catch (e) {}
      });
    }
  };
})();

document.addEventListener('click', ({target}) => {
  const repo = runtime.value === 'com.add0n.node' ? 'native-client' : 'native-client-bunjs';

  if (target.dataset.cmd === 'download') {
    const next = () => {
      notify.show('info', 'Looking for the latest version of the native-client', 60000);
      const req = new window.XMLHttpRequest();
      req.open('GET', 'https://api.github.com/repos/andy-portmen/' + repo + '/releases/latest');
      req.responseType = 'json';
      req.onload = () => {
        chrome.downloads.download({
          filename: os + '.zip',
          url: req.response.assets.filter(a => a.name === os + '.zip')[0].browser_download_url
        }, () => {
          notify.show('success', 'Download is started. Extract and install when it is done');
          window.setTimeout(() => {
            notify.destroy();
            document.body.dataset.step = 1;
          }, 3000);
        });
      };
      req.onerror = () => {
        notify('error', 'Something went wrong! Please download the package manually');
        window.setTimeout(() => {
          window.open('https://github.com/andy-portmen/' + repo + '/releases');
        }, 5000);
      };
      req.send();
    };
    if (chrome.downloads) {
      next();
    }
    else {
      chrome.permissions.request({
        permissions: ['downloads']
      }, granted => {
        if (granted) {
          next();
        }
        else {
          notify.show('error', 'Cannot initiate file downloading. Please download the file manually', 60000);
        }
      });
    }
  }
  else if (target.dataset.cmd === 'check') {
    chrome.runtime.sendNativeMessage(runtime.value, {
      cmd: 'version'
    }, response => {
      const e = chrome.runtime.lastError;
      if (response) {
        notify.show('success', 'Native client version is ' + response.version);
      }
      else {
        notify.show(
          'error',
          'Cannot find the native client. Follow the 3 steps to install the native client.\n\nLog: ' + e.message,
          10000
        );
      }
    });
  }
  else if (target.dataset.cmd === 'options') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.storage.local.get({
  'native': 'com.add0n.node'
}, prefs => {
  runtime.value = prefs.native;
  console.log(prefs);

  start();
});

