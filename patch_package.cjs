const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update scripts to ONLY support Android
pkg.scripts.build = "npm run build:android";
delete pkg.scripts['build:chrome'];
delete pkg.scripts['build:firefox'];
delete pkg.scripts['test:e2e:firefox'];
delete pkg.scripts['test:ci:web'];
pkg.scripts.test = "npm run test:unit && npm run test:e2e:android";
pkg.scripts['test:ci'] = "npm run test:ci:android";

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
