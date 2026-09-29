# X-Ray Mortgages site: build report (v1, 2026-09-29)

## What was built

A static, one-page site in plain HTML and CSS. No framework, no build step, no scripts, no tracking. It is ready for GitHub Pages with the custom domain xraymortgages.ca.

| File | Purpose |
|---|---|
| `index.html` | The full pitch, using the brief's copy. It has one CTA (the hero and the final `#request` block both point to `[TALLY_XRAY]`), the five-question FAQ, and the secondary `[CALENDLY_XRAY]` link |
| `privacy/index.html` | Alberta enquiry privacy notice (PIPA) |
| `thank-you/index.html` | Confirmation message from the brief, plus a Book a call button (`[CALENDLY_XRAY]`) |
| `404.html` | Not-found page |
| `styles.css` | One shared stylesheet, system fonts, mobile first |
| `CNAME` | `xraymortgages.ca` |
| `robots.txt` | `Disallow: /` (flip on go-live) |
| `tests/gate.mjs`, `package.json` | Compliance gate, run with `npm test` |
| `_config.yml` | Tells GitHub Pages not to publish `REPORT.md`, `tests/` and `package.json` |

Every page has these, in order:
- the draft banner
- the header: brokerage first and largest (19px bold), then the associate line, then the wordmark (15px)
- `noindex,nofollow`
- a skip link
- the exact footer disclosure

**Verified:**
- Lighthouse on mobile, run on index, privacy and thank-you: Accessibility 100, Best Practices 100. SEO is 63 only because of the required noindex.
- At phone width there is no horizontal scroll, and buttons are full width under 650px.
- Each page has exactly one h1.

## Gate output (`npm test`, exit code 1, expected)

Refreshed after the gstack review on 29 September 2026; see `REVIEW-GSTACK-2026-09-29.md` for what changed in the gate. `npm test` first runs `tests/gate-selftest.mjs` (47 cases, all passing), then the gate. The compliance rules all pass. The only failures are the unfilled placeholders, and they are listed on their own:

```
Compliance gate: 4 HTML files checked (7 shipped files scanned)
robots.txt disallows all: yes (noindex required)

Compliance rules: all passed.

PLACEHOLDERS UNFILLED (18), deploy blocked until filled:
  [PENDING]  x9
  [XRAY_EMAIL]  x5
  [TALLY_XRAY]  x2
  [CALENDLY_XRAY]  x2
  Locations:
    404.html:20  [PENDING]
    404.html:38  [PENDING]
    404.html:39  [XRAY_EMAIL]
    index.html:20  [PENDING]
    index.html:31  [TALLY_XRAY]
    index.html:139  [TALLY_XRAY]
    index.html:141  [CALENDLY_XRAY]
    index.html:150  [PENDING]
    index.html:151  [XRAY_EMAIL]
    privacy/index.html:20  [PENDING]
    privacy/index.html:33  [PENDING]
    privacy/index.html:61  [XRAY_EMAIL]
    privacy/index.html:71  [PENDING]
    privacy/index.html:72  [XRAY_EMAIL]
    thank-you/index.html:20  [PENDING]
    thank-you/index.html:32  [CALENDLY_XRAY]
    thank-you/index.html:41  [PENDING]
    thank-you/index.html:42  [XRAY_EMAIL]

GATE: FAIL (0 compliance, 18 placeholder)
```

I also tested the gate against a deliberately bad file. It caught all of these, and I deleted the file afterwards:
- em dashes, and en dashes used as em dashes
- banned phrases
- brand strings from the other brand
- `# `
- a missing header brokerage line, footer disclosure, `Alberta only` or noindex meta

## Things I was unsure about (please check)

1. **Source pages were not read.** My permission layer blocked reads of the other site's repo, and I did not try to get around that. So:
   - The **FAQ answers** were written fresh from the substance listed in the brief.
   - The **privacy notice** was written fresh as a standard Alberta PIPA enquiry notice, not ported.

   Please compare both against the source pages, or have Codex do it, before the principal broker review.
2. **The footer disclosure contains "not guaranteed"**, but "guaranteed" is a banned phrase. The gate blanks out the exact mandated disclosure string before the voice checks run. Everywhere else, "guarantee" and "guaranteed" still fail.
3. **Contrast versus the palette.** Grey `#9AA5B1` and teal `#19B3A6` are below 4.5:1 on the off-white page, so I used them as text only on slate. For text on the light page I added two darker tokens: `#4A5561` (grey) and `#0B7A71` (teal). The `X-RAY` part of the header wordmark uses `#0B7A71`. The CTA button is a teal fill with slate text.
4. **Your git author email is on the other brand's domain.** The commits in this repo use your global git identity. If the GitHub repo is public, that email will be visible in the history. Before the first push, you could set a repo-local identity (`git config user.email ...`) and rewrite the five commits.
5. **Wording I added beyond the brief:**
   - the FAQ heading "Questions, answered plainly."
   - on the thank-you page, "Prefer to pick a time now?" and a reminder not to email documents
   - the privacy notice text
   - the privacy "Last updated" date, set to 29 September 2026 (not a placeholder)
6. **Phone number.** The footer number (416) 898-0181 is a Toronto area code on an Alberta-only brand. I used it exactly as the brief gives it.
7. **Pages publishing.** Pages publishes with Jekyll by default. `_config.yml` keeps the tooling and this report out of the published site. The pages have no front matter, so Jekyll serves them unchanged.
8. **Tally redirect.** Point Tally's redirect-on-submit at `https://xraymortgages.ca/thank-you/`.

## Go-live checklist

1. Fill in `[PENDING]`, `[XRAY_EMAIL]`, `[TALLY_XRAY]` and `[CALENDLY_XRAY]`.
2. Change `robots.txt` to `Allow: /`.
3. Remove the noindex meta and the draft banner from every page.
4. Run `npm test`. It must pass before you deploy.

## Commands to add the remote and push (Ray runs these)

```sh
cd ~/Desktop/xraymortgages-site
git remote add origin git@github.com:<your-account>/xraymortgages-site.git
git push -u origin main
```

Then, in GitHub:
1. Go to Settings, then Pages.
2. Choose Deploy from a branch, with branch `main` and folder `/ (root)`.
3. Set the custom domain to `xraymortgages.ca`.
4. Once DNS resolves, enable Enforce HTTPS.
