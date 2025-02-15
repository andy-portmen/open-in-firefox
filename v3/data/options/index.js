/* global Behave, convert */
'use strict';

const toast = document.getElementById('toast');

new Behave({
  textarea: document.getElementById('custom-validation'),
  replaceTab: true,
  softTabs: true,
  tabSize: 2,
  autoOpen: true,
  overwrite: true,
  autoStrip: true,
  autoIndent: true,
  fence: false
});

function favicon(href) {
  const favicon = document.querySelector('link[rel="icon"]');
  if (href) {
    const type = href.split(';')[0].replace('data:', '');
    favicon.setAttribute('type', type);
    favicon.setAttribute('href', href);
  }
  else {
    favicon.setAttribute('type', 'image/png');
    favicon.setAttribute('href', '/data/icons/32.png');
  }
}

if (navigator.userAgent.includes('Mac') === false && navigator.userAgent.indexOf('Linux') === false) {
  document.querySelector('option[value="org.webextension.bun"]').disabled = true;
}

function restore() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get({
    'enabled': false,
    'altKey': true,
    'shiftKey': true,
    'ctrlKey': false,
    'metaKey': false,
    'button': 0,
    'path': '',
    'args': '',
    'closeme': false,
    'multiple': true,
    'reverse': false,
    'hosts': [],
    'urls': [],
    'keywords': [],
    'faqs': true,
    'topRedict': false,
    'nostop': false,
    'brand-name': 'Firefox',
    'custom-icon': '',
    'show-open-text': true,
    'show-open-current': true,
    'custom-validation': '',
    'native': 'com.add0n.node',
    'urlFilters': []
  }, prefs => {
    document.getElementById('enabled').checked = prefs.enabled;
    document.getElementById('altKey').checked = prefs.altKey;
    document.getElementById('shiftKey').checked = prefs.shiftKey;
    document.getElementById('ctrlKey').checked = prefs.ctrlKey;
    document.getElementById('metaKey').checked = prefs.metaKey;
    document.getElementById('button').selectedIndex = prefs.button;
    document.getElementById('path').value = prefs.path;
    document.getElementById('args').value = prefs.args;
    document.getElementById('closeme').checked = prefs.closeme;
    document.getElementById('multiple').checked = prefs.multiple;
    document.getElementById('reverse').checked = prefs.reverse;
    document.getElementById('hosts').value = prefs.hosts.join(', ');
    document.getElementById('urls').value = prefs.urls.join(', ');
    document.getElementById('keywords').value = prefs.keywords.join(', ');
    document.getElementById('faqs').checked = prefs.faqs;
    document.getElementById('topRedict').checked = prefs.topRedict;
    document.getElementById('nostop').checked = prefs.nostop;
    document.getElementById('brand-name').value = prefs['brand-name'] || 'Firefox';
    favicon(prefs['custom-icon']);
    document.title = 'Open in ' + prefs['brand-name'] + ' :: Options Page';
    document.getElementById('show-open-current').checked = prefs['show-open-current'];
    document.getElementById('show-open-text').checked = prefs['show-open-text'];
    document.getElementById('custom-validation').value = prefs['custom-validation'];
    document.getElementById('native').value = prefs['native'];
    document.getElementById('urlFilters').value = prefs['urlFilters'].join(', ');
  });
}

async function save() {
  const urls = document.getElementById('urls').value;
  const hosts = document.getElementById('hosts').value;
  const tmpUrlFilters = document.getElementById('urlFilters').value
    .split(/\s*,\s*/)
    .filter((h, i, l) => h && l.indexOf(h) === i);
  const urlFilters = [];
  for (const filter of tmpUrlFilters) {
    const regex = convert(filter);
    console.info('Filter', `"${filter}"`, 'Generated Regexp', `"${regex}"`);
    const b = await new Promise(resolve => chrome.declarativeNetRequest.isRegexSupported({
      regex
    }, resolve));
    if (b.isSupported) {
      urlFilters.push(filter);
    }
    else {
      alert('The following regular expression rule is not supported: ' + b.reason +
        '. This rule is removed from the list.\n\nGenerated Regexp: ' + regex + '\nOriginal Expression: ' + filter);
    }
  }
  const max = chrome.declarativeNetRequest.MAX_NUMBER_OF_REGEX_RULES;
  if (urlFilters.length > max) {
    urlFilters.length = max;
    alert('The regular expression rule list was larger than ' + max + '. The list got shorten.');
  }

  chrome.storage.local.set({
    'path': document.getElementById('path').value,
    'args': document.getElementById('args').value,
    'enabled': document.getElementById('enabled').checked,
    'altKey': document.getElementById('altKey').checked,
    'shiftKey': document.getElementById('shiftKey').checked,
    'ctrlKey': document.getElementById('ctrlKey').checked,
    'metaKey': document.getElementById('metaKey').checked,
    'button': document.getElementById('button').selectedIndex,
    'faqs': document.getElementById('faqs').checked,
    'closeme': document.getElementById('closeme').checked,
    'multiple': document.getElementById('multiple').checked,
    'urls': urls.split(/\s*,\s*/)
      .filter((h, i, l) => h && l.indexOf(h) === i),
    'hosts': hosts.split(/\s*,\s*/).map(s => s.replace('http://', '')
      .replace('https://', '')
      .split('/')[0].trim())
      .filter((h, i, l) => h && l.indexOf(h) === i),
    'keywords': document.getElementById('keywords').value.split(/\s*,\s*/).filter(a => a),
    'reverse': document.getElementById('reverse').checked,
    'topRedict': document.getElementById('topRedict').checked,
    'nostop': document.getElementById('nostop').checked,
    'brand-name': document.getElementById('brand-name').value,
    'show-open-text': document.getElementById('show-open-text').checked,
    'show-open-current': document.getElementById('show-open-current').checked,
    'custom-validation': document.getElementById('custom-validation').value,
    'native': document.getElementById('native').value,
    urlFilters
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

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}

document.getElementById('set-icon').addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.accept = 'image/*';
  fileInput.type = 'file';

  fileInput.addEventListener('change', () => {
    const selectedFile = fileInput.files[0];

    if (!selectedFile) {
      return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
      const img = new Image();
      img.src = e.target.result;
      img.onerror = e => alert(e.message);
      img.onload = () => {
        if (img.naturalWidth <= 64 && img.naturalHeight <= 64) {
          chrome.storage.local.set({
            'custom-icon': img.src
          }, () => {
            favicon(img.src);
            toast.textContent = 'Custom icon set.';
            setTimeout(() => toast.textContent = '', 1000);
          });
        }
        else {
          alert('Image dimensions must not exceed 64x64 pixels.');
        }
      };
    };

    reader.readAsDataURL(selectedFile);
  });
  fileInput.click();
});

document.getElementById('reset-icon').addEventListener('click', () => chrome.storage.local.remove('custom-icon', () => {
  toast.textContent = 'Custom icon cleared.';
  favicon('');
  setTimeout(() => toast.textContent = '', 1000);
}));


document.getElementById('urlFiltersPermission').onclick = e => chrome.permissions.request({
  origins: ['http://*/*', 'https://*/*']
}, granted => {
  if (granted) {
    e.target.remove();
    document.getElementById('urlFilters').disabled = false;
  }
});
chrome.permissions.contains({
  origins: ['http://*/*', 'https://*/*']
}, granted => {
  if (granted) {
    document.getElementById('urlFiltersPermission').remove();
    document.getElementById('urlFilters').disabled = false;
  }
});
