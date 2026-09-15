const fs = require('fs');
let s = fs.readFileSync('src/content/ui/Drawer.svelte', 'utf8');

const newFooter = `<div class="bds-drawer-footer" style="flex-direction: column; align-items: center; gap: 8px;">
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
      </div>`;

s = s.replace(/<div class="bds-drawer-footer">[\s\S]*?<\/div>\s*<\/div>\s*\{\/if\}\s*<\/aside>/, newFooter + '\n    </div>\n  {/if}\n</aside>');

fs.writeFileSync('src/content/ui/Drawer.svelte', s);
