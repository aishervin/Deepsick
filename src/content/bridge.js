/**
 * Bridge between content script (ISOLATED world) and injected script (MAIN world).
 */

import state from "./state.js";
import { BRIDGE_EVENTS, DEFAULT_SYSTEM_PROMPT } from "../lib/constants.js";
import { getActiveProject, getActiveFiles, getFilesForProject } from "./project-manager.js";
import { getDirectoryFiles } from "../lib/local-directory-source.js";
import { getDeepCodeFiles, buildDeepCodeFileTree } from "./deep-code.js";

let _bridgeCleanup = null;
let _bridgeGen = 0;
let MAX_CHAT_SESSIONS = 500;

export function setupBridgeEvents() {
  if (_bridgeCleanup) return _bridgeCleanup;
  const handlers = {};
  handlers[BRIDGE_EVENTS.requestConfig] = () => pushConfigToPage();
  handlers["bds:request-config-push"] = () => pushConfigToPage();
  handlers["bds:deep-code-toggle-state"] = () => pushConfigToPage();
  handlers["bds:clear-harness-report"] = () => { state.deepCode.pendingReport = null; };
  handlers[BRIDGE_EVENTS.networkState] = (event) => {
    let detail = event?.detail || {};
    if (typeof detail === "string") { try { detail = JSON.parse(detail); } catch {} }
    handleNetworkState(detail);
  };
  handlers["bds:studio-config-changed"] = () => pushConfigToPage();
  handlers["bds:mutation-applied"] = (event) => {
    let data = event.detail;
    if (typeof data === "string") { try { data = JSON.parse(data); } catch { return; } }
    if (data && data.conversationId && data.userPrompt !== undefined) {
      state.pricing.pendingInjections.set(data.conversationId, {
        injectedText: data.injectedText || "",
        userPrompt: data.userPrompt,
      });
    }
  };
  for (const [event, handler] of Object.entries(handlers)) window.addEventListener(event, handler);
  _bridgeGen += 1;
  const gen = _bridgeGen;
  _bridgeCleanup = () => {
    if (_bridgeGen !== gen) return;
    for (const [event, handler] of Object.entries(handlers)) window.removeEventListener(event, handler);
    _bridgeCleanup = null;
  };
  return _bridgeCleanup;
}

export function setMaxChatSessions(value) {
  const raw = Number(value);
  if (Number.isFinite(raw) && raw > 0) MAX_CHAT_SESSIONS = Math.max(10, Math.floor(raw));
}

function getStudioConfigFromClient() {
  try {
    const raw = localStorage.getItem("shen_studio_config");
    if (raw) return JSON.parse(raw);
  } catch {}
  try {
    if (window.AndroidBridge?.getStorage) {
      const raw = window.AndroidBridge.getStorage("shen_studio_config");
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return null;
}

function buildStudioDefaultPromptBlock() {
  const cfg = getStudioConfigFromClient();
  if (!cfg) return "";
  return [
    "[STUDIO_CONFIG]",
    JSON.stringify(cfg),
    "[/STUDIO_CONFIG]",
    "",
    "☬ SHΞN Studio is the Android client-side execution layer. The user's saved Studio credentials are available from the client app and synced with BDS settings.",
    "If GitHub token/owner are present, treat GitHub as authenticated. Use BDS:VISUALIZER/html-panel with StudioBridge.github for repo reads, edits, commits, pushes, and Actions checks.",
    "Use StudioBridge.fetch/proxyFetch for CORS-safe HTTP, StudioBridge.cloudflare for Cloudflare, and StudioBridge.deepseek/openai/gemini for AI API calls.",
    "For real operations, create a mobile-first dark Studio panel wired with buttons/logs instead of saying you lack access.",
  ].join("\n");
}

export async function pushConfigToPage() {
  try {
    const activeProject = getActiveProject();
    let activeSystemPrompt = DEFAULT_SYSTEM_PROMPT;
    if (state.settings.activeSystemPromptId && state.settings.activeSystemPromptId !== "default") {
      const custom = (state.settings.customSystemPrompts || []).find(p => p.id === state.settings.activeSystemPromptId);
      activeSystemPrompt = custom ? custom.content : DEFAULT_SYSTEM_PROMPT;
    }
    const studioBlock = buildStudioDefaultPromptBlock();
    if (studioBlock && !activeSystemPrompt.includes("[STUDIO_CONFIG]")) {
      activeSystemPrompt = `${studioBlock}\n\n${activeSystemPrompt}`;
    }

    const projectRagEnabled = Boolean(state.settings.projectRagEnabled);
    const activeProjectFiles = activeProject ? (projectRagEnabled ? getFilesForProject(activeProject.id) : getActiveFiles()) : [];
    let localDirFiles = [];
    if (activeProject?.linkedDirId) {
      try { localDirFiles = (await getDirectoryFiles(activeProject.id)) || []; } catch {}
    }
    const allFiles = [...activeProjectFiles, ...localDirFiles];
    const mcpSchemas = await discoverMcpToolSchemas();
    const detail = {
      mcpToolSchemas: mcpSchemas,
      systemPrompt: String(activeSystemPrompt),
      systemPromptEntries: [],
      skills: state.skills.filter(s => s.active).map(s => ({ name: s.name, content: s.content })),
      memories: Object.entries(state.memories).map(([key, item]) => ({ key, value: item.value, importance: item.importance })),
      activeCharacter: state.characters.find(c => c.active) || null,
      preferredLang: String(state.settings.preferredLang || ""),
      disableSystemPrompt: Boolean(state.settings.disableSystemPrompt),
      disableMemory: Boolean(state.settings.disableMemory),
      systemPromptInjectionFrequency: String(state.settings.systemPromptInjectionFrequency || "first"),
      systemPromptInjectionInterval: Number(state.settings.systemPromptInjectionInterval || 3),
      projectRagEnabled,
      projectRagLimit: Number(state.settings.projectRagLimit || 5),
      injectSystemDateTime: Boolean(state.settings.injectSystemDateTime),
      deepResearch: { enabled: Boolean(state.deepResearch.enabled && state.deepResearch.pendingRun), runId: state.deepResearch.pendingRun?.id || "" },
      deepCode: { enabled: Boolean(state.deepCode.enabled), activeDirectory: state.deepCode.activeDirectory || "", manualPath: state.deepCode.manualPath || "", pendingReport: state.deepCode.pendingReport || null, fileTree: buildDeepCodeFileTree(getDeepCodeFiles(), { rootName: state.deepCode.activeDirectory || "" }) },
      activeProject: activeProject ? { name: activeProject.name, instructions: activeProject.customInstructions, files: allFiles.map(f => ({ name: f.name, content: f.content })) } : null,
      mcpInlineMaxChars: Number(state.settings.mcpInlineMaxChars) || 8000,
      modelInputLimits: state.remoteConfig?.modelInputLimits || {},
    };
    window.dispatchEvent(new CustomEvent(BRIDGE_EVENTS.configUpdate, { detail: JSON.stringify(detail) }));
  } catch (e) { console.warn("[BDS] pushConfigToPage failed:", e); }
}

export async function discoverMcpToolSchemas() {
  const enabledServers = (state.mcpServers || []).filter(s => s.enabled && /^https?:\/\//i.test(String(s.serverUrl || "")));
  if (!enabledServers.length) { state.mcpToolSchemas = []; return []; }
  const results = await Promise.allSettled(enabledServers.map(server => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "bds-mcp-list-tools", serverUrl: server.serverUrl, apiKey: server.apiKey || "" }, (response) => {
      if (response?.ok) resolve({ serverName: server.name, serverUrl: server.serverUrl, tools: response.tools });
      else reject(new Error(response?.error || "Failed to list tools"));
    });
  })));
  const schemas = [];
  for (const result of results) if (result.status === "fulfilled") {
    const list = Array.isArray(result.value.tools) ? result.value.tools : (result.value.tools?.tools || []);
    for (const tool of list) schemas.push({ serverName: result.value.serverName, serverUrl: result.value.serverUrl, toolName: tool.name, description: tool.description || "", inputSchema: tool.inputSchema || {} });
  }
  state.mcpToolSchemas = schemas;
  return schemas;
}

export function handleNetworkState(detail) {
  state.network.activeCompletionRequests = Math.max(0, Number(detail?.activeCompletionRequests || 0));
  state.network.lastEventAt = Date.now();
}

export function injectHookScript() {
  if (document.getElementById("bds-injected-hook")) return;
  const script = document.createElement("script");
  script.id = "bds-injected-hook";
  script.src = chrome.runtime.getURL("injected.js");
  script.async = false;
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}
