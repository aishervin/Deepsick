<script>
  import { COMMANDS, findCommand } from "./registry.js"
  import appState from "../state.js"
  import { STORAGE_KEYS } from "../../lib/constants.js"
  import { t } from "../../lib/i18n.svelte.js"

  let { onClose } = $props()

  let newCommand = $state("")
  let selectedSnippetId = $state("")
  let validationError = $state("")

  let mappings = $state(appState.commands?.customMappings || {})
  let entries = $state([])
  let availableSnippets = $state([])

  function refreshDerived() {
    entries = Object.entries(mappings).map(([cmd, snippetId]) => {
      const snippet = appState.savedItems.find(s => s.id === snippetId)
      return { command: cmd, snippet }
    })
    const mappedIds = new Set(Object.values(mappings))
    availableSnippets = appState.savedItems.filter(s => s.type === "snippet" && !mappedIds.has(s.id))
  }

  $effect(refreshDerived)

  function validateCommand(val) {
    if (!val) return t("commands.cmdRequired")
    if (!/^[a-z0-9_]+$/.test(val)) return t("commands.cmdInvalidChars")
    if (findCommand(val)) return t("commands.cmdConflictBuiltin")
    if (mappings[val]) return t("commands.cmdConflictSnippet")
    return ""
  }

  function handleAdd() {
    const err = validateCommand(newCommand)
    if (err) { validationError = err; return }
    const next = { ...mappings, [newCommand.toLowerCase()]: selectedSnippetId }
    saveMappings(next)
    newCommand = ""
    selectedSnippetId = ""
    validationError = ""
  }

  function handleRemove(cmd) {
    const next = { ...mappings }
    delete next[cmd]
    saveMappings(next)
  }

  async function saveMappings(m) {
    appState.commands.customMappings = m
    mappings = m
    refreshDerived()
    await chrome.storage.local.set({ [STORAGE_KEYS.commandMappings]: m })
  }
</script>

<div class="bds-cmd-manager">
  <div class="bds-cmd-manager-header">
    <h3>{t("commands.commandShortcuts")}</h3>
    <button type="button" class="bds-cmd-manager-close" onclick={onClose}>&times;</button>
  </div>
  <div class="bds-cmd-manager-add">
    <input
      type="text"
      placeholder={t("commands.cmdHint")}
      bind:value={newCommand}
      oninput={() => { validationError = "" }}
      onkeydown={(e) => { if (e.key === "Enter") handleAdd() }}
    />
    <select bind:value={selectedSnippetId}>
      <option value="">{t("commands.selectSnippet")}</option>
      {#each availableSnippets as s}
        <option value={s.id}>{s.title}</option>
      {/each}
    </select>
    <button type="button" onclick={handleAdd} disabled={!newCommand || !selectedSnippetId}>{t("commands.add")}</button>
  </div>
  {#if validationError}
    <div class="bds-cmd-manager-error">{validationError}</div>
  {/if}
  <div class="bds-cmd-manager-list">
    {#each entries as entry}
      <div class="bds-cmd-manager-item">
        <span class="bds-cmd-manager-cmd">/{entry.command}</span>
        <span class="bds-cmd-manager-snippet">&rarr; {entry.snippet?.title || "(deleted)"}</span>
        <button type="button" class="bds-cmd-manager-remove" onclick={() => handleRemove(entry.command)}>{t("commands.remove")}</button>
      </div>
    {/each}
    {#if entries.length === 0}
      <div class="bds-cmd-manager-empty">{t("commands.noCustomCommands")}</div>
    {/if}
  </div>
  <div class="bds-cmd-manager-builtins">
    <h4>{t("commands.builtinCommands")}</h4>
    {#each COMMANDS as cmd}
      <div class="bds-cmd-manager-builtin">
        <span class="bds-cmd-icon">{@html cmd.icon}</span>
        <span class="bds-cmd-info">
          <span class="bds-cmd-name">/{cmd.id}</span>
          <span class="bds-cmd-desc">{t(cmd.descKey)}</span>
        </span>
        <span class="bds-cmd-usage">{t(cmd.usageKey)}</span>
      </div>
    {/each}
  </div>
</div>
