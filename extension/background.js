const DEFAULT_WHITELIST = [
  "google.com",
  "googleapis.com",
  "accounts.google.com",
  "claude.ai",
  "anthropic.com",
  "gemini.google.com",
  "notebooklm.google.com",
  "chatgpt.com",
  "openai.com",
  "auth0.com",
];

const DEFAULT_REDIRECT = "https://tcd.blackboard.com/ultra/institution-page";

async function getSettings() {
  const data = await chrome.storage.sync.get(["whitelist", "redirectUrl", "enabled", "instantRedirect"]);
  return {
    whitelist: data.whitelist ?? DEFAULT_WHITELIST,
    redirectUrl: data.redirectUrl ?? DEFAULT_REDIRECT,
    enabled: data.enabled ?? true,
    instantRedirect: data.instantRedirect ?? false,
  };
}

function isAllowed(url, whitelist, redirectUrl) {
  try {
    const { hostname, protocol } = new URL(url);
    if (["chrome:", "chrome-extension:", "about:", "data:", "file:"].includes(protocol)) return true;
    // Always allow the redirect destination to avoid redirect loops
    const redirectHost = new URL(redirectUrl).hostname.toLowerCase().replace(/^www\./, "");
    const host = hostname.toLowerCase().replace(/^www\./, "");
    if (host === redirectHost || host.endsWith("." + redirectHost)) return true;
    // Always allow the blocked interstitial page
    if (url.startsWith(chrome.runtime.getURL(""))) return true;
    return whitelist.some((entry) => {
      const domain = entry.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
      return host === domain || host.endsWith("." + domain);
    });
  } catch {
    return true;
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "loading" || !tab.url) return;

  const { whitelist, redirectUrl, enabled, instantRedirect } = await getSettings();
  if (!enabled) return;

  if (!isAllowed(tab.url, whitelist, redirectUrl)) {
    const target = instantRedirect
      ? redirectUrl
      : chrome.runtime.getURL("blocked.html") +
        "?redirect=" + encodeURIComponent(redirectUrl) +
        "&site=" + encodeURIComponent(tab.url);
    chrome.tabs.update(tabId, { url: target });
  }
});
