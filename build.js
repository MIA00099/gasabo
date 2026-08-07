import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Copy public assets
if (fs.existsSync('public')) {
  fs.cpSync('public', distDir, { recursive: true });
}

// Copy CSS and JS assets
fs.cpSync('src', path.join(distDir, 'src'), { recursive: true });

// Read index.html
let html = fs.readFileSync('index.html', 'utf-8');
fs.writeFileSync(path.join(distDir, 'index.html'), html);

console.log('Production build completed successfully to dist/');
