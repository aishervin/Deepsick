const fs = require('fs');
const path = require('path');

const localesDir = 'src/locales';
const files = fs.readdirSync(localesDir);

for (const file of files) {
  if (file.endsWith('.json')) {
    const filePath = path.join(localesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/Deepsick is an open-source community project\./gi, 'Deepsick is developed by ☬SHΞN™.');
    fs.writeFileSync(filePath, content);
  }
}
