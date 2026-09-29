// Checks for the X-Ray Mortgages ad frames (creative/frames). Same method as the
// Room's checks-creative.mjs, with the X-Ray brand rules.
//
//   node creative/checks.mjs              check the nine frames and their PNGs
//   node creative/checks.mjs --negative   break a frame one rule at a time and
//                                         confirm every break is caught
//
// Text rules come from tests/rules.mjs, the module the site gate uses, so the
// frames and the site share one banned-phrase, brand-string and dash list.
// `[PENDING]` (the RECA licence) is the one expected placeholder: it is
// reported on its own and does not fail. Exit code 1 on any other failure.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { BANNED_PHRASES, FORBIDDEN_STRINGS, EN_DASH_AS_EM, flatten } from '../tests/rules.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRAMES = path.join(HERE, 'frames');
const NEGATIVE = process.argv.includes('--negative');

/* ── locked copy (XRAY-AD-COPY-v1-ALBERTA.md) ───────────────────────────── */
const DISCLOSURE =
  'Raymond. F, Mortgage Associate, RECA Licence [PENDING]. ' +
  'Centum Financial Services Limited Partnership. Alberta only. ' +
  'Rates and terms are not guaranteed. Subject to lender approval.';
const BROKERAGE = 'Centum Financial Services Limited Partnership';
const BADGE = 'RECA licensed Mortgage Associate';
const TICKS = ['No documents to start', 'No credit check to start', 'Not an application'];
const CTA = 'Get your Mortgage X-Ray';
const WORDMARK = 'X-RAY MORTGAGES';
const EXPECTED_PLACEHOLDER = '[PENDING]';

// The brief's frame list, merged with the site gate's (the gate's is a superset).
const BRIEF_BANNED = ['beat the rate', 'lowest rate', 'best rate', 'approved', 'guaranteed', 'guarantee',
  'hidden fees', 'save money', 'lower your payments', 'bad credit', 'diagnostic'];
const BANNED = [...new Set([...BANNED_PHRASES, ...BRIEF_BANNED])];
const BRIEF_FORBIDDEN = ['Fisher', 'Capital', 'Mortgage Room', 'Ontario', 'FSRA', 'M26000144', '13054', 'Mortgage Commitment'];
const FORBIDDEN = [...new Set([...FORBIDDEN_STRINGS, ...BRIEF_FORBIDDEN])];
const ANY_DASH = /[\u2013\u2014\u2015\u2E3A\u2E3B\uFE58\uFE31\uFE32]/;
const CSS_DASH_ESCAPE = /\\0*(2013|2014|2015|2e3a|2e3b|fe58|fe31|fe32)(?![0-9a-f])/i;

// Site values the wordmark must match (styles.css .wordmark / .wordmark .x).
const siteCss = fs.readFileSync(path.join(HERE, '..', 'styles.css'), 'utf8');
const tok = (n) => siteCss.match(new RegExp(`--${n}\\s*:\\s*([^;]+);`))[1].trim();
const hexRgb = (h) => { const x = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)); };
const SLATE = hexRgb(tok('slate'));
const TEAL_INK = hexRgb(tok('teal-ink'));

/* ── helpers ────────────────────────────────────────────────────────────── */
function srgb(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
function lum([r, g, b]) { return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b); }
function rgb(s) { const m = String(s).match(/(\d+),\s*(\d+),\s*(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; }
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
const same = (a, b) => a && b && a.every((v, i) => Math.abs(v - b[i]) <= 1);

// Visible text of a frame: <style> and <head> removed, tags removed, entities
// decoded, look-alikes folded (the same flatten() the site gate uses).
function visibleText(html) {
  return flatten(html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(head|style|script|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')).trim();
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const t of ['playwright', process.env.PLAYWRIGHT_DIR,
    path.join(os.homedir(), '.claude/skills/gstack/node_modules/playwright')].filter(Boolean)) {
    try { return require(t); } catch { /* next */ }
  }
  throw new Error('Playwright not found. Set PLAYWRIGHT_DIR to a playwright package folder.');
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') return null;
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
}

/* ── one frame ──────────────────────────────────────────────────────────── */
// Returns { fails: [..], placeholders: n }. `html` may be a mutated copy.
async function checkFrame(browser, job, html) {
  const fails = [];
  const fail = (msg) => fails.push(msg);
  const { w, h, safeTop, safeBottom } = job;

  // Static: text rules on the source.
  const text = visibleText(html);
  const pending = text.split(EXPECTED_PLACEHOLDER).length - 1;
  const textNoDisclosure = text.split(DISCLOSURE).join(' ');
  if (ANY_DASH.test(html)) fail('em or en dash character in the file');
  if (CSS_DASH_ESCAPE.test(html)) fail('em or en dash as a CSS escape');
  if (ANY_DASH.test(text)) fail('em or en dash in visible text (entity or encoded)');
  if (new RegExp(EN_DASH_AS_EM.source).test(text)) fail('en dash used as an em dash');
  for (const p of BANNED) {
    const re = new RegExp(p.replace(/ /g, '[\\s\\-\u2010\u2011]+'), 'i');
    if (re.test(textNoDisclosure)) fail(`banned phrase "${p}"`);
  }
  const rawFlat = flatten(html);
  for (const s of FORBIDDEN) {
    const re = new RegExp(s.replace(/ /g, '[\\s\\-]+'), 'i');
    if (re.test(rawFlat) || re.test(text)) fail(`forbidden string "${s}"`);
  }
  // "#" is checked in visible text only: the <style> block needs "#" for colours.
  if (text.includes('#')) fail('"#" in visible text');
  const stray = text.split(EXPECTED_PLACEHOLDER).join('').match(/\[[^\]]*\]?/);
  if (stray) fail(`unexpected placeholder ${stray[0]}`);
  if (/<script\b/i.test(html)) fail('script element');
  if (/@font-face|@import/i.test(html)) fail('web font or @import');
  if (/<(img|link|iframe|video|object|embed)\b/i.test(html)) fail('external element (img, link, iframe, video, object or embed)');
  if (/url\(\s*["']?\s*(https?:)?\/\//i.test(html)) fail('off-site url()');

  // Rendered.
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const requests = [];
  page.on('request', (r) => { if (!/^(file|data|about):/.test(r.url())) requests.push(r.url()); });
  await page.setContent(html, { waitUntil: 'load' });
  const m = await page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { text: el.innerText.replace(/\s+/g, ' ').trim(), top: r.top, bottom: r.bottom, left: r.left, right: r.right,
        fontSize: parseFloat(cs.fontSize), letterSpacing: cs.letterSpacing, color: cs.color, bg: cs.backgroundColor,
        fontFamily: cs.fontFamily, visible: cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && r.height > 0 };
    };
    const q = (s) => box(document.querySelector(s));
    const bg = (el) => { while (el) { const c = getComputedStyle(el).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; el = el.parentElement; } return 'rgb(255, 255, 255)'; };
    return {
      brk: q('.brk'), brkBg: bg(document.querySelector('.brk')), wordmark: q('.wordmark'), x: q('.wordmark .x'),
      badge: q('.badge'), hook: q('.hook'), sub: q('.sub'), cta: q('.cta'), band: q('.band'), scan: q('.scan'),
      ticks: [...document.querySelectorAll('.tick')].map(box),
      ground: bg(document.querySelector('.main')),
      scans: document.querySelectorAll('.scan').length,
      svgs: document.querySelectorAll('svg').length, svgsInTicks: document.querySelectorAll('.tick svg').length,
      imgs: document.querySelectorAll('img, picture, video, canvas').length,
      bodyText: document.body.innerText,
      fontFaces: document.fonts.size,
      scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
    };
  });
  await page.close();

  const need = { brk: 'brokerage header', badge: 'badge', band: 'disclosure band', wordmark: 'wordmark', hook: 'hook', sub: 'sub-line', cta: 'button', scan: 'scan line' };
  for (const [k, what] of Object.entries(need)) if (!m[k] || !m[k].visible) fail(`missing ${what}`);
  if (fails.some((f) => f.startsWith('missing'))) return { fails, placeholders: pending };

  // Exact copy.
  if (m.band.text !== DISCLOSURE) fail(`disclosure band text differs: "${m.band.text.slice(0, 70)}..."`);
  if (m.brk.text !== BROKERAGE) fail(`brokerage header text differs: "${m.brk.text}"`);
  if (m.badge.text !== BADGE) fail(`badge text differs: "${m.badge.text}"`);
  if (m.cta.text !== CTA) fail(`button text differs: "${m.cta.text}"`);
  if (m.hook.text !== job.hook) fail(`hook differs: "${m.hook.text}"`);
  if (m.sub.text !== job.sub) fail(`sub-line differs: "${m.sub.text}"`);
  if (m.ticks.length !== 3 || m.ticks.some((t, i) => t.text !== TICKS[i])) fail(`ticks differ: ${JSON.stringify(m.ticks.map((t) => t.text))}`);
  if (!m.bodyText.includes('Alberta only')) fail('missing "Alberta only"');

  // Wordmark as the site renders it.
  if (m.wordmark.text !== WORDMARK) fail(`wordmark text differs: "${m.wordmark.text}"`);
  if (!m.x || m.x.text !== 'X-RAY' || !same(rgb(m.x.color), TEAL_INK)) fail('wordmark X-RAY is not in the accent (teal-ink)');
  if (!same(rgb(m.wordmark.color), SLATE)) fail('wordmark MORTGAGES is not slate');
  const ls = parseFloat(m.wordmark.letterSpacing) / m.wordmark.fontSize;
  if (!(Math.abs(ls - 0.22) < 0.01)) fail(`wordmark letter-spacing is not 0.22em (${ls.toFixed(3)}em)`);

  // Brokerage: top right, larger than the brand.
  if (!(m.brk.fontSize > m.wordmark.fontSize)) fail(`brokerage (${m.brk.fontSize}px) not larger than wordmark (${m.wordmark.fontSize}px)`);
  if (!(m.brk.right >= w - 100 && m.brk.top < m.wordmark.top)) fail('brokerage is not top right');

  // Disclosure band: full width, type size, safe zone, nothing on top of it.
  if (m.band.left > 0.5 || m.band.right < w - 0.5) fail(`band not full width (${Math.round(m.band.left)}-${Math.round(m.band.right)})`);
  if (m.band.fontSize < 26) fail(`band type ${m.band.fontSize}px, minimum 26px`);
  const lo = safeTop, hi = h - safeBottom;
  for (const k of ['brk', 'wordmark', 'badge', 'hook', 'sub', 'cta', 'band']) {
    if (m[k].top < lo - 0.5 || m[k].bottom > hi + 0.5) fail(`${k} outside the safe zone (${Math.round(m[k].top)}-${Math.round(m[k].bottom)} vs ${lo}-${hi})`);
  }
  for (const t of m.ticks) if (t.top < lo - 0.5 || t.bottom > hi + 0.5) fail('a tick is outside the safe zone');
  if (m.cta.bottom > m.band.top + 0.5) fail('button overlaps the disclosure band');
  if (m.scrollW > w + 1 || m.scrollH > h + 1) fail(`content overflows the canvas (${m.scrollW}x${m.scrollH})`);

  // Contrast (4.5:1 minimum for all text, per the brief for badge and ticks).
  const ground = rgb(m.ground);
  const pairs = [
    ['badge', rgb(m.badge.color), rgb(m.badge.bg)],
    ...m.ticks.map((t, i) => [`tick ${i + 1}`, rgb(t.color), ground]),
    ['hook', rgb(m.hook.color), ground], ['sub-line', rgb(m.sub.color), ground],
    ['button', rgb(m.cta.color), rgb(m.cta.bg)], ['band', rgb(m.band.color), rgb(m.band.bg)],
    ['brokerage', rgb(m.brk.color), rgb(m.brkBg)], ['wordmark X-RAY', rgb(m.x.color), ground],
  ];
  for (const [name, fg, bg] of pairs) {
    const r = contrast(fg, bg);
    if (!(r >= 4.5)) fail(`${name} contrast ${r.toFixed(2)}:1 below 4.5:1`);
  }

  // One decoration, no pictures, system fonts, no network.
  if (m.scans !== 1) fail(`expected exactly one scan line, found ${m.scans}`);
  if (m.imgs !== 0) fail('picture element present');
  if (m.svgs !== m.svgsInTicks || m.svgsInTicks !== 3) fail(`graphics other than the three tick marks (${m.svgs} svg)`);
  if (m.fontFaces !== 0) fail('web font loaded');
  if (!/^system-ui\b/.test(m.hook.fontFamily)) fail(`not the system font stack (${m.hook.fontFamily})`);
  if (requests.length) fail(`network request at render time: ${requests[0]}`);

  return { fails, placeholders: pending };
}

/* ── negative mutations ─────────────────────────────────────────────────── */
const MUTATIONS = [
  ['em dash in the hook', (s) => s.replace('</p>\n    <p class="sub">', ' \u2014 today</p>\n    <p class="sub">')],
  ['en dash entity in a tick', (s) => s.replace('No documents to start', 'No documents &ndash; to start')],
  ['em dash as CSS escape', (s) => s.replace('</style>', '.x::after{content:"\\2014"}</style>')],
  ['banned "approved"', (s) => s.replace('No documents to start', 'Get approved')],
  ['banned phrase split by a tag', (s) => s.replace('No documents to start', 'The best <b>rate</b>')],
  ['banned "guarantee" outside the band', (s) => s.replace('Not an application', 'No guarantee')],
  ['"diagnostic" in the sub-line', (s) => s.replace(/(<p class="sub">)/, '$1A diagnostic. ')],
  ['old brand "Fisher"', (s) => s.replace('<p class="brk">', '<p class="brk">Fisher ')],
  ['"Capital" hidden in a comment', (s) => s.replace('<main', '<!-- Capital --><main')],
  ['"Mortgage Room"', (s) => s.replace('Not an application', 'The Mortgage Room')],
  ['"Ontario"', (s) => s.replace('Alberta homeowners', 'Ontario homeowners').replace('reviews for Alberta.', 'reviews for Ontario.').replace('Alberta files', 'Ontario files')],
  ['"FSRA" licence text', (s) => s.replace(/(<span class="badge">)/, '$1FSRA ')],
  ['"M26000144"', (s) => s.replace('Not an application', 'Licence M26000144')],
  ['"13054"', (s) => s.replace('Not an application', 'Lic. 13054')],
  ['"Mortgage Commitment"', (s) => s.replace('<p class="brk">', '<p class="brk">Mortgage Commitment, ')],
  ['"#" before a licence number', (s) => s.replace('[PENDING]', '#[PENDING]'), 'sq', '"#" in visible text'],
  ['disclosure band removed', (s) => s.replace(/<p class="band">[\s\S]*?<\/p>/, '')],
  ['disclosure band reworded', (s) => s.replace('Rates and terms are not', 'Rates and terms are usually not'), 'sq', 'disclosure band text differs'],
  ['brokerage header removed', (s) => s.replace(/<p class="brk">[^<]*<\/p>/, '')],
  ['badge removed', (s) => s.replace(/<span class="badge">[^<]*<\/span>/, '')],
  ['"Alberta only" removed', (s) => s.replace(/Alberta only\. /, ''), 'sq', 'missing "Alberta only"'],
  ['band type under 26px', (s) => s.replace('</style>', '.band{font-size:22px}</style>')],
  ['band not full width', (s) => s.replace('</style>', '.band{width:80%}</style>')],
  ['brokerage smaller than wordmark', (s) => s.replace('</style>', '.brk{font-size:16px}</style>')],
  ['wordmark in one colour', (s) => s.replace('</style>', '.wordmark .x{color:inherit}</style>')],
  ['badge contrast too low', (s) => s.replace('</style>', '.badge{background:#9AA5B1;color:#F4F6F8}</style>')],
  ['tick contrast too low', (s) => s.replace('</style>', '.tick{color:#9AA5B1}</style>')],
  ['second placeholder', (s) => s.replace('Not an application', '[TALLY_XRAY]')],
  ['web font', (s) => s.replace('<style>', '<style>@font-face{font-family:X;src:url(https://fonts.gstatic.com/x.woff2)}')],
  ['tracking pixel', (s) => s.replace('<main', '<img src="https://t.test/p.gif" alt=""><main')],
  ['second decorative element', (s) => s.replace('</main>', '<div class="scan"></div></main>')],
  ['content overflows the canvas', (s) => s.replace('</style>', '.hook{font-size:260px}</style>')],
  ['story: text in the reserved top strip', (s) => s.replace('</style>', '.safe.top{flex-basis:0}</style>'), 'st'],
];

/* ── run ────────────────────────────────────────────────────────────────── */
const jobs = JSON.parse(fs.readFileSync(path.join(FRAMES, 'jobs.json'), 'utf8'));
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
let failed = 0;

if (!NEGATIVE) {
  let placeholders = 0;
  for (const job of jobs) {
    const html = fs.readFileSync(path.join(FRAMES, `${job.base}.html`), 'utf8');
    const { fails, placeholders: n } = await checkFrame(browser, job, html);
    const png = path.join(FRAMES, `${job.base}.png`);
    const dims = fs.existsSync(png) ? pngSize(png) : 'missing';
    if (dims !== `${job.w}x${job.h}`) fails.push(`PNG ${dims}, expected ${job.w}x${job.h}`);
    if (fs.existsSync(png) && fs.statSync(png).mtimeMs + 1 < fs.statSync(path.join(FRAMES, `${job.base}.html`)).mtimeMs) {
      fails.push('PNG is older than its HTML (re-run node creative/gen.js)');
    }
    placeholders += n;
    console.log(`${fails.length ? 'FAIL' : 'PASS'}  ${job.base}${fails.length ? '' : '  (' + n + ' x ' + EXPECTED_PLACEHOLDER + ')'}`);
    for (const f of fails) console.log(`        ${f}`);
    failed += fails.length ? 1 : 0;
  }
  console.log('');
  console.log(`Rules: text rules from tests/rules.mjs (${BANNED.length} banned phrases, ${FORBIDDEN.length} forbidden strings), plus "#" and dashes.`);
  console.log(`Expected placeholder: ${EXPECTED_PLACEHOLDER} x${placeholders} (the RECA licence number; not a failure until go-live).`);
  console.log(failed ? `FRAMES: FAIL (${failed} of ${jobs.length} frames)` : `FRAMES: PASS (${jobs.length} of ${jobs.length} frames, placeholders aside)`);
} else {
  const base = { sq: jobs.find((j) => j.base.startsWith('a1-sq')), st: jobs.find((j) => j.base.startsWith('a1-st')) };
  const clean = {};
  for (const k of Object.keys(base)) {
    clean[k] = fs.readFileSync(path.join(FRAMES, `${base[k].base}.html`), 'utf8');
    const r = await checkFrame(browser, base[k], clean[k]);
    if (r.fails.length) { console.log(`FAIL  control ${base[k].base} is not clean: ${r.fails[0]}`); failed++; }
  }
  for (const [name, mutate, size = 'sq', expect] of MUTATIONS) {
    const mutated = mutate(clean[size]);
    if (mutated === clean[size]) { console.log(`FAIL  ${name}: mutation did not apply`); failed++; continue; }
    const { fails } = await checkFrame(browser, base[size], mutated);
    // Where another rule would also fire, the named rule itself must fire too.
    const hit = expect ? fails.find((f) => f.includes(expect)) : fails[0];
    console.log(`${hit ? 'PASS' : 'FAIL'}  caught: ${name}${hit ? '  (' + hit + ')' : expect ? `  rule "${expect}" did not fire` : '  NOT CAUGHT'}`);
    if (!hit) failed++;
  }
  console.log('');
  console.log(failed ? `NEGATIVE: FAIL (${failed} not caught)` : `NEGATIVE: PASS (all ${MUTATIONS.length} breaks caught, clean controls pass)`);
}

await browser.close();
process.exit(failed ? 1 : 0);
