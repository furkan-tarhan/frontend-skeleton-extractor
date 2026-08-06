#!/usr/bin/env node

/*
 collect-styles.js
 - Scans a downloaded site directory for HTML files and CSS files
 - Runs PurgeCSS to remove unused selectors (very basic example)
 - Writes a purged.css file in the target directory

 Note: PurgeCSS needs HTML files to determine usage. This script is a starter and does not replace manual auditing.
*/

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const glob = require('glob');
const PurgeCSS = require('purgecss').PurgeCSS;

const argv = minimist(process.argv.slice(2));
const targetDir = argv.dir || argv.d || 'out';

if (!fs.existsSync(targetDir)) {
  console.error('Target directory not found:', targetDir);
  process.exit(1);
}

// Find the first host folder inside out/ (if user passed out)
const hosts = fs.readdirSync(targetDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
if (hosts.length === 0) {
  console.error('No downloaded site directories found inside', targetDir);
  process.exit(1);
}

const hostFolder = path.join(targetDir, hosts[0]);
console.log('Using host folder:', hostFolder);

// gather html files and css files
const htmlFiles = glob.sync('**/*.html', { cwd: hostFolder, absolute: true });
const cssFiles = glob.sync('**/*.css', { cwd: hostFolder, absolute: true });

if (htmlFiles.length === 0 || cssFiles.length === 0) {
  console.error('Need both HTML and CSS files in the downloaded folder. Found html=', htmlFiles.length, 'css=', cssFiles.length);
  process.exit(2);
}

(async () => {
  try {
    const purgeCSSResult = await new PurgeCSS().purge({
      content: htmlFiles,
      css: cssFiles,
    });

    // Combine results
    const combined = purgeCSSResult.map(r => r.css).join('\n');
    const outPath = path.join(hostFolder, 'purged.css');
    fs.writeFileSync(outPath, combined, 'utf8');
    console.log('Purged CSS written to', outPath);
  } catch (err) {
    console.error('Error during purge:', err);
    process.exit(3);
  }
})();
