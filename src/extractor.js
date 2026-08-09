#!/usr/bin/env node

/*
  extractor.js — learnable frontend skeleton extractor

  Usage:
    node src/extractor.js --url https://example.com
    node src/extractor.js --url https://example.com --scaffold
    node src/extractor.js --url https://example.com --scaffold --framework react
    node src/extractor.js --config example-config.json

  Outputs (./out/<host>/):
    skeleton.html   — editable structural skeleton (placeholders, no scripts)
    structure.json  — section / layout tree
    tokens.json     — fonts, colors, spacing samples from computed styles
    outline.txt     — readable layout outline
    screenshot.png  — full-page screenshot
    palette.json    — dominant colors from screenshot
    rendered.html   — raw rendered DOM (reference only)
    scaffold/       — React+Tailwind starter (when --scaffold)
*/

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const puppeteer = require('puppeteer');
const { Vibrant } = require('node-vibrant/node');
const {
  pageExtractScript,
  sanitizeForSkeletonScript,
  cleanDOM,
  buildSkeletonHtml,
  structureOutline,
  landmarksOutline,
  buildPatternsSummary,
} = require('./skeleton');
const { generateScaffold } = require('./scaffold');

const argv = minimist(process.argv.slice(2), {
  boolean: ['scaffold', 'force'],
});
const configPath = argv.config || 'example-config.json';

function loadConfig() {
  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  const target = argv.url || argv.u || config.target;
  if (!target) {
    console.error('Target URL required. Use --url https://... or set "target" in config.');
    process.exit(1);
  }

  // CLI --url implies intentional run; config still needs allow_live_download unless --force
  const allow =
    argv.force === true ||
    argv.url ||
    argv.u ||
    config.allow_live_download === true;

  if (!allow) {
    console.error(
      'Live extraction is DISABLED. Set "allow_live_download": true in config, or pass --url / --force.'
    );
    process.exit(2);
  }

  return {
    target,
    outDir: argv.out || config.outDir || './out',
    viewportWidth: Number(argv.width || config.viewportWidth || 1440),
    viewportHeight: Number(argv.height || config.viewportHeight || 900),
    waitMs: Number(argv.wait || config.waitMs || 1500),
    scaffold: argv.scaffold === true || config.scaffold === true,
    framework: String(argv.framework || config.framework || 'react').toLowerCase(),
  };
}

function resetDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

(async () => {
  const config = loadConfig();
  const url = config.target;
  let host;
  try {
    host = new URL(url).host.replace(/[:]/g, '-');
  } catch {
    console.error('Invalid URL:', url);
    process.exit(1);
  }

  const dest = path.join(config.outDir, host);
  resetDir(dest);

  console.log(`Extracting learnable skeleton from ${url}`);
  console.log(`Output -> ${dest}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: config.viewportWidth,
      height: config.viewportHeight,
    });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
    if (config.waitMs > 0) {
      await new Promise((r) => setTimeout(r, config.waitMs));
    }

    // Try to dismiss cookie/consent overlays (best-effort)
    await page.evaluate(() => {
      const texts = /accept|agree|allow|kabul|tamam|accept all|got it/i;
      for (const el of document.querySelectorAll('button, [role="button"], a')) {
        const t = (el.innerText || el.textContent || '').trim();
        if (t && t.length < 40 && texts.test(t)) {
          try { el.click(); } catch (_) {}
        }
      }
      document.body.removeAttribute('data-scroll-locked');
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 800));

    const screenshotPath = path.join(dest, 'screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('screenshot.png');

    const extracted = await page.evaluate(pageExtractScript);
    const generatedAt = new Date().toISOString();

    // Raw rendered DOM kept for reference
    fs.writeFileSync(path.join(dest, 'rendered.html'), extracted.html, 'utf8');
    console.log('rendered.html');

    // Mutate live DOM for skeleton (wrapper dedup / svg / astro / links), then Node clean
    const skeletonSource = await page.evaluate(sanitizeForSkeletonScript);
    const sanitizedHtml = cleanDOM(skeletonSource);
    const skeletonHtml = buildSkeletonHtml(sanitizedHtml, {
      url: extracted.url || url,
      generatedAt,
    });
    fs.writeFileSync(path.join(dest, 'skeleton.html'), skeletonHtml, 'utf8');
    console.log('skeleton.html');

    const structurePayload = {
      source: extracted.url || url,
      title: extracted.title,
      generatedAt,
      note: 'Structural map for rebuilding your own UI — not a pixel-perfect clone.',
      landmarks: extracted.landmarks || [],
      tree: extracted.structure,
    };
    writeJson(path.join(dest, 'structure.json'), structurePayload);
    console.log('structure.json');

    const patternsSummary = buildPatternsSummary(extracted.landmarks || []);
    writeJson(path.join(dest, 'patterns-summary.json'), {
      source: extracted.url || url,
      generatedAt,
      ...patternsSummary,
      footerProbe: extracted.footerProbe || null,
    });
    console.log('patterns-summary.json');

    // Prefer hierarchical tree in outline; flat landmarks as secondary scan
    const treeLines = structureOutline(extracted.structure);
    const landmarkLines = landmarksOutline(extracted.landmarks || []);
    const patternLines = (patternsSummary.detected || [])
      .map((d) => `- ${d.pattern} ×${d.count} (landmarks: ${d.landmarkIndices.join(', ')})`)
      .join('\n');
    const outlineBody = [
      '=== PATTERNS ===',
      patternLines || '(none detected)',
      `unrecognized landmarks: ${patternsSummary.unrecognized}`,
      '',
      '=== STRUCTURE TREE ===',
      treeLines.join('\n') || '(empty)',
      '',
      '=== LANDMARKS (flat, deduped) ===',
      landmarkLines.join('\n') || '(none)',
      '',
    ].join('\n');
    fs.writeFileSync(
      path.join(dest, 'outline.txt'),
      `Source: ${url}\nTitle: ${extracted.title}\n\n${outlineBody}`,
      'utf8'
    );
    console.log('outline.txt');

    const tokensPayload = {
      source: extracted.url || url,
      title: extracted.title,
      generatedAt,
      note: 'Design tokens sampled from computed styles. Rebuild with your own brand values.',
      ...extracted.tokens,
    };
    writeJson(path.join(dest, 'tokens.json'), tokensPayload);
    console.log('tokens.json');

    let paletteOut = {};
    try {
      const palette = await Vibrant.from(screenshotPath).getPalette();
      paletteOut = Object.keys(palette).reduce((acc, k) => {
        acc[k] = palette[k] ? palette[k].hex : null;
        return acc;
      }, {});
      writeJson(path.join(dest, 'palette.json'), paletteOut);
      console.log('palette.json');
    } catch (err) {
      console.warn('Palette extraction skipped:', err.message);
    }

    let scaffoldResult = null;
    if (config.scaffold) {
      try {
        scaffoldResult = generateScaffold({
          outDir: dest,
          landmarks: extracted.landmarks || [],
          tokens: extracted.tokens || {},
          palette: paletteOut,
          framework: config.framework,
          host,
          sourceUrl: extracted.url || url,
        });
        console.log(`scaffold/ (${scaffoldResult.components.length} components, ${scaffoldResult.framework})`);
        console.log(`  cd ${scaffoldResult.dir} && npm install && npm run dev`);
      } catch (err) {
        console.error('Scaffold generation failed:', err.message || err);
        process.exit(4);
      }
    }

    const outputs = [
      'skeleton.html',
      'structure.json',
      'patterns-summary.json',
      'tokens.json',
      'outline.txt',
      'screenshot.png',
      'palette.json',
      'rendered.html',
    ];
    if (scaffoldResult) outputs.push('scaffold/');

    writeJson(path.join(dest, 'meta.json'), {
      source: url,
      finalUrl: extracted.url || url,
      title: extracted.title,
      generatedAt,
      outputs,
      scaffold: scaffoldResult
        ? {
            framework: scaffoldResult.framework,
            components: scaffoldResult.components,
            path: 'scaffold/',
          }
        : null,
      howToUse: scaffoldResult
        ? 'Open scaffold/ and run npm install && npm run dev. Use patterns-summary.json + tokens as reference — replace placeholders with your own brand.'
        : 'Open patterns-summary.json + outline.txt + tokens.json. Rebuild your own frontend using detected UI patterns and design tokens as reference — change structure, content, and brand freely.',
    });

    console.log('\nDone. Start with:');
    if (scaffoldResult) {
      console.log(`  ${scaffoldResult.dir}`);
    }
    console.log(`  ${path.join(dest, 'patterns-summary.json')}`);
    console.log(`  ${path.join(dest, 'outline.txt')}`);
    console.log(`  ${path.join(dest, 'skeleton.html')}`);
  } catch (err) {
    console.error('Extraction failed:', err.message || err);
    process.exit(3);
  } finally {
    await browser.close();
  }
})();
