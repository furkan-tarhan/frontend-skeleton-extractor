#!/usr/bin/env node

/*
  extractor.js
  - Loads example-config.json (or a provided --config path)
  - IF config.allow_live_download !== true, the script exits with instructions.
  - Otherwise: uses website-scraper to download the target URL to outDir
  - Then opens the downloaded page with Puppeteer, takes a screenshot, and runs node-vibrant to extract a palette

  IMPORTANT: live scraping is gated behind allow_live_download in config to avoid accidental scans.
*/

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const websiteScraper = require('website-scraper');
const Vibrant = require('node-vibrant');
const puppeteer = require('puppeteer');

const argv = minimist(process.argv.slice(2));
const configPath = argv.config || 'example-config.json';

if (!fs.existsSync(configPath)) {
  console.error(`Config file not found: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!config.target) {
  console.error('Config error: "target" URL is required. Edit example-config.json');
  process.exit(1);
}

if (!config.allow_live_download) {
  console.error('Live download is DISABLED in config for safety. To enable, set "allow_live_download": true in example-config.json (and confirm you have permission to scrape the target).');
  console.error('Aborting to avoid accidental scraping.');
  process.exit(2);
}

(async () => {
  try {
    const url = config.target;
    const outDir = config.outDir || 'out';
    const host = new URL(url).host.replace(/[:]/g, '-');
    const dest = path.join(outDir, host);

    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    console.log(`Starting website-scraper for ${url} -> ${dest}`);

    await websiteScraper({
      urls: [url],
      directory: dest,
      recursive: true,
      maxDepth: config.maxDepth || 2,
      // optional: add plugins or filters here
    });

    console.log('Download complete. Launching headless browser to capture screenshot...');

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });

    const screenshotPath = path.join(dest, 'screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    console.log(`Screenshot saved to ${screenshotPath}`);

    console.log('Extracting color palette (node-vibrant)...');
    const v = await Vibrant.from(screenshotPath).getPalette();
    const paletteOut = Object.keys(v).reduce((acc, k) => {
      acc[k] = v[k] ? v[k].getHex() : null;
      return acc;
    }, {});

    const palettePath = path.join(dest, 'palette.json');
    fs.writeFileSync(palettePath, JSON.stringify(paletteOut, null, 2), 'utf8');

    console.log(`Palette written to ${palettePath}`);

    await browser.close();

    console.log('Done. Note: Purging CSS is a separate step (node src/collect-styles.js).');
  } catch (err) {
    console.error('Error during extraction:', err);
    process.exit(3);
  }
})();
