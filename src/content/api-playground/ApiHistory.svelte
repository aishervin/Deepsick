<script>
  import { t } from "../../lib/i18n.svelte.js";
  import { calculateCost, formatCost, formatTokenCount } from "../../lib/utils/api-parser.js";

  let { store } = $props();

  let searchQuery = $state("");
  let filterModel = $state("");

  let models = $derived([...new Set(store.history.map(h => h.request?.model).filter(Boolean))]);

  let filtered = $derived(
    store.history.filter((h) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const content = h.request?.messages?.map(m => m.content).join(" ").toLowerCase() || "";
        const resp = h.response?.choices?.[0]?.message?.content?.toLowerCase() || "";
        if (!content.includes(q) && !resp.includes(q)) return false;
      }
      if (filterModel && h.request?.model !== filterModel) return false;
      return true;
    })
  );

  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  }

  function getPreviewText(messages) {
    if (!messages?.length) return "(no messages)";
    const last = messages[messages.length - 1];
    const text = last?.content || "";
    return text.length > 120 ? text.slice(0, 120) + "..." : text;
  }
</script>

<div class="bds-api-history">
  <div class="bds-api-toolbar">
    <input
      class="bds-api-search"
      type="text"
      placeholder={t('apiPlayground.searchHistory')}
      value={searchQuery}
      oninput={(e) => searchQuery = e.target.value}
    />
    <select
      class="bds-api-select"
      value={filterModel}
      onchange={(e) => filterModel = e.target.value}
    >
      <option value="">{t('apiPlayground.allModels')}</option>
      {#each models as m}
        <option value={m}>{m}</option>
      {/each}
    </select>
    <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => store.exportHistory()}>
      {t('apiPlayground.export')}
    </button>
    <button type="button" class="bds-api-btn bds-api-btn-sm bds-api-btn-danger" onclick={() => { if (confirm('Clear all history?')) store.clearHistory(); }}>
      {t('apiPlayground.clear')}
    </button>
  </div>

  {#if filtered.length === 0}
    <div class="bds-api-empty">
      <p>{t('apiPlayground.noHistory')}</p>
    </div>
  {/if}

  {#each filtered as entry}
    <div class="bds-api-history-item" role="button" tabindex="0" onclick={() => store.loadRequestFromHistory(entry)} onkeydown={(e) => e.key === 'Enter' && store.loadRequestFromHistory(entry)}>
      <div class="bds-api-history-header">
        <span class="bds-api-history-method">{entry.request?.endpoint || '?'}</span>
        {#if entry.response}
          <span class="bds-api-status-ok">ok</span>
        {:else}
          <span class="bds-api-status-err">err</span>
        {/if}
        <span class="bds-api-history-model">{entry.request?.model || ''}</span>
        {#if entry.response?.usage}
          <span class="bds-api-history-tokens">{formatTokenCount(entry.response.usage.total_tokens)} tok</span>
        {/if}
        <span class="bds-api-history-time">{formatDate(entry.timestamp)}</span>
        <span class="bds-api-history-latency">{entry.latency?.toFixed(0)}ms</span>
        {#if entry.streamed}
          <span class="bds-api-history-stream">stream</span>
        {/if}
      </div>
      <div class="bds-api-history-preview">{getPreviewText(entry.request?.messages)}</div>
      {#if entry.response?.usage}
        <div class="bds-api-history-cost">{formatCost(calculateCost(entry.response.usage, entry.request?.model).totalCost)}</div>
      {/if}
      <button
        type="button"
        class="bds-api-btn bds-api-btn-sm bds-api-btn-danger bds-api-history-delete"
        onclick={(e) => { e.stopPropagation(); store.deleteHistoryEntry(entry.id); }}
        title={t('apiPlayground.delete')}
      >&#10005;</button>
    </div>
  {/each}

  {#if store.history.length > 200}
    <p class="bds-api-hint">{t('apiPlayground.historyLimit')}</p>
  {/if}
</div>
