// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  getOrCreateWrapper,
  getOrCreateHost,
  removeMessageHost,
  removeAllMessageHosts,
  reconcileMessageHost,
} from "../../src/content/dom/host.js";

describe("host wrapper (Child-Host pattern)", () => {
  let msg;

  beforeEach(() => {
    document.body.innerHTML = "";
    msg = document.createElement("div");
    msg.className = "ds-message _63c77b1";
    document.body.appendChild(msg);
  });

  it("repeated wrapper creation for one message returns same wrapper inside message", () => {
    const w1 = getOrCreateWrapper(msg);
    const w2 = getOrCreateWrapper(msg);
    expect(w1).toBe(w2);
    expect(w1.className).toBe("bds-host-wrapper");
    // Wrapper appended inside the message as a child
    expect(w1.parentElement).toBe(msg);
    expect(msg.contains(w1)).toBe(true);
  });

  it("multiple feature hosts share same wrapper", () => {
    const hostA = getOrCreateHost(msg, "bds-overlay-host");
    const hostB = getOrCreateHost(msg, "bds-file-host");
    const wrapper = getOrCreateWrapper(msg);

    expect(hostA.parentElement).toBe(wrapper);
    expect(hostB.parentElement).toBe(wrapper);
    expect(wrapper.childElementCount).toBe(2);
    expect(wrapper.parentElement).toBe(msg);
  });

  it("repeated host creation for same class deduplicates", () => {
    const host1 = getOrCreateHost(msg, "bds-overlay-host");
    const host2 = getOrCreateHost(msg, "bds-overlay-host");
    expect(host1).toBe(host2);
    expect(getOrCreateWrapper(msg).childElementCount).toBe(1);
  });

  it("removing one feature host preserves sibling and unknown hosts", () => {
    const hostA = getOrCreateHost(msg, "bds-overlay-host");
    const hostB = getOrCreateHost(msg, "bds-file-host");
    const unknown = document.createElement("div");
    unknown.className = "some-other-thing";
    getOrCreateWrapper(msg).appendChild(unknown);

    removeMessageHost(msg, "bds-overlay-host");
    expect(document.contains(hostA)).toBe(false);
    expect(document.contains(hostB)).toBe(true);
    expect(document.contains(unknown)).toBe(true);
  });

  it("removing last child removes wrapper and clears ownership", () => {
    const host = getOrCreateHost(msg, "bds-overlay-host");
    const wrapper = getOrCreateWrapper(msg);

    removeMessageHost(msg, "bds-overlay-host");
    expect(document.contains(wrapper)).toBe(false);
    expect(msg.contains(wrapper)).toBe(false);

    // New call creates a fresh wrapper
    const fresh = getOrCreateWrapper(msg);
    expect(fresh).not.toBe(wrapper);
    expect(fresh.parentElement).toBe(msg);
  });

  it("pre-existing child wrapper is rediscovered", () => {
    const existing = document.createElement("div");
    existing.className = "bds-host-wrapper";
    msg.appendChild(existing);

    const wrapper = getOrCreateWrapper(msg);
    expect(wrapper).toBe(existing);
    expect(wrapper.parentElement).toBe(msg);
  });

  it("full disposal removes wrapper and all feature hosts", () => {
    getOrCreateHost(msg, "bds-overlay-host");
    getOrCreateHost(msg, "bds-file-host");
    const wrapper = getOrCreateWrapper(msg);

    removeAllMessageHosts(msg);

    expect(document.contains(wrapper)).toBe(false);
    expect(msg.contains(wrapper)).toBe(false);
    // New call creates a fresh wrapper
    const fresh = getOrCreateWrapper(msg);
    expect(fresh).not.toBe(wrapper);
  });

  it("reconcileMessageHost re-attaches wrapper if detached", () => {
    const wrapper = getOrCreateWrapper(msg);
    wrapper.remove();
    expect(msg.contains(wrapper)).toBe(false);

    reconcileMessageHost(msg);
    expect(msg.contains(wrapper)).toBe(true);
    expect(wrapper.parentElement).toBe(msg);
  });

  it("wrapper owned by one message is not adopted by another", () => {
    const wrapper = getOrCreateWrapper(msg);

    const msg2 = document.createElement("div");
    msg2.className = "ds-message _63c77b1";
    document.body.appendChild(msg2);

    // msg2 should get its own wrapper, not adopt msg's
    const wrapper2 = getOrCreateWrapper(msg2);
    expect(wrapper2).not.toBe(wrapper);
    expect(wrapper.parentElement).toBe(msg);
    expect(wrapper2.parentElement).toBe(msg2);
  });

  it("wrapper creation for different messages is independent", () => {
    const msg2 = document.createElement("div");
    msg2.className = "ds-message _63c77b1";
    document.body.appendChild(msg2);

    const w1 = getOrCreateWrapper(msg);
    const w2 = getOrCreateWrapper(msg2);

    expect(w1).not.toBe(w2);
    expect(w1.parentElement).toBe(msg);
    expect(w2.parentElement).toBe(msg2);
  });

  it("detach removes wrapper when getOrCreateWrapper called off-DOM", () => {
    const host = getOrCreateHost(msg, "bds-overlay-host");
    const wrapper = getOrCreateWrapper(msg);
    expect(document.contains(wrapper)).toBe(true);

    // Detach message
    msg.remove();
    expect(document.contains(msg)).toBe(false);

    const refound = getOrCreateWrapper(msg);
    expect(refound).toBe(wrapper);
    expect(document.contains(wrapper)).toBe(false);
  });

  it("reconnect restores wrapper inside message", () => {
    const host = getOrCreateHost(msg, "bds-overlay-host");
    const wrapper = getOrCreateWrapper(msg);

    msg.remove();
    getOrCreateWrapper(msg);
    expect(document.contains(wrapper)).toBe(false);

    // Reconnect to a different parent
    const newParent = document.createElement("div");
    document.body.appendChild(newParent);
    newParent.appendChild(msg);

    const refound = getOrCreateWrapper(msg);
    expect(refound).toBe(wrapper);
    expect(document.contains(wrapper)).toBe(true);
    expect(wrapper.parentElement).toBe(msg);
  });

  it("permanent disposal clears ownership from both maps", () => {
    getOrCreateHost(msg, "bds-overlay-host");
    const wrapper = getOrCreateWrapper(msg);

    removeAllMessageHosts(msg);

    expect(document.contains(wrapper)).toBe(false);
    // Fresh call creates a new wrapper
    const fresh = getOrCreateWrapper(msg);
    expect(fresh).not.toBe(wrapper);
  });
});
