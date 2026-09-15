/**
 * Safe DOM mutation utilities.
 *
 * Provides safe wrappers for interacting with DOM nodes to prevent
 * unhandled DOMExceptions or reconciliation desync issues from crashing the extension.
 */

import { withObserverPaused } from "../state.js";

/**
 * Safely appends a child node to a parent.
 *
 * @param {Element|Node} parent
 * @param {Element|Node} child
 * @returns {Element|Node|null}
 */
export function safeAppendChild(parent, child) {
  if (!parent || !child) return null;
  try {
    return withObserverPaused(() => parent.appendChild(child));
  } catch (e) {
    console.warn("[BDS:DOM] appendChild failed:", e?.message || e);
    return null;
  }
}

/**
 * Safely inserts a node before a reference node in a parent.
 *
 * @param {Element|Node} parent
 * @param {Element|Node} newNode
 * @param {Element|Node|null} refNode
 * @returns {Element|Node|null}
 */
export function safeInsertBefore(parent, newNode, refNode) {
  if (!parent || !newNode) return null;
  try {
    return withObserverPaused(() => parent.insertBefore(newNode, refNode));
  } catch (e) {
    console.warn("[BDS:DOM] insertBefore failed:", e?.message || e);
    return null;
  }
}

/**
 * Safely removes a node from its parent.
 *
 * @param {Element|Node} node
 * @returns {boolean}
 */
export function safeRemove(node) {
  if (!node) return false;
  try {
    if (node.parentNode) {
      withObserverPaused(() => node.remove());
      return true;
    }
  } catch (e) {
    console.warn("[BDS:DOM] remove failed:", e?.message || e);
  }
  return false;
}

/**
 * Safely sets the text content of a node.
 *
 * @param {Element|Node} node
 * @param {string} text
 * @returns {boolean}
 */
export function safeSetTextContent(node, text) {
  if (!node) return false;
  try {
    withObserverPaused(() => {
      node.textContent = String(text ?? "");
    });
    return true;
  } catch (e) {
    console.warn("[BDS:DOM] textContent set failed:", e?.message || e);
    return false;
  }
}

/**
 * Safely adds classes to an element.
 *
 * @param {Element} node
 * @param {...string} classes
 */
export function safeAddClass(node, ...classes) {
  if (!node?.classList) return;
  try {
    node.classList.add(...classes);
  } catch (e) {
    console.warn("[BDS:DOM] classList.add failed:", e?.message || e);
  }
}

/**
 * Safely removes classes from an element.
 *
 * @param {Element} node
 * @param {...string} classes
 */
export function safeRemoveClass(node, ...classes) {
  if (!node?.classList) return;
  try {
    node.classList.remove(...classes);
  } catch (e) {
    console.warn("[BDS:DOM] classList.remove failed:", e?.message || e);
  }
}

/**
 * Safely sets an attribute on an element.
 *
 * @param {Element} node
 * @param {string} name
 * @param {string} value
 */
export function safeSetAttribute(node, name, value) {
  if (!node?.setAttribute) return;
  try {
    node.setAttribute(name, String(value ?? ""));
  } catch (e) {
    console.warn("[BDS:DOM] setAttribute failed:", e?.message || e);
  }
}

/**
 * Safely removes an attribute from an element.
 *
 * @param {Element} node
 * @param {string} name
 */
export function safeRemoveAttribute(node, name) {
  if (!node?.removeAttribute) return;
  try {
    node.removeAttribute(name);
  } catch (e) {
    console.warn("[BDS:DOM] removeAttribute failed:", e?.message || e);
  }
}
