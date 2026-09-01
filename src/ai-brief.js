/**
 * Compact AI brief from extract outputs (no raw DOM/CSS).
 */

const { buildThemeTokens, assignComponentNames } = require('./scaffold');

const PATTERN_META = {
  navigation: {
    purpose: 'Site-wide header navigation and primary CTAs.',
    keyElements: ['logo/brand', 'nav links', 'CTA button'],
    designNotes: 'Keep sticky/top bar compact; avoid dense menus in the first pass.',
  },
  hero: {
    purpose: 'Primary above-the-fold value proposition and main CTA.',
    keyElements: ['headline', 'supporting line', 'primary CTA', 'optional media plane'],
    designNotes: 'Treat as one full composition; do not pack secondary promos into the hero.',
  },
  'search-bar': {
    purpose: 'Primary find/filter entry for catalog or inventory.',
    keyElements: ['search input', 'submit control', 'optional icon placeholder'],
    designNotes: 'Center or align with hero; keep a single clear field.',
  },
  'stat-cards': {
    purpose: 'Trust or metric strip with short numeric highlights.',
    keyElements: ['3+ metric values', 'short labels'],
    designNotes: 'Equal card rhythm; numbers lead, labels stay secondary.',
  },
  'feature-grid': {
    purpose: 'Feature or benefit grid explaining product modes.',
    keyElements: ['section title', 'icon placeholders', 'short feature copy'],
    designNotes: 'One idea per cell; avoid card chrome unless interaction needs it.',
  },
  'product-carousel': {
    purpose: 'Horizontally browsable product or item strip.',
    keyElements: ['scroll row', 'repeatable product cards', 'media placeholders'],
    designNotes: 'Overflow-x scroll; no real product images in the scaffold.',
  },
  'cta-banner': {
    purpose: 'Mid/late-page conversion band.',
    keyElements: ['headline', 'short pitch', 'CTA button'],
    designNotes: 'High contrast against page background; one action only.',
  },
  'faq-accordion': {
    purpose: 'Expandable Q&A for objections and trust.',
    keyElements: ['section title', 'question rows', 'expand/collapse answers'],
    designNotes: 'Start with one open item; keep answers short.',
  },
  about: {
    purpose: 'Short brand/product explanation block.',
    keyElements: ['heading', 'paragraph'],
    designNotes: 'Keep copy brief; link out for deep detail if needed.',
  },
  'info-block': {
    purpose: 'Topical information section (mode, security, community, etc.).',
    keyElements: ['heading', 'body copy'],
    designNotes: 'Repeatable content section with clear id-level topic.',
  },
  footer: {
    purpose: 'Site footer with link groups and legal/meta lines.',
    keyElements: ['link columns', 'copyright/legal'],
    designNotes: 'Only emit when a real footer landmark exists.',
  },
  testimonial: {
    purpose: 'Social proof quote block.',
    keyElements: ['quote', 'attribution'],
    designNotes: 'One quote per band unless a true carousel is justified.',
  },
  'pricing-grid': {
    purpose: 'Plan comparison / pricing cards.',
    keyElements: ['plan name', 'price', 'CTA'],
    designNotes: 'Equal columns; highlight one recommended plan at most.',
  },
  unrecognized: {
    purpose: 'Landmark without a confident pattern — treat as a custom section.',
    keyElements: ['section shell', 'placeholder content'],
    designNotes: 'Do not invent a fake pattern; design from layout intent.',
  },
};

function truncate(str, max) {
  const s = String(str || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function layoutFlowFromLandmarks(landmarks) {
  const flow = [];
  for (const lm of landmarks) {
    const p = (lm.pattern && lm.pattern.type) || 'unrecognized';
    if (flow[flow.length - 1] === p) continue;
    flow.push(p);
  }
  return flow.slice(0, 24);
}

function buildSummary(title, source, flow) {
  const host = (() => {
    try {
      return new URL(source).hostname;
    } catch {
      return source || 'the page';
    }
  })();
  const main = flow.filter((p) => p !== 'unrecognized').slice(0, 5);
  const flowText = main.length ? main.join(' → ') : 'mixed sections';
  const t = truncate(title || host, 90);
  return truncate(
    `${t} — use as UI reference for ${host}. Typical flow: ${flowText}. Rebuild with your own brand, copy, and assets; do not clone the source site.`,
    320
  );
}

function buildComponents(landmarks) {
  const entries = assignComponentNames(landmarks);
  const seen = new Map(); // pattern -> { name, count, first }
  const order = [];

  for (const e of entries) {
    const key = e.patternType || 'unrecognized';
    if (!seen.has(key)) {
      seen.set(key, { name: e.name, count: 1, first: e });
      order.push(key);
    } else {
      seen.get(key).count += 1;
    }
  }

  return order.slice(0, 16).map((key) => {
    const { name, count, first } = seen.get(key);
    const meta = PATTERN_META[key] || PATTERN_META.unrecognized;
    const bounds = (first.landmark && first.landmark.bounds) || {};
    let designNotes = meta.designNotes;
    if (bounds.w >= 1200 && bounds.h >= 480 && key === 'hero') {
      designNotes = 'Wide, tall hero band — prefer full-bleed composition over inset cards.';
    } else if (count > 1) {
      designNotes = truncate(`${meta.designNotes} Appears ×${count} in the extract.`, 140);
    }

    const purpose =
      count > 1 ? truncate(`${meta.purpose} (×${count} landmarks collapsed).`, 140) : meta.purpose;

    return {
      name,
      pattern: key,
      purpose,
      keyElements: meta.keyElements.slice(0, 4),
      designNotes: truncate(designNotes, 140),
    };
  });
}

function designSystemBlock(tokens, palette) {
  const theme = buildThemeTokens(tokens, palette);
  const colors = {
    background: theme.colors['primary-bg'],
    text: theme.colors['primary-text'],
    accent: theme.colors.accent,
    surface: theme.colors.surface,
    muted: theme.colors.muted,
  };

  const font = theme.fontName || 'system-ui';
  const sizes = theme.fontSize || {};
  const base = Array.isArray(sizes.base) ? sizes.base[0] : sizes.base || '16px';
  const display = Array.isArray(sizes['4xl']) ? sizes['4xl'][0] : sizes['4xl'] || '42px';

  const spaceVals = Object.values(theme.spacing || {});
  const spacing =
    spaceVals.length > 0
      ? truncate(`Spacing scale sampled from page (~${spaceVals.slice(0, 4).join(', ')} …).`, 120)
      : 'Use a simple 8px-based spacing scale.';

  const r = theme.borderRadius || {};
  const radiusParts = [];
  if (r.sm) radiusParts.push(`corners ${r.sm}`);
  if (r.lg) radiusParts.push(`pills ${r.lg}`);
  if (r.circle) radiusParts.push(`avatars circle`);
  const radius =
    radiusParts.length > 0
      ? truncate(`Radius roles: ${radiusParts.join('; ')}; full=${r.full || '9999px'}.`, 120)
      : 'Soft corners for surfaces; circle for avatars; full for pills.';

  return {
    colors,
    typography: truncate(`${font}; body ~${base}, display up to ~${display}.`, 120),
    spacing,
    radius,
  };
}

const PATTERN_COUNT_WARN_THRESHOLD = 10;

/** Health check: any pattern matching too many landmarks is likely a detection bug. */
function patternCountWarnings(landmarks = []) {
  const counts = Object.create(null);
  for (const lm of landmarks) {
    const t = lm && lm.pattern && lm.pattern.type;
    if (!t) continue;
    counts[t] = (counts[t] || 0) + 1;
  }
  const warnings = [];
  for (const type of Object.keys(counts).sort()) {
    const count = counts[type];
    if (count > PATTERN_COUNT_WARN_THRESHOLD) {
      warnings.push(
        `${type} pattern matched unusually high count (${count}) - possible detection bug`
      );
    }
  }
  return warnings;
}

function buildAiBrief({
  source,
  title,
  generatedAt,
  landmarks = [],
  tokens = {},
  palette = {},
  hasScaffold = false,
} = {}) {
  const flow = layoutFlowFromLandmarks(landmarks);
  const warnings = patternCountWarnings(landmarks);
  const brief = {
    meta: {
      source: source || '',
      generatedAt: generatedAt || new Date().toISOString(),
    },
    summary: buildSummary(title, source, flow),
    layoutFlow: flow,
    components: buildComponents(landmarks),
    designSystem: designSystemBlock(tokens, palette),
    scaffoldPath: hasScaffold ? 'scaffold/' : null,
    usageHint:
      'Give this brief to an AI as the only site-reference context: rebuild the layoutFlow with your brand using designSystem tokens; treat components as empty intent shells, not content to copy.',
  };
  if (warnings.length) brief.warnings = warnings;
  return brief;
}

function briefToMarkdown(brief) {
  const lines = [];
  lines.push(`# AI Brief`);
  lines.push('');
  lines.push(`- **Source:** ${brief.meta.source}`);
  lines.push(`- **Generated:** ${brief.meta.generatedAt}`);
  if (brief.scaffoldPath) lines.push(`- **Scaffold:** \`${brief.scaffoldPath}\``);
  lines.push('');
  if (brief.warnings && brief.warnings.length) {
    lines.push(`## Warnings`);
    for (const w of brief.warnings) lines.push(`- ${w}`);
    lines.push('');
  }
  lines.push(`## Summary`);
  lines.push(brief.summary);
  lines.push('');
  lines.push(`## Layout flow`);
  lines.push(brief.layoutFlow.join(' → ') || '(empty)');
  lines.push('');
  lines.push(`## Components`);
  for (const c of brief.components) {
    lines.push(`### ${c.name} (\`${c.pattern}\`)`);
    lines.push(c.purpose);
    lines.push(`- **Key elements:** ${c.keyElements.join(', ')}`);
    lines.push(`- **Design notes:** ${c.designNotes}`);
    lines.push('');
  }
  lines.push(`## Design system`);
  const ds = brief.designSystem;
  lines.push(`- **Colors:** bg ${ds.colors.background}, text ${ds.colors.text}, accent ${ds.colors.accent}, surface ${ds.colors.surface}, muted ${ds.colors.muted}`);
  lines.push(`- **Typography:** ${ds.typography}`);
  lines.push(`- **Spacing:** ${ds.spacing}`);
  lines.push(`- **Radius:** ${ds.radius}`);
  lines.push('');
  lines.push(`## Usage`);
  lines.push(brief.usageHint);
  lines.push('');
  return lines.join('\n');
}

module.exports = {
  buildAiBrief,
  briefToMarkdown,
  patternCountWarnings,
};
