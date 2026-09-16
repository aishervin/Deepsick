/**
 * SHΞN Studio runtime for Android.
 *
 * The model can emit pure HTML panels in either:
 *   <BDS:VISUALIZER>...</BDS:VISUALIZER>
 * or fenced ```html-panel blocks.
 *
 * This runtime finds those blocks in assistant messages, adds an Open Studio
 * button, renders the generated HTML inside an iframe, and exposes a tiny
 * parent-side StudioBridge so dynamic panels can use stored service config
 * without hardcoding secrets into the app.
 */

import { AndroidFetch, AndroidStorage } from "./android-bridge-shim.js";

const STORAGE_KEY = "shen_studio_config";
const STYLE_ID = "bds-studio-runtime-style";
const PROCESSED_ATTR = "data-bds-studio-processed";

const DEFAULT_CONFIG = {
  github: { owner: "", token: "" },
  deepseek: { key: "", model: "deepseek-chat" },
  gemini: { key: "", model: "gemini-2.0-flash" },
  openai: { key: "", model: "gpt-4o-mini" },
  anthropic: { key: "", model: "claude-3-5-sonnet-latest" },
  custom: [],
  workers: [],
  misc: {},
};

let scanTimer = 0;
let modalRoot = null;
let settingsRoot = null;

export function initStudioRuntime() {
  if (typeof window === "undefined" || window.__bdsStudioRuntimeInstalled) return;
  window.__bdsStudioRuntimeInstalled = true;
  installStyles();
  installBridge();
  installSettingsButton();
  scheduleStudioScan();

  const observer = new MutationObserver(scheduleStudioScan);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener("bds:urlChanged", scheduleStudioScan);
}

function installBridge() {
  window.StudioBridge = {
    getConfig() {
      return getStudioConfig();
    },
    getPublicConfig() {
      return publicConfig(getStudioConfig());
    },
    setConfig(config) {
      setStudioConfig(config);
      window.dispatchEvent(new CustomEvent("bds:studio-config-changed"));
      return true;
    },
    async fetch(payload) {
      return AndroidFetch.send({ type: "bds-fetch-url", ...(payload || {}) });
    },
    onResult(payload) {
      window.dispatchEvent(new CustomEvent("bds:studio-result", { detail: payload }));
      return true;
    },
  };
}

function getStudioConfig() {
  const stored = AndroidStorage.get(STORAGE_KEY);
  if (!stored || typeof stored !== "object") return structuredClone(DEFAULT_CONFIG);
  return mergeConfig(DEFAULT_CONFIG, stored);
}

function setStudioConfig(config) {
  AndroidStorage.set(STORAGE_KEY, mergeConfig(DEFAULT_CONFIG, config || {}));
}

function mergeConfig(base, next) {
  return {
    ...base,
    ...next,
    github: { ...base.github, ...(next.github || {}) },
    deepseek: { ...base.deepseek, ...(next.deepseek || {}) },
    gemini: { ...base.gemini, ...(next.gemini || {}) },
    openai: { ...base.openai, ...(next.openai || {}) },
    anthropic: { ...base.anthropic, ...(next.anthropic || {}) },
    custom: Array.isArray(next.custom) ? next.custom : base.custom,
    workers: Array.isArray(next.workers) ? next.workers : base.workers,
    misc: next.misc && typeof next.misc === "object" ? next.misc : base.misc,
  };
}

function publicConfig(config) {
  const clone = JSON.parse(JSON.stringify(config || {}));
  for (const service of ["github", "deepseek", "gemini", "openai", "anthropic"]) {
    if (clone[service]?.token) clone[service].token = maskSecret(clone[service].token);
    if (clone[service]?.key) clone[service].key = maskSecret(clone[service].key);
  }
  for (const listName of ["custom", "workers"]) {
    if (!Array.isArray(clone[listName])) continue;
    clone[listName] = clone[listName].map((item) => {
      const copy = { ...(item || {}) };
      if (copy.token) copy.token = maskSecret(copy.token);
      if (copy.key) copy.key = maskSecret(copy.key);
      if (copy.secret) copy.secret = maskSecret(copy.secret);
      return copy;
    });
  }
  return clone;
}

function maskSecret(value) {
  const s = String(value || "");
  if (s.length <= 8) return s ? "••••" : "";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function scheduleStudioScan() {
  if (scanTimer) return;
  scanTimer = window.setTimeout(() => {
    scanTimer = 0;
    scanForPanels();
  }, 250);
}

function scanForPanels() {
  const candidates = Array.from(document.querySelectorAll("div.ds-message, [data-message-author-role='assistant']"));
  for (const node of candidates) {
    if (node.getAttribute(PROCESSED_ATTR) === "1" || node.closest("#bds-root")) continue;
    const html = extractPanelHtml(node);
    if (!html) continue;
    node.setAttribute(PROCESSED_ATTR, "1");
    injectOpenButton(node, html);
  }
}

function extractPanelHtml(node) {
  const text = node.textContent || "";
  const visualizer = text.match(/<BDS:VISUALIZER>([\s\S]*?)<\/BDS:VISUALIZER>/i);
  if (visualizer?.[1]) return decodeHtmlEntities(visualizer[1].trim());

  const codeBlocks = Array.from(node.querySelectorAll("pre code, code"));
  for (const code of codeBlocks) {
    const raw = code.textContent || "";
    if (raw.trim().startsWith("<!DOCTYPE html") || raw.trim().startsWith("<html")) {
      const lang = Array.from(code.classList || []).join(" ").toLowerCase();
      const prev = code.parentElement?.textContent || "";
      if (lang.includes("html-panel") || prev.includes("html-panel")) return raw.trim();
    }
  }

  const fenced = text.match(/```html-panel\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return null;
}

function decodeHtmlEntities(input) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = input;
  return textarea.value;
}

function injectOpenButton(messageNode, html) {
  const host = document.createElement("div");
  host.className = "bds-studio-card";
  host.innerHTML = `
    <div class="bds-studio-card-title">☬ SHΞN Studio panel</div>
    <button type="button" class="bds-studio-open">Open Studio</button>
  `;
  host.querySelector("button")?.addEventListener("click", () => openPanel(html));
  messageNode.appendChild(host);
}

function openPanel(rawHtml) {
  closePanel();
  const root = document.createElement("div");
  root.className = "bds-studio-modal";
  root.innerHTML = `
    <div class="bds-studio-toolbar">
      <strong>☬ SHΞN Studio</strong>
      <div>
        <button type="button" class="bds-studio-config">Settings</button>
        <button type="button" class="bds-studio-close">Close</button>
      </div>
    </div>
    <iframe class="bds-studio-frame" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads allow-same-origin"></iframe>
  `;
  document.body.appendChild(root);
  modalRoot = root;
  root.querySelector(".bds-studio-close")?.addEventListener("click", closePanel);
  root.querySelector(".bds-studio-config")?.addEventListener("click", openSettings);
  const frame = root.querySelector("iframe");
  frame.srcdoc = buildPanelDocument(rawHtml);
}

function closePanel() {
  modalRoot?.remove();
  modalRoot = null;
}

function buildPanelDocument(html) {
  const prelude = `
<script>
(function(){
  var realFetch = window.fetch.bind(window);
  window.STUDIO_CONFIG = window.parent.StudioBridge.getConfig();
  window.STUDIO_PUBLIC_CONFIG = window.parent.StudioBridge.getPublicConfig();
  window.StudioBridge = {
    getConfig: function(){ return window.parent.StudioBridge.getConfig(); },
    getPublicConfig: function(){ return window.parent.StudioBridge.getPublicConfig(); },
    onResult: function(payload){ return window.parent.StudioBridge.onResult(payload); }
  };
  window.fetch = function(url, options){
    var href = String(url || '');
    if (/^https:\/\//i.test(href)) {
      return window.parent.StudioBridge.fetch({ url: href, options: options || {} }).then(function(res){
        var body = res && (res.html || res.body || res.error || '');
        return new Response(body, { status: res && res.status || (res && res.ok ? 200 : 500) });
      });
    }
    return realFetch(url, options);
  };
})();
<\/script>`;

  let safeHtml = stripKnownInlineSecrets(html);
  safeHtml = safeHtml.replace(/<script/i, `${prelude}<script`);
  if (safeHtml === html) safeHtml += prelude;
  return safeHtml;
}

function stripKnownInlineSecrets(html) {
  return String(html)
    .replace(/github_pat_[A-Za-z0-9_]+/g, "")
    .replace(/ghp_[A-Za-z0-9_]+/g, "")
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "")
    .replace(/AQ\.[A-Za-z0-9_-]{16,}/g, "");
}

function installSettingsButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "bds-studio-fab";
  button.textContent = "☬";
  button.title = "SHΞN Studio settings";
  button.addEventListener("click", openSettings);
  document.documentElement.appendChild(button);
}

function openSettings() {
  closeSettings();
  const cfg = getStudioConfig();
  const root = document.createElement("div");
  root.className = "bds-studio-settings";
  root.innerHTML = `
    <div class="bds-studio-settings-panel">
      <div class="bds-studio-settings-head"><strong>☬ Studio Settings</strong><button type="button" data-close>×</button></div>
      <label>GitHub owner<input data-k="github.owner" value="${esc(cfg.github.owner)}"></label>
      <label>GitHub token<input data-k="github.token" type="password" value="${esc(cfg.github.token)}"></label>
      <label>DeepSeek key<input data-k="deepseek.key" type="password" value="${esc(cfg.deepseek.key)}"></label>
      <label>DeepSeek model<input data-k="deepseek.model" value="${esc(cfg.deepseek.model)}"></label>
      <label>Gemini key<input data-k="gemini.key" type="password" value="${esc(cfg.gemini.key)}"></label>
      <label>Gemini model<input data-k="gemini.model" value="${esc(cfg.gemini.model)}"></label>
      <p>Secrets are stored in Android SharedPreferences and only passed to Studio panels at runtime.</p>
      <div class="bds-studio-settings-actions"><button type="button" data-save>Save</button></div>
    </div>
  `;
  document.body.appendChild(root);
  settingsRoot = root;
  root.querySelector("[data-close]")?.addEventListener("click", closeSettings);
  root.querySelector("[data-save]")?.addEventListener("click", () => {
    const next = getStudioConfig();
    for (const input of root.querySelectorAll("input[data-k]")) {
      setDeep(next, input.dataset.k, input.value);
    }
    setStudioConfig(next);
    closeSettings();
  });
}

function closeSettings() {
  settingsRoot?.remove();
  settingsRoot = null;
}

function setDeep(obj, path, value) {
  const parts = String(path).split(".");
  let cur = obj;
  while (parts.length > 1) {
    const p = parts.shift();
    cur[p] ||= {};
    cur = cur[p];
  }
  cur[parts[0]] = value;
}

function esc(value) {
  return String(value || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .bds-studio-fab{position:fixed;right:18px;bottom:86px;z-index:2147483000;width:44px;height:44px;border-radius:50%;border:1px solid rgba(77,107,254,.35);background:#0f0f0f;color:#8fa3ff;font-size:20px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
    .bds-studio-card{margin:12px 0;padding:12px;border:1px solid rgba(77,107,254,.25);border-radius:12px;background:rgba(15,15,15,.88);color:#d0d0d0;display:flex;gap:12px;align-items:center;justify-content:space-between}.bds-studio-open,.bds-studio-card button{border:0;border-radius:9px;padding:8px 12px;background:#4d6bfe;color:white}.bds-studio-card-title{font-weight:700;color:#8fa3ff}
    .bds-studio-modal{position:fixed;inset:0;z-index:2147483200;background:#050505;display:flex;flex-direction:column}.bds-studio-toolbar{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:#111;color:#ddd;border-bottom:1px solid #222}.bds-studio-toolbar button{margin-left:8px;border:1px solid #333;border-radius:8px;background:#181818;color:#eee;padding:7px 10px}.bds-studio-frame{flex:1;border:0;width:100%;background:#0a0a0a}
    .bds-studio-settings{position:fixed;inset:0;z-index:2147483300;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:18px}.bds-studio-settings-panel{width:min(520px,100%);background:#101014;color:#eee;border:1px solid #2a2a35;border-radius:16px;padding:16px;box-shadow:0 20px 70px rgba(0,0,0,.55)}.bds-studio-settings-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.bds-studio-settings label{display:block;margin:10px 0;color:#aaa;font-size:12px}.bds-studio-settings input{width:100%;margin-top:5px;background:#08080a;color:#fff;border:1px solid #30303a;border-radius:8px;padding:10px}.bds-studio-settings p{color:#777;font-size:12px;line-height:1.6}.bds-studio-settings button{border:0;border-radius:9px;background:#4d6bfe;color:white;padding:8px 12px}.bds-studio-settings-head button{background:#222}.bds-studio-settings-actions{text-align:right;margin-top:12px}
  `;
  document.documentElement.appendChild(style);
}
