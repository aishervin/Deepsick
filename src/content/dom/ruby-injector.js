import { mount, unmount } from "svelte";
import CodeRunner from "../ui/CodeRunner.svelte";

const INJECTED_ATTR = "data-bds-rb-run-injected";

export function injectRubyRunButtons(rootNode) {
  if (!rootNode) return;

  const codeBlocks = rootNode.querySelectorAll(`.md-code-block:not([${INJECTED_ATTR}])`);

  for (const block of codeBlocks) {
    if (!isRubyCodeBlock(block)) continue;

    const preEl = block.querySelector("pre");
    if (!preEl) continue;

    block.setAttribute(INJECTED_ATTR, "1");
    injectButton(block, preEl);
  }
}

function isRubyCodeBlock(block) {
  const banner =
    block.querySelector(".md-code-block-banner") ||
    block.querySelector('[class*="code-block-banner"]');
  if (banner) {
    const spans = banner.querySelectorAll("span");
    for (const span of spans) {
      const t = span.textContent.trim().toLowerCase();
      if (t === "ruby" || t === "rb") return true;
      if (t === "python" || t === "py" || t === "javascript" || t === "js" || t === "typescript" || t === "ts" || t === "lua") return false;
    }
  }

  const codeEl = block.querySelector('pre code[class*="language-"]');
  if (codeEl) {
    const cls = Array.from(codeEl.classList).find(c => c.startsWith('language-'));
    if (cls) {
      const lang = cls.replace('language-', '').toLowerCase();
      if (lang === "ruby" || lang === "rb") return true;
    }
  }

  const text = block.querySelector("pre")?.textContent || "";
  if (/^(def |class |require |puts |print )/m.test(text) && /\bend\b/m.test(text)) {
    if (!/^(import |from |const |let |var |function |local )/m.test(text)) {
      return true;
    }
  }

  return false;
}

function injectButton(block, preEl) {
  const btnContainer = findButtonContainer(block);

  const runBtn = document.createElement("button");
  runBtn.type = "button";
  runBtn.setAttribute("role", "button");
  runBtn.className = "ds-atom-button ds-text-button ds-text-button--with-icon bds-run-btn";
  runBtn.style.marginRight = "8px";

  const iconHtml = `
    <div class="ds-icon ds-atom-button__icon" style="font-size: 16px; width: 16px; height: 16px; margin-right: 3px; color: #dc2626;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 18L6 12l10-6v12z"></path>
      </svg>
    </div>
  `;

  runBtn.innerHTML = `${iconHtml}<span><span class="code-info-button-text">Run Ruby</span></span><div class="ds-focus-ring"></div>`;

  let mounted = null;

  runBtn.addEventListener("click", () => {
    if (mounted) {
      mounted.instance.$destroy ? mounted.instance.$destroy() : mounted.unmount();
      mounted.container.remove();
      mounted = null;
      runBtn.querySelector(".code-info-button-text").textContent = "Run Ruby";
      runBtn.querySelector(".ds-icon").style.color = "#dc2626";
      runBtn.querySelector("svg").innerHTML = '<path d="M16 18L6 12l10-6v12z"></path>';
      return;
    }

    const code = preEl.textContent || "";
    const container = document.createElement("div");
    block.appendChild(container);

    const instance = mount(CodeRunner, {
      target: container,
      props: {
        content: code,
        language: "ruby"
      }
    });

    mounted = { instance, container, unmount: () => unmount(instance) };

    runBtn.querySelector(".code-info-button-text").textContent = "Close";
    runBtn.querySelector(".ds-icon").style.color = "#ef4444";
    runBtn.querySelector("svg").innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
  });

  if (btnContainer) {
    btnContainer.insertBefore(runBtn, btnContainer.firstChild);
  } else {
    const banner =
      block.querySelector(".md-code-block-banner") ||
      block.querySelector('[class*="code-block-banner"]');
    if (banner) {
      banner.appendChild(runBtn);
    }
  }
}

function findButtonContainer(block) {
  const btnText = block.querySelector(
    `.code-info-button-text:not(.bds-run-btn-text)`,
  );
  if (btnText) {
    const btn = btnText.closest("button");
    if (btn && btn.parentElement && !btn.classList.contains("bds-run-btn")) {
      return btn.parentElement;
    }
  }

  const dsBtns = block.querySelectorAll(".ds-atom-button");
  for (const b of dsBtns) {
    if (!b.classList.contains("bds-run-btn") && b.parentElement) {
      return b.parentElement;
    }
  }

  return null;
}
