# gstack review: xraymortgages-site (29 September 2026)

Scope: every tracked file on `main` at `5cc02cc`, reviewed against `XRAY-SITE-BUILD-BRIEF-v1.md` by following `XRAY-SITE-REVIEW-BRIEF-v1.md`. This file is excluded from the Pages build.

## What ran

| Step | Skill | What it did |
|---|---|---|
| 1 | `/review` | Claude structured pass over all files, plus two parallel subagents: a design/accessibility specialist and an adversarial red team. The red team ran 60+ probe files against a scratch copy of the gate. |
| 2 | `/design-review` | Screenshots of all four pages at 390px and 1440px, contrast and target-size audit, heading and landmark check |
| 2 | `/qa` | Links, skip link, keyboard focus, FAQ toggles, console errors and horizontal scroll on all four pages |
| 2 | Lighthouse 12.8.2 (CLI) | All four pages, mobile and desktop, before and after the fixes |
| 3 | `/codex review` | Codex CLI 0.152.1 with `-m gpt-5.5`, read-only, 94,103 tokens. See the note below. |

How these differed from each skill's defaults:
- **No base branch.** `/review` and `/codex review` normally diff against a base. Here the whole tree was reviewed instead.
- **Codex model.** The model pinned in `~/.codex/config.toml` (`gpt-6-astra`) needs a newer Codex CLI and returns HTTP 400, so the run used `-m gpt-5.5`. The build brief was passed to Codex inside the prompt, because the brief lives outside the repo.
- **Nothing extra in the repo.** QA and design screenshots were kept in the session scratchpad, not in `.gstack/`, and gstack's one-time setup prompts were skipped. That includes adding a CLAUDE.md routing section.

## Lighthouse

The server was `python3 -m http.server 8765`. SEO is 63 on every page only because of the required noindex (`is-crawlable`), which is intended.

| Page | Device | Perf | A11y | Best Practices before → after | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| index.html | mobile | 100 | 100 | 96 → **100** | 63 | 0.8 s | 0 |
| index.html | desktop | 100 | 100 | 96 → **100** | 63 | 0.2 s | 0 |
| privacy/index.html | mobile | 100 | 100 | 96 → **100** | 63 | 0.8 s | 0 |
| privacy/index.html | desktop | 100 | 100 | 96 → **100** | 63 | 0.2 s | 0 |
| thank-you/index.html | mobile | 100 | 100 | 96 → **100** | 63 | 0.8 s | 0 |
| thank-you/index.html | desktop | 100 | 100 | 96 → **100** | 63 | 0.2 s | 0 |
| 404.html | mobile | 100 | 100 | 96 → **100** | 63 | 0.8 s | 0 |
| 404.html | desktop | 100 | 100 | 96 → **100** | 63 | 0.2 s | 0 |

The 96 was a `/favicon.ico` 404 logged to the console. It is fixed in (a).

Also checked:
- **Width:** no horizontal scroll at 390px on any page, 16px gutters, and buttons are 358px wide (full width) below 650px.
- **Headings:** one h1 per page, with no skipped heading levels.
- **Console:** no console errors after the fixes.

---

## (a) Fixed now

Each fix is its own commit. None changes copy, adds a page, font or script, or touches a placeholder.

| Commit | Finding | Found by |
|---|---|---|
| `0557ca9` | **Focus ring failed WCAG 1.4.11.** Teal `#19B3A6` measured 2.41:1 on the page and 2.61:1 on the white header, where 3:1 is required. Light surfaces now get a slate ring (16.7:1). The ring stays white on slate sections, the banner and the footer. | design specialist, confirmed in browser |
| `b977147` | The FAQ disclosure triangle sat outside the content box, touching the screen edge at 390px. It now sits inside. | design specialist, QA |
| `7496e41` | Every page load requested `/favicon.ico` and got a 404, which cost 4 points of Lighthouse Best Practices. Each page now has an empty `data:` icon, with no new file. | Lighthouse, QA |
| `ca6b616` | The draft banner was outside every landmark, so screen readers skipped it. It is now an `<aside aria-label="Draft notice">` and stays first on the page. | design specialist |
| `8bb1370` | GitHub Pages publishes `.md` files that have no front matter, and only `REPORT.md` and `README.md` were excluded. `_config.yml` now excludes `*.md`, including this file. | adversarial |
| `42b74e4` | **The compliance gate had false negatives, and would also fail a compliant site at go-live.** See the list below. | adversarial, Codex |
| `cab4fde` | Added `tests/gate-selftest.mjs`, which `npm test` runs first. It covers 47 cases: every probe that used to slip through must now fail, and a fully filled-in site must pass. | follow-up to the above |
| `6755c6d` | The gate sources contained literal em and en dash characters. They are now `\u` escapes. | Codex |
| `c105fd6` | The gate output in REPORT.md had stale line numbers. It has been refreshed. | Codex |

### Gate fixes in `42b74e4`

Each was reproduced with a probe first.

1. **The gate would fail at go-live.** The disclosure constant contained the literal `[PENDING]`. With the licence number filled in, every page failed "missing exact footer disclosure", and "not guaranteed" tripped the banned-word check: 12 failures on a compliant site. The licence is now matched as a pattern.
2. **Markup tricks hid violations.** Banned phrases, brand strings and dashes are now also matched on a normalised copy of the text. It has comments and tags removed, entities decoded, soft hyphens and zero-width characters dropped, NFKC applied and Cyrillic look-alikes folded. It now catches:
   - `best <b>rate</b>`, `&#97;pproved`, `guaran&shy;teed`, and phrases split across a line break or a hyphen
   - `&#8212` with no semicolon, `&horbar;`, and a CSS `content: "\2014"`
3. **Only `.html` files were scanned.** The gate now scans every file Pages would publish: `styles.css`, `robots.txt`, `CNAME`, `.htm` files and any `.md` that isn't excluded. It follows the `_config.yml` excludes. `tests/` is skipped only at the root. The gate fails if it finds no HTML or a required page is missing.
4. **Header checks.**
   - The header must read, in order: brokerage, associate line, wordmark.
   - It must come before any brand text on the page.
   - The brokerage must be a `<p class="brokerage">` that is not hidden and is larger than the wordmark in `styles.css`.
   - The gate previously only checked that the brokerage string appeared somewhere in the first `<header>`.
5. **Footer and decoys.** The footer contact line (phone | email | domain) is now required. Comments are stripped before the structural checks, so a commented-out header, footer or noindex meta no longer counts.
6. **Robots.**
   - noindex must be inside `<head>`, and any robots meta that allows indexing fails.
   - `#` comments in `robots.txt` are stripped before it is read, so `Disallow: / # draft` still counts. A missing `robots.txt` fails.
   - The draft banner is required above the header while robots.txt disallows crawling.
7. **Brief rules the gate did not enforce.** These now fail: `<script>`, `<iframe>`, `<form>`, embed/object, external stylesheets, off-site media, inline event handlers, `@import`, `@font-face`, off-site `url()`, inline `style=`, `hidden`, and `!` in visible text.
8. **Placeholders.** Encoded brackets (`&#91;`, `%5B`) and bare placeholder names now count as unfilled placeholders.

---

## (b) Needs a decision from Ray

Each item has a recommendation.

1. **The FAQ and privacy notice were never ported from the source pages.** They were written fresh because the source repo couldn't be read. Codex marked this P1. *Recommendation:* before the principal broker sees it, compare both against `alberta-self-employed` and `alberta-privacy` yourself. This review stayed inside this repo, so it didn't.
2. **Some FAQ wording goes beyond the brief:**
   - Q1 mentions a private mortgage without the "full costs in writing first" condition.
   - "It is a bridge" (Q3).
   - A second mortgage "may mean the current term does not need to be broken" (Q2).
   - "only with your consent" (Q4).

   *Recommendation:* add the costs-in-writing condition to Q1 and have the broker sign off the rest. It was left unchanged because the copy is yours to approve.
3. **Privacy notice wording:**
   - "Raymond. F is licensed with Centum…" is stated while the licence is pending.
   - The section on providers outside Canada names no contact person for questions, which PIPA s.13.1 expects.

   *Recommendation:* change it to "is a mortgage associate with", and name a contact (you or the brokerage privacy officer).
4. **Footer has a third line.** The brief says the footer is "exactly" two lines, but every page also has a "Privacy notice" link in the footer (Codex P2). *Recommendation:* keep it. The disclosure text is unchanged, and a privacy link on every page helps with PIPA.
5. **Repo visibility.**
   - Every commit, including the nine review commits, is authored with your email on the other brand's domain.
   - `tests/gate.mjs` has to spell out the forbidden brand strings to test for them.

   *Recommendation:* make the GitHub repo private, or set a repo-local `user.email` and rewrite the author before the first push.
6. **Phone number.** The phone number is a 416 area code on an Alberta-only brand. *Recommendation:* confirm it's the number you want on RECA-facing material.
7. **Go-live state isn't enforced.** Once the placeholders are filled, the gate passes even with the banner, the noindex and the privacy page's "Draft for principal broker review" line still in place. That was deliberate, so you can deploy a filled-in draft for the broker. *Recommendation:* add a `--go-live` flag later that requires all three to be gone and robots to allow crawling. Add the privacy draft line to the go-live checklist in REPORT.md now.
8. **The email won't be a link.** `[XRAY_EMAIL]` in the footer and on the privacy page is plain text. *Recommendation:* when you fill it in, make it a `mailto:` link, keeping the visible text identical.

---

## (c) Noted, no action

- **Reviewer suggestions I rejected under the review brief's override rules:**
  - `/design-review`'s landing-page rules call for a named typeface instead of system-ui, gradient or image backgrounds instead of flat colour, a hero image, and 2 or 3 entrance or scroll animations. The brief requires system fonts, no web fonts, and the scan line as the only decoration.
  - It also flags any 3-card grid as "AI slop". These three cards are copy the brief specifies, with no icons, so they stay.
  - Its "coloured left border on cards" pattern matches the `.nots` list. It's a small styling choice, kept for now.
  - No reviewer suggested testimonials, claims, rate tables, calculators or urgency. Nothing like that was added.
- **One CTA.** Both "Get your Mortgage X-Ray" buttons go to `[TALLY_XRAY]`. "Prefer to book a call first?" is the secondary text link the brief asks for.
- **Target size.** The standalone text links ("Prefer to book a call first?", the footer links) are 17 to 20px tall. They pass WCAG 2.5.8 through its spacing exception. The buttons are 50px or taller.
- **Skip link.** It works. After you press Enter, `document.activeElement` is still `body`, but the next Tab lands inside `#main` in Chrome. Adding `tabindex="-1"` to `<main>` is optional.
- **Contrast is otherwise fine.** Every text pair measures at least 4.5:1: the darker grey (`#4A5561`) and darker teal (`#0B7A71`) on light backgrounds, and palette grey and teal on slate.
- **Known gate false positives.** "Capital" also matches words like "capitalize", and `!` is blocked everywhere in visible text. Neither occurs today. False negatives were the priority.
- **404 not tested end-to-end.** The local Python server doesn't serve `404.html` for unknown paths; GitHub Pages does. The page was tested directly.
- **Codex CLI.** The pinned model needs a newer Codex CLI. `npm i -g @openai/codex@latest` would fix it, but that is outside this repo, so I didn't change it.

## Final `npm test`

```
Gate self-test: 47/47 cases behave as expected.

Compliance gate: 4 HTML files checked (7 shipped files scanned)
robots.txt disallows all: yes (noindex required)

Compliance rules: all passed.

PLACEHOLDERS UNFILLED (18), deploy blocked until filled:
  [PENDING]  x9
  [XRAY_EMAIL]  x5
  [TALLY_XRAY]  x2
  [CALENDLY_XRAY]  x2

GATE: FAIL (0 compliance, 18 placeholder)
```

The only failures are the placeholder hits, as intended.
