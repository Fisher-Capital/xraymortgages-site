// X-Ray Mortgages Meta ad frames v1 (Alberta campaign), 2026-09-29.
// Nine static frames (3 angles x 3 sizes) plus a contact sheet.
//
// Same method as The Mortgage Room frames (~/fc-paid-campaign/creative/gen.js):
// one HTML file per frame, rendered to PNG with Playwright/Chromium, then
// checked by creative/checks.mjs. The brand is X-Ray Mortgages, not the Room.
//
// Design rules (XRAY-FRAMES-BUILD-BRIEF-v1.md):
//  - Tokens and the font stack are read from ../styles.css :root at generation
//    time, so the frames and the site cannot drift. System fonts only: no web
//    fonts, no scripts, no network at render time.
//  - One ground on all nine: off-white page with a slate header block. The
//    wordmark must render as on the site (X-RAY in the accent, MORTGAGES in
//    slate), and slate text needs a light ground, so the slate-ground option
//    was not used.
//  - One decorative element: the site's scan-line rule, under the header block.
//  - Story frames keep 250px clear at the top and bottom for Meta's overlays.
//
// Usage: node creative/gen.js            generate HTML, render PNGs and sheet
//        node creative/gen.js --no-render  generate HTML only

const fs = require('fs');
const path = require('path');
const os = require('os');

const HERE = __dirname;
const FRAMES = path.join(HERE, 'frames');

/* ── tokens from the site ───────────────────────────────────────────────── */
const siteCss = fs.readFileSync(path.join(HERE, '..', 'styles.css'), 'utf8');
const root = siteCss.match(/:root\s*\{([\s\S]*?)\}/)[1];
const token = (name) => {
  const m = root.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  if (!m) throw new Error(`styles.css :root has no --${name}`);
  return m[1].trim();
};
const T = {
  slate: token('slate'),        // #0F1720
  page: token('page'),          // #F4F6F8 off-white
  grey: token('grey'),          // #9AA5B1 (on slate only)
  greyInk: token('grey-ink'),   // #4A5561 (secondary text on the light page)
  teal: token('teal'),          // #19B3A6 accent fill and rules
  tealInk: token('teal-ink'),   // #0B7A71 accent as text on the light page
  line: token('line'),
  font: token('font'),
};

/* ── copy: verbatim from XRAY-AD-COPY-v1-ALBERTA.md. Do not rewrite. ─────── */
const DISCLOSURE =
  'Raymond. F, Mortgage Associate, RECA Licence [PENDING]. ' +
  'Centum Financial Services Limited Partnership. Alberta only. ' +
  'Rates and terms are not guaranteed. Subject to lender approval.';
const BROKERAGE = 'Centum Financial Services Limited Partnership';
const BADGE = 'RECA licensed Mortgage Associate';
const TICKS = ['No documents to start', 'No credit check to start', 'Not an application'];
const CTA = 'Get your Mortgage X-Ray';
const ANGLES = {
  a1: { hook: 'See your renewal clearly before you sign.', sub: 'A plain-language mortgage review for Alberta homeowners.' },
  a2: { hook: 'Write-offs can lower the income a lender sees.', sub: 'Self-employed mortgage reviews for Alberta.' },
  a3: { hook: 'A decline is a data point, not a verdict.', sub: 'Mortgage reviews for Alberta files that stalled.' },
};

/* ── layout per size ────────────────────────────────────────────────────── */
// safeTop/safeBottom: story placements cover about 250px at each end.
const SIZES = {
  sq: { w: 1080, h: 1080, name: 'square', pad: 60, safeTop: 0, safeBottom: 0,
    headPadT: 44, headPadB: 34, brk: 36, wm: 26, badge: 26, hook: 66, sub: 32,
    tick: 31, tickGap: 10, cta: 33, band: 28, bandPadV: 24, gap: 18, scan: 4 },
  pt: { w: 1080, h: 1350, name: 'portrait', pad: 68, safeTop: 0, safeBottom: 0,
    headPadT: 56, headPadB: 44, brk: 40, wm: 30, badge: 30, hook: 86, sub: 40,
    tick: 36, tickGap: 16, cta: 38, band: 29, bandPadV: 32, gap: 26, scan: 4 },
  st: { w: 1080, h: 1920, name: 'story', pad: 72, safeTop: 250, safeBottom: 250,
    headPadT: 44, headPadB: 44, brk: 42, wm: 32, badge: 32, hook: 94, sub: 44,
    tick: 40, tickGap: 20, cta: 42, band: 30, bandPadV: 36, gap: 30, scan: 5 },
};

const CHECK = (px) =>
  `<svg class="tk" viewBox="0 0 24 24" width="${px}" height="${px}" aria-hidden="true">` +
  `<circle cx="12" cy="12" r="10.5" fill="none" stroke="${T.tealInk}" stroke-width="2.2"/>` +
  `<path d="M7 12.4l3.3 3.3L17.2 8.8" fill="none" stroke="${T.tealInk}" stroke-width="2.6" ` +
  `stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function frame(angleKey, sizeKey) {
  const a = ANGLES[angleKey];
  const s = SIZES[sizeKey];
  return `<!doctype html>
<html lang="en-CA"><head><meta charset="utf-8">
<title>X-Ray Mortgages ad ${angleKey} ${s.name} ${s.w}x${s.h}</title>
<style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{width:${s.w}px;height:${s.h}px;overflow:hidden;background:${T.page};color:${T.slate};
  font-family:${T.font};-webkit-font-smoothing:antialiased;display:flex;flex-direction:column}
.safe{flex:0 0 ${sizeKey === 'st' ? s.safeTop : 0}px;background:${T.slate}}
.safe.bottom{flex-basis:${s.safeBottom}px}
.head{flex:0 0 auto;background:${T.slate};padding:${s.headPadT}px ${s.pad}px ${s.headPadB}px;display:flex;justify-content:flex-end}
.brk{margin:0;max-width:100%;text-align:right;color:${T.page};font-size:${s.brk}px;font-weight:700;line-height:1.22}
.scan{flex:0 0 ${s.scan}px;background:linear-gradient(90deg,transparent,${T.teal} 20%,${T.teal} 80%,transparent)}
.main{flex:1 1 auto;padding:${Math.round(s.pad * 0.7)}px ${s.pad}px;display:flex;flex-direction:column;justify-content:space-between;min-height:0}
.wordmark{margin:0;font-size:${s.wm}px;font-weight:800;letter-spacing:0.22em;color:${T.slate};line-height:1.2}
.wordmark .x{color:${T.tealInk}}
.badge{display:inline-block;margin-top:${s.gap}px;background:${T.slate};color:${T.page};font-size:${s.badge}px;
  font-weight:700;line-height:1.2;padding:${Math.round(s.badge * 0.5)}px ${Math.round(s.badge * 0.9)}px;border-radius:999px}
.hook{margin:0;font-size:${s.hook}px;font-weight:800;line-height:1.06;letter-spacing:-0.02em;color:${T.slate}}
.sub{margin:${s.gap}px 0 0;font-size:${s.sub}px;font-weight:500;line-height:1.3;color:${T.greyInk}}
.ticks{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:${s.tickGap}px}
.tick{display:flex;align-items:center;gap:${Math.round(s.tick * 0.45)}px;font-size:${s.tick}px;font-weight:600;line-height:1.25;color:${T.slate}}
.tk{flex:0 0 auto}
.cta{display:inline-block;margin-top:${s.gap + 8}px;background:${T.teal};color:${T.slate};font-size:${s.cta}px;font-weight:700;
  line-height:1.2;padding:${Math.round(s.cta * 0.62)}px ${Math.round(s.cta * 1.2)}px;border-radius:12px}
.band{flex:0 0 auto;margin:0;width:100%;background:${T.slate};color:${T.page};font-size:${s.band}px;font-weight:500;
  line-height:1.35;padding:${s.bandPadV}px ${s.pad}px}
</style></head>
<body>
<div class="safe top"></div>
<header class="head"><p class="brk">${BROKERAGE}</p></header>
<div class="scan"></div>
<main class="main">
  <div class="group-id">
    <p class="wordmark"><span class="x">X-RAY</span> MORTGAGES</p>
    <span class="badge">${BADGE}</span>
  </div>
  <div class="group-copy">
    <p class="hook">${a.hook}</p>
    <p class="sub">${a.sub}</p>
  </div>
  <div class="group-act">
    <ul class="ticks">${TICKS.map((t) => `<li class="tick">${CHECK(Math.round(s.tick * 1.05))}<span>${t}</span></li>`).join('')}</ul>
    <span class="cta">${CTA}</span>
  </div>
</main>
<p class="band">${DISCLOSURE}</p>
<div class="safe bottom"></div>
</body></html>
`;
}

/* ── write frames ───────────────────────────────────────────────────────── */
fs.mkdirSync(FRAMES, { recursive: true });
const jobs = [];
for (const ak of Object.keys(ANGLES)) {
  for (const sk of Object.keys(SIZES)) {
    const s = SIZES[sk];
    const base = `${ak}-${sk}-${s.w}x${s.h}`;
    fs.writeFileSync(path.join(FRAMES, `${base}.html`), frame(ak, sk));
    jobs.push({ base, angle: ak, size: sk, w: s.w, h: s.h, safeTop: s.safeTop, safeBottom: s.safeBottom,
      hook: ANGLES[ak].hook, sub: ANGLES[ak].sub });
  }
}
fs.writeFileSync(path.join(FRAMES, 'jobs.json'), JSON.stringify(jobs, null, 2) + '\n');
console.log('generated', jobs.length, 'frames');

/* ── contact sheet ──────────────────────────────────────────────────────── */
// Three rows (angles), three columns (square, portrait, story), all scaled to
// the same height so the set reads side by side.
const SHEET_ROW_H = 560;
function sheetHtml() {
  const cell = (j) => {
    const w = Math.round((j.w / j.h) * SHEET_ROW_H);
    return `<figure><img src="frames/${j.base}.png" width="${w}" height="${SHEET_ROW_H}" alt="">` +
      `<figcaption>${j.angle} ${SIZES[j.size].name} ${j.w}x${j.h}</figcaption></figure>`;
  };
  const rows = Object.keys(ANGLES).map((ak) =>
    `<div class="row">${jobs.filter((j) => j.angle === ak).map(cell).join('')}</div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:40px;background:${T.line};font-family:${T.font};color:${T.slate};display:inline-block}
h1{margin:0 0 24px;font-size:28px}
.row{display:flex;gap:32px;margin-bottom:32px;align-items:flex-start}
figure{margin:0}img{display:block;box-shadow:0 2px 10px rgba(15,23,32,.18)}
figcaption{margin-top:10px;font-size:18px;color:${T.greyInk}}
</style></head><body><h1>X-Ray Mortgages ad frames v1 (Alberta), contact sheet</h1>${rows}</body></html>`;
}
fs.writeFileSync(path.join(HERE, 'contact-sheet.html'), sheetHtml());

if (process.argv.includes('--no-render')) process.exit(0);

/* ── render ─────────────────────────────────────────────────────────────── */
// The Room generator's renderer: Playwright with its Chromium. Resolution order:
// an installed `playwright`, then $PLAYWRIGHT_DIR, then the copy the gstack
// skill installs (its Chromium build is the one in the local browser cache).
function loadPlaywright() {
  const tries = [
    'playwright',
    process.env.PLAYWRIGHT_DIR,
    path.join(os.homedir(), '.claude/skills/gstack/node_modules/playwright'),
  ].filter(Boolean);
  for (const t of tries) {
    try { return require(t); } catch (e) { /* try the next one */ }
  }
  throw new Error('Playwright not found. Set PLAYWRIGHT_DIR to a playwright package folder.');
}

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(FRAMES, `${j.base}.html`));
    await page.screenshot({ path: path.join(FRAMES, `${j.base}.png`), fullPage: false });
    await page.close();
    console.log('rendered', `${j.base}.png`);
  }
  const sheet = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
  await sheet.goto('file://' + path.join(HERE, 'contact-sheet.html'));
  await sheet.waitForLoadState('load');
  const box = await sheet.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
  await sheet.setViewportSize({ width: box.w, height: box.h });
  await sheet.screenshot({ path: path.join(HERE, 'CONTACT-SHEET-v1.png'), fullPage: true });
  console.log('rendered CONTACT-SHEET-v1.png', `${box.w}x${box.h}`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
