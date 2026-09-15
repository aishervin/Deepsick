const fs = require('fs');
const path = require('path');

const localesDir = 'src/locales';
const files = fs.readdirSync(localesDir);

for (const file of files) {
  if (file.endsWith('.json')) {
    const filePath = path.join(localesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Branding replacements
    content = content.replace(/Better DeepSeek/gi, 'Deepsick');
    content = content.replace(/BetterDeepSeek/gi, 'Deepsick');
    content = content.replace(/EdgeTypE/gi, 'aishervin');
    
    // Specifically fix github links if needed, but EdgeTypE -> aishervin might be enough for GitHub urls
    
    fs.writeFileSync(filePath, content);
  }
}
