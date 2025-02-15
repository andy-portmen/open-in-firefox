{
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

  const block = e => {
    // run user-script
    const script = document.createElement('script');
    script.textContent = port.dataset.script;
    script.evt = e;
    document.documentElement.append(script);
    script.remove();
    // get data
    if (script.dataset.block === 'true') {
      port.dispatchEvent(new CustomEvent('open', {
        detail: {
          url: script.dataset.url,
          close: script.dataset.close === 'true'
        }
      }));
    }
  };

  port.addEventListener('update', () => {
    document.removeEventListener('click', block, true);
    if (port.dataset.script) {
      document.addEventListener('click', block, true);
    }
  });
}
