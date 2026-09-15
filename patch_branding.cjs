const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replaceInFile = (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.svelte') || filePath.endsWith('.json') || filePath.endsWith('.html') || filePath.endsWith('.xml') || filePath.endsWith('.md')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    content = content.replace(/Better DeepSeek/g, 'Deepsick');
    content = content.replace(/BetterDeepSeek/g, 'Deepsick');
    if (content !== original) {
      fs.writeFileSync(filePath, content);
    }
  }
}

walkDir('src', replaceInFile);
walkDir('static', replaceInFile);
walkDir('android/app/src/main/res/values', replaceInFile);
