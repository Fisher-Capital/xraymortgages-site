// Compliance gate for the X-Ray Mortgages site. Node only, no dependencies.
// Run with `npm test`. Exits non-zero if any shipped file fails a rule.
// Placeholder failures (an unfilled `[`) are reported separately, because they
// are expected until go-live values are supplied.
//
// False negatives matter more than false positives here, so every text rule
// runs twice: on the raw source (with line numbers) and on a normalised layer
// (comments and tags removed, entities decoded, soft hyphens and zero-width
// characters dropped, whitespace collapsed) that defeats markup tricks.
//
// Usage: node tests/gate.mjs [root]   (root defaults to the repo root)

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..');

const BROKERAGE = 'Centum Financial Services Limited Partnership';
// The licence number is `[PENDING]` until go-live, then a real value.
const LICENCE = String.raw`(?:\[PENDING\]|[A-Za-z0-9][A-Za-z0-9-]*)`;
const ASSOCIATE = String.raw`Raymond\. F, Mortgage Associate, RECA Licence ${LICENCE}`;
const DISCLOSURE = new RegExp(
  `${ASSOCIATE}\\. Centum Financial Services Limited Partnership\\. Alberta only\\. ` +
    'Rates and terms are not guaranteed\\. Subject to lender approval\\.',
  'g',
);
const CONTACT_LINE = /\(416\) 898-0181 \| (?:\[XRAY_EMAIL\]|[^\s@|]+@[^\s|]+) \| www\.xraymortgages\.ca/;
const HEADER_TEXT = new RegExp(`^${BROKERAGE} ${ASSOCIATE} X-RAY MORTGAGES$`);
const BANNER = 'PRINCIPAL BROKER REVIEW \u00B7 RECA licence pending';
const REQUIRED_PAGES = ['index.html', 'privacy/index.html', 'thank-you/index.html', '404.html'];

// Case-insensitive banned phrases (voice and compliance).
const BANNED_PHRASES = [
  'beat the rate', 'lowest rate', 'best rate', 'approved', 'approval in',
  'guaranteed', 'guarantee', 'hidden fees', 'banks hide', 'save money',
  'lower your payments', 'bad credit', 'diagnostic', 'diagnose',
];

// Strings from the other brand and jurisdiction that must never ship.
const FORBIDDEN_STRINGS = [
  'Fisher', 'Capital', 'Mortgage Room', 'themortgageroom', 'Ontario', 'FSRA',
  'M26000144', '13054', 'Mortgage Commitment',
];
// Exact-match tokens (case-sensitive, HTML only).
const FORBIDDEN_EXACT = ['#M', '# '];

// Em dash and its look-alikes: em dash, horizontal bar, two- and three-em
// dashes, small and vertical em dashes.
const EM_DASHES = /[\u2014\u2015\u2E3A\u2E3B\uFE58\uFE31]/g;
const CSS_EM_DASH_ESCAPE = /\\0*(2014|2015|2e3a|2e3b|fe58|fe31)(?![0-9a-f])/gi;
// En dash (or small en dash) with whitespace on either side reads as an em dash.
const EN_DASH_AS_EM = /(?:^|\s)[\u2013\uFE32]|[\u2013\uFE32](?:\s|$)/g;

// Tracking, fonts, scripts and embedded forms are not allowed.
const EMBED_RULES = [
  [/<script\b/i, 'script element'],
  [/<iframe\b/i, 'iframe'],
  [/<form\b/i, 'embedded form'],
  [/<(?:embed|object|frame)\b/i, 'embed/object'],
  [/<link\b[^>]*\bhref\s*=\s*["']?\s*(?:https?:)?\/\//i, 'external <link> (fonts or tracking)'],
  [/<(?:img|source|video|audio)\b[^>]*\bsrc\s*=\s*["']?\s*(?:https?:)?\/\//i, 'off-site media (tracking pixel)'],
  [/\son[a-z]+\s*=/i, 'inline event handler'],
  [/<[a-z][^>]*\sstyle\s*=/i, 'inline style attribute'],
  [/<[a-z][^>]*\shidden(?=[\s=>/])/i, 'hidden attribute'],
];
const CSS_EMBED_RULES = [
  [/@import\b/i, '@import'],
  [/@font-face\b/i, '@font-face (web font)'],
  [/url\(\s*["']?\s*(?:https?:)?\/\//i, 'off-site url()'],
];

const TEXT_EXT = /\.(?:html?|css|m?js|txt|xml|json|svg|webmanifest|md|ya?ml)$/i;
const HTML_EXT = /\.html?$/i;

// ---------------------------------------------------------------- helpers

const NAMED = {
  nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', amp: '&', lt: '<', gt: '>',
  quot: '"', apos: "'", shy: '', zwj: '', zwnj: '', mdash: '\u2014',
  ndash: '\u2013', horbar: '\u2015', hyphen: '-', dash: '\u2010', minus: '\u2212',
  lbrack: '[', rbrack: ']', lsqb: '[', rsqb: ']', middot: '\u00B7', excl: '!',
};
const cp = (n) => (n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '');
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => cp(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => cp(parseInt(d, 10)))
    .replace(/&([a-z]+);?/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
}

// Latin look-alikes from Cyrillic and Greek that NFKC leaves alone.
const CONFUSABLES = {
  '\u0430': 'a', '\u0435': 'e', '\u043E': 'o', '\u0440': 'p', '\u0441': 'c',
  '\u0443': 'y', '\u0445': 'x', '\u0456': 'i', '\u0458': 'j', '\u0455': 's',
  '\u0410': 'A', '\u0412': 'B', '\u0415': 'E', '\u041A': 'K', '\u041C': 'M',
  '\u041D': 'H', '\u041E': 'O', '\u0420': 'P', '\u0421': 'C', '\u0422': 'T',
  '\u0425': 'X', '\u03BF': 'o', '\u039F': 'O', '\u03B1': 'a', '\u0391': 'A',
};

function flatten(s) {
  return decodeEntities(s)
    .replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '')
    .normalize('NFKC')
    .replace(/[\u0391-\u03C9\u0400-\u04FF]/g, (c) => CONFUSABLES[c] ?? c)
    .replace(/\s+/g, ' ');
}
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
// Tags removed without a space so `appro<span>ved</span>` reads as one word.
const stripTags = (s) => s.replace(/<[^>]*>/g, '');
const visibleText = (s) =>
  flatten(stripTags(stripComments(s).replace(/<(head|script|style|template)\b[\s\S]*?<\/\1>/gi, ' ')));

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function findAll(haystack, needle, { ci = false } = {}) {
  const h = ci ? haystack.toLowerCase() : haystack;
  const n = ci ? needle.toLowerCase() : needle;
  const hits = [];
  let i = h.indexOf(n);
  while (i !== -1) {
    hits.push(i);
    i = h.indexOf(n, i + 1);
  }
  return hits;
}

// Blank out the mandated footer disclosure (same length, keeps line numbers)
// so its required wording ("not guaranteed", "[PENDING]") is not flagged by
// the voice rules. The placeholder inside it is still counted separately below.
const withoutDisclosure = (text) => text.replace(DISCLOSURE, (m) => ' '.repeat(m.length));

function cssFontSizePx(css, selectorEnd) {
  let px;
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selectors = sel.split(',').map((x) => x.trim());
    if (!selectors.some((x) => x.endsWith(selectorEnd))) continue;
    if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?![.\d])/i.test(body)) return -1;
    const m = body.match(/font-size\s*:\s*([\d.]+)(rem|em|px)/i);
    if (m) px = parseFloat(m[1]) * (m[2].toLowerCase() === 'px' ? 1 : 16);
  }
  return px;
}

function readExcludes() {
  const cfg = join(ROOT, '_config.yml');
  if (!existsSync(cfg)) return [];
  const block = readFileSync(cfg, 'utf8').match(/^exclude:\s*\n((?:[ \t]+-.*\n?)*)/m)?.[1] ?? '';
  return [...block.matchAll(/-\s*["']?([^"'\n]+?)["']?\s*$/gm)].map((m) => m[1]);
}
// Jekyll matches plain entries against the path from the site root, and
// globs with File.fnmatch, where `*` also crosses `/`.
function isExcluded(rel, entry) {
  if (!entry.includes('*')) return rel === entry || rel.startsWith(entry + '/');
  const re = entry.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp('^' + re + '$').test(rel);
}

// Everything GitHub Pages would publish: not a dotfile, not `_`-prefixed,
// not excluded in _config.yml. `tests` and `node_modules` are skipped only at
// the root, by path, so a nested `guides/tests/` is still checked.
function walk(dir, excludes, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).split(sep).join('/');
    if (name.startsWith('.') || name.startsWith('_')) continue;
    if (rel === 'tests' || rel === 'node_modules') continue;
    if (excludes.some((g) => isExcluded(rel, g))) continue;
    if (statSync(full).isDirectory()) walk(full, excludes, out);
    else out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------- checks

const robotsPath = join(ROOT, 'robots.txt');
const robotsTxt = existsSync(robotsPath)
  ? readFileSync(robotsPath, 'utf8').replace(/#.*$/gm, '')
  : null;
const robotsDisallowAll = robotsTxt !== null && /^\s*Disallow:\s*\/\s*$/m.test(robotsTxt);

const excludes = readExcludes();
const shipped = walk(ROOT, excludes).sort();
const htmlFiles = shipped.filter((f) => HTML_EXT.test(f));
const failures = [];
const placeholders = [];

if (robotsTxt === null) failures.push('robots.txt  missing (cannot tell whether noindex is required)');
if (htmlFiles.length === 0) failures.push('no shipped HTML files found');
for (const page of REQUIRED_PAGES) {
  if (!existsSync(join(ROOT, page))) failures.push(`${page}  required page missing`);
}

let css = '';
if (existsSync(join(ROOT, 'styles.css'))) css = readFileSync(join(ROOT, 'styles.css'), 'utf8');
const brokeragePx = cssFontSizePx(css, '.brokerage');
const wordmarkPx = cssFontSizePx(css, '.wordmark');
if (!(brokeragePx > 0 && wordmarkPx > 0 && brokeragePx > wordmarkPx)) {
  failures.push(
    `styles.css  brokerage line must be visible and larger than the wordmark (brokerage ${brokeragePx}px, wordmark ${wordmarkPx}px)`,
  );
}

// Text rules shared by every shipped text file.
function textRules(rel, raw, fail, { html }) {
  const text = withoutDisclosure(raw);
  const layers = html
    ? [flatten(text), flatten(stripTags(stripComments(text)))]
    : [flatten(text)];
  const layered = (re) => layers.some((l) => new RegExp(re.source, re.flags.replace('g', '')).test(l));

  // Em dashes, as characters, entities or CSS escapes.
  for (const m of raw.matchAll(EM_DASHES)) fail('em dash', m.index);
  for (const m of raw.matchAll(CSS_EM_DASH_ESCAPE)) fail('em dash (CSS escape)', m.index);
  if (!EM_DASHES.test(raw) && layered(EM_DASHES)) fail('em dash (entity or encoded)');
  EM_DASHES.lastIndex = 0;
  if (layered(EN_DASH_AS_EM)) fail('en dash used as an em dash');

  for (const p of BANNED_PHRASES) {
    const hits = findAll(text, p, { ci: true });
    for (const i of hits) fail(`banned phrase "${p}"`, i);
    if (!hits.length) {
      const re = new RegExp(p.replace(/ /g, '[\\s\\-\u2010\u2011]+'), 'i');
      if (layers.some((l) => re.test(l))) fail(`banned phrase "${p}" (hidden by markup, entities or line breaks)`);
    }
  }
  for (const s of FORBIDDEN_STRINGS) {
    const hits = findAll(raw, s, { ci: true });
    for (const i of hits) fail(`forbidden string "${s}"`, i);
    if (!hits.length) {
      const re = new RegExp(s.replace(/ /g, '[\\s\\-]+'), 'i');
      const rawLayers = html ? [flatten(raw), flatten(stripTags(raw))] : [flatten(raw)];
      if (rawLayers.some((l) => re.test(l))) fail(`forbidden string "${s}" (hidden by markup or entities)`);
    }
  }
}

function collectPlaceholders(rel, raw) {
  for (const i of findAll(raw, '[')) {
    const token = raw.slice(i).match(/^\[[^\]\s<]*\]?/)[0];
    placeholders.push(`${rel}:${lineOf(raw, i)}  ${token}`);
  }
  // Encoded brackets and bare placeholder names still mean "not filled in".
  for (const m of raw.matchAll(/&#0*91;?|&#x0*5b;?|&lbrack;|&lsqb;|%5B/gi)) {
    placeholders.push(`${rel}:${lineOf(raw, m.index)}  ${m[0]} (encoded bracket)`);
  }
  for (const m of raw.matchAll(/(?<![[\w])(PENDING|XRAY_EMAIL|TALLY_XRAY|CALENDLY_XRAY|TBD|TODO)(?![\w\]])/g)) {
    placeholders.push(`${rel}:${lineOf(raw, m.index)}  ${m[1]} (unbracketed)`);
  }
}

for (const file of shipped) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const isHtml = HTML_EXT.test(file);
  const isText = isHtml || TEXT_EXT.test(file) || !/\.[a-z0-9]+$/i.test(file);
  if (!isText) continue;
  const raw = readFileSync(file, 'utf8');
  const fail = (msg, idx) =>
    failures.push(`${rel}${idx === undefined ? '' : ':' + lineOf(raw, idx)}  ${msg}`);

  if (/\.md$/i.test(file)) fail('Markdown file would be published by GitHub Pages; add it to _config.yml exclude');
  textRules(rel, raw, fail, { html: isHtml });

  if (!isHtml) {
    if (/\.css$/i.test(file)) {
      for (const [re, what] of CSS_EMBED_RULES) if (re.test(raw)) fail(`not allowed: ${what}`);
    }
    continue;
  }

  collectPlaceholders(rel, raw);

  for (const s of FORBIDDEN_EXACT) {
    for (const i of findAll(raw, s)) fail(`forbidden token ${JSON.stringify(s)}`, i);
  }

  // Structure is read with comments blanked, so a commented-out decoy header,
  // footer or meta cannot satisfy a rule.
  const live = stripComments(raw);

  for (const [re, what] of EMBED_RULES) {
    const m = live.match(re);
    if (m) fail(`not allowed: ${what}`, m.index);
  }
  const styleBlocks = [...live.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  for (const [re, what] of CSS_EMBED_RULES) if (re.test(styleBlocks)) fail(`not allowed: ${what}`);

  const visible = visibleText(raw);
  const bang = visible.search(/[!\uFF01\u01C3]/);
  if (bang !== -1) fail(`exclamation mark in visible text: "...${visible.slice(Math.max(0, bang - 30), bang + 1)}"`);

  // Header: brokerage first, then the associate line, then the wordmark, and
  // it must come before any brand text on the page.
  const headerMatch = live.match(/<header\b[\s\S]*?<\/header>/i);
  const header = headerMatch?.[0] ?? '';
  const headerText = flatten(stripTags(header.replace(/></g, '> <'))).trim();
  if (!header.includes(BROKERAGE)) fail('missing header brokerage line');
  else if (!HEADER_TEXT.test(headerText)) fail(`header must read brokerage, associate line, wordmark in that order (found "${headerText}")`);
  if (!/<p class="brokerage">\s*Centum Financial Services Limited Partnership\s*<\/p>/.test(header)) {
    fail('header brokerage line must be <p class="brokerage"> so its size is checked');
  }
  const body = live.slice(live.search(/<body\b/i));
  const firstBrand = body.search(/X-RAY|X-Ray Mortgages/i);
  if (headerMatch && firstBrand !== -1 && body.indexOf(headerMatch[0]) > firstBrand) {
    fail('brand text appears before the brokerage header');
  }

  // Footer: exact disclosure and the contact line.
  const footer = live.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] ?? '';
  const footerText = flatten(stripTags(footer.replace(/></g, '> <')));
  DISCLOSURE.lastIndex = 0;
  if (!DISCLOSURE.test(footerText)) fail('missing exact footer disclosure line');
  if (!CONTACT_LINE.test(footerText)) fail('missing footer contact line (phone | email | www.xraymortgages.ca)');
  if (!raw.includes('Alberta only')) fail('missing "Alberta only"');

  // Robots: while robots.txt disallows, every page needs noindex in <head>,
  // no robots meta may allow indexing, and the draft banner must be first.
  const head = live.match(/<head\b[\s\S]*?<\/head>/i)?.[0] ?? '';
  const robotsMetas = [...live.matchAll(/<meta\b[^>]*name\s*=\s*["']?robots["']?[^>]*>/gi)].map((m) => m[0]);
  if (robotsMetas.some((m) => !/noindex/i.test(m))) fail('a robots meta allows indexing');
  if (robotsDisallowAll) {
    if (!/<meta\s+name="robots"\s+content="noindex,\s*nofollow"\s*\/?>/i.test(head)) {
      fail('missing noindex,nofollow meta in <head> while robots.txt disallows');
    }
    const bannerAt = body.indexOf(BANNER);
    if (bannerAt === -1 || (headerMatch && bannerAt > body.indexOf(headerMatch[0]))) {
      fail(`missing draft banner "${BANNER}" above the header while robots.txt disallows`);
    }
  }
}

console.log(`Compliance gate: ${htmlFiles.length} HTML files checked (${shipped.length} shipped files scanned)`);
console.log(`robots.txt disallows all: ${robotsDisallowAll ? 'yes (noindex required)' : robotsTxt === null ? 'missing' : 'no'}`);
console.log('');

if (failures.length) {
  console.log(`COMPLIANCE FAILURES (${failures.length}):`);
  for (const f of failures) console.log(`  ${f}`);
} else {
  console.log('Compliance rules: all passed.');
}
console.log('');

if (placeholders.length) {
  const counts = {};
  for (const p of placeholders) {
    const token = p.split('  ')[1];
    counts[token] = (counts[token] ?? 0) + 1;
  }
  console.log(`PLACEHOLDERS UNFILLED (${placeholders.length}), deploy blocked until filled:`);
  for (const [token, n] of Object.entries(counts)) console.log(`  ${token}  x${n}`);
  console.log('  Locations:');
  for (const p of placeholders) console.log(`    ${p}`);
} else {
  console.log('Placeholders: none remaining.');
}

const ok = failures.length === 0 && placeholders.length === 0;
console.log('');
console.log(ok ? 'GATE: PASS' : `GATE: FAIL (${failures.length} compliance, ${placeholders.length} placeholder)`);
process.exit(ok ? 0 : 1);
