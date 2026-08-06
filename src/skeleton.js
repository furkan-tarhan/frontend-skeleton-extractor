/**
 * Browser-side + Node helpers for extracting a learnable frontend skeleton.
 * Goal: structure + design tokens + editable skeleton HTML — not a site clone.
 */

const cheerio = require('cheerio');

/** Runs inside the page (Puppeteer evaluate). */
function pageExtractScript() {
  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'META', 'LINK', 'BR', 'HR',
  ]);

  function roleOf(el) {
    const tag = el.tagName.toLowerCase();
    const role = (el.getAttribute('role') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const cls = (el.className && typeof el.className === 'string' ? el.className : '').toLowerCase();
    const hint = `${id} ${cls} ${role}`;

    if (tag === 'header' || role === 'banner' || /header|navbar|nav-bar|topbar/.test(hint)) return 'header';
    if (tag === 'nav' || role === 'navigation' || /(^|\s)nav(\s|$)/.test(hint)) return 'nav';
    if (tag === 'footer' || role === 'contentinfo' || /footer/.test(hint)) return 'footer';
    if (tag === 'aside' || role === 'complementary' || /sidebar|aside/.test(hint)) return 'aside';
    if (tag === 'main' || role === 'main' || /main-content|page-content/.test(hint)) return 'main';
    if (/hero|banner|jumbotron|masthead/.test(hint)) return 'hero';
    if (/card|tile|feature/.test(hint)) return 'card';
    if (/grid|columns|row/.test(hint)) return 'grid';
    if (tag === 'section' || tag === 'article') return tag;
    if (tag === 'form') return 'form';
    if (tag === 'ul' || tag === 'ol') return 'list';
    return tag;
  }

  function shortText(el, max = 60) {
    const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    return t.length > max ? t.slice(0, max) + '…' : t;
  }

  function cssSnapshot(el) {
    const s = getComputedStyle(el);
    return {
      display: s.display,
      position: s.position,
      flexDirection: s.flexDirection,
      justifyContent: s.justifyContent,
      alignItems: s.alignItems,
      gridTemplateColumns: s.gridTemplateColumns,
      gap: s.gap,
      width: s.width,
      maxWidth: s.maxWidth,
      padding: s.padding,
      margin: s.margin,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      color: s.color,
      backgroundColor: s.backgroundColor,
      borderRadius: s.borderRadius,
    };
  }

  function childElements(el) {
    const list = [...el.children];
    if (el.shadowRoot) list.push(...el.shadowRoot.children);
    return list;
  }

  function walk(el, depth, maxDepth, minArea) {
    if (!el || !el.tagName || SKIP_TAGS.has(el.tagName) || depth > maxDepth) return null;
    const rect = el.getBoundingClientRect();
    const area = Math.abs(rect.width * rect.height);
    // Top levels: keep even if small/offscreen; deeper: require some size
    if (depth > 1 && area < minArea) return null;
    if (depth > 0 && (rect.width < 30 || rect.height < 16)) return null;

    const children = [];
    for (const child of childElements(el)) {
      const node = walk(child, depth + 1, maxDepth, minArea);
      if (node) children.push(node);
    }

    const role = roleOf(el);
    const interesting =
      children.length > 0 ||
      ['header', 'nav', 'footer', 'main', 'hero', 'aside', 'section', 'article', 'form', 'card', 'grid'].includes(role) ||
      depth <= 3 ||
      tagLooksLikeBlock(el.tagName);

    if (!interesting) return null;

    return {
      role,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: el.className && typeof el.className === 'string'
        ? el.className.split(/\s+/).filter(Boolean).slice(0, 6)
        : [],
      textSample: shortText(el, 80),
      bounds: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      },
      styles: cssSnapshot(el),
      children,
    };
  }

  function tagLooksLikeBlock(tagName) {
    const t = tagName.toLowerCase();
    return ['div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside', 'astro-island', 'astro-slot'].includes(t);
  }

  /** Flat landmark list — more reliable on heavy SPAs / hashed class names */
  function collectLandmarks() {
    const selectors = [
      'header', 'nav', 'main', 'footer', 'aside', 'section', 'article',
      '[role="banner"]', '[role="navigation"]', '[role="main"]', '[role="contentinfo"]',
      'h1', 'h2', 'h3',
    ];
    const seen = new Set();
    const items = [];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (seen.has(el)) continue;
        seen.add(el);
        const rect = el.getBoundingClientRect();
        if (rect.width < 20 || rect.height < 10) continue;
        items.push({
          role: roleOf(el),
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          classes: el.className && typeof el.className === 'string'
            ? el.className.split(/\s+/).filter(Boolean).slice(0, 4)
            : [],
          textSample: shortText(el, 100),
          bounds: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          },
        });
      }
    }
    items.sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x);
    return items.slice(0, 80);
  }

  function collectTokens() {
    const fonts = new Map();
    const colors = new Map();
    const fontSizes = new Map();
    const spacings = new Map();
    const radii = new Map();

    const add = (map, key, weight = 1) => {
      if (!key || key === 'rgba(0, 0, 0, 0)' || key === 'transparent' || key === 'none') return;
      map.set(key, (map.get(key) || 0) + weight);
    };

    const nodes = document.querySelectorAll('body, body *');
    let counted = 0;
    for (const el of nodes) {
      if (counted > 800) break;
      if (SKIP_TAGS.has(el.tagName)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      const s = getComputedStyle(el);
      const weight = Math.max(1, Math.round((rect.width * rect.height) / 10000));

      add(fonts, s.fontFamily, weight);
      add(fontSizes, s.fontSize, weight);
      add(colors, s.color, weight);
      add(colors, s.backgroundColor, weight);
      add(colors, s.borderColor, Math.max(1, Math.floor(weight / 2)));
      add(spacings, s.paddingTop, 1);
      add(spacings, s.paddingLeft, 1);
      add(spacings, s.marginTop, 1);
      add(spacings, s.gap, 1);
      add(radii, s.borderRadius, 1);
      counted += 1;
    }

    const top = (map, n = 12) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([value, score]) => ({ value, score }));

    return {
      fonts: top(fonts, 8),
      fontSizes: top(fontSizes, 10),
      colors: top(colors, 16),
      spacings: top(spacings, 12).filter((x) => x.value && x.value !== '0px'),
      borderRadii: top(radii, 8).filter((x) => x.value && x.value !== '0px'),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      title: document.title || '',
    };
  }

  // Unlock scroll / hide common blockers so layout rects are usable
  try {
    document.body.removeAttribute('data-scroll-locked');
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.querySelectorAll('[aria-modal="true"], [role="dialog"]').forEach((el) => {
      el.style.pointerEvents = 'none';
      el.setAttribute('data-skeleton-ignored', '1');
    });
  } catch (_) {}

  const root = document.body;
  const structure = walk(root, 0, 6, 2500);
  const landmarks = collectLandmarks();

  return {
    url: location.href,
    title: document.title || '',
    tokens: collectTokens(),
    structure,
    landmarks,
    html: document.documentElement.outerHTML,
  };
}

/**
 * Turn rendered HTML into a learnable skeleton:
 * - strip scripts / iframes / event handlers
 * - replace long text with placeholders
 * - keep tags, classes, ids, layout-ish structure
 */
function buildSkeletonHtml(renderedHtml, meta = {}) {
  const $ = cheerio.load(renderedHtml);

  $('script, noscript, iframe, template').remove();
  $('link[rel="preload"], link[rel="modulepreload"]').remove();
  $('link[rel="alternate"], link[rel="canonical"], meta[name^="DC."], meta[property^="og:"], meta[property^="twitter:"], meta[name="sentry-trace"], meta[name="baggage"], meta[name="sentry-route-name"], meta[name="keywords"], meta[name="google-site-verification"], meta[name="yandex-verification"]').remove();
  $('[onclick], [onload], [onerror], [onmouseover]').each((_, el) => {
    const attribs = el.attribs || {};
    for (const key of Object.keys(attribs)) {
      if (key.toLowerCase().startsWith('on')) $(el).removeAttr(key);
    }
  });

  // Neutralize images / media
  $('img, source, video, audio').each((_, el) => {
    const $el = $(el);
    if ($el.is('img')) {
      const w = $el.attr('width') || '';
      const h = $el.attr('height') || '';
      $el.attr('src', `https://placehold.co/${w || 600}x${h || 320}?text=Image`);
      $el.attr('alt', $el.attr('alt') || 'placeholder');
      $el.removeAttr('srcset');
    } else {
      $el.removeAttr('src');
      $el.removeAttr('srcset');
    }
  });

  $('title').text('Frontend Skeleton');
  $('meta[name="description"]').attr('content', 'Learnable frontend skeleton');

  // Replace visible text with placeholders (keep tags/classes/structure)
  $('*').each((_, el) => {
    const tag = (el.tagName || el.name || '').toLowerCase();
    if (['script', 'style', 'svg', 'code', 'pre', 'noscript', 'title'].includes(tag)) return;
    $(el)
      .contents()
      .each((__, node) => {
        if (node.type !== 'text') return;
        const raw = (node.data || '').replace(/\s+/g, ' ');
        if (!raw.trim() || raw.trim().length <= 2) return;
        node.data = raw.trim().length <= 18 ? ' Label ' : ' Text content ';
      });
  });

  $('title').text('Frontend Skeleton');

  // Inject skeleton banner comment + minimal base style note
  const note = `
<!--
  LEARNABLE FRONTEND SKELETON
  Source: ${meta.url || 'unknown'}
  Generated: ${meta.generatedAt || new Date().toISOString()}

  This is NOT a clone of the original site.
  Use it as a structural / stylistic reference to rebuild your own UI.
-->
`.trim();

  const html = $.html();
  return `${note}\n${html}`;
}

/** Flatten structure tree into a readable outline. */
function structureOutline(node, depth = 0, lines = [], max = 120) {
  if (!node || lines.length >= max) return lines;
  const indent = '  '.repeat(depth);
  const cls = (node.classes || []).slice(0, 2).join('.');
  const label = [
    node.role,
    node.tag !== node.role ? `<${node.tag}>` : null,
    node.id ? `#${node.id}` : null,
    cls ? `.${cls}` : null,
    node.bounds ? `${node.bounds.w}x${node.bounds.h}` : null,
    node.textSample ? `"${node.textSample.slice(0, 40)}"` : null,
  ]
    .filter(Boolean)
    .join(' ');
  lines.push(`${indent}- ${label}`);
  for (const child of node.children || []) {
    structureOutline(child, depth + 1, lines, max);
  }
  return lines;
}

function landmarksOutline(landmarks = []) {
  return landmarks.map((item) => {
    const cls = (item.classes || []).slice(0, 2).join('.');
    return [
      `- ${item.role}`,
      item.tag !== item.role ? `<${item.tag}>` : null,
      item.id ? `#${item.id}` : null,
      cls ? `.${cls}` : null,
      item.bounds ? `@${item.bounds.y}px ${item.bounds.w}x${item.bounds.h}` : null,
      item.textSample ? `"${item.textSample.slice(0, 50)}"` : null,
    ]
      .filter(Boolean)
      .join(' ');
  });
}

module.exports = {
  pageExtractScript,
  buildSkeletonHtml,
  structureOutline,
  landmarksOutline,
};
