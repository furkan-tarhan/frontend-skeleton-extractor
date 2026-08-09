/**
 * Scaffold generator — React + Tailwind + Vite starter from landmarks + tokens.
 */

const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, 'utf8');
}

function toPascalCase(kebab) {
  return String(kebab)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
}

function parseColor(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  // Skip multi-value / complex border-color dumps
  if (/\s/.test(v) && !/^rgba?\(/.test(v) && !/^hsla?\(/.test(v)) return null;

  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return {
      hex: `#${h.toLowerCase()}`,
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }

  const m = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!m) return null;
  const r = Math.round(Number(m[1]));
  const g = Math.round(Number(m[2]));
  const b = Math.round(Number(m[3]));
  const a = m[4] !== undefined ? Number(m[4]) : 1;
  if (a < 0.35) return null;
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return { hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`, r, g, b, a };
}

function luminance({ r, g, b }) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function pxNumber(value) {
  if (!value || typeof value !== 'string') return null;
  const m = value.trim().match(/^([\d.]+)px$/i);
  return m ? Number(m[1]) : null;
}

function scoredList(arr) {
  return Array.isArray(arr) ? [...arr].sort((a, b) => (b.score || 0) - (a.score || 0)) : [];
}

/** Map tokens + palette → named theme tokens for Tailwind. */
function buildThemeTokens(tokens = {}, palette = {}) {
  const colorEntries = scoredList(tokens.colors)
    .map((c) => ({ ...c, parsed: parseColor(c.value) }))
    .filter((c) => c.parsed);

  const unique = [];
  const seen = new Set();
  for (const c of colorEntries) {
    if (seen.has(c.parsed.hex)) continue;
    seen.add(c.parsed.hex);
    unique.push(c);
  }

  const darks = unique.filter((c) => luminance(c.parsed) < 0.45);
  const lights = unique.filter((c) => luminance(c.parsed) >= 0.55);
  const mids = unique.filter((c) => luminance(c.parsed) >= 0.45 && luminance(c.parsed) < 0.55);

  const primaryBg = (darks[0] || unique[0] || { parsed: { hex: '#101014' } }).parsed.hex;
  const primaryText = (lights[0] || { parsed: { hex: '#ffffff' } }).parsed.hex;
  const surface = (darks[1] || mids[0] || darks[0] || { parsed: { hex: '#1c1a24' } }).parsed.hex;
  const muted = (lights[1] || mids[0] || { parsed: { hex: '#bbb9c7' } }).parsed.hex;
  const accent =
    palette.Vibrant ||
    palette.LightVibrant ||
    (unique.find((c) => luminance(c.parsed) > 0.2 && luminance(c.parsed) < 0.7) || {}).parsed?.hex ||
    '#8080f5';
  const accentDark = palette.DarkVibrant || darks[2]?.parsed?.hex || '#124870';
  const mutedAccent = palette.Muted || muted;

  // Prefer high-score sizes, keep a readable scale (body → display)
  const rawSizes = scoredList(tokens.fontSizes)
    .map((f) => ({ ...f, px: pxNumber(f.value) }))
    .filter((f) => f.px != null && f.px >= 10 && f.px <= 72);
  const byPx = [];
  for (const s of rawSizes) {
    if (byPx.some((d) => Math.abs(d.px - s.px) < 0.5)) continue;
    byPx.push(s);
  }
  byPx.sort((a, b) => a.px - b.px);
  const pickNear = (target) => {
    if (!byPx.length) return target;
    return byPx.reduce((best, s) =>
      Math.abs(s.px - target) < Math.abs(best.px - target) ? s : best
    ).px;
  };
  const fontSizes = {
    xs: [`${pickNear(12)}px`, { lineHeight: '1.4' }],
    sm: [`${pickNear(14)}px`, { lineHeight: '1.4' }],
    base: [`${pickNear(16)}px`, { lineHeight: '1.5' }],
    lg: [`${pickNear(18)}px`, { lineHeight: '1.45' }],
    xl: [`${pickNear(22)}px`, { lineHeight: '1.35' }],
    '2xl': [`${pickNear(28)}px`, { lineHeight: '1.3' }],
    '3xl': [`${pickNear(32)}px`, { lineHeight: '1.2' }],
    '4xl': [`${pickNear(42)}px`, { lineHeight: '1.1' }],
    '5xl': [`${Math.max(pickNear(42), 48)}px`, { lineHeight: '1.05' }],
  };

  // Radii are purpose-based, not a dense sm→xl ladder:
  // px corners → sm/lg/xl (only as many steps as real px tokens);
  // percent (50%) → circle; always keep full for pills.
  const borderRadius = {};
  const cornerPx = [];
  let circleValue = null;
  for (const entry of scoredList(tokens.borderRadii)) {
    const v = (entry.value || '').trim();
    if (!v || v === '0px' || v === '0') continue;
    if (/%$/.test(v)) {
      if (!circleValue) circleValue = v;
      continue;
    }
    const px = pxNumber(v);
    if (px == null || px <= 0) continue;
    if (cornerPx.some((c) => c.px === px)) continue;
    cornerPx.push({ value: v, px });
  }
  cornerPx.sort((a, b) => a.px - b.px);
  const scaleNames =
    cornerPx.length <= 1
      ? ['sm']
      : cornerPx.length === 2
        ? ['sm', 'lg']
        : cornerPx.length === 3
          ? ['sm', 'lg', 'xl']
          : ['sm', 'md', 'lg', 'xl'];
  cornerPx.slice(0, scaleNames.length).forEach((r, i) => {
    borderRadius[scaleNames[i]] = r.value;
  });
  borderRadius.circle = circleValue || '50%';
  borderRadius.full = '9999px';

  const spacing = {};
  const spaceNames = ['1', '2', '3', '4', '5', '6', '8', '10', '12'];
  const spaces = scoredList(tokens.spacings)
    .map((s) => ({ ...s, px: pxNumber(s.value) }))
    .filter((s) => s.px != null && s.px > 0)
    .sort((a, b) => a.px - b.px);
  const dedupSpace = [];
  for (const s of spaces) {
    if (dedupSpace.some((d) => d.px === s.px)) continue;
    dedupSpace.push(s);
  }
  dedupSpace.slice(0, spaceNames.length).forEach((s, i) => {
    spacing[spaceNames[i]] = `${s.px}px`;
  });

  const fontFamily = scoredList(tokens.fonts)[0]?.value || 'system-ui, sans-serif';
  // First family name only for CSS var / tailwind
  const fontName = fontFamily.split(',')[0].replace(/["']/g, '').trim() || 'system-ui';

  return {
    colors: {
      'primary-bg': primaryBg,
      'primary-text': primaryText,
      surface,
      muted,
      accent,
      'accent-dark': accentDark,
      'muted-accent': mutedAccent,
    },
    fontSize: fontSizes,
    borderRadius,
    spacing,
    fontFamily: {
      sans: fontFamily.split(',').map((p) => p.trim().replace(/^["']|["']$/g, '')),
    },
    fontName,
  };
}

function assignComponentNames(landmarks) {
  const used = new Map();
  let sectionN = 0;
  return landmarks.map((lm, index) => {
    const type = lm.pattern && lm.pattern.type;
    let name;
    if (!type) {
      sectionN += 1;
      name = `Section${String(sectionN).padStart(2, '0')}`;
    } else {
      const base = toPascalCase(type);
      const n = (used.get(base) || 0) + 1;
      used.set(base, n);
      name = n === 1 ? base : `${base}${String(n).padStart(2, '0')}`;
    }
    return { landmark: lm, index, name, patternType: type || null };
  });
}

function commentHeader(name, lm, patternType) {
  const bounds = lm.bounds || {};
  const sample = (lm.textSample || '').replace(/\*\//g, '* /').slice(0, 120);
  const lines = [
    `/**`,
    ` * ${name} — scaffold placeholder`,
    ` * Pattern: ${patternType || 'unrecognized'}`,
    ` * Bounds (ref): x=${bounds.x ?? '?'} y=${bounds.y ?? '?'} w=${bounds.w ?? '?'} h=${bounds.h ?? '?'}`,
    sample ? ` * Original textSample (do not copy verbatim): "${sample}"` : ` * Original textSample: (empty)`,
    ` */`,
  ];
  return lines.join('\n');
}

function minHeightStyle(lm) {
  const h = lm.bounds && lm.bounds.h;
  if (!h || h < 40) return '';
  const capped = Math.min(Math.round(h), 720);
  return ` style={{ minHeight: '${capped}px' }}`;
}

/** Pattern → JSX body (placeholders only, token class names). */
function templateBody(patternType, lm) {
  const mh = minHeightStyle(lm);

  switch (patternType) {
    case 'navigation':
      return `
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-primary-bg/95 px-6 py-4 text-primary-text backdrop-blur">
      <div className="text-lg font-semibold tracking-wide">Brand</div>
      <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
        <a href="#" className="hover:text-primary-text">Link one</a>
        <a href="#" className="hover:text-primary-text">Link two</a>
        <a href="#" className="hover:text-primary-text">Link three</a>
      </nav>
      <button type="button" className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-primary-text">
        CTA
      </button>
    </header>
  );`;

    case 'hero':
      return `
  return (
    <section className="relative flex flex-col items-center justify-center gap-6 bg-primary-bg px-6 py-20 text-center text-primary-text"${mh}>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent-dark/40 to-primary-bg" />
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
        Buraya ana başlığınızı yazın
      </h1>
      <p className="max-w-xl text-lg text-muted">
        Kısa destekleyici cümle — kendi ürün vaadinizi buraya koyun.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="rounded-sm bg-accent px-6 py-3 font-medium text-primary-text">
          Birincil aksiyon
        </button>
        <button type="button" className="rounded-sm border border-muted/40 px-6 py-3 text-muted">
          İkincil aksiyon
        </button>
      </div>
    </section>
  );`;

    case 'search-bar':
      return `
  return (
    <section className="bg-primary-bg px-6 py-4">
      <form
        className="mx-auto flex max-w-xl items-center gap-2 rounded-sm bg-surface px-4 py-3"
        onSubmit={(e) => e.preventDefault()}
      >
        <span className="inline-block h-5 w-5 rounded-sm bg-muted/40" aria-hidden="true" />
        <input
          type="search"
          placeholder="Arama placeholder…"
          className="w-full bg-transparent text-primary-text outline-none placeholder:text-muted"
        />
        <button type="submit" className="rounded-sm bg-accent px-3 py-1.5 text-sm text-primary-text">
          Ara
        </button>
      </form>
    </section>
  );`;

    case 'stat-cards':
      return `
  const items = [
    { label: 'Metrik A', value: '00' },
    { label: 'Metrik B', value: '00+' },
    { label: 'Metrik C', value: '00K' },
  ];

  return (
    <section className="bg-primary-bg px-6 py-12 text-primary-text"${mh}>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-surface px-6 py-8 text-center">
            <div className="text-3xl font-bold text-accent">{item.value}</div>
            <div className="mt-2 text-sm text-muted">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );`;

    case 'feature-grid':
      return `
  const features = [
    { title: 'Özellik 1', body: 'Kısa açıklama placeholder.' },
    { title: 'Özellik 2', body: 'Kısa açıklama placeholder.' },
    { title: 'Özellik 3', body: 'Kısa açıklama placeholder.' },
  ];

  return (
    <section className="bg-primary-bg px-6 py-16 text-primary-text"${mh}>
      <h2 className="mb-10 text-center text-3xl font-semibold">Özellikler</h2>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg bg-surface p-6">
            <div className="mb-4 h-10 w-10 rounded-sm bg-accent/30" aria-hidden="true" />
            <h3 className="text-xl font-medium">{f.title}</h3>
            <p className="mt-2 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );`;

    case 'product-carousel':
      return `
  const cards = [1, 2, 3, 4, 5];

  return (
    <section className="bg-primary-bg px-6 py-12 text-primary-text"${mh}>
      <h2 className="mb-6 text-2xl font-semibold">Ürün şeridi</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {cards.map((n) => (
          <div
            key={n}
            className="min-w-[180px] shrink-0 rounded-lg bg-surface p-4"
          >
            <div className="mb-3 aspect-square rounded-sm bg-muted/20" aria-hidden="true" />
            <div className="text-sm font-medium">Ürün {n}</div>
            <div className="text-xs text-muted">Açıklama placeholder</div>
          </div>
        ))}
      </div>
    </section>
  );`;

    case 'cta-banner':
      return `
  return (
    <section className="bg-surface px-6 py-20 text-center text-primary-text"${mh}>
      <h2 className="text-3xl font-bold">Buraya CTA başlığı</h2>
      <p className="mx-auto mt-4 max-w-lg text-muted">
        Kullanıcıyı aksiyona yönlendiren kısa metin.
      </p>
      <button type="button" className="mt-8 rounded-sm bg-accent px-8 py-3 font-medium">
        Aksiyon butonu
      </button>
    </section>
  );`;

    case 'faq-accordion':
      return `
  const [open, setOpen] = useState(0);
  const items = [
    { q: 'Soru 1 placeholder?', a: 'Cevap metni buraya.' },
    { q: 'Soru 2 placeholder?', a: 'Cevap metni buraya.' },
    { q: 'Soru 3 placeholder?', a: 'Cevap metni buraya.' },
  ];

  return (
    <section className="bg-primary-bg px-6 py-16 text-primary-text"${mh}>
      <h2 className="mb-8 text-center text-3xl font-semibold">SSS</h2>
      <div className="mx-auto max-w-2xl space-y-3">
        {items.map((item, i) => (
          <div key={item.q} className="overflow-hidden rounded-lg bg-surface">
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 text-left font-medium"
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              <span>{item.q}</span>
              <span className="text-muted">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && (
              <div className="border-t border-muted/10 px-5 py-4 text-sm text-muted">{item.a}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );`;

    case 'about':
      return `
  return (
    <section className="bg-primary-bg px-6 py-12 text-primary-text"${mh}>
      <h2 className="text-2xl font-semibold">Hakkında</h2>
      <p className="mt-4 max-w-3xl text-muted">
        Marka / ürün hakkında kısa tanıtım paragrafı placeholder.
      </p>
    </section>
  );`;

    case 'info-block':
      return `
  return (
    <section className="bg-primary-bg px-6 py-10 text-primary-text"${mh}>
      <h2 className="text-xl font-semibold">Bilgi bloğu başlığı</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
        Bu bölüm için kendi açıklama metninizi yazın.
      </p>
    </section>
  );`;

    case 'footer':
      return `
  return (
    <footer className="bg-surface px-6 py-12 text-sm text-muted">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
        {['Kolon A', 'Kolon B', 'Kolon C', 'Kolon D'].map((col) => (
          <div key={col}>
            <div className="mb-3 font-medium text-primary-text">{col}</div>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-primary-text">Link</a></li>
              <li><a href="#" className="hover:text-primary-text">Link</a></li>
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center text-xs">© Your Brand — placeholder</p>
    </footer>
  );`;

    case 'testimonial':
      return `
  return (
    <section className="bg-primary-bg px-6 py-16 text-center text-primary-text"${mh}>
      <blockquote className="mx-auto max-w-2xl text-xl italic text-muted">
        “Kullanıcı yorumu placeholder.”
      </blockquote>
      <div className="mt-4 text-sm">— İsim, Rol</div>
    </section>
  );`;

    case 'pricing-grid':
      return `
  const plans = [
    { name: 'Başlangıç', price: '₺—' },
    { name: 'Pro', price: '₺—' },
    { name: 'Ekip', price: '₺—' },
  ];

  return (
    <section className="bg-primary-bg px-6 py-16 text-primary-text"${mh}>
      <h2 className="mb-10 text-center text-3xl font-semibold">Fiyatlandırma</h2>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className="rounded-lg bg-surface p-8 text-center">
            <div className="text-lg font-medium">{p.name}</div>
            <div className="mt-4 text-3xl font-bold text-accent">{p.price}</div>
            <button type="button" className="mt-6 rounded-sm bg-accent px-4 py-2 text-sm">
              Seç
            </button>
          </div>
        ))}
      </div>
    </section>
  );`;

    default:
      return `
  return (
    <section className="bg-primary-bg px-6 py-10 text-primary-text"${mh}>
      <div className="rounded-lg border border-dashed border-muted/30 bg-surface/50 px-6 py-8">
        <h2 className="text-xl font-semibold">Bölüm başlığı</h2>
        <p className="mt-2 text-sm text-muted">
          Tanınmayan landmark — kendi içeriğinizi buraya yerleştirin.
        </p>
        <div className="mt-6 h-16 rounded-sm bg-muted/10" aria-hidden="true" />
      </div>
    </section>
  );`;
  }
}

function componentSource(entry) {
  const { name, landmark: lm, patternType } = entry;
  const needsState = patternType === 'faq-accordion';
  const imports = needsState ? `import { useState } from 'react';\n\n` : '';
  const header = commentHeader(name, lm, patternType);
  const body = templateBody(patternType, lm);
  return `${imports}${header}
export default function ${name}() {${body}
}
`;
}

function buildTailwindConfig(theme) {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: ${JSON.stringify(theme.colors, null, 8).replace(/\n/g, '\n      ')},
      fontFamily: {
        sans: ${JSON.stringify(theme.fontFamily.sans)},
      },
      fontSize: ${JSON.stringify(theme.fontSize, null, 8).replace(/\n/g, '\n      ')},
      borderRadius: ${JSON.stringify(theme.borderRadius, null, 8).replace(/\n/g, '\n      ')},
      spacing: ${JSON.stringify(theme.spacing, null, 8).replace(/\n/g, '\n      ')},
    },
  },
  plugins: [],
};
`;
}

function buildAppJsx(entries) {
  const imports = entries
    .map((e) => `import ${e.name} from './components/${e.name}';`)
    .join('\n');
  const renders = entries.map((e) => `      <${e.name} />`).join('\n');
  return `/**
 * App — landmark sırasına göre scaffold bileşenleri.
 * İçerik placeholder; orijinal siteden kopyalanmış metin yoktur.
 */
${imports}

export default function App() {
  return (
    <div className="min-h-screen bg-primary-bg font-sans text-primary-text antialiased">
${renders}
    </div>
  );
}
`;
}

function buildPackageJson(host) {
  const safe = String(host || 'scaffold')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '') || 'scaffold';
  return {
    name: `${safe}-scaffold`,
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.3.4',
      autoprefixer: '^10.4.20',
      postcss: '^8.4.49',
      tailwindcss: '^3.4.17',
      vite: '^5.4.11',
    },
  };
}

/**
 * Generate React+Tailwind Vite scaffold under outDir/scaffold.
 * @returns {{ dir: string, components: string[], framework: string }}
 */
function generateScaffold({
  outDir,
  landmarks = [],
  tokens = {},
  palette = {},
  framework = 'react',
  host = 'site',
  sourceUrl = '',
} = {}) {
  const fw = String(framework || 'react').toLowerCase();
  if (fw !== 'react') {
    throw new Error(
      `Scaffold framework "${fw}" is not supported yet. Use --framework react (default).`
    );
  }

  const scaffoldDir = path.join(outDir, 'scaffold');
  // Preserve node_modules if present (re-run / locked Vite process)
  if (fs.existsSync(scaffoldDir)) {
    for (const name of fs.readdirSync(scaffoldDir)) {
      if (name === 'node_modules') continue;
      fs.rmSync(path.join(scaffoldDir, name), { recursive: true, force: true });
    }
  }
  ensureDir(scaffoldDir);

  const theme = buildThemeTokens(tokens, palette);
  const entries = assignComponentNames(landmarks);

  write(path.join(scaffoldDir, 'package.json'), JSON.stringify(buildPackageJson(host), null, 2) + '\n');
  write(path.join(scaffoldDir, 'tailwind.config.js'), buildTailwindConfig(theme));
  write(
    path.join(scaffoldDir, 'postcss.config.js'),
    `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n`
  );
  write(
    path.join(scaffoldDir, 'vite.config.js'),
    `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`
  );
  write(
    path.join(scaffoldDir, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Scaffold — ${host}</title>
  </head>
  <body class="bg-primary-bg">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
  );
  write(
    path.join(scaffoldDir, 'src', 'main.jsx'),
    `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
  );
  write(
    path.join(scaffoldDir, 'src', 'index.css'),
    `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Scaffold starter — tokens live in tailwind.config.js */
html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: ${theme.fontFamily.sans.map((f) => (f.includes(' ') ? `"${f}"` : f)).join(', ')};
  background-color: ${theme.colors['primary-bg']};
  color: ${theme.colors['primary-text']};
}
`
  );
  write(path.join(scaffoldDir, 'src', 'App.jsx'), buildAppJsx(entries));

  for (const entry of entries) {
    write(path.join(scaffoldDir, 'src', 'components', `${entry.name}.jsx`), componentSource(entry));
  }

  write(
    path.join(scaffoldDir, 'README.md'),
    `# Scaffold — ${host}

Generated from \`${sourceUrl || host}\` by frontend-skeleton-extractor.

## Run

\`\`\`bash
npm install
npm run dev
\`\`\`

Placeholder components follow landmark order. Replace copy and wire your own data — do not treat this as a clone of the source site.
`
  );

  return {
    dir: scaffoldDir,
    framework: fw,
    components: entries.map((e) => e.name),
    themeColors: theme.colors,
  };
}

module.exports = {
  generateScaffold,
  buildThemeTokens,
  assignComponentNames,
};
