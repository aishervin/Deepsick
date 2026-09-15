<script>
  import { t } from "../../lib/i18n.svelte.js";
  import { createApiStore } from "./api-store.svelte.js";
  import ApiRequestBuilder from "./ApiRequestBuilder.svelte";
  import ApiResponseViewer from "./ApiResponseViewer.svelte";
  import ApiHistory from "./ApiHistory.svelte";
  import ApiPresets from "./ApiPresets.svelte";
  import { buildCurlCommand, copyCode } from "../../lib/utils/api-parser.js";

  let { onclose } = $props();

  const store = createApiStore();

  let keyManagerName = $state("");
  let keyManagerValue = $state("");
  let keyManagerError = $state("");
  let codeDialog = $state(null);
  let showSaveDialog = $state(false);
  let saveName = $state("");
  let toasts = $state([]);

  const TABS = [
    { id: "builder", label: "apiPlayground.builder" },
    { id: "history", label: "apiPlayground.history" },
    { id: "presets", label: "apiPlayground.presets" },
  ];

  function addToast(message, type = "info") {
    const id = Date.now() + Math.random();
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
    }, 2500);
  }

  function addKey() {
    keyManagerError = "";
    if (!keyManagerName.trim() || !keyManagerValue.trim()) {
      keyManagerError = "Name and key are required.";
      return;
    }
    store.addApiKey(keyManagerName.trim(), keyManagerValue.trim());
    keyManagerName = "";
    keyManagerValue = "";
    addToast("Key added", "success");
  }

  function showCodeDialog() {
    const key = store.getActiveKey();
    const lang = "curl";
    const code = buildCurlCommand(store.request, key || "");
    codeDialog = { language: lang, code };
  }

  async function copyAsLanguage(language) {
    const key = store.getActiveKey();
    const code = await copyCode(store.request, key || "", language);
    if (code) {
      try { await navigator.clipboard.writeText(code); } catch {}
      addToast(`${language} code copied`, "success");
    }
    codeDialog = null;
  }

  function handleSave() {
    if (!saveName.trim()) return;
    store.saveCurrentRequest(saveName.trim());
    showSaveDialog = false;
    saveName = "";
    addToast("Request saved", "success");
  }

  function handleKeydown(e) {
    const isMod = e.ctrlKey || e.metaKey;
    if (isMod && e.key === "Enter" && !store.isLoading) {
      e.preventDefault();
      store.sendRequest();
    }
    if (isMod && e.key === "s") {
      e.preventDefault();
      showSaveDialog = true;
      saveName = "";
    }
  }
</script>

<div class="bds-api-playground" onkeydown={handleKeydown}>
  <div class="bds-api-playground-header">
    <h3>{t('apiPlayground.title')}</h3>
    <div class="bds-api-header-actions">
      <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={showCodeDialog} title={t('apiPlayground.viewCurl')}>
        curl
      </button>
      <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => copyAsLanguage("python")}>
        Python
      </button>
      <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => copyAsLanguage("nodejs")}>
        Node.js
      </button>
      <button type="button" class="bds-api-btn bds-api-btn-sm bds-api-btn-close" onclick={onclose}>
        &#10005;
      </button>
    </div>
  </div>

  <div class="bds-api-tabs">
    {#each TABS as tab}
      <button
        type="button"
        class="bds-api-tab"
        class:bds-api-tab-active={store.activeTab === tab.id}
        onclick={() => store.activeTab = tab.id}
      >
        {t(tab.label)}
      </button>
    {/each}
  </div>

  <div class="bds-api-body">
    {#if store.activeTab === "builder"}
      <div class="bds-api-builder-layout">
        <div class="bds-api-builder-panel">
          <ApiRequestBuilder {store} onsave={() => { showSaveDialog = true; saveName = ''; }} />
        </div>
        <div class="bds-api-builder-panel">
          <ApiResponseViewer {store} addtoast={(msg, type) => addToast(msg, type)} />
        </div>
      </div>
    {:else if store.activeTab === "history"}
      <ApiHistory {store} />
    {:else if store.activeTab === "presets"}
      <ApiPresets {store} />
    {/if}
  </div>

  <div class="bds-api-toast-container">
    {#each toasts as toast}
      <div class="bds-api-toast bds-api-toast-{toast.type}">{toast.message}</div>
    {/each}
  </div>

  {#if store.showKeyManager}
    <div class="bds-api-modal-overlay" onclick={() => store.showKeyManager = false}>
      <div class="bds-api-modal" onclick={(e) => e.stopPropagation()}>
        <div class="bds-api-modal-header">
          <h4>{t('apiPlayground.manageKeys')}</h4>
          <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => store.showKeyManager = false}>&#10005;</button>
        </div>
        <div class="bds-api-modal-body">
          {#if store.apiKeys.length === 0}
            <p class="bds-api-hint">{t('apiPlayground.noKeysHint')}</p>
          {/if}
          {#each store.apiKeys as key}
            <div class="bds-api-key-row">
              <span class="bds-api-key-name">{key.name}</span>
              <code class="bds-api-key-value">{key.key.slice(0, 8)}...{key.key.slice(-4)}</code>
              <button type="button" class="bds-api-btn bds-api-btn-sm {store.activeKeyId === key.id ? 'bds-api-btn-primary' : ''}" onclick={() => store.setActiveKey(key.id)}>
                {store.activeKeyId === key.id ? 'Active' : 'Use'}
              </button>
              <button type="button" class="bds-api-btn bds-api-btn-sm bds-api-btn-danger" onclick={() => { store.removeApiKey(key.id); addToast('Key deleted', 'info'); }}>
                &#10005;
              </button>
            </div>
          {/each}
          <div class="bds-api-add-key">
            <input placeholder="Key name" value={keyManagerName} oninput={(e) => keyManagerName = e.target.value} />
            <input placeholder="sk-..." value={keyManagerValue} oninput={(e) => keyManagerValue = e.target.value} type="password" />
            <button type="button" class="bds-api-btn bds-api-btn-primary" onclick={addKey}>{t('apiPlayground.addKey')}</button>
            {#if keyManagerError}
              <div class="bds-api-field-error">{keyManagerError}</div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if codeDialog}
    <div class="bds-api-modal-overlay" onclick={() => codeDialog = null}>
      <div class="bds-api-modal bds-api-modal-wide" onclick={(e) => e.stopPropagation()}>
        <div class="bds-api-modal-header">
          <h4>{codeDialog.language.toUpperCase()} Code</h4>
          <div class="bds-api-header-actions">
            <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => navigator.clipboard.writeText(codeDialog.code).then(() => addToast('Copied', 'success')).catch(() => {})}>
              {t('apiPlayground.copyCode')}
            </button>
            <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => codeDialog = null}>&#10005;</button>
          </div>
        </div>
        <div class="bds-api-modal-body">
          <pre class="bds-api-code-block">{codeDialog.code}</pre>
        </div>
      </div>
    </div>
  {/if}

  {#if showSaveDialog}
    <div class="bds-api-modal-overlay" onclick={() => showSaveDialog = false}>
      <div class="bds-api-modal" onclick={(e) => e.stopPropagation()}>
        <div class="bds-api-modal-header">
          <h4>{t('apiPlayground.save')}</h4>
          <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => showSaveDialog = false}>&#10005;</button>
        </div>
        <div class="bds-api-modal-body">
          <div class="bds-api-save-field">
            <input
              placeholder="Request name"
              value={saveName}
              oninput={(e) => saveName = e.target.value}
              onkeydown={(e) => { if (e.key === 'Enter') handleSave(); }}
              autofocus
            />
          </div>
          <div class="bds-api-save-actions">
            <button type="button" class="bds-api-btn" onclick={() => showSaveDialog = false}>Cancel</button>
            <button type="button" class="bds-api-btn bds-api-btn-primary" onclick={handleSave} disabled={!saveName.trim()}>Save</button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
