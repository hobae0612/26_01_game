const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

// List of files and directories to copy
const itemsToCopy = [
  'index.html',
  'style.css',
  'script.js',
  'translations.js',
  'img',
  'bgm'
];

// Create www directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName),
                        path.join(dest, childItemName));
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
}

itemsToCopy.forEach(item => {
  const srcPath = path.join(srcDir, item);
  const destPath = path.join(destDir, item);
  console.log(`Copying ${item}...`);
  if (fs.existsSync(srcPath)) {
    copyRecursiveSync(srcPath, destPath);
  } else {
    console.warn(`Warning: ${item} not found.`);
  }
});

console.log('Build complete! Files copied to www folder.');
