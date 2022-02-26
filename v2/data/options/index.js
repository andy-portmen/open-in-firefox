'use strict';

const toast = document.getElementById('toast');

function restore() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get({
    enabled: false,
    altKey: true,
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    button: 0,
    path: '',
    closeme: false,
    multiple: true,
    reverse: false,
    hosts: [],
    urls: [],
    keywords: [],
    faqs: true,
    topRedict: false,
    nostop: false
  }, prefs => {
    document.getElementById('enabled').checked = prefs.enabled;
    document.getElementById('altKey').checked = prefs.altKey;
    document.getElementById('shiftKey').checked = prefs.shiftKey;
    document.getElementById('ctrlKey').checked = prefs.ctrlKey;
    document.getElementById('metaKey').checked = prefs.metaKey;
    document.getElementById('button').selectedIndex = prefs.button;
    document.getElementById('path').value = prefs.path;
    document.getElementById('closeme').checked = prefs.closeme;
    document.getElementById('multiple').checked = prefs.multiple;
    document.getElementById('reverse').checked = prefs.reverse;
    document.getElementById('hosts').value = prefs.hosts.join(', ');
    document.getElementById('urls').value = prefs.urls.join(', ');
    document.getElementById('keywords').value = prefs.keywords.join(', ');
    document.getElementById('faqs').checked = prefs.faqs;
    document.getElementById('topRedict').checked = prefs.topRedict;
    document.getElementById('nostop').checked = prefs.nostop;
  });
}

function save() {
  const urls = document.getElementById('urls').value;
  const hosts = document.getElementById('hosts').value;

  chrome.storage.local.set({
    path: document.getElementById('path').value,
    enabled: document.getElementById('enabled').checked,
    altKey: document.getElementById('altKey').checked,
    shiftKey: document.getElementById('shiftKey').checked,
    ctrlKey: document.getElementById('ctrlKey').checked,
    metaKey: document.getElementById('metaKey').checked,
    button: document.getElementById('button').selectedIndex,
    faqs: document.getElementById('faqs').checked,
    closeme: document.getElementById('closeme').checked,
    multiple: document.getElementById('multiple').checked,
    urls: urls.split(/\s*,\s*/).filter(s => s.startsWith('http') || s.startsWith('file'))
      .filter((h, i, l) => h && l.indexOf(h) === i),
    hosts: hosts.split(/\s*,\s*/).map(s => s.replace('http://', '')
      .replace('https://', '')
      .split('/')[0].trim())
      .filter((h, i, l) => h && l.indexOf(h) === i),
    keywords: document.getElementById('keywords').value.split(/\s*,\s*/).filter(a => a),
    reverse: document.getElementById('reverse').checked,
    topRedict: document.getElementById('topRedict').checked,
    nostop: document.getElementById('nostop').checked
  }, () => {
    restore();
    toast.textContent = 'Options saved.';
    setTimeout(() => toast.textContent = '', 1000);
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '&rd=donate'
}));

document.getElementById('save').addEventListener('click', save);
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    setTimeout(() => toast.textContent = '', 1000);
    toast.textContent = 'Double-click to reset!';
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});

document.getElementById('preview').onclick = () => chrome.tabs.create({
  url: 'https://www.youtube.com/watch?v=W6hSo5Sx5tk'
});
document.getElementById('yw').onclick = () => chrome.tabs.create({
  url: 'https://www.youtube.com/watch?v=yZAoy8SOd7o'
});
document.getElementById('ym').onclick = () => chrome.tabs.create({
  url: 'https://www.youtube.com/watch?v=2asPoW2gJ-c'
});
