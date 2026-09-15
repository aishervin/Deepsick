<script>
  import SettingsPanel from "./SettingsPanel.svelte";
  import CharacterList from "./CharacterList.svelte";
  import SkillList from "./SkillList.svelte";
  import MemoryList from "./MemoryList.svelte";
  import ProjectsManager from "./ProjectsManager.svelte";
  import ProjectsCard from "./ProjectsCard.svelte";
  import SavedItems from "./SavedItems.svelte";
  import CommandManager from "../commands/CommandManager.svelte";
  import { COMMANDS } from "../commands/registry.js";
  import { findChatEditor, setChatInputText } from "../auto.js";
  import appState from "../state.js";
  import { i18n, t } from "../../lib/i18n.svelte.js";

  let { open = false, onclose, onopenapiplayground } = $props();

  let TIP_COUNT = $derived.by(() => {
    const tips = i18n.messages?.messages?.tips;
    return tips ? Object.keys(tips).filter((k) => /^\d+$/.test(k)).length : 0;
  });
  let currentTipIndex = $state(-1);
  let disableTipBox = $state(Boolean(appState.settings.disableTipBox));

  function handleSettingsSaved() {
    disableTipBox = Boolean(appState.settings.disableTipBox);
  }

  $effect(() => {
    disableTipBox = Boolean(appState.settings.disableTipBox);
    if (open && !disableTipBox && TIP_COUNT > 0) {
      queueMicrotask(() => {
        currentTipIndex = Math.floor(Math.random() * TIP_COUNT);
      });
    } else {
      currentTipIndex = -1;
    }
  });

  function openApiPlayground() {
    onclose();
    onopenapiplayground();
  }

  let settingsRef = $state(null);
  let charactersRef = $state(null);
  let skillsRef = $state(null);
  let memoryRef = $state(null);
  let projectsManagerRef = $state(null);
  let savedItemsRef = $state(null);
  let showCmdManager = $state(false);

  let showProjectsManager = $state(false);

  export function refreshSettings() {
    if (settingsRef) settingsRef.refresh();
  }
  export function refreshCharacters() {
    if (charactersRef) charactersRef.refresh();
  }
  export function refreshSkills() {
    if (skillsRef) skillsRef.refresh();
  }
  export function refreshMemories() {
    if (memoryRef) memoryRef.refresh();
  }
  export function refreshProjects() {
    if (projectsManagerRef) projectsManagerRef.refresh();
    if (settingsRef) settingsRef.refreshProject();
  }
  export function refreshSavedItems() {
    if (savedItemsRef) savedItemsRef.refresh();
  }
  export function refreshCssSnippets() {
    if (settingsRef) settingsRef.refreshCssSnippets();
  }

  function openProjectsManager() {
    showProjectsManager = true;
  }

  function closeProjectsManager() {
    showProjectsManager = false;
  }

  function insertCommand(cmdId) {
    const editor = findChatEditor();
    if (!editor) return;
    setChatInputText("/" + cmdId + " ");
    editor.focus();
    onclose();
  }

  export async function handleClose() {
    if (settingsRef && settingsRef.checkBeforeClose) {
      const ok = await settingsRef.checkBeforeClose();
      if (ok) onclose();
    } else {
      onclose();
    }
  }
</script>

<aside id="bds-drawer" class={open ? "bds-open" : "bds-closed"}>
  <div class="bds-drawer-header">
    <div class="ds-modal-content__title">{t("drawer.title")}</div>
    <button
      id="bds-close"
      type="button"
      onclick={handleClose}
      aria-label={t("drawer.close")}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14.1871 13.1265L13.1265 14.1872L1.81275 2.87347L2.87341 1.81281L14.1871 13.1265Z"
          fill="currentColor"
        ></path>
        <path
          d="M13.1265 1.81282L14.1871 2.87348L2.8734 14.1872L1.81274 13.1265L13.1265 1.81282Z"
          fill="currentColor"
        ></path>
      </svg>
    </button>
  </div>

  {#if showProjectsManager}
    <div class="bds-projects-body">
      <ProjectsManager
        bind:this={projectsManagerRef}
        onback={closeProjectsManager}
      />
    </div>
  {:else}
    <div class="bds-drawer-body">
      <SettingsPanel
        bind:this={settingsRef}
        onsave={handleSettingsSaved}
        onapiplayground={openApiPlayground}
        onimportdata={() => {
          refreshSettings();
          refreshSkills();
          refreshCharacters();
          refreshMemories();
          refreshProjects();
          refreshSavedItems();
        }}
      />

      <hr />

      <SkillList bind:this={skillsRef} />

      <hr />

      <CharacterList bind:this={charactersRef} />

      <hr />

      <MemoryList bind:this={memoryRef} />

      <hr />

      <ProjectsCard onmanage={openProjectsManager} />

      <hr />

      <SavedItems bind:this={savedItemsRef} />

      <hr />

      <div class="bds-section-title">
        <div
          style="display: flex; align-items: center; justify-content: space-between; width: 100%;"
        >
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="bds-icon-inline">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><polygon
                  points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
                /></svg
              >
            </span>
            <span>{t("commands.title")}</span>
          </div>
          <button
            type="button"
            class="bds-btn-outlined"
            style="font-size:11px;padding:3px 7px;"
            onclick={() => (showCmdManager = !showCmdManager)}
          >
            {showCmdManager ? t("commands.done") : t("commands.manage")}
          </button>
        </div>
      </div>
      {#if !showCmdManager}
        <div class="bds-featured-list">
          <h4>{t("commands.builtinCommands")}</h4>
          {#each COMMANDS as cmd}
            <button
              type="button"
              class="bds-featured-item"
              onclick={() => insertCommand(cmd.id)}
            >
              <span class="bds-cmd-icon">{@html cmd.icon}</span>
              <span class="bds-cmd-info">
                <span class="bds-cmd-name">/{cmd.id}</span>
                <span class="bds-cmd-desc">{t(cmd.descKey)}</span>
              </span>
              <span class="bds-cmd-usage">{t(cmd.usageKey)}</span>
            </button>
          {/each}
        </div>
      {/if}
      {#if showCmdManager}
        <CommandManager onclose={() => (showCmdManager = false)} />
      {/if}
    </div>

    <div class="bds-drawer-bottom">
      {#if TIP_COUNT > 0 && !disableTipBox && currentTipIndex >= 0}
        <div class="bds-tip-bar">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="M9 18h6" /><path d="M10 22h4" /><path
              d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"
            /></svg
          >
          <span>{@html t("tips." + currentTipIndex)}</span>
        </div>
      {/if}
      <div class="bds-drawer-footer" style="flex-direction: column; align-items: center; gap: 8px;">
        <div style="display: flex; gap: 12px; justify-content: center; width: 100%;">
          <a href="https://github.com/aishervin" target="_blank" rel="noopener noreferrer" title="GitHub">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
          </a>
          <a href="https://t.me/shervini" target="_blank" rel="noopener noreferrer" title="Telegram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.11.03-1.87 1.2-5.28 3.5-.5.35-.95.51-1.36.5-.43-.01-1.25-.24-1.86-.44-.75-.24-1.34-.37-1.29-.79.03-.22.34-.44.93-.68 3.63-1.58 6.05-2.62 7.25-3.12 3.46-1.44 4.18-1.69 4.65-1.7.1 0 .32.02.46.13.12.1.16.24.17.34.02.08.02.16.02.26z"/></svg>
          </a>
          <a href="https://telegramer.pages.dev" target="_blank" rel="noopener noreferrer" title="T Channel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          </a>
          <a href="https://x.com/shervinonx" target="_blank" rel="noopener noreferrer" title="X">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
        </div>
        <a href="https://t.me/shervini" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; font-size: 12px; opacity: 0.8; margin-top: 4px;">
          ☬Exclusive SHΞN™ made
        </a>
      </div>
    </div>
  {/if}
</aside>
