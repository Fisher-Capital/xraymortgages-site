// Text rules shared by the site gate (tests/gate.mjs) and the ad-frame checks
// (creative/checks.mjs), so the site and the frames cannot drift apart.
// Node only, no dependencies.

// Case-insensitive banned phrases (voice and compliance).
export const BANNED_PHRASES = [
  'beat the rate', 'lowest rate', 'best rate', 'approved', 'approval in',
  'guaranteed', 'guarantee', 'hidden fees', 'banks hide', 'save money',
  'lower your payments', 'bad credit', 'diagnostic', 'diagnose',
];

// Strings from the other brand and jurisdiction that must never ship.
export const FORBIDDEN_STRINGS = [
  'Fisher', 'Capital', 'Mortgage Room', 'themortgageroom', 'Ontario', 'FSRA',
  'M26000144', '13054', 'Mortgage Commitment',
];

// Em dash and its look-alikes: em dash, horizontal bar, two- and three-em
// dashes, small and vertical em dashes.
export const EM_DASHES = /[\u2014\u2015\u2E3A\u2E3B\uFE58\uFE31]/g;
export const CSS_EM_DASH_ESCAPE = /\\0*(2014|2015|2e3a|2e3b|fe58|fe31)(?![0-9a-f])/gi;
// En dash (or small en dash) with whitespace on either side reads as an em dash.
export const EN_DASH_AS_EM = /(?:^|\s)[\u2013\uFE32]|[\u2013\uFE32](?:\s|$)/g;

const NAMED = {
  nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', amp: '&', lt: '<', gt: '>',
  quot: '"', apos: "'", shy: '', zwj: '', zwnj: '', mdash: '\u2014',
  ndash: '\u2013', horbar: '\u2015', hyphen: '-', dash: '\u2010', minus: '\u2212',
  lbrack: '[', rbrack: ']', lsqb: '[', rsqb: ']', middot: '\u00B7', excl: '!',
};
const cp = (n) => (n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '');
export function decodeEntities(s) {
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

export function flatten(s) {
  return decodeEntities(s)
    .replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '')
    .normalize('NFKC')
    .replace(/[\u0391-\u03C9\u0400-\u04FF]/g, (c) => CONFUSABLES[c] ?? c)
    .replace(/\s+/g, ' ');
}
