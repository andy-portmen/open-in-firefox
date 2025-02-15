const args = new URLSearchParams(location.search);

const url = args.get('url');
chrome.runtime.sendMessage({
  cmd: 'open-in',
  url
}, () => {
  chrome.runtime.lastError;
  window.close();
});
