const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src/pages');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (filePath.endsWith('LoginPage.jsx') || filePath.endsWith('App.jsx')) {
    return;
  }

  const replacements = [
    { regex: /\bbg-slate-950\b/g, replacement: 'bg-white/40 dark:bg-slate-950' },
    { regex: /\bbg-slate-900\b/g, replacement: 'bg-white/40 dark:bg-slate-900' },
    { regex: /\bbg-slate-800\b/g, replacement: 'bg-white/60 dark:bg-slate-800' },
    { regex: /\bbg-slate-700\b/g, replacement: 'bg-slate-200 dark:bg-slate-700' },
    { regex: /\bbg-slate-950\/(\d+)\b/g, replacement: 'bg-white/40 dark:bg-slate-950/$1' },
    { regex: /\bbg-slate-900\/(\d+)\b/g, replacement: 'bg-white/40 dark:bg-slate-900/$1' },
    { regex: /\bbg-slate-800\/(\d+)\b/g, replacement: 'bg-white/60 dark:bg-slate-800/$1' },
    { regex: /\bborder-slate-800\b/g, replacement: 'border-black/5 dark:border-slate-800' },
    { regex: /\bborder-slate-700\b/g, replacement: 'border-black/10 dark:border-slate-700' },
    { regex: /\bborder-slate-600\b/g, replacement: 'border-black/20 dark:border-slate-600' },
    { regex: /\btext-slate-50\b/g, replacement: 'text-slate-900 dark:text-slate-50' },
    { regex: /\btext-slate-200\b/g, replacement: 'text-slate-800 dark:text-slate-200' },
    { regex: /\btext-slate-300\b/g, replacement: 'text-slate-700 dark:text-slate-300' },
    { regex: /\btext-slate-400\b/g, replacement: 'text-slate-600 dark:text-slate-400' },
    { regex: /\btext-white\b/g, replacement: 'text-slate-800 dark:text-white' },
    { 
      regex: /url="https:\/\/\{s\}\.basemaps\.cartocdn\.com\/dark_all\/\{z\}\/\{x\}\/\{y\}\.png"/g, 
      replacement: 'url={theme === "dark" ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"}' 
    }
  ];

  let modified = false;
  let newContent = content;
  for (const { regex, replacement } of replacements) {
    if (regex.test(newContent)) {
      newContent = newContent.replace(regex, replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir(directoryPath);
console.log('Done mapping styles.');
