// Self-test for tests/gate.mjs. Copies the site to a temp folder, applies one
// violation at a time and checks the gate catches it. Also checks that a
// fully filled-in site passes, so the gate cannot block a compliant go-live.
// Node only, no dependencies. Run with `npm test`.

import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const GATE = join(HERE, 'gate.mjs');
const PAGES = ['index.html', 'privacy/index.html', 'thank-you/index.html', '404.html'];
const SITE = ['index.html', 'privacy', 'thank-you', '404.html', 'styles.css', 'robots.txt', 'CNAME', '_config.yml'];

const FILLED = (s) =>
  s.replaceAll('[PENDING]', '12345')
    .replaceAll('[XRAY_EMAIL]', 'ray@xraymortgages.ca')
    .replaceAll('[TALLY_XRAY]', 'https://tally.so/r/abc')
    .replaceAll('[CALENDLY_XRAY]', 'https://calendly.com/x');

const edit = (file, fn) => (dir) => {
  const p = join(dir, file);
  writeFileSync(p, fn(readFileSync(p, 'utf8')));
};
const add = (file, content) => (dir) => {
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  writeFileSync(join(dir, file), content);
};
const onIndex = (fn) => edit('index.html', fn);
const lede = 'No documents to start.'; // body only, not in the meta description

// A site ready for go-live: placeholders filled, draft banner, noindex and the
// privacy draft line removed, robots.txt allowing crawling.
const releaseReady = (d) => {
  PAGES.forEach((f) => edit(f, (s) => FILLED(s)
    .replace(/\s*<meta name="robots"[^>]*>/, '')
    .replace(/\s*<aside class="banner"[\s\S]*?<\/aside>/, '')
    .replace('Draft for principal broker review. ', ''))(d));
  edit('robots.txt', () => 'User-agent: *\nAllow: /\n')(d);
};
const GO_LIVE = ['--go-live'];

// [name, mutation, expected, gate flags] where expected is 'compliance', 'placeholder' or 'pass'.
const CASES = [
  ['clean repo fails on placeholders only', () => {}, 'placeholder'],
  ['filled-in site passes', (d) => PAGES.forEach((f) => edit(f, FILLED)(d)), 'pass'],
  ['literal em dash', onIndex((s) => s.replace(lede, 'One call \u2014 one page.')), 'compliance'],
  ['em dash entity, no semicolon', onIndex((s) => s.replace(lede, 'One call &#8212 one page.')), 'compliance'],
  ['em dash hex, leading zero', onIndex((s) => s.replace(lede, 'One call &#x02014; one page.')), 'compliance'],
  ['horizontal bar', onIndex((s) => s.replace(lede, 'One call &horbar; one page.')), 'compliance'],
  ['em dash in CSS content', edit('styles.css', (s) => s + '\n.x::after { content: "\\2014"; }\n'), 'compliance'],
  ['en dash between nbsp', onIndex((s) => s.replace(lede, 'One call&nbsp;&ndash;&nbsp;one page.')), 'compliance'],
  ['banned phrase split by tag', onIndex((s) => s.replace(lede, 'The best <b>rate</b>.')), 'compliance'],
  ['banned word split by span', onIndex((s) => s.replace(lede, 'Get appro<span>ved</span>.')), 'compliance'],
  ['banned word with soft hyphen', onIndex((s) => s.replace(lede, 'Rates guaran&shy;teed.')), 'compliance'],
  ['banned phrase across line break', onIndex((s) => s.replace(lede, 'The lowest\n        rate.')), 'compliance'],
  ['banned phrase hyphenated', onIndex((s) => s.replace(lede, 'Our best-rate promise.')), 'compliance'],
  ['banned word entity-encoded', onIndex((s) => s.replace(lede, 'Get &#97;pproved.')), 'compliance'],
  ['banned word with Cyrillic e', onIndex((s) => s.replace(lede, 'Get approv\u0435d.')), 'compliance'],
  ['forbidden brand split by tag', onIndex((s) => s.replace(lede, 'Fish<span></span>er.')), 'compliance'],
  ['forbidden brand entity-encoded', onIndex((s) => s.replace(lede, 'Onta&shy;rio.')), 'compliance'],
  ['forbidden brand in CSS', edit('styles.css', (s) => s + '\n/* Fisher */\n'), 'compliance'],
  ['forbidden brand in robots.txt', edit('robots.txt', (s) => s + '# The Mortgage Room\n'), 'compliance'],
  ['.htm page with violations', add('extra.htm', '<p>Get approved \u2014 Fisher</p>'), 'compliance'],
  ['unexcluded Markdown file', (d) => { edit('_config.yml', (s) => s.replace('  - "*.md"\n', ''))(d); add('NOTES.md', 'notes')(d); }, 'compliance'],
  ['nested tests folder still scanned', add('guides/tests/index.html', '<p>Fisher</p>'), 'compliance'],
  ['all pages renamed to .htm', (d) => renameSync(join(d, 'index.html'), join(d, 'index.htm')), 'compliance'],
  ['exclamation mark', onIndex((s) => s.replace(lede, 'No documents to start!')), 'compliance'],
  ['script tag', onIndex((s) => s.replace('</head>', '<script src="https://x.test/a.js"></script></head>')), 'compliance'],
  ['Google Fonts link', onIndex((s) => s.replace('</head>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2">\n</head>')), 'compliance'],
  ['tracking pixel', onIndex((s) => s.replace(lede, '<img src="https://t.test/p.gif" alt="">')), 'compliance'],
  ['embedded form', onIndex((s) => s.replace(lede, '<form><input name="sin"></form>')), 'compliance'],
  ['iframe embed', onIndex((s) => s.replace(lede, '<iframe src="https://tally.so/embed/x"></iframe>')), 'compliance'],
  ['@import in CSS', edit('styles.css', (s) => '@import url("https://fonts.googleapis.com/x");\n' + s), 'compliance'],
  ['wordmark before brokerage', onIndex((s) => s.replace(
    /(<p class="brokerage">[^<]*<\/p>\s*<p class="associate">[^<]*<\/p>)\s*(<a class="wordmark"[\s\S]*?<\/a>)/, '$2$1')), 'compliance'],
  ['brokerage hidden by attribute', onIndex((s) => s.replace('<p class="brokerage">', '<p class="brokerage" hidden>')), 'compliance'],
  ['brokerage only in a comment', onIndex((s) => s.replace(/<p class="brokerage">[^<]*<\/p>/, '<!-- <p class="brokerage">Centum Financial Services Limited Partnership</p> -->')), 'compliance'],
  ['brokerage smaller than wordmark', edit('styles.css', (s) => s + '\n.site-header .brokerage { font-size: 0.5rem; }\n'), 'compliance'],
  ['brokerage hidden by CSS', edit('styles.css', (s) => s + '\n.site-header .brokerage { display: none; }\n'), 'compliance'],
  ['brand block above header', onIndex((s) => s.replace('<header', '<p>X-Ray Mortgages</p>\n<header')), 'compliance'],
  ['associate line removed', onIndex((s) => s.replace(/<p class="associate">[^<]*<\/p>/, '')), 'compliance'],
  ['disclosure only in a comment', onIndex((s) => s.replace(/(<footer[\s\S]*?<p>)(Raymond[^<]*)(<\/p>)/, '$1<!-- $2 -->$3')), 'compliance'],
  ['disclosure in inline hidden style', onIndex((s) => s.replace(/(<footer[\s\S]*?)<p>(Raymond)/, '$1<p style="display:none">$2')), 'compliance'],
  ['footer contact line removed', onIndex((s) => s.replace(/<p><a href="tel:[\s\S]*?<\/p>/, '')), 'compliance'],
  ['noindex only in a comment', onIndex((s) => s.replace(/(<meta name="robots"[^>]*>)/, '<!-- $1 -->')), 'compliance'],
  ['index,follow meta alongside', onIndex((s) => s.replace('</head>', '<meta name="robots" content="index,follow">\n</head>')), 'compliance'],
  ['robots.txt trailing comment', (d) => { edit('robots.txt', () => 'User-agent: *\nDisallow: / # draft\n')(d); onIndex((s) => s.replace(/<meta name="robots"[^>]*>/, ''))(d); }, 'compliance'],
  ['robots.txt deleted', (d) => rmSync(join(d, 'robots.txt')), 'compliance'],
  ['draft banner removed', onIndex((s) => s.replace(/<aside class="banner"[\s\S]*?<\/aside>/, '')), 'compliance'],
  ['encoded placeholder bracket', (d) => PAGES.forEach((f) => edit(f, (s) => FILLED(s).replace('https://tally.so/r/abc', '&#91;TALLY_XRAY&#93;'))(d)), 'placeholder'],
  ['unbracketed placeholder', (d) => PAGES.forEach((f) => edit(f, (s) => FILLED(s).replace('https://calendly.com/x', 'CALENDLY_XRAY'))(d)), 'placeholder'],
  ['creative/ is not scanned while excluded', add('creative/frames/a1.html', '<p>Fisher \u2014 approved</p>'), 'placeholder'],
  ['creative/ is scanned if the exclude is removed', (d) => { add('creative/frames/a1.html', '<p>Fisher \u2014 approved</p>')(d); edit('_config.yml', (s) => s.replace('  - creative\n', ''))(d); }, 'compliance'],
  // --go-live
  ['go-live: draft repo fails', () => {}, 'compliance', GO_LIVE],
  ['go-live: filled-in draft still fails', (d) => PAGES.forEach((f) => edit(f, FILLED)(d)), 'compliance', GO_LIVE],
  ['go-live: release-ready site passes', releaseReady, 'pass', GO_LIVE],
  ['release-ready site also passes without the flag', releaseReady, 'pass'],
  ['go-live: draft banner left on one page', (d) => { releaseReady(d); edit('404.html', (s) => s.replace('<header', '<aside class="banner" aria-label="Draft notice">PRINCIPAL BROKER REVIEW \u00B7 RECA licence pending</aside>\n  <header'))(d); }, 'compliance', GO_LIVE],
  ['go-live: noindex left on one page', (d) => { releaseReady(d); edit('thank-you/index.html', (s) => s.replace('</head>', '<meta name="robots" content="noindex,nofollow">\n</head>'))(d); }, 'compliance', GO_LIVE],
  ['go-live: privacy draft line left', (d) => { releaseReady(d); edit('privacy/index.html', (s) => s.replace('Last updated:', 'Draft for principal broker review. Last updated:'))(d); }, 'compliance', GO_LIVE],
  ['go-live: robots.txt still disallows', (d) => { releaseReady(d); edit('robots.txt', () => 'User-agent: *\nDisallow: /\n')(d); }, 'compliance', GO_LIVE],
  ['go-live: email as mailto links passes', (d) => { releaseReady(d); PAGES.forEach((f) => edit(f, (s) => s.replaceAll('ray@xraymortgages.ca', '<a href="mailto:ray@xraymortgages.ca">ray@xraymortgages.ca</a>'))(d)); }, 'pass', GO_LIVE],
  ['go-live: one placeholder left', (d) => { releaseReady(d); edit('index.html', (s) => s.replace('https://tally.so/r/abc', '[TALLY_XRAY]'))(d); }, 'compliance', GO_LIVE],
];

function runGate(dir, flags = []) {
  const r = spawnSync(process.execPath, [GATE, dir, ...flags], { encoding: 'utf8' });
  const m = r.stdout.match(/GATE: FAIL \((\d+) compliance, (\d+) placeholder\)/);
  return { code: r.status, compliance: m ? +m[1] : 0, placeholder: m ? +m[2] : 0, out: r.stdout };
}

let bad = 0;
for (const [name, mutate, expected, flags] of CASES) {
  const dir = mkdtempSync(join(tmpdir(), 'xray-gate-'));
  for (const f of SITE) cpSync(join(ROOT, f), join(dir, f), { recursive: true });
  mutate(dir);
  const r = runGate(dir, flags);
  rmSync(dir, { recursive: true, force: true });
  const ok =
    expected === 'pass' ? r.code === 0
    : expected === 'placeholder' ? r.code === 1 && r.compliance === 0 && r.placeholder > 0
    : r.code === 1 && r.compliance > 0;
  if (!ok) {
    bad++;
    console.log(`  FAIL  ${name}: expected ${expected}, got exit ${r.code} (${r.compliance} compliance, ${r.placeholder} placeholder)`);
  }
}
console.log(`Gate self-test: ${CASES.length - bad}/${CASES.length} cases behave as expected.`);
console.log('');
process.exit(bad ? 1 : 0);
