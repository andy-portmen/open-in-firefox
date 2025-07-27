const args = new URLSearchParams(location.search);

// if URL includes "?", args.get does not return correctly.
// example: https://zzz.io/yyy?xxx=1111&nnn=2222
const url = location.href.split('?url=')[1] || args.get('url');

chrome.runtime.sendMessage({
  cmd: 'open-in',
  url
}, () => {
  chrome.runtime.lastError;
  window.close();
});
