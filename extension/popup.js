const enabledToggle = document.getElementById("enabledToggle");
const alarmToggle = document.getElementById("alarmToggle");
const instantToggle = document.getElementById("instantToggle");

chrome.storage.sync.get(
  ["enabled", "alarmEnabled", "instantRedirect"],
  ({ enabled = true, alarmEnabled = true, instantRedirect = false }) => {
    enabledToggle.checked = enabled;
    alarmToggle.checked = alarmEnabled;
    instantToggle.checked = instantRedirect;
  }
);

enabledToggle.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: enabledToggle.checked });
});

alarmToggle.addEventListener("change", () => {
  chrome.storage.sync.set({ alarmEnabled: alarmToggle.checked });
});

instantToggle.addEventListener("change", () => {
  chrome.storage.sync.set({ instantRedirect: instantToggle.checked });
});

document.getElementById("settingsLink").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
