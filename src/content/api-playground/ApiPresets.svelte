<script>
  import { t } from "../../lib/i18n.svelte.js";
  import { PRESETS } from "./presets.js";

  let { store } = $props();

  let savedList = $state([]);

  $effect(() => {
    savedList = store.savedRequests;
  });

  function applyPreset(preset) {
    store.request = JSON.parse(JSON.stringify(preset.request));
    store.response = null;
    store.streamChunks = [];
    store.error = null;
    store.activeTab = "builder";
  }

  function deleteSaved(id) {
    store.deleteSavedRequest(id);
  }
</script>

<div class="bds-api-presets">
  <h4 class="bds-api-section-title">{t('apiPlayground.builtinPresets')}</h4>
  <div class="bds-api-preset-grid">
    {#each PRESETS as preset}
      <div class="bds-api-preset-card" role="button" tabindex="0" onclick={() => applyPreset(preset)} onkeydown={(e) => e.key === 'Enter' && applyPreset(preset)}>
        <div class="bds-api-preset-name">{preset.name}</div>
        <div class="bds-api-preset-desc">{preset.description}</div>
        <div class="bds-api-preset-meta">
          <span>{preset.request.endpoint}</span>
          {#if preset.request.model}
            <span>{preset.request.model}</span>
          {/if}
          {#if preset.request.thinking?.type === 'enabled'}
            <span class="bds-api-badge-thinking">thinking</span>
          {/if}
          {#if preset.request.stream}
            <span class="bds-api-badge-stream">stream</span>
          {/if}
          {#if preset.request.responseFormat?.type === 'json_object'}
            <span class="bds-api-badge-json">JSON</span>
          {/if}
          {#if preset.request.tools?.length}
            <span class="bds-api-badge-tools">tools</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  {#if savedList.length > 0}
    <h4 class="bds-api-section-title">{t('apiPlayground.savedRequests')}</h4>
    <div class="bds-api-saved-list">
      {#each savedList as saved}
        <div class="bds-api-saved-item" role="button" tabindex="0" onclick={() => store.loadRequestFromSaved(saved)} onkeydown={(e) => e.key === 'Enter' && store.loadRequestFromSaved(saved)}>
          <div class="bds-api-saved-name">{saved.name}</div>
          <div class="bds-api-saved-meta">
            <span>{saved.request?.endpoint}</span>
            {#if saved.request?.model}
              <span>{saved.request?.model}</span>
            {/if}
          </div>
          <button
            type="button"
            class="bds-api-btn bds-api-btn-sm bds-api-btn-danger"
            onclick={(e) => { e.stopPropagation(); deleteSaved(saved.id); }}
          >&#10005;</button>
        </div>
      {/each}
    </div>
  {/if}
</div>
