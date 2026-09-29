# X-Ray Mortgages ad frames v1: build report (2026-09-29)

Brief: `XRAY-FRAMES-BUILD-BRIEF-v1.md`. Copy: `XRAY-AD-COPY-v1-ALBERTA.md`, used verbatim. Nothing here is public. `creative/` is excluded from GitHub Pages and from the site gate (`_config.yml`). No remote, nothing pushed.

## What is here

| Path | What it is |
|---|---|
| `creative/gen.js` | Generator. Writes one HTML file per frame, then renders the PNGs and the contact sheet with Playwright. Run `node creative/gen.js` (or `--no-render` for HTML only). |
| `creative/frames/*.html`, `*.png` | The nine frames: `a1`, `a2`, `a3` x `sq` 1080x1080, `pt` 1080x1350, `st` 1080x1920. All PNGs are verified at the exact pixel size. |
| `creative/frames/jobs.json` | Frame list with each frame's hook, sub-line and safe zones, read by the checks. |
| `creative/contact-sheet.html`, `creative/CONTACT-SHEET-v1.png` | All nine side by side, one row per angle. |
| `creative/checks.mjs` | Checks. Run `node creative/checks.mjs`, and `node creative/checks.mjs --negative` for the negative test. |
| `tests/rules.mjs` | The banned-phrase, brand-string and dash rules, moved out of `tests/gate.mjs` unchanged. The site gate and the frame checks both import it, so they cannot drift. |

## Design, as built

- **Ground:** off-white (`--page` `#F4F6F8`) with a slate (`--slate` `#0F1720`) header block, the same on all nine. The brief allowed that or a slate ground. The wordmark has to render as on the site, with X-RAY in the accent and MORTGAGES in slate. Slate text needs a light ground, so the slate-ground option was out.
- **Tokens:** `gen.js` reads the colours and the font stack from `styles.css` `:root` each time it runs. It fails if a token is missing.
- **Header:** the brokerage name, top right, 36/40/42px bold (square, portrait, story), in off-white on slate. The wordmark is 26/30/32px, so the brokerage is always larger than the brand. The checks verify this.
- **Wordmark:** `X-RAY` in `--teal-ink` `#0B7A71` and `MORTGAGES` in slate, weight 800, letter-spacing 0.22em, exactly as `.wordmark` in `styles.css`.
- **Badge:** slate pill with off-white text, 17:1.
- **Ticks:** slate text on off-white, 17:1, with teal-ink check marks.
- **Button:** teal `#19B3A6` fill with slate text, like the site's `.btn`.
- **Hook and sub-line:** hook in slate 800; sub-line in `--grey-ink` `#4A5561`, about 7:1.
- **Disclosure band:** full width, slate with off-white text, 28/29/30px (the brief's minimum is 26px).
- **Decoration:** exactly one, the site's scan-line gradient, under the header block. There are no photos, illustrations or logos. The only graphics are the three tick marks.
- **Story safe zones:** the top and bottom 250px contain only slate fill. All text sits between 250 and 1670.
- **No network:** system font stack, no web fonts, no scripts, and no network at render time. The checks watch for requests.

## Check output (`node creative/checks.mjs`)

```
PASS  a1-sq-1080x1080  (1 x [PENDING])
PASS  a1-pt-1080x1350  (1 x [PENDING])
PASS  a1-st-1080x1920  (1 x [PENDING])
PASS  a2-sq-1080x1080  (1 x [PENDING])
PASS  a2-pt-1080x1350  (1 x [PENDING])
PASS  a2-st-1080x1920  (1 x [PENDING])
PASS  a3-sq-1080x1080  (1 x [PENDING])
PASS  a3-pt-1080x1350  (1 x [PENDING])
PASS  a3-st-1080x1920  (1 x [PENDING])

Rules: text rules from tests/rules.mjs (14 banned phrases, 9 forbidden strings), plus "#" and dashes.
Expected placeholder: [PENDING] x9 (the RECA licence number; not a failure until go-live).
FRAMES: PASS (9 of 9 frames, placeholders aside)
```

## Negative test (`node creative/checks.mjs --negative`)

It breaks a clean frame (a1 square, and a1 story for the safe-zone case) one way at a time, and each break must be caught. For three breaks, another rule would also fire: editing the disclosure stops its "not guaranteed" being exempt. For those three, the run requires the named rule itself to fire.

```
PASS  caught: em dash in the hook  (em or en dash character in the file)
PASS  caught: en dash entity in a tick  (em or en dash in visible text (entity or encoded))
PASS  caught: em dash as CSS escape  (em or en dash as a CSS escape)
PASS  caught: banned "approved"  (banned phrase "approved")
PASS  caught: banned phrase split by a tag  (banned phrase "best rate")
PASS  caught: banned "guarantee" outside the band  (banned phrase "guarantee")
PASS  caught: "diagnostic" in the sub-line  (banned phrase "diagnostic")
PASS  caught: old brand "Fisher"  (forbidden string "Fisher")
PASS  caught: "Capital" hidden in a comment  (forbidden string "Capital")
PASS  caught: "Mortgage Room"  (forbidden string "Mortgage Room")
PASS  caught: "Ontario"  (forbidden string "Ontario")
PASS  caught: "FSRA" licence text  (forbidden string "FSRA")
PASS  caught: "M26000144"  (forbidden string "M26000144")
PASS  caught: "13054"  (forbidden string "13054")
PASS  caught: "Mortgage Commitment"  (forbidden string "Mortgage Commitment")
PASS  caught: "#" before a licence number  ("#" in visible text)
PASS  caught: disclosure band removed  (missing disclosure band)
PASS  caught: disclosure band reworded  (disclosure band text differs: "Raymond. F, Mortgage Associate, RECA Licence [PENDING]. Centum Financi...")
PASS  caught: brokerage header removed  (missing brokerage header)
PASS  caught: badge removed  (missing badge)
PASS  caught: "Alberta only" removed  (missing "Alberta only")
PASS  caught: band type under 26px  (band type 22px, minimum 26px)
PASS  caught: band not full width  (band not full width (0-864))
PASS  caught: brokerage smaller than wordmark  (brokerage (16px) not larger than wordmark (26px))
PASS  caught: wordmark in one colour  (wordmark X-RAY is not in the accent (teal-ink))
PASS  caught: badge contrast too low  (badge contrast 2.31:1 below 4.5:1)
PASS  caught: tick contrast too low  (tick 1 contrast 2.31:1 below 4.5:1)
PASS  caught: second placeholder  (unexpected placeholder [TALLY_XRAY])
PASS  caught: web font  (web font or @import)
PASS  caught: tracking pixel  (external element (img, link, iframe, video, object or embed))
PASS  caught: second decorative element  (expected exactly one scan line, found 2)
PASS  caught: content overflows the canvas  (hook outside the safe zone (274-2203 vs 0-1080))
PASS  caught: story: text in the reserved top strip  (brk outside the safe zone (44-95 vs 250-1670))

NEGATIVE: PASS (all 33 breaks caught, clean controls pass)
```

The site gate, after these changes (`npm test`): self-test 59/59, compliance rules all passed. The only failures are the 19 unfilled placeholders on the site pages, which is expected.

## Things I was unsure about (please check)

1. **The badge says "RECA licensed Mortgage Associate" while the licence is pending.** It is the approved copy, and it matches `[PENDING]` in the band. These frames must not run until the licence is issued and `[PENDING]` holds the real number. The checks report `[PENDING]` separately and do not fail on it, as the brief says, so nothing in the checks blocks an early upload. The copy file's rule that "a gate blocks any upload whose text contains `[`" is the control for that, and it is not in this repo.
2. **"#" is checked in visible text only.** The frame HTML needs `#` for colours in its `<style>` block, so a raw-file check would always fail. Every other brand and dash rule runs on the whole file, CSS included.
3. **Dash rule is stricter than the site gate.** The frames fail on any en dash, not only one used as an em dash. Nothing in the copy uses one.
4. **The header names the brokerage without a licence number**, as the brief's header copy does. Whether RECA wants a brokerage licence number in the disclosure is still an open question in the ad-copy file.
5. **Renderer location.** No `playwright` package is installed in `~/fc-paid-campaign` or globally, even though the Room scripts `require` it (they were written for another machine). Both scripts try a normal `require('playwright')` first, then `$PLAYWRIGHT_DIR`, then the copy the gstack skill installed (`~/.claude/skills/gstack/node_modules/playwright`, 1.62.1). That copy matches the cached Chromium build (1234, Chromium 151). Nothing was installed and no dependency was added to this repo.
6. **System fonts render per machine.** These PNGs were made on macOS, which uses the system UI font. Re-rendering on another OS gives slightly different line breaks. The checks re-measure the layout, so a bad wrap would fail rather than slip through.
7. **The button in the image is not a link.** It is part of the picture. The ad's real button is Meta's "Learn more", per the copy file.
8. **The contact sheet's heading and captions** ("X-Ray Mortgages ad frames v1 (Alberta), contact sheet", "a1 square 1080x1080") are working labels. They are not checked, and the sheet is not an ad.
