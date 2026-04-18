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

let whitelist = [];

async function load() {
  const data = await chrome.storage.sync.get(["whitelist", "redirectUrl"]);
  whitelist = data.whitelist ?? [...DEFAULT_WHITELIST];
  document.getElementById("redirectInput").value = data.redirectUrl ?? DEFAULT_REDIRECT;
  renderList();
}

function renderList() {
  const ul = document.getElementById("siteList");
  ul.innerHTML = "";
  if (whitelist.length === 0) {
    ul.innerHTML = '<li class="empty">No sites allowed</li>';
    return;
  }
  whitelist.forEach((site, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="dot"></span><span>${site}</span><button class="remove" data-i="${i}">✕</button>`;
    ul.appendChild(li);
  });
}

function showToast(msg = "Saved") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

document.getElementById("saveRedirect").addEventListener("click", async () => {
  const val = document.getElementById("redirectInput").value.trim();
  if (!val) return;
  await chrome.storage.sync.set({ redirectUrl: val });
  showToast("Redirect saved");
});

document.getElementById("addBtn").addEventListener("click", addSite);
document.getElementById("siteInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSite();
});

async function addSite() {
  const raw = document.getElementById("siteInput").value
    .trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  if (!raw || whitelist.includes(raw)) return;
  whitelist.push(raw);
  await chrome.storage.sync.set({ whitelist });
  document.getElementById("siteInput").value = "";
  renderList();
  showToast("Site added");
}

document.getElementById("siteList").addEventListener("click", async (e) => {
  const btn = e.target.closest("button.remove");
  if (!btn) return;
  whitelist.splice(parseInt(btn.dataset.i, 10), 1);
  await chrome.storage.sync.set({ whitelist });
  renderList();
  showToast("Site removed");
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  whitelist = [...DEFAULT_WHITELIST];
  await chrome.storage.sync.set({
    whitelist,
    redirectUrl: DEFAULT_REDIRECT,
  });
  document.getElementById("redirectInput").value = DEFAULT_REDIRECT;
  renderList();
  showToast("Reset to defaults");
});

load();
