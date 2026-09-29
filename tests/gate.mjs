// Compliance gate for the X-Ray Mortgages site. Node only, no dependencies.
// Run with `npm test`. Exits non-zero if any shipped HTML file fails a rule.
// Placeholder failures (an unfilled `[`) are reported separately, because they
// are expected until go-live values are supplied.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', 'tests', '.git']);

const BROKERAGE = 'Centum Financial Services Limited Partnership';
const FOOTER_DISCLOSURE =
  'Raymond. F, Mortgage Associate, RECA Licence [PENDING]. Centum Financial Services Limited Partnership. Alberta only. Rates and terms are not guaranteed. Subject to lender approval.';

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
// Exact-match tokens (case-sensitive).
const FORBIDDEN_EXACT = ['#M', '# '];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

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
function withoutDisclosure(text) {
  return text.split(FOOTER_DISCLOSURE).join(' '.repeat(FOOTER_DISCLOSURE.length));
}

const robotsTxt = existsSync(join(ROOT, 'robots.txt'))
  ? readFileSync(join(ROOT, 'robots.txt'), 'utf8')
  : '';
const robotsDisallowAll = /^\s*Disallow:\s*\/\s*$/m.test(robotsTxt);

const files = walk(ROOT).sort();
const failures = [];
const placeholders = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  const raw = readFileSync(file, 'utf8');
  const text = withoutDisclosure(raw);
  const fail = (msg, idx) =>
    failures.push(`${rel}${idx === undefined ? '' : ':' + lineOf(raw, idx)}  ${msg}`);

  // Em dashes, as characters or entities.
  for (const needle of ['—', '&mdash;', '&#8212;', '&#x2014;']) {
    for (const i of findAll(text, needle, { ci: true })) fail(`em dash (${JSON.stringify(needle)})`, i);
  }
  // En dash used as an em dash: an en dash with whitespace on either side.
  const enDash = /(\s(–|&ndash;|&#8211;|&#x2013;))|((–|&ndash;|&#8211;|&#x2013;)\s)/gi;
  for (const m of text.matchAll(enDash)) fail('en dash used as an em dash', m.index);

  for (const p of BANNED_PHRASES) {
    for (const i of findAll(text, p, { ci: true })) fail(`banned phrase "${p}"`, i);
  }
  for (const s of FORBIDDEN_STRINGS) {
    for (const i of findAll(raw, s, { ci: true })) fail(`forbidden string "${s}"`, i);
  }
  for (const s of FORBIDDEN_EXACT) {
    for (const i of findAll(raw, s)) fail(`forbidden token ${JSON.stringify(s)}`, i);
  }

  // Required content.
  const header = raw.match(/<header[\s\S]*?<\/header>/i)?.[0] ?? '';
  if (!header.includes(BROKERAGE)) fail('missing header brokerage line');
  const footer = raw.match(/<footer[\s\S]*?<\/footer>/i)?.[0] ?? '';
  const footerText = footer.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  if (!footerText.includes(FOOTER_DISCLOSURE)) fail('missing exact footer disclosure line');
  if (!raw.includes('Alberta only')) fail('missing "Alberta only"');
  if (robotsDisallowAll && !/<meta\s+name="robots"\s+content="noindex,\s*nofollow"\s*\/?>/i.test(raw)) {
    fail('missing noindex,nofollow meta while robots.txt disallows');
  }

  // Unfilled placeholders: every `[` counts, reported on their own.
  for (const i of findAll(raw, '[')) {
    const token = raw.slice(i).match(/^\[[^\]\s<]*\]?/)[0];
    placeholders.push(`${rel}:${lineOf(raw, i)}  ${token}`);
  }
}

console.log(`Compliance gate: ${files.length} HTML files checked`);
console.log(`robots.txt disallows all: ${robotsDisallowAll ? 'yes (noindex required)' : 'no'}`);
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
