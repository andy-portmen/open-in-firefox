/* global convert */

{
  const build = () => chrome.storage.local.get({
    urlFilters: [],
    urlFiltersMainFrame: true,
    urlFiltersSubFrame: false
  }, async prefs => {
    const resourceTypes = [];
    if (prefs.urlFiltersMainFrame) {
      resourceTypes.push('main_frame');
    }
    if (prefs.urlFiltersSubFrame) {
      resourceTypes.push('sub_frame');
    }
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = rules.map(r => r.id);

    const addRules = prefs.urlFilters.map((filter, n) => ({
      id: n + 1,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: chrome.runtime.getURL('/data/redirect/index.html') + '?url=\\0'
        }
      },
      condition: {
        regexFilter: convert(filter),
        resourceTypes,
        isUrlFilterCaseSensitive: false
      }
    }));

    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
  });

  chrome.runtime.onStartup.addListener(build);
  chrome.runtime.onInstalled.addListener(build);
  chrome.storage.onChanged.addListener(ps => ps.urlFilters && build());
}
