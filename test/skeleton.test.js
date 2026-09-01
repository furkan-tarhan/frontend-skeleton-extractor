const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { pageExtractScript } = require('../src/skeleton');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

let browser;

before(async () => {
  browser = await puppeteer.launch({ headless: true });
});

after(async () => {
  await browser.close();
});

async function extractFixture(t, filename) {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, filename), 'utf8');
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.setViewport({ width: 1440, height: 900 });
  await page.setContent(html, { waitUntil: 'load' });
  return page.evaluate(pageExtractScript);
}

function patternTypesOf(result) {
  return result.landmarks.map((lm) => (lm.pattern && lm.pattern.type) || null);
}

test('header with only a class name (no <header> tag, no id) is recognized as navigation', async (t) => {
  const result = await extractFixture(t, 'header-class-only.html');
  const types = patternTypesOf(result);
  assert.ok(types.includes('navigation'), `expected a navigation landmark, got: ${types.join(', ')}`);
});

test('a bare class="navigation" container (no "nav"/"header" word-bounded token) is recognized as navigation', async (t) => {
  const result = await extractFixture(t, 'navigation-class-literal.html');
  const types = patternTypesOf(result);
  assert.ok(types.includes('navigation'), `expected a navigation landmark, got: ${types.join(', ')}`);
});

test('dropdown-style controls in a header are not misclassified as an FAQ accordion', async (t) => {
  const result = await extractFixture(t, 'header-dropdown-menus.html');
  const types = patternTypesOf(result);
  assert.ok(!types.includes('faq-accordion'), `expected no faq-accordion landmark, got: ${types.join(', ')}`);
});

test('a <main> spanning nearly the whole page is not misclassified as hero', async (t) => {
  const result = await extractFixture(t, 'full-page-main-hero.html');
  const main = result.landmarks.find((lm) => lm.tag === 'main');
  assert.ok(main, 'expected a <main> landmark');
  assert.notEqual(main.pattern && main.pattern.type, 'hero', 'main should not be classified as hero');
});

test('footer link columns stay part of the footer instead of becoming their own feature-grid', async (t) => {
  const result = await extractFixture(t, 'footer-link-columns.html');
  const types = patternTypesOf(result);
  assert.ok(types.includes('footer'), `expected a footer landmark, got: ${types.join(', ')}`);
  assert.ok(!types.includes('feature-grid'), `expected no feature-grid landmark, got: ${types.join(', ')}`);
});
