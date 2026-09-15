<script>
  import { t } from "../../lib/i18n.svelte.js";
  import { marked } from "marked";
  import {
    calculateCost,
    formatCost,
    formatTokenCount,
    mergeStreamChunks,
  } from "../../lib/utils/api-parser.js";

  let { store, addtoast } = $props();

  let merged = $derived(
    store.streamChunks?.length
      ? mergeStreamChunks(store.streamChunks)
      : store.response
  );

  let usage = $derived(store.response?.usage || merged?.usage || null);
  let cost = $derived(calculateCost(usage, store.request.model));
  let finishReason = $derived(
    store.response?.choices?.[0]?.finish_reason ||
    merged?.finishReason ||
    null
  );

  let reasoningContent = $derived(
    store.response?.choices?.[0]?.message?.reasoning_content ||
    merged?.reasoningContent ||
    ""
  );

  let content = $derived(
    store.response?.choices?.[0]?.message?.content ||
    merged?.content ||
    (store.response?.choices?.[0]?.text) ||
    ""
  );

  let toolCalls = $derived(
    store.response?.choices?.[0]?.message?.tool_calls || null
  );

  let modelInfo = $derived(
    store.response?.model || merged?.model || store.request.model || ""
  );

  let rawJson = $derived(
    store.response
      ? JSON.stringify(store.response, null, 2)
      : merged
        ? JSON.stringify(merged, null, 2)
        : ""
  );

  let isListModels = $derived(store.request.endpoint === "models");
  let isBalance = $derived(store.request.endpoint === "user/balance");
  let isFim = $derived(store.request.endpoint === "completions");

  let responseContainer = $state(null);
  let autoScroll = $state(true);

  $effect(() => {
    if (store.streamChunks?.length && autoScroll && responseContainer) {
      responseContainer.scrollTop = responseContainer.scrollHeight;
    }
  });

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
    addtoast?.("Copied", "success");
  }

  function handleScroll() {
    if (!responseContainer) return;
    const el = responseContainer;
    autoScroll = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }
</script>

<div class="bds-api-response">
  {#if store.isLoading}
    <div class="bds-api-loading">
      <div class="bds-api-spinner"></div>
      <span>{t('apiPlayground.waitingResponse')}</span>
    </div>

  {:else if store.error}
    <div class="bds-api-error">
      <strong>Error</strong>
      <p>{store.error}</p>
      {#if store.latency > 0}
        <span>Latency: {store.latency.toFixed(0)}ms</span>
      {/if}
    </div>

  {:else if store.response}
    <div class="bds-api-response-meta" bind:this={responseContainer} onscroll={handleScroll}>
      <span class="bds-api-response-meta-item">
        <span class="bds-api-response-meta-label">Model</span>
        <span class="bds-api-response-meta-value">{modelInfo}</span>
      </span>
      <span class="bds-api-response-meta-item">
        <span class="bds-api-response-meta-label">Latency</span>
        <span class="bds-api-response-meta-value">{store.latency.toFixed(0)}ms</span>
      </span>
      {#if finishReason}
        <span class="bds-api-response-meta-item">
          <span class="bds-api-response-meta-label">Finish</span>
          <span class="bds-api-response-meta-value">{finishReason}</span>
        </span>
      {/if}
      {#if store.streamChunks?.length}
        <span class="bds-api-response-meta-item">
          <span class="bds-api-response-meta-label">Chunks</span>
          <span class="bds-api-response-meta-value">{store.streamChunks.length}</span>
        </span>
      {/if}
    </div>

    {#if usage}
      <div class="bds-api-usage-grid">
        <div class="bds-api-usage-card">
          <div class="bds-api-usage-card-value">{formatTokenCount(usage.prompt_tokens)}</div>
          <div class="bds-api-usage-card-label">Input</div>
        </div>
        <div class="bds-api-usage-card">
          <div class="bds-api-usage-card-value">{formatTokenCount(usage.completion_tokens)}</div>
          <div class="bds-api-usage-card-label">Output</div>
        </div>
        <div class="bds-api-usage-card">
          <div class="bds-api-usage-card-value">{formatTokenCount(usage.total_tokens)}</div>
          <div class="bds-api-usage-card-label">Total</div>
        </div>
        {#if usage.prompt_cache_hit_tokens > 0 || usage.prompt_cache_miss_tokens > 0}
          <div class="bds-api-usage-card">
            <div class="bds-api-usage-card-value">{formatTokenCount(usage.prompt_cache_hit_tokens)}</div>
            <div class="bds-api-usage-card-label">Cache Hit</div>
          </div>
          <div class="bds-api-usage-card">
            <div class="bds-api-usage-card-value">{formatTokenCount(usage.prompt_cache_miss_tokens)}</div>
            <div class="bds-api-usage-card-label">Cache Miss</div>
          </div>
        {/if}
      </div>

      {#if cost.totalCost > 0}
        <div class="bds-api-cost-breakdown">
          <div class="bds-api-cost-row">
            <span class="bds-api-cost-label">Input Cost</span>
            <span class="bds-api-cost-value">{formatCost(cost.inputCost)}</span>
          </div>
          <div class="bds-api-cost-row">
            <span class="bds-api-cost-label">Output Cost</span>
            <span class="bds-api-cost-value">{formatCost(cost.outputCost)}</span>
          </div>
          <div class="bds-api-cost-row">
            <span class="bds-api-cost-label">Total Cost</span>
            <span class="bds-api-cost-value">{formatCost(cost.totalCost)}</span>
          </div>
          {#if cost.cacheSavings > 0}
            <div class="bds-api-cost-row">
              <span class="bds-api-cost-label">Cache Saved</span>
              <span class="bds-api-cost-value">{formatCost(cost.cacheSavings)}</span>
            </div>
          {/if}
          {#if cost.reasoningTokens > 0}
            <div class="bds-api-cost-row">
              <span class="bds-api-cost-label">Reasoning Tokens</span>
              <span class="bds-api-cost-value">{formatTokenCount(cost.reasoningTokens)}</span>
            </div>
          {/if}
        </div>
      {/if}
    {/if}

    {#if isListModels}
      <div class="bds-api-models-list">
        <h4>{t('apiPlayground.availableModels')}</h4>
        {#each store.response?.data || [] as model}
          <div class="bds-api-model-item">
            <code>{model.id}</code>
            <span class="bds-api-model-owner">{model.owned_by}</span>
          </div>
        {/each}
      </div>
    {:else if isBalance}
      <div class="bds-api-balance">
        <h4>{t('apiPlayground.balance')}</h4>
        <p>{t('apiPlayground.balanceAvailable')}: <strong>{store.response?.is_available ? 'Yes' : 'No'}</strong></p>
        {#each store.response?.balance_infos || [] as info}
          <div class="bds-api-balance-row">
            <span>{info.currency}</span>
            <span>Total: {info.total_balance}</span>
            <span>Granted: {info.granted_balance}</span>
            <span>Topped Up: {info.topped_up_balance}</span>
          </div>
        {/each}
      </div>
    {:else if isFim}
      <div class="bds-api-content">
        <div class="bds-api-content-header">
          <span>Completion</span>
          <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => copyToClipboard(content)}>{t('apiPlayground.copy')}</button>
        </div>
        <pre class="bds-api-code-block">{content}</pre>
      </div>
    {:else}
      {#if reasoningContent}
        <div class="bds-api-reasoning-box">
          <div class="bds-api-reasoning-header">Reasoning Content</div>
          <div class="bds-api-reasoning-content">{reasoningContent}</div>
        </div>
      {/if}

      {#if toolCalls}
        <div class="bds-api-tool-calls">
          <h4>{t('apiPlayground.toolCalls')}</h4>
          {#each toolCalls as tc}
            <div class="bds-api-tool-call">
              <div class="bds-api-tool-call-name">{tc.function?.name}</div>
              <div class="bds-api-tool-call-args">{tc.function?.arguments}</div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="bds-api-content">
        <div class="bds-api-content-header">
          <span>Response</span>
          <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => copyToClipboard(content)}>{t('apiPlayground.copy')}</button>
        </div>
        <div class="bds-api-markdown">{@html marked.parse(content)}</div>
      </div>
    {/if}

    <div class="bds-api-content">
      <div class="bds-api-content-header">
        <span>Raw JSON</span>
        <div>
          <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => copyToClipboard(rawJson)}>Copy</button>
          <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => store.showRawJson = !store.showRawJson}>
            {store.showRawJson ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {#if store.showRawJson}
        <pre class="bds-api-json">{rawJson}</pre>
      {/if}
    </div>

    {#if store.streamChunks?.length > 0}
      <div class="bds-api-stream-log">
        <div class="bds-api-content-header">
          <span>SSE Stream Log ({store.streamChunks.length} chunks)</span>
          <button type="button" class="bds-api-btn bds-api-btn-sm" onclick={() => store.showStreamLog = !store.showStreamLog}>
            {store.showStreamLog ? 'Hide' : 'Show'}
          </button>
        </div>
        {#if store.showStreamLog}
          <div class="bds-api-stream-chunks">
            {#each store.streamChunks.slice(0, 100) as chunk, i}
              <div class="bds-api-stream-chunk">
                <span class="bds-api-chunk-num">#{i + 1}</span>
                {#if chunk.choices?.[0]?.delta?.reasoning_content}
                  <span class="bds-api-chunk-reasoning">{chunk.choices[0].delta.reasoning_content}</span>
                {/if}
                {#if chunk.choices?.[0]?.delta?.content}
                  <span class="bds-api-chunk-content">{chunk.choices[0].delta.content}</span>
                {/if}
                {#if chunk.usage}
                  <span class="bds-api-chunk-usage">[usage]</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

  {:else}
    <div class="bds-api-empty">
      <p>{t('apiPlayground.noResponse')}</p>
    </div>
  {/if}
</div>
