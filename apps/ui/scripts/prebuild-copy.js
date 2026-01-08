const fs = require('fs');
const path = require('path');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach((file) => {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }
}

const source = path.resolve(__dirname, '../src/main/anti-detection');
const target = path.resolve(__dirname, '../out/main/anti-detection');

try {
  if (fs.existsSync(source)) {
    console.log(`Copying ${source} to ${target}...`);
    copyFolderRecursiveSync(source, target);
    console.log('Successfully copied anti-detection folder.');
  } else {
    console.log(`Source folder ${source} does not exist, skipping copy.`);
    // Still ensure out/main exists
    const outMain = path.resolve(__dirname, '../out/main');
    if (!fs.existsSync(outMain)) {
      fs.mkdirSync(outMain, { recursive: true });
    }
  }
} catch (err) {
  console.error('Error during prebuild:copy:', err);
  process.exit(1);
}
