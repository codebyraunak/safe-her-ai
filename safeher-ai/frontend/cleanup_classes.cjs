const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src/pages');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the erroneously injected dark:bg-white/40 and dark:bg-white/60 classes
  const regex = /dark:bg-white\/(40|60)\s+/g;

  if (regex.test(content)) {
    const newContent = content.replace(regex, '');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Cleaned up ${path.basename(filePath)}`);
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
console.log('Cleanup complete.');
