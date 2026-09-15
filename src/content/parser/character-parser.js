/**
 * Character parsing and persistence.
 */

import state from "../state.js";
import { pushConfigToPage } from "../bridge.js";
import { STORAGE_KEYS } from "../../lib/constants.js";
import { makeId } from "../../lib/utils/helpers.js";

let characterPersistTimer = 0;

/**
 * Upsert character entries and persist to storage.
 * In the character system, creating a character results in it being the only active one.
 * (Only one character can be active at a time).
 */
export async function upsertCharacters(items) {
  if (!items || items.length === 0) return;

  let changed = false;

  for (const item of items) {
    const name = String(item.name || "New Character").trim();
    const content = String(item.content || "").trim();
    const usage = String(item.usage || "").trim();

    if (!content) continue;

    // Check if character with same name and content already exists to avoid duplicates
    const existing = state.characters.find(c => c.name === name && c.content === content);
    if (existing) {
       // Just activate it if it wasn't
       if (!existing.active) {
         state.characters.forEach(c => c.active = false);
         existing.active = true;
         changed = true;
       }
       continue;
    }

    // New character: Deactivate others and add this one
    state.characters.forEach(c => c.active = false);
    
    state.characters.push({
      id: makeId(),
      name,
      usage,
      content,
      active: true
    });
    
    changed = true;
  }

  if (!changed) {
    return;
  }

  if (state.ui) {
    state.ui.refreshCharacters();
  }
  pushConfigToPage();

  if (characterPersistTimer) {
    window.clearTimeout(characterPersistTimer);
  }

  characterPersistTimer = window.setTimeout(async () => {
    characterPersistTimer = 0;
    await chrome.storage.local.set({
      [STORAGE_KEYS.characters]: state.characters,
    });
  }, 300);
}
