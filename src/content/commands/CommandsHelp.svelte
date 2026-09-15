<script>
  import { COMMANDS, getCommandSuggestions } from "./registry.js"
  import { t } from "../../lib/i18n.svelte.js"

  let isOpen = $state(false)
  let search = $state("")
  let selectedCategory = $state("all")

  let categories = $derived.by(() => {
    const cats = new Set(COMMANDS.map(c => c.category))
    return ["all", ...Array.from(cats)]
  })

  let filtered = $derived.by(() => {
    let items = COMMANDS
    if (selectedCategory !== "all") items = items.filter(c => c.category === selectedCategory)
    if (search) items = getCommandSuggestions(search)
    return items
  })

  function open() { isOpen = true; search = ""; selectedCategory = "all" }
  function close() { isOpen = false }

  function handleKeydown(e) {
    if (e.key === "Escape") close()
  }

  $effect(() => {
    function handler() { open() }
    window.addEventListener("bds:show-help", handler)
    return () => window.removeEventListener("bds:show-help", handler)
  })
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="bds-cmd-help-overlay" role="presentation" onclick={close} onkeydown={handleKeydown}>
    <div class="bds-modal bds-help-modal" role="dialog" onclick={(e) => e.stopPropagation()} tabindex="-1">
      <div class="bds-help-header">
        <h2>{t("commands.helpTitle")}</h2>
        <button type="button" class="bds-help-close" onclick={close}>&times;</button>
      </div>
      <div class="bds-help-search">
        <input type="text" placeholder={t("commands.search")} bind:value={search} onkeydown={handleKeydown} />
      </div>
      <div class="bds-help-categories">
        {#each categories as cat}
          <button type="button" class="bds-help-cat-btn" class:bds-help-cat-btn--active={cat === selectedCategory} onclick={() => selectedCategory = cat}>
            {cat === "all" ? t("commands.all") : t("commands.cat" + cat)}
          </button>
        {/each}
      </div>
      <div class="bds-help-list">
        {#each filtered as cmd}
          <div class="bds-help-item">
            <span class="bds-help-icon">{@html cmd.icon}</span>
            <div class="bds-help-info">
              <span class="bds-help-name">/{cmd.id}</span>
              <span class="bds-help-desc">{t(cmd.descKey)}</span>
            </div>
            <span class="bds-help-usage">{t(cmd.usageKey)}</span>
          </div>
        {/each}
        {#if filtered.length === 0}
          <div class="bds-help-empty">{t("commands.noCommands")}</div>
        {/if}
      </div>
    </div>
  </div>
{/if}
