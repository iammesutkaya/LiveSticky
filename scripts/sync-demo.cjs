const fs = require('fs');
const path = require('path');

const srcStylesPath = path.join(__dirname, '../src/client/styles.css');
const docsStylesPath = path.join(__dirname, '../docs/landing.css');

function scopeSelectorGroup(selectorGroup, prefix) {
  const clean = selectorGroup.trim();
  if (!clean) return '';
  if (clean.startsWith('@')) {
    return clean;
  }
  return clean.split(',')
    .map(sel => {
      let s = sel.trim();
      if (!s) return '';
      
      // Replace .dashboard class reference with our mock prefix
      s = s.replace(/\.dashboard\b/g, prefix);
      
      if (s === ':root' || s === 'html' || s === 'body' || s === prefix) {
        return prefix;
      }
      
      // If it already starts with or contains the prefix, keep it
      if (s.startsWith(prefix)) return s;
      return `${prefix} ${s}`;
    })
    .join(', ');
}

function scopeCssText(css, prefix) {
  let output = '';
  let i = 0;
  let depth = 0;
  let buffer = '';
  let mediaHeader = '';
  let inMedia = false;
  
  while (i < css.length) {
    const char = css[i];
    if (char === '{') {
      depth++;
      if (depth === 1) {
        const selector = buffer.trim();
        if (selector.startsWith('@media')) {
          inMedia = true;
          mediaHeader = selector;
          output += selector + ' {\n';
        } else {
          output += scopeSelectorGroup(selector, prefix) + ' {\n';
        }
        buffer = '';
      } else {
        if (inMedia && depth === 2) {
          const selector = buffer.trim();
          output += scopeSelectorGroup(selector, prefix) + ' {\n';
          buffer = '';
        } else {
          output += '{\n';
        }
      }
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        inMedia = false;
      }
      output += '}\n';
    } else {
      if (depth === 0 || (inMedia && depth === 1)) {
        buffer += char;
      } else {
        output += char;
      }
    }
    i++;
  }
  return output;
}

function run() {
  console.log('[sync-demo] Synchronizing client dashboard styles to landing page...');
  
  if (!fs.existsSync(srcStylesPath)) {
    console.error(`Source styles not found at ${srcStylesPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(docsStylesPath)) {
    console.error(`Docs styles not found at ${docsStylesPath}`);
    process.exit(1);
  }
  
  const scopedCss = ''; // Scoped mockup styles are no longer needed because of the iframe sandbox boundary
  
  const landingCssContent = fs.readFileSync(docsStylesPath, 'utf8');
  
  const startIndex = landingCssContent.indexOf('/* MOCKUP_STYLES_START */');
  const endIndex = landingCssContent.indexOf('/* MOCKUP_STYLES_END */');
  
  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    console.error('Error: Could not find MOCKUP_STYLES_START and MOCKUP_STYLES_END markers in docs/landing.css');
    process.exit(1);
  }
  
  const beforeMarker = landingCssContent.substring(0, startIndex + '/* MOCKUP_STYLES_START */'.length);
  const afterMarker = landingCssContent.substring(endIndex);
  
  // Combine it all
  const updatedCss = beforeMarker + '\n' + scopedCss + '\n' + afterMarker;
  
  fs.writeFileSync(docsStylesPath, updatedCss, 'utf8');
  console.log('[sync-demo] Successfully synced and scoped styles to docs/landing.css');

  // Copy dist/client/ directory contents directly to docs/demo/
  const distClientPath = path.join(__dirname, '../dist/client');
  const docsDemoPath = path.join(__dirname, '../docs/demo');

  if (fs.existsSync(distClientPath)) {
    console.log('[sync-demo] Copying compiled Vite client to docs/demo/...');
    if (!fs.existsSync(docsDemoPath)) {
      fs.mkdirSync(docsDemoPath, { recursive: true });
    }
    const files = fs.readdirSync(distClientPath);
    for (const file of files) {
      const srcFile = path.join(distClientPath, file);
      const destFile = path.join(docsDemoPath, file);
      const stat = fs.statSync(srcFile);
      if (stat.isDirectory()) {
        fs.cpSync(srcFile, destFile, { recursive: true });
      } else {
        fs.copyFileSync(srcFile, destFile);
      }
    }
    console.log('[sync-demo] Copied client assets to docs/demo/ successfully.');

    // Copy icon.png from docs/ to docs/demo/icon.png so the mock avatar loads correctly
    const srcIcon = path.join(__dirname, '../docs/icon.png');
    const destIcon = path.join(docsDemoPath, 'icon.png');
    if (fs.existsSync(srcIcon)) {
      fs.copyFileSync(srcIcon, destIcon);
      console.log('[sync-demo] Copied icon.png to docs/demo/icon.png successfully.');
    }

    const srcProfilePic = path.join(__dirname, '../docs/sticky-profile-pic.png');
    const destProfilePic = path.join(docsDemoPath, 'sticky-profile-pic.png');
    if (fs.existsSync(srcProfilePic)) {
      fs.copyFileSync(srcProfilePic, destProfilePic);
      console.log('[sync-demo] Copied sticky-profile-pic.png to docs/demo/ successfully.');
    }

    const mockImages = ['twitch-stream.png', 'youtube-stream.png', 'kick-stream.png'];
    for (const img of mockImages) {
      const srcImg = path.join(__dirname, '../docs/', img);
      const destImg = path.join(docsDemoPath, img);
      if (fs.existsSync(srcImg)) {
        fs.copyFileSync(srcImg, destImg);
        console.log(`[sync-demo] Copied ${img} to docs/demo/ successfully.`);
      }
    }
  }
}

run();
