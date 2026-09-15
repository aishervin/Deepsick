import { devLog } from "../../lib/dev-log.js"
import { injectPureTextAndSend, findChatEditor } from "../auto.js"
import { extractMessageMarkdown } from "../dom/message-text.js"
import { isSystemGenerating } from "../message-processor.svelte.js"
import { remoteConfig, detectModelType } from "../../lib/remote-config.svelte.js"
import state from "../state.js"

const PROMPT_A = `You are about to lose access to this entire conversation history. Before that happens, produce a complete, self-contained HANDOFF DOCUMENT that will let a new instance of you (with zero memory of this conversation) pick up exactly where we left off, with no loss of context, no re-litigating settled decisions, and no repeating mistakes already ruled out.

Write the handoff using the structure below. Be precise, dense, and concrete. Prefer specifics (file names, exact terms, version numbers, exact wording of decisions) over vague narrative summaries. Omit pleasantries and anything that doesn't affect future actions. If a section has no relevant content, write "None" rather than skipping or padding it.

## 1. Objective
One or two sentences: what are we actually trying to accomplish, and what does "done" look like?

## 2. Current State
What exists right now — what has been built, written, decided, or delivered so far. Factual, not narrative.

## 3. Key Decisions & Rationale
Every meaningful decision made, paired with WHY it was made. This is the most important section — do not compress it. If a decision involved a tradeoff, state what was given up and why that was acceptable.

## 4. Rejected Approaches
Anything tried, proposed, or considered and then explicitly rejected, with the reason. This stops the next session from re-suggesting something already ruled out.

## 5. Open Questions / Unresolved Issues
Anything still undecided, ambiguous, or blocked — including what or who is needed to unblock it.

## 6. Next Steps
A concrete, ordered list of what should happen next.

## 7. Constraints & Preferences
Standing rules, style requirements, tool/library/version constraints, formatting requirements, or stated preferences that must keep being respected.

## 8. Technical Context
File paths, repo names, key code structure, function/class/module names, schemas, API contracts, dependencies and versions — anything needed to orient without re-reading everything from scratch.

## 9. Terminology / Glossary
Project-specific terms, abbreviations, or naming conventions introduced in this conversation that wouldn't be obvious out of context.

Output only the handoff document itself, formatted in Markdown, ready to be copy-pasted as the opening message of a new conversation. No preamble before it, no commentary after it.
Do not mention or include Better DeepSeek (BDS) instructions, custom BDS tools, or BDS tags in the summary or handoff document.
`

const PROMPT_B_PREAMBLE = `The following is a handoff document from a previous conversation. Treat everything in it as established, already-decided context. Do not re-derive, re-ask, or re-litigate anything marked as a decision in section 3, and do not re-suggest anything listed in section 4 (Rejected Approaches) unless something has materially changed and you flag it explicitly. Read the Objective and Current State first, then continue directly from Next Steps. If anything in the document is ambiguous or seems inconsistent, ask one targeted question before proceeding — don't guess silently.

--- HANDOFF DOCUMENT START ---`

const PROMPT_B_POSTAMBLE = `--- HANDOFF DOCUMENT END ---

Confirm in one or two sentences that you've absorbed the context, then proceed with the first item in Next Steps.`

function hasMessages() {
  return document.querySelectorAll(".ds-message").length > 0
}

function waitForGenerationEnd(timeoutMs = 120000) {
  devLog("Handoff", "waitForGenerationEnd started")

  return new Promise((resolve, reject) => {
    let seenStop = false
    const timeout = setTimeout(() => {
      devLog("Handoff", "TIMEOUT - waited 120s, seenStop:", seenStop)
      reject(new Error("Timed out waiting for response"))
    }, timeoutMs)

    const timer = setInterval(() => {
      const generating = isSystemGenerating()
      devLog("Handoff", "poll - generating:", generating, "seenStop:", seenStop)
      if (generating) seenStop = true
      if (seenStop && !generating) {
        devLog("Handoff", "Generation ended, settling...")
        clearInterval(timer)
        clearTimeout(timeout)
        setTimeout(() => {
          const nodes = Array.from(new Set(document.querySelectorAll(".ds-message")))
          devLog("Handoff", "messageNodes found:", nodes.length)
          if (nodes.length > 0) {
            const latest = nodes[nodes.length - 1]
            const md = extractMessageMarkdown(latest)
            const txt = latest.textContent || ""
            devLog("Handoff", "Handoff extracted, markdown length:", md?.length, "text length:", txt.length)
            resolve(md || txt)
          } else {
            devLog("Handoff", "ERROR - no messages found after generation")
            reject(new Error("No message found"))
          }
        }, 1000)
      }
    }, 500)
  })
}

export async function performSummarize() {
  if (!hasMessages()) {
    devLog("Handoff", "performSummarize - no messages")
    if (state.ui) state.ui.showToast("No messages to summarize")
    return
  }
  devLog("Handoff", "performSummarize - sending PROMPT_A")
  const ok = await injectPureTextAndSend(PROMPT_A)
  devLog("Handoff", "performSummarize - send result:", ok)
  if (!ok && state.ui) state.ui.showToast("Failed to send summarization prompt")
}

export async function performCompress() {
  if (!hasMessages()) {
    devLog("Handoff", "performCompress - no messages")
    if (state.ui) state.ui.showToast("No messages to compress")
    return
  }
  devLog("Handoff", "performCompress - sending PROMPT_A")
  try {
    const ok = await injectPureTextAndSend(PROMPT_A)
    devLog("Handoff", "performCompress - send result:", ok)
    if (!ok) {
      if (state.ui) state.ui.showToast("Failed to send handoff prompt")
      return
    }
    devLog("Handoff", "performCompress - waiting for generation end")
    const handoff = await waitForGenerationEnd()
    devLog("Handoff", "performCompress - handoff received, length:", handoff.length)
    const modelType = detectModelType()
    devLog("Handoff", "performCompress - modelType detected:", modelType)
    sessionStorage.setItem("bds:pending-handoff", JSON.stringify({ handoff, modelType }))
    devLog("Handoff", "performCompress - navigating to /")
    window.location.href = "https://chat.deepseek.com/"
  } catch (err) {
    devLog("Handoff", "performCompress - error:", err.message)
    if (state.ui) state.ui.showToast(`Handoff failed: ${err.message}`)
  }
}

export function setDeepSeekModel(modelName) {
  devLog("Handoff", `setDeepSeekModel("${modelName}") called`)
  const radiogroup = document.querySelector('[role="radiogroup"]')
  devLog("Handoff", "setDeepSeekModel - radiogroup found:", !!radiogroup)
  if (!radiogroup) { console.error('[BDS:Handoff] setDeepSeekModel - radiogroup not found'); return false }
  const buttons = radiogroup.querySelectorAll('[role="radio"]')
  devLog("Handoff", "setDeepSeekModel - buttons in radiogroup:", buttons.length)
  buttons.forEach((b, i) => {
    devLog("Handoff", `setDeepSeekModel - btn #${i}: checked="${b.getAttribute('aria-checked')}" data-model-type="${b.getAttribute('data-model-type')}" text="${(b.textContent || '').trim().substring(0, 40)}"`)
  })
  const targetBtn = Array.from(buttons).find(btn => {
    const textMatch = btn.textContent.toLowerCase().includes(modelName.toLowerCase())
    const dataMatch = btn.getAttribute('data-model-type') === modelName.toLowerCase()
    devLog("Handoff", `setDeepSeekModel - match check: text="${(btn.textContent || '').trim().substring(0, 30)}" textMatch=${textMatch} dataMatch=${dataMatch}`)
    return textMatch || dataMatch
  })
  devLog("Handoff", "setDeepSeekModel - targetBtn found:", !!targetBtn)
  if (!targetBtn) { console.error(`[BDS:Handoff] setDeepSeekModel - model "${modelName}" not found among buttons`); return false }
  devLog("Handoff", "setDeepSeekModel - targetBtn checked:", targetBtn.getAttribute('aria-checked'))
  if (targetBtn.getAttribute('aria-checked') === 'true') { devLog("Handoff", `setDeepSeekModel - already "${modelName}", skipping`); return true }
  devLog("Handoff", "setDeepSeekModel - dispatching mousedown/mouseup/click")
  targetBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  targetBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
  targetBtn.click()
  devLog("Handoff", `setDeepSeekModel - click dispatched for "${modelName}"`)
  return true
}

export function checkPendingHandoff() {
  const stored = sessionStorage.getItem("bds:pending-handoff")
  if (!stored) {
    devLog("Handoff", "checkPendingHandoff - no pending handoff")
    return
  }
  devLog("Handoff", "checkPendingHandoff - pending handoff found")
  sessionStorage.removeItem("bds:pending-handoff")

  let handoff, modelType
  try {
    const parsed = JSON.parse(stored)
    handoff = parsed.handoff || stored
    modelType = parsed.modelType || "default"
  } catch {
    handoff = stored
    modelType = "default"
  }
  devLog("Handoff", "checkPendingHandoff - modelType:", modelType, "handoff length:", handoff.length)

  const full = `${PROMPT_B_PREAMBLE}\n\n${handoff}\n\n${PROMPT_B_POSTAMBLE}`

  ;(async () => {
    if (modelType !== "default") {
      devLog("Handoff", "checkPendingHandoff - need to switch model to:", modelType)
      for (let i = 0; i < 30; i++) {
        devLog("Handoff", "checkPendingHandoff - model retry #" + i)
        if (setDeepSeekModel(modelType)) { devLog("Handoff", "checkPendingHandoff - model switched on attempt #" + i); break }
        await new Promise(r => setTimeout(r, 500))
      }
    } else {
      devLog("Handoff", "checkPendingHandoff - modelType=default, skipping model switch")
    }
    for (let i = 0; i < 30; i++) {
      const ok = await injectPureTextAndSend(full, "Context handoff")
      if (ok) {
        devLog("Handoff", "checkPendingHandoff - injected successfully")
        return
      }
      await new Promise(r => setTimeout(r, 500))
    }
    devLog("Handoff", "checkPendingHandoff - all 30 attempts failed")
    if (state.ui) state.ui.showToast("Failed to open new session for handoff — editor not found")
  })()
}
