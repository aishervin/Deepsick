/**
 * SHΞN Studio runtime for Android.
 * Renders generated HTML panels with a browser-like iframe and a native-backed
 * bridge for storage, HTTP/proxy fetch, service credentials and result handoff.
 */

import { AndroidFetch, AndroidStorage } from "./android-bridge-shim.js";

const STORAGE_KEY = "shen_studio_config";
const STYLE_ID = "bds-studio-runtime-style";
const PROCESSED_ATTR = "data-bds-studio-processed";
const DEFAULT_PROXY_URL = "https://superscrap.shervin003254024.workers.dev/";

const DEFAULT_CONFIG = {
  github: { owner: "", token: "" },
  cloudflare: { accountId: "", token: "", zoneId: "", workerProxyUrl: DEFAULT_PROXY_URL },
  deepseek: { key: "", model: "deepseek-chat" },
  gemini: { key: "", model: "gemini-2.0-flash" },
  openai: { key: "", model: "gpt-4o-mini" },
  anthropic: { key: "", model: "claude-3-5-sonnet-latest" },
  custom: [], workers: [], misc: {},
};

let scanTimer = 0, modalRoot = null, settingsRoot = null;

export function initStudioRuntime() {
  if (typeof window === "undefined" || window.__bdsStudioRuntimeInstalled) return;
  window.__bdsStudioRuntimeInstalled = true;
  installStyles(); installBridge(); installSettingsButton(); scheduleStudioScan();
  new MutationObserver(scheduleStudioScan).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener("bds:urlChanged", scheduleStudioScan);
}

function installBridge() {
  window.StudioBridge = {
    getConfig: () => getStudioConfig(),
    getPublicConfig: () => publicConfig(getStudioConfig()),
    setConfig(config) { setStudioConfig(config); window.dispatchEvent(new CustomEvent("bds:studio-config-changed")); return true; },
    async fetch(payload) { return studioFetch(payload || {}); },
    async proxyFetch(url, options) { return studioProxyFetch(url, options || {}); },
    async github(path, options) { return studioFetch(withAuth(`https://api.github.com${path}`, options || {}, "github")); },
    async cloudflare(path, options) {
      const cfg = getStudioConfig();
      return studioFetch(withAuth(`https://api.cloudflare.com/client/v4${path}`, options || {}, "cloudflare", cfg));
    },
    onResult(payload) { window.dispatchEvent(new CustomEvent("bds:studio-result", { detail: payload })); return true; },
  };
}

async function studioFetch(payload) {
  const cfg = getStudioConfig();
  const direct = await AndroidFetch.send({ type: "bds-fetch-url", ...payload });
  if (direct?.ok) return direct;
  if (cfg.cloudflare?.workerProxyUrl) {
    const proxied = await studioProxyFetch(payload.url, payload.options || {}, direct?.error);
    if (proxied?.ok) return proxied;
  }
  return direct;
}

async function studioProxyFetch(url, options = {}, previousError = "") {
  const proxy = getStudioConfig().cloudflare?.workerProxyUrl || DEFAULT_PROXY_URL;
  if (!proxy || !url) return { ok: false, error: previousError || "No proxy/url configured" };
  const sep = proxy.includes("?") ? "&" : "?";
  const proxyUrl = `${proxy}${sep}url=${encodeURIComponent(String(url))}`;
  return AndroidFetch.send({ type: "bds-fetch-url", url: proxyUrl, options: { method: "GET", ...(options || {}) } });
}

function withAuth(url, options, service, cfg = getStudioConfig()) {
  const token = service === "cloudflare" ? cfg.cloudflare?.token : cfg.github?.token;
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (service === "github") { headers.Accept ||= "application/vnd.github+json"; headers["X-GitHub-Api-Version"] ||= "2022-11-28"; }
  if (service === "cloudflare") headers["Content-Type"] ||= "application/json";
  return { url, options: { ...options, headers } };
}

function getStudioConfig() { const stored = AndroidStorage.get(STORAGE_KEY); return mergeConfig(DEFAULT_CONFIG, stored && typeof stored === "object" ? stored : {}); }
function setStudioConfig(config) { AndroidStorage.set(STORAGE_KEY, mergeConfig(DEFAULT_CONFIG, config || {})); }
function mergeConfig(base, next) { return { ...base, ...next, github:{...base.github,...(next.github||{})}, cloudflare:{...base.cloudflare,...(next.cloudflare||{})}, deepseek:{...base.deepseek,...(next.deepseek||{})}, gemini:{...base.gemini,...(next.gemini||{})}, openai:{...base.openai,...(next.openai||{})}, anthropic:{...base.anthropic,...(next.anthropic||{})}, custom:Array.isArray(next.custom)?next.custom:base.custom, workers:Array.isArray(next.workers)?next.workers:base.workers, misc:next.misc&&typeof next.misc==="object"?next.misc:base.misc }; }
function publicConfig(config) { const clone = JSON.parse(JSON.stringify(config || {})); maskConfig(clone); return clone; }
function maskConfig(obj) { for (const k of Object.keys(obj || {})) { if (obj[k] && typeof obj[k] === "object") maskConfig(obj[k]); if (["token","key","secret","password"].includes(k)) obj[k] = maskSecret(obj[k]); } }
function maskSecret(value) { const s = String(value || ""); return s.length <= 8 ? (s ? "••••" : "") : `${s.slice(0,4)}…${s.slice(-4)}`; }
function scheduleStudioScan() { if (scanTimer) return; scanTimer = setTimeout(() => { scanTimer = 0; scanForPanels(); }, 250); }
function scanForPanels() { for (const node of document.querySelectorAll("div.ds-message, [data-message-author-role='assistant']")) { if (node.getAttribute(PROCESSED_ATTR)==="1" || node.closest("#bds-root")) continue; const html = extractPanelHtml(node); if (!html) continue; node.setAttribute(PROCESSED_ATTR,"1"); injectOpenButton(node, html); } }
function extractPanelHtml(node) { const text = node.textContent || ""; const visualizer = text.match(/<BDS:VISUALIZER>([\s\S]*?)<\/BDS:VISUALIZER>/i); if (visualizer?.[1]) return decodeHtmlEntities(visualizer[1].trim()); const fenced = text.match(/```html-panel\s*([\s\S]*?)```/i); if (fenced?.[1]) return fenced[1].trim(); for (const code of node.querySelectorAll("pre code, code")) { const raw = code.textContent || ""; if (raw.trim().startsWith("<!DOCTYPE html") || raw.trim().startsWith("<html")) return raw.trim(); } return null; }
function decodeHtmlEntities(input) { const t = document.createElement("textarea"); t.innerHTML = input; return t.value; }
function injectOpenButton(messageNode, html) { const host = document.createElement("div"); host.className = "bds-studio-card"; host.innerHTML = `<div class="bds-studio-card-title">☬ SHΞN Studio panel</div><button type="button" class="bds-studio-open">Open Studio</button>`; host.querySelector("button")?.addEventListener("click", () => openPanel(html)); messageNode.appendChild(host); }
function openPanel(rawHtml) { closePanel(); const root = document.createElement("div"); root.className = "bds-studio-modal"; root.innerHTML = `<div class="bds-studio-toolbar"><strong>☬ SHΞN Studio</strong><div><button type="button" class="bds-studio-config">Settings</button><button type="button" class="bds-studio-close">Close</button></div></div><iframe class="bds-studio-frame" allow="clipboard-read; clipboard-write; fullscreen; downloads" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads allow-same-origin"></iframe>`; document.body.appendChild(root); modalRoot = root; root.querySelector(".bds-studio-close")?.addEventListener("click", closePanel); root.querySelector(".bds-studio-config")?.addEventListener("click", openSettings); root.querySelector("iframe").srcdoc = buildPanelDocument(rawHtml); }
function closePanel() { modalRoot?.remove(); modalRoot = null; }

function buildPanelDocument(html) {
  const prelude = `<script>(function(){var realFetch=window.fetch.bind(window);window.STUDIO_CONFIG=window.parent.StudioBridge.getConfig();window.STUDIO_PUBLIC_CONFIG=window.parent.StudioBridge.getPublicConfig();window.StudioBridge={getConfig:function(){return window.parent.StudioBridge.getConfig()},getPublicConfig:function(){return window.parent.StudioBridge.getPublicConfig()},fetch:function(p){return window.parent.StudioBridge.fetch(p)},proxyFetch:function(u,o){return window.parent.StudioBridge.proxyFetch(u,o)},github:function(p,o){return window.parent.StudioBridge.github(p,o)},cloudflare:function(p,o){return window.parent.StudioBridge.cloudflare(p,o)},onResult:function(p){return window.parent.StudioBridge.onResult(p)}};window.fetch=function(url,options){var href=String(url||'');if(/^https:\/\//i.test(href)){return window.parent.StudioBridge.fetch({url:href,options:options||{}}).then(function(res){var body=res&&(res.html||res.body||res.error||'');return new Response(body,{status:res&&res.status||(res&&res.ok?200:500),headers:{'Content-Type':'text/plain; charset=utf-8'}})})}return realFetch(url,options)}})();<\/script>`;
  let safeHtml = stripKnownInlineSecrets(String(html || ""));
  safeHtml = safeHtml.replace(/<script/i, `${prelude}<script`);
  if (!safeHtml.includes(prelude)) safeHtml += prelude;
  return safeHtml;
}
function stripKnownInlineSecrets(html) { return html.replace(/github_pat_[A-Za-z0-9_]+/g, "").replace(/ghp_[A-Za-z0-9_]+/g, "").replace(/sk-[A-Za-z0-9_-]{16,}/g, "").replace(/AQ\.[A-Za-z0-9_-]{16,}/g, ""); }
function installSettingsButton() { const b=document.createElement("button"); b.type="button"; b.className="bds-studio-fab"; b.textContent="☬"; b.title="SHΞN Studio settings"; b.addEventListener("click", openSettings); document.documentElement.appendChild(b); }
function openSettings() { closeSettings(); const cfg=getStudioConfig(); const root=document.createElement("div"); root.className="bds-studio-settings"; root.innerHTML=`<div class="bds-studio-settings-panel"><div class="bds-studio-settings-head"><strong>☬ Studio Services</strong><button type="button" data-close>×</button></div><label>GitHub owner<input data-k="github.owner" value="${esc(cfg.github.owner)}"></label><label>GitHub token<input data-k="github.token" type="password" value="${esc(cfg.github.token)}"></label><label>Cloudflare account ID<input data-k="cloudflare.accountId" value="${esc(cfg.cloudflare.accountId)}"></label><label>Cloudflare zone ID<input data-k="cloudflare.zoneId" value="${esc(cfg.cloudflare.zoneId)}"></label><label>Cloudflare API token<input data-k="cloudflare.token" type="password" value="${esc(cfg.cloudflare.token)}"></label><label>Worker proxy URL<input data-k="cloudflare.workerProxyUrl" value="${esc(cfg.cloudflare.workerProxyUrl)}"></label><label>DeepSeek key<input data-k="deepseek.key" type="password" value="${esc(cfg.deepseek.key)}"></label><label>DeepSeek model<input data-k="deepseek.model" value="${esc(cfg.deepseek.model)}"></label><label>Gemini key<input data-k="gemini.key" type="password" value="${esc(cfg.gemini.key)}"></label><label>Gemini model<input data-k="gemini.model" value="${esc(cfg.gemini.model)}"></label><p>Panels run in a browser-like iframe. HTTPS fetch is routed through Android native fetch and automatically falls back to the Worker proxy to avoid CORS blocks.</p><div class="bds-studio-settings-actions"><button type="button" data-save>Save</button></div></div>`; document.body.appendChild(root); settingsRoot=root; root.querySelector("[data-close]")?.addEventListener("click",closeSettings); root.querySelector("[data-save]")?.addEventListener("click",()=>{const next=getStudioConfig(); for(const input of root.querySelectorAll("input[data-k]")) setDeep(next,input.dataset.k,input.value); setStudioConfig(next); closeSettings();}); }
function closeSettings(){settingsRoot?.remove(); settingsRoot=null;}
function setDeep(obj,path,value){const parts=String(path).split(".");let cur=obj;while(parts.length>1){const p=parts.shift();cur[p]||={};cur=cur[p];}cur[parts[0]]=value;}
function esc(value){return String(value||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function installStyles(){if(document.getElementById(STYLE_ID))return;const style=document.createElement("style");style.id=STYLE_ID;style.textContent=`.bds-studio-fab{position:fixed;right:18px;bottom:86px;z-index:2147483000;width:44px;height:44px;border-radius:50%;border:1px solid rgba(77,107,254,.35);background:#0f0f0f;color:#8fa3ff;font-size:20px;box-shadow:0 10px 30px rgba(0,0,0,.35)}.bds-studio-card{margin:12px 0;padding:12px;border:1px solid rgba(77,107,254,.25);border-radius:12px;background:rgba(15,15,15,.88);color:#d0d0d0;display:flex;gap:12px;align-items:center;justify-content:space-between}.bds-studio-open,.bds-studio-card button{border:0;border-radius:9px;padding:8px 12px;background:#4d6bfe;color:white}.bds-studio-card-title{font-weight:700;color:#8fa3ff}.bds-studio-modal{position:fixed;inset:0;z-index:2147483200;background:#050505;display:flex;flex-direction:column}.bds-studio-toolbar{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:#111;color:#ddd;border-bottom:1px solid #222}.bds-studio-toolbar button{margin-left:8px;border:1px solid #333;border-radius:8px;background:#181818;color:#eee;padding:7px 10px}.bds-studio-frame{flex:1;border:0;width:100%;background:#0a0a0a}.bds-studio-settings{position:fixed;inset:0;z-index:2147483300;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:18px}.bds-studio-settings-panel{width:min(560px,100%);max-height:90vh;overflow:auto;background:#101014;color:#eee;border:1px solid #2a2a35;border-radius:16px;padding:16px;box-shadow:0 20px 70px rgba(0,0,0,.55)}.bds-studio-settings-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.bds-studio-settings label{display:block;margin:10px 0;color:#aaa;font-size:12px}.bds-studio-settings input{width:100%;margin-top:5px;background:#08080a;color:#fff;border:1px solid #30303a;border-radius:8px;padding:10px}.bds-studio-settings p{color:#777;font-size:12px;line-height:1.6}.bds-studio-settings button{border:0;border-radius:9px;background:#4d6bfe;color:white;padding:8px 12px}.bds-studio-settings-head button{background:#222}.bds-studio-settings-actions{text-align:right;margin-top:12px}`;document.documentElement.appendChild(style);}
