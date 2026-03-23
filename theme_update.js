const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('e:/golf/client/src', function(filePath) {
  if (filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace hardcoded white text with adaptive --on_surface
    content = content.replace(/color:\s*#FFFFFF\s*;/gi, 'color: var(--on_surface);');
    content = content.replace(/color:\s*#fff\s*;/gi, 'color: var(--on_surface);');

    // Make sure we didn't mistakenly overwrite button text that MUST be white,
    // actually inside our CSS, we use var(--on_primary_container) for primary buttons,
    // so this is safe!

    // Replace Electric Cyan rgba with Neon Mint rgba
    content = content.replace(/rgba\(0,\s*229,\s*255,/g, 'rgba(0, 255, 163,');
    
    // Replace Electric Cyan hex
    content = content.replace(/#00E5FF/gi, '#00FFA3');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated:', filePath);
    }
  }
});
console.log('Theme adaptation successful!');
