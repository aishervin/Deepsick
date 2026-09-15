/**
 * Centralized message host ownership.
 *
 * Every message node gets at most one bds-host-wrapper element (tracked via
 * WeakMap). Feature hosts (.bds-overlay-host, .bds-file-host, etc.) live
 * inside the wrapper. This module is the single source of truth for host
 * lifecycle — other modules call these helpers rather than creating their
 * own wrapper/container elements.
 *
 * Child-Host Pattern:
 * The wrapper is appended INSIDE the message node as its child rather than as
 * a sibling. This prevents breaking React virtual list reconciliation and indexing.
 */

const hostWrappers = new WeakMap();
const wrapperOwner = new WeakMap();

function adoptWrapper(wrapper, node) {
  const previousOwner = wrapperOwner.get(wrapper);
  if (previousOwner && previousOwner !== node) {
    hostWrappers.delete(previousOwner);
  }
  wrapperOwner.set(wrapper, node);
  hostWrappers.set(node, wrapper);
}

/**
 * Reconcile an existing wrapper with its message without creating a new one.
 */
export function reconcileMessageHost(node) {
  const wrapper = hostWrappers.get(node);
  if (!wrapper || wrapperOwner.get(wrapper) !== node) return null;

  if (!document.contains(node)) {
    if (document.contains(wrapper)) wrapper.remove();
    return wrapper;
  }

  if (!node.contains(wrapper) || wrapper.parentElement !== node) {
    node.appendChild(wrapper);
  }
  return wrapper;
}

/**
 * Get or create the bds-host-wrapper for a message node.
 * A cached wrapper that is still in the document and inside the message
 * is reused as-is. If detached, the wrapper is re-appended to the message.
 */
export function getOrCreateWrapper(node) {
  let wrapper = hostWrappers.get(node);

  // Cached wrapper exists — handle based on connection state
  if (wrapper && wrapperOwner.get(wrapper) === node) {
    if (document.contains(node)) {
      // Message is connected — ensure wrapper is a child of the message
      if (!node.contains(wrapper) || wrapper.parentElement !== node) {
        node.appendChild(wrapper);
      }
      return wrapper;
    }
    // Message detached — remove wrapper from live DOM but preserve it off-DOM
    if (document.contains(wrapper)) {
      wrapper.remove();
    }
    return wrapper;
  }

  // Cached wrapper owned by another message or missing — drop stale reference
  if (wrapper) {
    hostWrappers.delete(node);
    wrapper = null;
  }

  // Search existing direct children for a pre-existing but unowned wrapper
  if (node.children) {
    for (const child of node.children) {
      if (child.classList?.contains("bds-host-wrapper") && !wrapperOwner.has(child)) {
        wrapper = child;
        break;
      }
    }
  }

  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "bds-host-wrapper";
  }

  if (wrapper.parentElement !== node) {
    node.appendChild(wrapper);
  }
  adoptWrapper(wrapper, node);
  return wrapper;
}

/**
 * Get or create a specific feature host inside the message wrapper.
 */
export function getOrCreateHost(node, hostClass) {
  const wrapper = getOrCreateWrapper(node);

  let host = wrapper.querySelector(`.${hostClass}`);
  if (!host) {
    host = document.createElement("div");
    host.className = hostClass;
    wrapper.appendChild(host);
  }

  return host;
}

/**
 * Remove a specific feature host from a message wrapper.
 * Deletes the wrapper only when childElementCount reaches zero.
 * Unknown/sibling hosts (tool hosts, etc.) are preserved.
 */
export function removeMessageHost(node, hostClass) {
  const wrapper = hostWrappers.get(node);
  if (!wrapper) return;
  const host = wrapper.querySelector(`.${hostClass}`);
  if (host) host.remove();
  if (wrapper.childElementCount === 0) {
    wrapper.remove();
    hostWrappers.delete(node);
    wrapperOwner.delete(wrapper);
  }
}

/**
 * Remove the wrapper and all its hosts for a message node.
 * Used during detached-message disposal.
 */
export function removeAllMessageHosts(node) {
  const wrapper = hostWrappers.get(node);
  if (wrapper) {
    wrapper.remove();
    hostWrappers.delete(node);
    wrapperOwner.delete(wrapper);
  }
}
