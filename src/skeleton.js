/**
 * Browser-side + Node helpers for extracting a learnable frontend skeleton.
 * Goal: structure + design tokens + editable skeleton HTML — not a site clone.
 */

const cheerio = require('cheerio');

const TRACKING_ACTION_RE =
  /facebook\.com|google-analytics|googletagmanager|doubleclick|googlesyndication|adservice|adsystem|twitter\.com\/i\/adsct|linkedin\.com\/px|hotjar|segment\.io|mixpanel|amplitude|clarity\.ms|mc\.yandex|pixel/i;

const JUNK_ID_CLASS_RE =
  /\b(beacon|pixel|banner|ads|tracking|advert)\b|trg-|ad[-_]|gtm-|fb[-_]?pixel|doubleclick/i;

/**
 * Puppeteer page.evaluate body — must be self-contained (no outer closures).
 */
function pageExtractScript() {
  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'META', 'LINK', 'BR', 'HR',
    'TEMPLATE', 'IFRAME',
  ]);

  const LANDMARK_SELECTOR = [
    'header', 'nav', 'main', 'footer', 'aside', 'section', 'article',
    '[role="banner"]', '[role="navigation"]', '[role="main"]', '[role="contentinfo"]',
    '[class*="footer" i]', '[id*="footer" i]',
    '[id*="header" i]', '[class*="navbar" i]', '[class*="NavBar" i]',
    '[id*="layout-page-header" i]',
    'h1', 'h2', 'h3',
  ].join(',');

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
    if (/hero|jumbotron|masthead/.test(hint)) return 'hero';
    if (/card|tile|feature/.test(hint)) return 'card';
    if (/grid|columns|row/.test(hint)) return 'grid';
    if (tag === 'section' || tag === 'article') return tag;
    if (tag === 'form') return 'form';
    if (tag === 'ul' || tag === 'ol') return 'list';
    if (/^h[1-6]$/.test(tag)) return tag;
    return tag;
  }

  function shortText(el, max = 80) {
    const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    return t.length > max ? t.slice(0, max) + '…' : t;
  }

  function normText(el) {
    return (el.innerText || '').replace(/\s+/g, ' ').trim();
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

  function isVisibleInViewport(el, vw) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    // Completely outside viewport (off-screen carousel slides, etc.)
    // Below-the-fold content on long pages is kept (rect.top > vh is OK).
    if (rect.right < 0 || rect.bottom < 0 || rect.left > vw) return false;
    return true;
  }

  function boundsOf(rect) {
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    };
  }

  function area(b) {
    return Math.max(0, b.w) * Math.max(0, b.h);
  }

  function intersectionArea(a, b) {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  }

  /** Overlap relative to the smaller box (1 = smaller fully inside larger). */
  function overlapRatio(a, b) {
    const inter = intersectionArea(a, b);
    if (inter <= 0) return 0;
    const smaller = Math.min(area(a), area(b));
    if (smaller <= 0) return 0;
    return inter / smaller;
  }

  /** True when boxes are nearly the same size (wrapper vs inner twin). */
  function similarSize(a, b, minRatio = 0.85) {
    const aa = area(a);
    const ab = area(b);
    if (aa <= 0 || ab <= 0) return false;
    return Math.min(aa, ab) / Math.max(aa, ab) >= minRatio;
  }

  function isJunkEl(el) {
    const id = el.id || '';
    const cls = typeof el.className === 'string' ? el.className : '';
    if (/\b(beacon|pixel|banner|ads|tracking|advert)\b|trg-|ad[-_]|gtm-|fb[-_]?pixel|doubleclick/i.test(`${id} ${cls}`)) {
      return true;
    }
    if (el.tagName === 'FORM') {
      const action = el.getAttribute('action') || '';
      if (/facebook\.com|google-analytics|googletagmanager|doubleclick|pixel/i.test(action)) return true;
    }
    return false;
  }

  function toItem(el) {
    const rect = el.getBoundingClientRect();
    return {
      el,
      role: roleOf(el),
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: el.className && typeof el.className === 'string'
        ? el.className.split(/\s+/).filter(Boolean).slice(0, 4)
        : [],
      textSample: shortText(el, 100),
      textKey: normText(el),
      bounds: boundsOf(rect),
      styles: cssSnapshot(el),
    };
  }

  /**
   * Heuristic UI pattern detection (rule-based, no ML).
   * Returns { type, confidence, signals } or null.
   */
  function detectPattern(el, bounds, ctx = {}) {
    const scores = Object.create(null);

    function add(type, amount, signal) {
      if (!scores[type]) scores[type] = { score: 0, signals: [] };
      scores[type].score += amount;
      if (signal && !scores[type].signals.includes(signal)) {
        scores[type].signals.push(signal);
      }
    }

    const id = (el.id || '').toLowerCase();
    const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
    const tag = el.tagName.toLowerCase();
    const roleAttr = (el.getAttribute('role') || '').toLowerCase();
    const hint = `${id} ${cls} ${roleAttr}`;
    const textHead = ((el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400)).toLowerCase();
    const pageH = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
      1
    );
    const bottom = (bounds.y || 0) + (bounds.h || 0);

    // Headings never get their own component pattern (parent covers them, or null)
    if (/^h[1-6]$/.test(tag)) {
      return null;
    }

    // --- class / id name matches (+0.4), including CSS-module fragments ---
    if (/accordion|faq|collaps|sss/.test(hint)) {
      add('faq-accordion', 0.4, "class/id matches accordion|faq|collaps");
    }
    if (/carousel|slider|swiper|slick|suggestioncarousel|module_slide|module_swiper|-slide__|keen-slider|embla/.test(hint)) {
      add('product-carousel', 0.4, "class matches carousel/slider/swiper/module_slide");
    }
    if (/hero|jumbotron|masthead/.test(hint)) {
      add('hero', 0.4, "class/id matches hero|jumbotron|masthead");
    }
    if (/testimonial|review|quote/.test(hint)) {
      add('testimonial', 0.4, "class/id matches testimonial|review|quote");
    }
    if (/pricing|plan|tier/.test(hint)) {
      add('pricing-grid', 0.4, "class/id matches pricing|plan|tier");
    }
    if (tag === 'footer' || roleAttr === 'contentinfo' || /\bfooter\b/.test(hint)) {
      add('footer', 0.4, "semantic footer / class footer");
    }
    if (
      tag === 'nav' ||
      roleAttr === 'navigation' ||
      /(^|[\s_-])(nav|navbar|menu)([\s_-]|$)/.test(hint) ||
      /layout-page-header|site-header|topbar/.test(hint)
    ) {
      add('navigation', 0.4, "nav semantic or nav/header class");
    }
    if (/\bcta\b|call-to-action|calltoaction/.test(hint)) {
      add('cta-banner', 0.4, "class matches cta");
    }
    if (/stat|metric|counter|trust/.test(hint)) {
      add('stat-cards', 0.4, "class matches stat|metric|counter");
    }
    if (/\bsearch\b|inputcontainer/.test(hint) && el.querySelector('input')) {
      add('search-bar', 0.4, "class search/inputcontainer + input");
    }

    // --- meaningful id (+0.3) ---
    if (/^(faq|sss)([-_]|$)/.test(id) || id === 'faq' || id === 'sss') {
      add('faq-accordion', 0.3, "id suggests faq");
    }
    if (/^(hero|banner|home)([-_]|$)/.test(id)) {
      add('hero', 0.3, "id suggests hero");
    }
    if (/^(pricing|plans?)([-_]|$)/.test(id)) {
      add('pricing-grid', 0.3, "id suggests pricing");
    }
    if (/^(about|general-information)/.test(id)) {
      add('about', 0.3, "id suggests about");
    }
    if (/footer/.test(id)) {
      add('footer', 0.3, "id suggests footer");
    }
    if (/search/.test(id) && el.querySelector('input')) {
      add('search-bar', 0.3, "id search + input");
    }
    if (/testimonial|review/.test(id)) {
      add('testimonial', 0.3, "id suggests testimonial");
    }
    // Topical about subsections (heading + body copy) — real repeated info blocks
    if (/trade-mode|market-mode|security|community/.test(id)) {
      const hasHeading = !!el.querySelector('h2, h3, h4');
      const hasBody =
        !!el.querySelector('p') ||
        ((el.innerText || '').replace(/\s+/g, ' ').trim().length > 60);
      if (hasHeading && hasBody) {
        add('info-block', 0.55, 'topical id block with heading + body copy');
      }
    }

    if (/\b(sss|faq|sıkça sorulan)\b/.test(textHead)) {
      add('faq-accordion', 0.2, "text suggests FAQ/SSS");
    }

    // --- helpers ---
    const kids = [...el.children].filter((c) => {
      if (SKIP_TAGS.has(c.tagName)) return false;
      const r = c.getBoundingClientRect();
      return r.width > 8 && r.height > 8;
    });

    function visibleChildren(node) {
      return [...node.children].filter((c) => {
        if (SKIP_TAGS.has(c.tagName)) return false;
        const r = c.getBoundingClientRect();
        return r.width > 8 && r.height > 8;
      });
    }

    function cardSig(n) {
      const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
      const hasImg = !!n.querySelector('img, picture, [class*="image" i], [class*="Image" i]');
      const hasBtn = !!n.querySelector(
        'button, a[class*="btn" i], a[class*="button" i], [class*="Button" i], [role="button"]'
      );
      const hasTitle = !!n.querySelector('h1, h2, h3, h4, [class*="title" i]');
      const hasText = t.length > 12;
      const hasPrice = /\$|€|₺|₽|\d+[.,]\d{2}|price|fiyat/i.test(t);
      const hasToggle =
        /toggle|expand|collaps|accordion/i.test(`${n.className || ''} ${n.getAttribute('aria-expanded') || ''}`) ||
        !!n.querySelector('[aria-expanded], [class*="expand" i], [class*="toggle" i], [class*="accordion" i]');
      const r = n.getBoundingClientRect();
      return {
        hasImg,
        hasBtn,
        hasTitle,
        hasText,
        hasPrice,
        hasToggle,
        short: t.length > 0 && t.length < 260,
        w: Math.round(r.width),
        h: Math.round(r.height),
        t,
      };
    }

    function groupRepeated(nodes, min = 3) {
      if (nodes.length < min) return null;
      const keyed = nodes.map((n) => ({ n, s: cardSig(n) }));
      const buckets = new Map();
      for (const row of keyed) {
        const key = [
          row.n.tagName,
          row.s.hasImg ? 1 : 0,
          row.s.hasBtn ? 1 : 0,
          row.s.hasPrice ? 1 : 0,
          row.s.hasToggle ? 1 : 0,
          row.s.hasTitle ? 1 : 0,
        ].join(':');
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(row);
      }
      let best = null;
      for (const group of buckets.values()) {
        if (group.length >= min && (!best || group.length > best.length)) best = group;
      }
      return best;
    }

    function findRepeatedDeep(root, min = 3, maxDepth = 4) {
      let best = groupRepeated(visibleChildren(root), min);
      const walk = (node, depth) => {
        if (depth > maxDepth) return;
        for (const c of visibleChildren(node).slice(0, 12)) {
          const g = groupRepeated(visibleChildren(c), min);
          if (g && (!best || g.length > best.length)) best = g;
          walk(c, depth + 1);
        }
      };
      walk(root, 0);
      return best;
    }

    function isNumericStatText(t) {
      const s = (t || '').replace(/\s+/g, ' ').trim();
      if (!s || s.length >= 20) return false;
      // starts with digit, or contains % / +, or compact number tokens (1 000 000+, 7/24)
      return (
        /^\d/.test(s) ||
        /%/.test(s) ||
        /\+/.test(s) ||
        /^\d[\d\s.,/]*\+?$/.test(s) ||
        /^\d+\/\d+/.test(s)
      );
    }

    /** Recursive: collect short numeric text leaves under el */
    function collectStatTexts(node, out = [], depth = 0) {
      if (!node || depth > 8 || out.length > 40) return out;
      if (node.nodeType === 3) return out;
      const children = [...node.childNodes];
      const ownText = (node.innerText || '').replace(/\s+/g, ' ').trim();
      // Prefer leaf-ish nodes
      const elementChildren = children.filter((c) => c.nodeType === 1);
      if (elementChildren.length === 0) {
        if (isNumericStatText(ownText)) out.push(ownText);
        return out;
      }
      // Also accept short numeric block even with wrappers
      if (ownText.length < 20 && isNumericStatText(ownText) && elementChildren.length <= 3) {
        out.push(ownText);
      }
      for (const c of elementChildren) collectStatTexts(c, out, depth + 1);
      return out;
    }

    function countLinkGroups(node) {
      // ul>li>a repeating groups
      let groups = 0;
      for (const ul of node.querySelectorAll('ul, ol, [class*="link" i], nav')) {
        const items = [...ul.querySelectorAll(':scope > li, :scope > a, :scope > div')].filter((li) =>
          li.querySelector('a[href]')
        );
        if (items.length >= 2) groups += 1;
      }
      // fallback: columns of links
      const linkCols = [...node.children].filter((c) => c.querySelectorAll('a[href]').length >= 3);
      if (linkCols.length >= 3) groups = Math.max(groups, linkCols.length);
      return groups;
    }

    function hasHorizontalOverflow(node) {
      const style = getComputedStyle(node);
      const ox = style.overflowX;
      if (/(auto|scroll|overlay)/.test(ox) && node.scrollWidth > node.clientWidth + 20) return true;
      // child track
      for (const c of visibleChildren(node).slice(0, 8)) {
        const cs = getComputedStyle(c);
        if (/(auto|scroll|overlay)/.test(cs.overflowX) && c.scrollWidth > c.clientWidth + 20) return true;
        if (/(row|row-reverse)/.test(cs.flexDirection) && c.scrollWidth > c.clientWidth + 40) return true;
      }
      return false;
    }

    // --- NAVIGATION ---
    const headerLinks = [...el.querySelectorAll('a[href]')].filter((a) => {
      const r = a.getBoundingClientRect();
      return r.width > 8 && r.height > 8 && r.y < (bounds.y + Math.min(bounds.h, 120));
    });
    const horizontalNavLinks = headerLinks.filter((a, i, arr) => {
      if (i === 0) return true;
      const prev = arr[i - 1].getBoundingClientRect();
      const cur = a.getBoundingClientRect();
      return Math.abs(cur.y - prev.y) < 24; // same row
    });
    if (tag === 'nav' || roleAttr === 'navigation') {
      add('navigation', 0.5, 'tag/role is nav');
    }
    if (
      (tag === 'header' || roleAttr === 'banner' || /header|navbar|topbar|layout-page-header/.test(hint)) &&
      horizontalNavLinks.length >= 2
    ) {
      add('navigation', 0.45, `header/nav host with ${horizontalNavLinks.length} horizontal links`);
    }

    // --- FOOTER (only strong signals — never invent) ---
    const linkGroups = countLinkGroups(el);
    if (tag === 'footer' || roleAttr === 'contentinfo') {
      add('footer', 0.7, 'tag/role is footer');
    }
    if (/\bfooter\b/.test(hint) || /layout-page-footer|site-footer|page-footer/.test(hint)) {
      add('footer', 0.5, 'class/id clearly footer');
    }
    // Lowest section only if it actually looks like a footer link farm
    if (ctx.isLowestSection && linkGroups >= 3 && el.querySelectorAll('a[href]').length >= 8) {
      add('footer', 0.45, `lowest section with ${linkGroups} link groups`);
    }

    // --- STAT-CARDS (recursive numeric shorts among sibling cards) ---
    const siblingCards = kids.length >= 3 ? kids : visibleChildren(kids[0] || el);
    let statSiblingHits = 0;
    const cardParents = kids.length >= 3 ? [el] : kids.slice(0, 4);
    for (const parent of cardParents) {
      const siblings = visibleChildren(parent);
      if (siblings.length < 3) continue;
      let hits = 0;
      for (const sib of siblings) {
        const nums = collectStatTexts(sib).filter((t, i, arr) => arr.indexOf(t) === i);
        if (nums.length >= 1 && (sib.innerText || '').replace(/\s+/g, ' ').trim().length < 120) {
          hits += 1;
        }
      }
      if (hits >= 3) {
        statSiblingHits = Math.max(statSiblingHits, hits);
      }
    }
    // also: 3+ distinct short numeric texts anywhere under a compact section
    const allStats = [...new Set(collectStatTexts(el))];
    if (statSiblingHits >= 3) {
      add('stat-cards', 0.5, `${statSiblingHits} sibling cards with short numeric text`);
    } else if (allStats.length >= 3 && bounds.h <= 420) {
      add('stat-cards', 0.45, `${allStats.length} short numeric texts in compact block`);
    } else if (allStats.length >= 3 && /stat|metric|counter|support|destek|7\/24/.test(hint + textHead)) {
      add('stat-cards', 0.4, `${allStats.length} numeric texts + stat-like copy`);
    } else if (
      bounds.h <= 220 &&
      /7\/24|\d[\d\s.]*\+|%|\banında\b|\bdestek\b|\btrust/i.test(textHead)
    ) {
      // Compact trust/support strip (cs.money "7/24 canlı destek…")
      add('stat-cards', 0.4, 'compact trust/support strip with numeric cues');
    }

    // --- CTA-BANNER / FEATURE-GRID (2-4 equal-width cards) ---
    function findEqualCards(minN, maxN) {
      const groups = [];
      const tryNodes = [kids];
      for (const k of kids.slice(0, 6)) tryNodes.push(visibleChildren(k));
      for (const nodes of tryNodes) {
        if (nodes.length < minN || nodes.length > maxN + 2) continue;
        const scored = nodes.map((n) => ({ n, s: cardSig(n) })).filter((r) => r.s.w > 40);
        if (scored.length < minN) continue;
        const widths = scored.map((r) => r.s.w);
        const avg = widths.reduce((a, b) => a + b, 0) / widths.length;
        const equal = widths.every((w) => Math.abs(w - avg) / avg < 0.28);
        if (!equal) continue;
        const rich = scored.filter(
          (r) => (r.s.hasTitle || r.s.hasText) && (r.s.hasBtn || r.s.hasImg || r.s.short)
        );
        if (rich.length >= minN && rich.length <= maxN) groups.push(rich);
      }
      return groups.sort((a, b) => b.length - a.length)[0] || null;
    }

    const twoCards = findEqualCards(2, 2);
    const multiCards = findEqualCards(3, 4);
    if (multiCards && multiCards.length >= 3) {
      const withBtn = multiCards.filter((r) => r.s.hasBtn).length;
      const withTitle = multiCards.filter((r) => r.s.hasTitle || r.s.hasText).length;
      if (withTitle >= 3) {
        add(
          'feature-grid',
          withBtn >= 2 ? 0.5 : 0.4,
          `${multiCards.length} equal-width cards (title/text${withBtn ? '+button' : ''})`
        );
      }
    } else if (twoCards && twoCards.length === 2) {
      const bothRich = twoCards.every((r) => (r.s.hasTitle || r.s.hasText) && (r.s.hasBtn || r.s.hasImg));
      if (bothRich || twoCards.every((r) => r.s.hasBtn)) {
        add('cta-banner', 0.45, '2 equal-width CTA/feature cards');
      }
    } else if (
      !/^h[1-6]$/.test(tag) &&
      bounds.h >= 160 &&
      bounds.h <= 400 &&
      /takas|trade|market|anında|özellik|feature|nadir|kar elde/i.test(textHead) &&
      (el.querySelectorAll('h2, h3, h4, [class*="title" i]').length >= 2 ||
        (textHead.match(/\b(takas|trade|market|anında)\b/gi) || []).length >= 2)
    ) {
      add('feature-grid', 0.4, 'mid-size section with multiple feature/value props');
    }

    // Empty / media-only mid bands — only with real carousel/media signals
    if (
      (tag === 'section' || tag === 'div') &&
      bounds.h >= 120 &&
      bounds.h <= 320 &&
      textHead.length < 8 &&
      (el.querySelectorAll(
        'img, picture, [class*="slide" i], [class*="carousel" i], [class*="swiper" i], [class*="slick" i]'
      ).length >= 3 ||
        hasHorizontalOverflow(el))
    ) {
      add('product-carousel', 0.4, 'low-text media/overflow band with slide-like children');
    }

    // Single compact CTA block (login / trade / one big button)
    const buttons = el.querySelectorAll(
      'button, a[class*="btn" i], a[class*="button" i], [class*="Button" i], [role="button"]'
    );
    if (
      !/^h[1-6]$/.test(tag) &&
      buttons.length >= 1 &&
      buttons.length <= 4 &&
      bounds.h >= 100 &&
      bounds.h <= 750 &&
      (/\bcta\b|call-to-action|upgrade|sign.?in|oturum|trade|buy|mükemmel|find|keşfet/.test(
        hint + textHead.slice(0, 100)
      ) ||
        (buttons.length <= 2 && bounds.h <= 420 && el.querySelector('h1, h2, h3')))
    ) {
      add('cta-banner', 0.35, 'compact block with prominent CTA button');
    }

    // --- PRODUCT-CAROUSEL (DOM-primary: horizontal overflow + 5+ equal cards) ---
    const productGroup = findRepeatedDeep(el, 5, 4);
    if (productGroup && productGroup.length >= 5) {
      const widths = productGroup.map((r) => r.s.w).filter((w) => w > 0);
      const avgW = widths.reduce((a, b) => a + b, 0) / (widths.length || 1);
      const equalWidth = widths.length >= 5 && widths.every((w) => Math.abs(w - avgW) / avgW < 0.3);
      const productish = productGroup.filter((r) => r.s.hasImg && (r.s.hasPrice || r.s.hasTitle || r.s.short));
      const overflow = hasHorizontalOverflow(el) || [...el.querySelectorAll('div, ul, section')].some((n) => {
        try {
          return hasHorizontalOverflow(n);
        } catch (_) {
          return false;
        }
      });
      if (equalWidth && productish.length >= 5) {
        add(
          'product-carousel',
          overflow ? 0.55 : 0.4,
          `${productish.length} equal product-like cards${overflow ? ' in overflow/scroll container' : ''}`
        );
      }
    }
    // reinforce with class fragments even without overflow
    if (/carousel|slider|swiper|slick|suggestioncarousel|module_slide/.test(hint) && productGroup && productGroup.length >= 4) {
      add('product-carousel', 0.35, 'carousel-like class + repeated cards');
    }

    // FAQ accordion DOM
    const accordionItems = el.querySelectorAll(
      '[class*="accordion" i] [class*="item" i], [class*="AccordionItem" i], details, [aria-expanded]'
    );
    const repeated = findRepeatedDeep(el, 3, 3);
    if (repeated && repeated.length >= 3 && (repeated[0].s.hasToggle || accordionItems.length >= 3)) {
      add('faq-accordion', 0.4, `${repeated.length}+ repeated expand/toggle siblings`);
    }
    if (accordionItems.length >= 3) {
      add('faq-accordion', scores['faq-accordion'] ? 0.2 : 0.4, `${accordionItems.length} accordion items in DOM`);
    }

    // Hero
    const h1 = el.querySelector('h1');
    const heroLikeTag =
      tag === 'section' || tag === 'header' || tag === 'main' || tag === 'div' || tag === 'article' || roleAttr === 'banner';
    if (h1 && heroLikeTag && bounds.y < 300 && bounds.h >= 280) {
      const fs = parseFloat(getComputedStyle(h1).fontSize) || 0;
      add('hero', 0.4, `near-top tall section with h1 (${Math.round(fs) || '?'}px)`);
      if (fs >= 24) add('hero', 0.2, 'h1 font-size reinforces hero');
    }
    // hero-like even with h2 slider titles near top
    if (!h1 && heroLikeTag && bounds.y < 200 && bounds.h >= 500 && el.querySelectorAll('h2').length >= 1) {
      add('hero', 0.35, 'near-top tall landing/slider section');
    }

    // Search bar compact
    const searchInput = el.querySelector(
      'input[type="search"], input[type="text"], input:not([type]), textarea'
    );
    const looksLikeSearchHost =
      /inputcontainer|search|autocomplete|typeahead/i.test(hint) ||
      (searchInput &&
        /search|ara|skin|find|query/i.test(
          `${searchInput.getAttribute('placeholder') || ''} ${searchInput.getAttribute('name') || ''} ${searchInput.getAttribute('aria-label') || ''} ${searchInput.type || ''}`
        ));
    if (searchInput && looksLikeSearchHost && bounds.h <= 280 && !/^h[1-6]$/.test(tag)) {
      add('search-bar', 0.45, 'compact search-like input host');
    }

    // Aside with stats (cs.money about sidebar)
    if (tag === 'aside' && allStats.length >= 2) {
      add('stat-cards', 0.4, 'aside with numeric stat texts');
    }

    // Pick best
    let best = null;
    for (const type of Object.keys(scores)) {
      const conf = Math.min(1, scores[type].score);
      if (conf <= 0) continue;
      if (!best || conf > best.confidence) {
        best = {
          type,
          confidence: Math.round(conf * 100) / 100,
          signals: scores[type].signals.slice(0, 8),
        };
      }
    }
    return best;
  }

  /** Specificity: prefer semantic tags / headings over generic wrappers */
  function specificity(item) {
    const order = {
      h1: 100, h2: 95, h3: 90,
      header: 80, footer: 80, nav: 78, main: 78, aside: 75,
      section: 60, article: 60, hero: 70, form: 55,
      div: 10,
    };
    return order[item.role] || order[item.tag] || 20;
  }

  function collectRawLandmarks(vw) {
    const seen = new Set();
    const items = [];
    for (const el of document.querySelectorAll(LANDMARK_SELECTOR)) {
      if (seen.has(el) || SKIP_TAGS.has(el.tagName) || isJunkEl(el)) continue;
      seen.add(el);
      if (!isVisibleInViewport(el, vw)) continue;
      const item = toItem(el);
      if (item.bounds.w < 20 || item.bounds.h < 10) continue;
      items.push(item);
    }

    // Compact search hosts (so search-bar is not lost inside a hero section)
    const searchInputs = document.querySelectorAll(
      'input[type="search"], input[type="text"], input:not([type]), input[placeholder], [class*="InputContainer" i] input'
    );
    for (const input of searchInputs) {
      if (!input || input.tagName !== 'INPUT') continue;
      const ph = `${input.getAttribute('placeholder') || ''} ${input.getAttribute('name') || ''} ${input.getAttribute('aria-label') || ''} ${input.className || ''}`.toLowerCase();
      const parentHint = `${input.closest('[class]')?.className || ''}`.toLowerCase();
      const relevant =
        input.type === 'search' ||
        /search|ara|skin|find|query|inputcontainer/.test(ph + ' ' + parentHint);
      if (!relevant) continue;

      let host =
        input.closest('[class*="InputContainer" i]') ||
        input.closest('form') ||
        input.parentElement;
      if (!host) continue;
      // Never treat the <input> itself as the landmark host
      if (host.tagName === 'INPUT') host = host.parentElement || host;
      let cur = host;
      for (let i = 0; i < 5 && cur && cur !== document.body; i++) {
        if (cur.tagName === 'INPUT') {
          cur = cur.parentElement;
          continue;
        }
        const r = cur.getBoundingClientRect();
        if (r.height >= 28 && r.height <= 280 && r.width >= 80) {
          host = cur;
          break;
        }
        cur = cur.parentElement;
      }
      if (!host || host.tagName === 'INPUT') continue;
      if (seen.has(host) || isJunkEl(host) || !isVisibleInViewport(host, vw)) continue;
      const item = toItem(host);
      if (item.bounds.h > 280 || item.bounds.w < 40) continue;
      seen.add(host);
      items.push(item);
    }

    return items;
  }

  /**
   * Drop nested duplicates: same text + >=90% box overlap → keep more specific one.
   * Prefer outer container when specificity ties and one contains the other.
   */
  function dedupeLandmarks(items) {
    const keep = items.slice();
    const drop = new Set();

    for (let i = 0; i < keep.length; i++) {
      if (drop.has(i)) continue;
      for (let j = i + 1; j < keep.length; j++) {
        if (drop.has(j)) continue;
        const a = keep[i];
        const b = keep[j];
        // Only collapse near-twin wrappers (similar size + high overlap).
        // Do NOT collapse a small heading inside a large section.
        if (!similarSize(a.bounds, b.bounds, 0.85)) continue;
        if (overlapRatio(a.bounds, b.bounds) < 0.9) continue;

        const sameText = a.textKey === b.textKey;
        const nested = a.el.contains(b.el) || b.el.contains(a.el);
        if (!sameText && !nested) continue;

        const aContainsB = a.el.contains(b.el);
        const bContainsA = b.el.contains(a.el);
        const sa = specificity(a);
        const sb = specificity(b);

        // Prefer more specific semantic node; else keep outer container.
        if (sa !== sb) {
          drop.add(sa > sb ? j : i);
        } else if (aContainsB) {
          drop.add(j);
        } else if (bContainsA) {
          drop.add(i);
        } else {
          drop.add(area(a.bounds) >= area(b.bounds) ? j : i);
        }
      }
    }

    return keep.filter((_, idx) => !drop.has(idx));
  }

  /**
   * Build nested tree from landmark elements using DOM containment.
   * children = landmarks that are direct descendants in the landmark set
   * (no intermediate landmark between parent and child).
   */
  function buildLandmarkTree(items) {
    const nodes = items.map((item) => ({
      role: item.role,
      tag: item.tag,
      id: item.id,
      classes: item.classes,
      textSample: item.textSample,
      bounds: item.bounds,
      styles: item.styles,
      pattern: item.pattern || null,
      children: [],
      _el: item.el,
    }));

    const parentOf = new Map();
    for (let i = 0; i < nodes.length; i++) {
      let bestParent = null;
      let bestDepth = Infinity;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        if (!nodes[j]._el.contains(nodes[i]._el)) continue;
        // nearest ancestor landmark
        let depth = 0;
        let p = nodes[i]._el.parentElement;
        while (p && p !== nodes[j]._el) {
          depth += 1;
          p = p.parentElement;
        }
        if (p === nodes[j]._el && depth < bestDepth) {
          bestDepth = depth;
          bestParent = j;
        }
      }
      if (bestParent !== null) parentOf.set(i, bestParent);
    }

    const roots = [];
    for (let i = 0; i < nodes.length; i++) {
      const p = parentOf.get(i);
      if (p === undefined) roots.push(nodes[i]);
      else nodes[p].children.push(nodes[i]);
    }

    const sortRec = (list) => {
      list.sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x);
      for (const n of list) sortRec(n.children);
    };
    sortRec(roots);

    const strip = (n) => {
      const { _el, ...rest } = n;
      return {
        ...rest,
        children: (n.children || []).map(strip),
      };
    };

    // Wrap in a synthetic page root for a stable tree shape
    return {
      role: 'page',
      tag: 'body',
      id: null,
      classes: [],
      textSample: shortText(document.body, 80),
      bounds: boundsOf(document.body.getBoundingClientRect()),
      styles: cssSnapshot(document.body),
      pattern: null,
      children: roots.map(strip),
    };
  }

  function collectTokens(vw) {
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
      if (SKIP_TAGS.has(el.tagName) || isJunkEl(el)) continue;
      if (!isVisibleInViewport(el, vw)) continue;
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

  // Unlock scroll / hide common blockers
  try {
    document.body.removeAttribute('data-scroll-locked');
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.querySelectorAll('[aria-modal="true"], [role="dialog"]').forEach((el) => {
      el.style.pointerEvents = 'none';
      el.setAttribute('data-skeleton-ignored', '1');
    });
  } catch (_) {}

  const vw = window.innerWidth;
  const raw = collectRawLandmarks(vw);
  const deduped = dedupeLandmarks(raw);

  // Identify lowest section-like landmark (max y+h) for footer heuristics
  let lowestSection = null;
  let lowestBottom = -Infinity;
  for (const item of deduped) {
    if (!['section', 'footer', 'aside'].includes(item.tag) && item.role !== 'footer') continue;
    const bottom = (item.bounds.y || 0) + (item.bounds.h || 0);
    if (bottom > lowestBottom) {
      lowestBottom = bottom;
      lowestSection = item;
    }
  }

  for (const item of deduped) {
    item.pattern = detectPattern(item.el, item.bounds, {
      isLowestSection: item === lowestSection,
    });
  }

  // Drop headings that are already covered by a recognized parent pattern.
  // Lone headings stay with pattern: null (honest unrecognized).
  function isHeadingItem(item) {
    return /^h[1-6]$/.test(item.tag);
  }
  function isRecognized(item) {
    return !!(item.pattern && item.pattern.type);
  }

  const coveredHeadings = new Set();
  for (const item of deduped) {
    if (!isHeadingItem(item)) continue;
    const covered = deduped.some(
      (parent) =>
        parent !== item &&
        isRecognized(parent) &&
        parent.el.contains(item.el)
    );
    if (covered) coveredHeadings.add(item);
    else item.pattern = null;
  }

  const filtered = deduped.filter((item) => !coveredHeadings.has(item));
  const tree = buildLandmarkTree(filtered);

  // Flat list (no el refs)
  const landmarks = filtered
    .map(({ el, textKey, ...rest }) => rest)
    .sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x)
    .slice(0, 80);

  // Probe why footer may be missing (collection vs classification)
  const footerProbe = {
    footerTags: document.querySelectorAll('footer').length,
    contentinfoRoles: document.querySelectorAll('[role="contentinfo"]').length,
    footerClassOrId: document.querySelectorAll('[class*="footer" i], [id*="footer" i]').length,
    footerLikeLandmarks: filtered.filter(
      (i) =>
        i.tag === 'footer' ||
        i.role === 'footer' ||
        (i.id && /footer/i.test(i.id)) ||
        (i.classes || []).some((c) => /footer/i.test(c))
    ).length,
  };

  return {
    url: location.href,
    title: document.title || '',
    tokens: collectTokens(vw),
    structure: tree,
    landmarks,
    footerProbe,
    html: document.documentElement.outerHTML,
  };
}

/**
 * Browser-side DOM mutation for skeleton.html only.
 * Runs AFTER structure extraction so landmarks/tree stay accurate.
 * Returns serialized HTML ready for Node-side cleanDOM/buildSkeletonHtml.
 */
function sanitizeForSkeletonScript() {
  function normText(el) {
    return (el.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function area(r) {
    return Math.max(0, r.width) * Math.max(0, r.height);
  }

  function similarSize(a, b, minRatio = 0.85) {
    const aa = area(a);
    const ab = area(b);
    if (aa <= 0 || ab <= 0) return false;
    return Math.min(aa, ab) / Math.max(aa, ab) >= minRatio;
  }

  function overlapRatio(a, b) {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.right, b.right);
    const y2 = Math.min(a.bottom, b.bottom);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const smaller = Math.min(area(a), area(b));
    return smaller > 0 ? inter / smaller : 0;
  }

  function unwrap(el) {
    if (!el || !el.isConnected || !el.parentNode) return;
    try {
      // replaceWith avoids insertBefore parent/child races on live DOM
      el.replaceWith(...el.childNodes);
    } catch (_) {
      try {
        const parent = el.parentNode;
        if (!parent) return;
        const frag = document.createDocumentFragment();
        while (el.firstChild) frag.appendChild(el.firstChild);
        parent.replaceChild(frag, el);
      } catch (__ ) {}
    }
  }

  // 1) Nested duplicate wrappers → keep outer, unwrap inner (deepest first)
  const candidates = [
    ...document.querySelectorAll('section, div, article, main, aside, header, footer'),
  ];
  const toUnwrap = new Set();
  for (let i = 0; i < candidates.length; i++) {
    for (let j = 0; j < candidates.length; j++) {
      if (i === j) continue;
      const outer = candidates[i];
      const inner = candidates[j];
      if (!outer.contains(inner)) continue;
      const ro = outer.getBoundingClientRect();
      const ri = inner.getBoundingClientRect();
      if (!similarSize(ro, ri, 0.85)) continue;
      if (overlapRatio(ro, ri) < 0.9) continue;
      if (normText(outer) !== normText(inner)) continue;
      toUnwrap.add(inner);
    }
  }
  [...toUnwrap]
    .sort((a, b) => (a.contains(b) ? 1 : b.contains(a) ? -1 : 0)) // inner before outer
    .forEach((el) => unwrap(el));

  // 2) SVG → sized icon placeholder (rendered pixels only — never viewBox)
  const vw = window.innerWidth || document.documentElement.clientWidth || 1440;
  const vh = window.innerHeight || document.documentElement.clientHeight || 900;
  const FALLBACK = 24;

  function svgPlaceholderSize(svg) {
    const r = svg.getBoundingClientRect();
    let w = r.width;
    let h = r.height;

    // Zero / not laid out → fallback
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return { w: FALLBACK, h: FALLBACK, reason: 'zero-rect' };
    }

    // Stretched to (near) viewport / huge layout box → not a real icon size
    const nearViewport =
      w >= vw * 0.85 ||
      h >= vh * 0.85 ||
      (w >= vw * 0.5 && h >= vh * 0.25) ||
      w >= 600 ||
      h >= 400;

    if (nearViewport) {
      return { w: FALLBACK, h: FALLBACK, reason: 'near-viewport' };
    }

    return {
      w: Math.max(1, Math.round(w)),
      h: Math.max(1, Math.round(h)),
      reason: 'rect',
    };
  }

  for (const svg of [...document.querySelectorAll('svg')]) {
    const { w, h } = svgPlaceholderSize(svg);
    const div = document.createElement('div');
    div.className = 'icon-placeholder';
    div.setAttribute(
      'style',
      `width:${w}px;height:${h}px;display:inline-block;vertical-align:middle;background:rgba(127,127,127,0.25);border-radius:2px`
    );
    div.setAttribute('aria-hidden', 'true');
    svg.replaceWith(div);
  }

  // 3) Astro / framework wrappers + attrs
  for (const el of [...document.querySelectorAll('astro-island, astro-slot, astro-fragment')]) {
    if (el.isConnected) unwrap(el);
  }
  for (const el of [...document.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) {
      const n = attr.name.toLowerCase();
      if (
        n.startsWith('data-astro') ||
        n === 'component-url' ||
        n === 'renderer-url' ||
        n === 'ssr' && el.hasAttribute('component-url')
      ) {
        el.removeAttribute(attr.name);
      }
    }
    el.removeAttribute('component-url');
    el.removeAttribute('renderer-url');
  }

  // 4) Keep structural nav/footer/header links; neutralize the rest
  function isStructuralLink(a) {
    if (
      a.closest(
        'nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"]'
      )
    ) {
      return true;
    }
    let el = a.parentElement;
    while (el && el !== document.body) {
      const id = (el.id || '').toLowerCase();
      const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
      const hint = `${id} ${cls}`;
      if (/(^|[\s_-])(nav|navbar|header|footer|menu)([\s_-]|$)/.test(hint) || /layout-page-header|site-header|page-footer/.test(hint)) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  for (const a of document.querySelectorAll('a[href]')) {
    if (isStructuralLink(a)) continue;
    const href = a.getAttribute('href') || '';
    if (!href || href === '#' || href.startsWith('#') || href.startsWith('javascript:')) {
      continue;
    }
    a.setAttribute('href', '#');
    a.setAttribute('data-skeleton-neutralized', '1');
  }

  return document.documentElement.outerHTML;
}

function unwrapAll($, selector) {
  // Repeat for nested wrappers
  for (let pass = 0; pass < 5; pass++) {
    const nodes = $(selector).toArray();
    if (nodes.length === 0) break;
    let changed = false;
    for (const el of nodes) {
      const $el = $(el);
      if (!$el.parent().length) continue;
      $el.replaceWith($el.contents());
      changed = true;
    }
    if (!changed) break;
  }
}

/**
 * Remove tracking/ad junk + framework noise before skeleton serialization.
 * Called from extractor.js right before writing skeleton.html.
 */
function cleanDOM(html) {
  const $ = cheerio.load(html);

  $('script, noscript, iframe, template').remove();

  // Hidden elements (inline style)
  $('[style]').each((_, el) => {
    const style = ($(el).attr('style') || '').toLowerCase().replace(/\s+/g, '');
    if (
      /display:\s*none/.test($(el).attr('style') || '') ||
      /visibility:\s*hidden/.test($(el).attr('style') || '') ||
      style.includes('display:none') ||
      style.includes('visibility:hidden')
    ) {
      $(el).remove();
    }
  });

  // Don't strip icon-placeholders that use aria-hidden
  $('[hidden]').remove();
  $('[aria-hidden="true"]').each((_, el) => {
    const cls = el.attribs?.class || '';
    if (/\bicon-placeholder\b/.test(cls)) return;
    $(el).remove();
  });

  // Tracking forms
  $('form').each((_, el) => {
    const action = ($(el).attr('action') || '').toLowerCase();
    if (TRACKING_ACTION_RE.test(action)) $(el).remove();
  });

  // id/class junk (beacon, pixel, banner, ads, trg-)
  $('*').each((_, el) => {
    const id = el.attribs?.id || '';
    const cls = el.attribs?.class || '';
    if (JUNK_ID_CLASS_RE.test(`${id} ${cls}`)) {
      $(el).remove();
    }
  });

  // 1x1 / tracking images
  $('img').each((_, el) => {
    const src = ($(el).attr('src') || '').toLowerCase();
    const w = Number($(el).attr('width') || 0);
    const h = Number($(el).attr('height') || 0);
    if (
      TRACKING_ACTION_RE.test(src) ||
      /facebook\.com\/tr|google-analytics|doubleclick|pixel|beacon/i.test(src) ||
      (w > 0 && h > 0 && w <= 2 && h <= 2)
    ) {
      $(el).remove();
    }
  });

  // Cheerio fallback: single-child twin wrappers with identical text → unwrap inner
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    $('section, div, article, main, aside, header, footer').each((_, el) => {
      const $el = $(el);
      const $kids = $el.children('section, div, article, main, aside, header, footer');
      if ($kids.length !== 1) return;
      const $child = $kids.first();
      const t1 = $el.text().replace(/\s+/g, ' ').trim();
      const t2 = $child.text().replace(/\s+/g, ' ').trim();
      if (!t1 || t1 !== t2) return;
      $child.replaceWith($child.contents());
      changed = true;
    });
    if (!changed) break;
  }

  // Remaining SVGs (no live rect available in cheerio) → safe 24x24 fallback
  // Never use viewBox here — it is a coordinate system, not rendered pixels.
  $('svg').each((_, el) => {
    $(el).replaceWith(
      `<div class="icon-placeholder" style="width:24px;height:24px;display:inline-block;vertical-align:middle;background:rgba(127,127,127,0.25);border-radius:2px" aria-hidden="true"></div>`
    );
  });

  // Astro / framework wrappers + attrs + leftover CSS hooks
  unwrapAll($, 'astro-island, astro-slot, astro-fragment, astro-static-slot');
  $('style').each((_, el) => {
    const text = ($(el).html() || '').trim();
    if (/astro-island|astro-slot|astro-static-slot/i.test(text)) {
      $(el).remove();
    }
  });
  $('*').each((_, el) => {
    const attribs = el.attribs || {};
    for (const key of Object.keys(attribs)) {
      const n = key.toLowerCase();
      if (n.startsWith('data-astro') || n === 'component-url' || n === 'renderer-url') {
        $(el).removeAttr(key);
      }
    }
  });

  // Neutralize non-structural links (cheerio fallback)
  function isStructuralAnchor($a) {
    if (
      $a.closest(
        'nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"]'
      ).length
    ) {
      return true;
    }
    let $el = $a.parent();
    while ($el.length && !$el.is('body') && !$el.is('html')) {
      const id = ($el.attr('id') || '').toLowerCase();
      const cls = ($el.attr('class') || '').toLowerCase();
      const hint = `${id} ${cls}`;
      if (
        /(^|[\s_-])(nav|navbar|header|footer|menu)([\s_-]|$)/.test(hint) ||
        /layout-page-header|site-header|page-footer/.test(hint)
      ) {
        return true;
      }
      $el = $el.parent();
    }
    return false;
  }

  $('a[href]').each((_, el) => {
    const $a = $(el);
    if (isStructuralAnchor($a)) return;
    const href = $a.attr('href') || '';
    if (!href || href === '#' || href.startsWith('#') || href.startsWith('javascript:')) return;
    $a.attr('href', '#');
    $a.attr('data-skeleton-neutralized', '1');
  });

  return $.html();
}

/**
 * Turn cleaned HTML into a learnable skeleton.
 */
function buildSkeletonHtml(renderedHtml, meta = {}) {
  const cleaned = cleanDOM(renderedHtml);
  const $ = cheerio.load(cleaned);

  $('link[rel="preload"], link[rel="modulepreload"]').remove();
  $('link[rel="alternate"], link[rel="canonical"], meta[name^="DC."], meta[property^="og:"], meta[property^="twitter:"], meta[name="sentry-trace"], meta[name="baggage"], meta[name="sentry-route-name"], meta[name="keywords"], meta[name="google-site-verification"], meta[name="yandex-verification"]').remove();

  $('[onclick], [onload], [onerror], [onmouseover]').each((_, el) => {
    const attribs = el.attribs || {};
    for (const key of Object.keys(attribs)) {
      if (key.toLowerCase().startsWith('on')) $(el).removeAttr(key);
    }
  });

  // Neutralize remaining images / media (layout placeholders only)
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

  $('meta[name="description"]').attr('content', 'Learnable frontend skeleton');

  $('*').each((_, el) => {
    const tag = (el.tagName || el.name || '').toLowerCase();
    const cls = el.attribs?.class || '';
    if (['script', 'style', 'svg', 'code', 'pre', 'noscript', 'title'].includes(tag)) return;
    if (/\bicon-placeholder\b/.test(cls)) return;
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

  const note = `
<!--
  LEARNABLE FRONTEND SKELETON
  Source: ${meta.url || 'unknown'}
  Generated: ${meta.generatedAt || new Date().toISOString()}

  This is NOT a clone of the original site.
  Use it as a structural / stylistic reference to rebuild your own UI.
-->
`.trim();

  return `${note}\n${$.html()}`;
}

function patternPrefix(pattern) {
  if (!pattern || !pattern.type) return '';
  return `[${pattern.type}] `;
}

/** Flatten structure tree into a readable outline. */
function structureOutline(node, depth = 0, lines = [], max = 160) {
  if (!node || lines.length >= max) return lines;
  const indent = '  '.repeat(depth);
  const cls = (node.classes || []).slice(0, 2).join('.');
  const label = [
    patternPrefix(node.pattern).trimEnd(),
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
      `- ${patternPrefix(item.pattern)}${item.role}`,
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

/** Build patterns-summary.json payload from flat landmarks. */
function buildPatternsSummary(landmarks = []) {
  const map = new Map();
  let unrecognized = 0;

  landmarks.forEach((lm, index) => {
    const type = lm && lm.pattern && lm.pattern.type;
    if (!type) {
      unrecognized += 1;
      return;
    }
    if (!map.has(type)) {
      map.set(type, { pattern: type, count: 0, landmarkIndices: [] });
    }
    const entry = map.get(type);
    entry.count += 1;
    entry.landmarkIndices.push(index);
  });

  return {
    detected: [...map.values()].sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern)),
    unrecognized,
  };
}

module.exports = {
  pageExtractScript,
  sanitizeForSkeletonScript,
  cleanDOM,
  buildSkeletonHtml,
  structureOutline,
  landmarksOutline,
  buildPatternsSummary,
};
