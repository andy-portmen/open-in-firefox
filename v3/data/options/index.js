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

// comma-separated textareas: single logical line, wrapped visually
for (const ta of document.querySelectorAll('#hosts, #urls, #keywords, #urlFilters')) {
  // Enter inserts a comma instead of a newline
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ta.setRangeText(', ', ta.selectionStart, ta.selectionEnd, 'end');
    }
  });
  // pasted/inserted newlines become commas instead of breaking the list
  ta.addEventListener('input', () => {
    if (ta.value.includes('\n')) {
      const pos = ta.selectionStart;
      ta.value = ta.value.replace(/\r?\n+/g, ',');
      ta.setSelectionRange(pos, pos);
    }
  });
}

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
    'urls': urls.split(/\s*[,\n]\s*/)
      .filter((h, i, l) => h && l.indexOf(h) === i),
    'hosts': hosts.split(/\s*[,\n]\s*/).map(s => s.replace('http://', '')
      .replace('https://', '')
      .split('/')[0].trim())
      .filter((h, i, l) => h && l.indexOf(h) === i),
    'keywords': document.getElementById('keywords').value.split(/\s*[,\n]\s*/).filter(a => a),
    'reverse': document.getElementById('reverse').checked,
    'topRedict': document.getElementById('topRedict').checked,
    'nostop': document.getElementById('nostop').checked,
    'brand-name': document.getElementById('brand-name').value,
    'show-open-text': document.getElementById('show-open-text').checked,
    'show-open-current': document.getElementById('show-open-current').checked,
    'custom-validation': document.getElementById('custom-validation').value,
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

// Shortcut capture: reflect the active tab OS hints and test the combination
const clientOS = (() => {
  if (/Mac/.test(navigator.userAgent)) {
    return 'mac';
  }
  if (/Windows/.test(navigator.userAgent)) {
    return 'windows';
  }
  return 'linux';
})();
document.body.dataset.client = clientOS;

{
  const area = document.getElementById('capture-area');
  const result = document.getElementById('capture-result');
  const BUTTONS = ['Left Click', 'Middle Click (wheel)', 'Right Click'];
  const META = clientOS === 'mac' ? '⌘ Cmd (Meta)' : clientOS === 'windows' ? 'Win ⊞ (Meta)' : 'Meta';
  // show the OS-native name of the Meta key in the combination selector
  const metaLabel = document.getElementById('metaKey').closest('label');
  metaLabel.firstChild.textContent = META + ' ';
  const MODIFIERS = [
    ['metaKey', META],
    ['ctrlKey', 'Ctrl'],
    ['altKey', 'Alt'],
    ['shiftKey', 'Shift']
  ];

  function warnings(e) {
    const msgs = [];
    if (clientOS === 'mac') {
      if (e.type === 'contextmenu') {
        msgs.push('⚠ Ctrl + Click on macOS is delivered by the browser as a right-click — it cannot be captured as a click combination. Use Alt instead.');
      }
      else if (e.ctrlKey) {
        msgs.push('⚠ On macOS the browser may deliver this Ctrl + Click as a right-click. Use Alt instead.');
      }
      if (e.metaKey) {
        msgs.push('⚠ Meta on macOS is the ⌘ Cmd key — Cmd + Click is intercepted by the browser (opens a new tab) and may never reach the page.');
      }
    }
    else if (clientOS === 'windows' && e.metaKey) {
      msgs.push('⚠ The Meta key on Windows is the Windows (⊞) key, which is usually intercepted by the operating system.');
    }
    else if (clientOS === 'linux' && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      msgs.push('⚠ On Linux desktops (GNOME, KDE, …) a plain Alt + Click is used to drag windows. Add another modifier such as Shift.');
    }
    if (e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      msgs.push('⚠ Shift + Click alone also opens a new window in Chrome.');
    }
    return msgs;
  }

  function describe(e) {
    const btn = BUTTONS[e.button] || 'Button ' + e.button;
    const mods = MODIFIERS.filter(([key]) => e[key]).map(([, label]) => label);
    return btn + (mods.length ? ' + ' + mods.join(' + ') : ' (no modifiers)');
  }

  function onDown(e) {
    e.preventDefault();
    const received = describe(e);
    const enabled = document.getElementById('enabled').checked;
    const configButton = Number(document.getElementById('button').value);
    const configMods = {
      altKey: document.getElementById('altKey').checked,
      ctrlKey: document.getElementById('ctrlKey').checked,
      metaKey: document.getElementById('metaKey').checked,
      shiftKey: document.getElementById('shiftKey').checked
    };
    const matches = enabled && e.button === configButton &&
      MODIFIERS.every(([key]) => configMods[key] === e[key]);

    area.dataset.captured = true;
    let html = '<div>Received: <code>' + received + '</code></div>';
    if (matches) {
      result.dataset.type = 'match';
      html += '<div>✓ This combination was received by the browser and matches the configured combination.</div>';
    }
    else {
      result.dataset.type = 'mismatch';
      html += '<div>' + (enabled ? 'This does not match the configured combination above. Click and hold the combo you intend to use.</div>' : 'The combination is not enabled. Check "Enabled" above.</div>');
    }
    const msgs = warnings(e);
    if (msgs.length) {
      html += msgs.map(m => '<div data-kind="warn">' + m + '</div>').join('');
    }
    result.innerHTML = html;
    if (msgs.length) {
      result.dataset.type = msgs.length === 1 ? 'warning' : 'mismatch';
    }
  }

  area.addEventListener('mousedown', onDown);
  area.addEventListener('contextmenu', onDown);
  area.addEventListener('click', e => e.preventDefault());
}

// reflect the active tab in the URL hash so refresh (and links) restore it
const tabHashes = {
  tab1: 'rules',
  tab2: 'shortcuts',
  tab3: 'executable',
  tab4: 'native-client',
  tab5: 'settings'
};
const tabIds = Object.fromEntries(Object.entries(tabHashes).map(([id, hash]) => [hash, id]));

function selectTab(id) {
  const radio = document.getElementById(id);
  if (radio) {
    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
  }
}

function tabFromHash() {
  const id = tabIds[location.hash.slice(1)];
  if (id) {
    document.getElementById(id).checked = true;
  }
}

for (const radio of document.querySelectorAll('.tab-radio')) {
  radio.addEventListener('change', () => history.replaceState(null, '', '#' + tabHashes[radio.id]));
}

window.addEventListener('hashchange', tabFromHash);
tabFromHash();
