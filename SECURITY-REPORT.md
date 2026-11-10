# Security report — `gsc-tools`

Date: 2026-11-10 · Scope: the whole repository (code, config, git history, GitHub Actions) · Method: static review plus hands-on tests in a headless Chromium browser. No requests were sent to the apps' own servers; the only outside call was `npm audit` (npm registry), as authorised.

## 1. Summary

**Overall risk: LOW.** The repository holds JavaScript tools that run in the visitor's browser. There is no server, no database, no login, and no Google Search Console or Google API code (despite the "GSC" name, which here means the studio's design tools). Nothing is sent to a third party except fonts, icons and 3D library files that the pages download.

| Area | Result |
|---|---|
| Secrets (API keys, tokens, passwords) in code and in all 51 commits | None found |
| Real or sensitive data (CSV exports, test data) | None |
| Cross-site scripting (code injection through text, SVG, files) | Protected, and verified by tests (section 3) |
| Known vulnerabilities in npm dependencies | **0** (`npm audit`, all 8 direct dependencies and their sub-dependencies) |
| Where data goes | Stays in the browser (`localStorage`). Only outside contacts: Google Fonts, jsDelivr CDN, and `api.github.com` (Atelier only) |
| GitHub token (Atelier) | Removed by the owner on 2026-11-10 |
| `.gitignore` | Hardened in this review (section 4) |

## 2. Findings

Severity: 🟠 important · 🟡 minor · ✅ OK. Effort: S = 5 min, M = 1 h, L = more.

| # | Finding | Severity | Effort | Status |
|---|---|---|---|---|
| 1 | Secrets in code and git history | ✅ | – | Clean |
| 2 | Sensitive data in repo | ✅ | – | Clean (check the 6 images in `factsheet/assets/` are meant to be public) |
| 3 | `.gitignore` too short | 🟡 | S | **Fixed** |
| 4 | Injection through text (`inlineMk`, `donut` `esc`) | ✅ | – | **Tested** |
| 5 | Injection through imported SVG (`cleanSvgTree`) | ✅ | – | **Tested** |
| 6 | GitHub token kept in clear text in the browser (Atelier) | 🟠 | S | Token removed. When creating a new one: 30-day expiry, this repository only, "Contents: Read and write" only |
| 7 | CDN files without integrity hash (Tabler 3.19.0, three.js 0.160.0 — versions are pinned) | 🟡 | M | Open |
| 8 | Design-system files copied from another repository on `main` (`scripts/sync-design-system.sh`), including `js/app-update.js`, which ships to production | 🟡 | M | Open: review the diff before each push |
| 9 | npm dependencies | ✅ | – | `npm audit`: 0 vulnerabilities. Note `pdf-lib` 1.17.1 is no longer maintained (no known flaw) |
| 10 | Project file import accepts remote image URLs (`factsheet/src/render.js:105,121,202`; not filtered in `state.js` `migrate`) | 🟡 | M | Open (see 3.3) |
| 11 | Google Fonts: visitor IP address sent to Google (GDPR point) | 🟡 | M | Open |
| 12 | No Content Security Policy on any page | 🟡 | M | Open |
| 13 | Whole repository published on GitHub Pages (`pages.yml`, `path: .`): docs, tests, config are readable | 🟡 | S | Open (no secret inside) |
| 14 | GitHub Actions pinned by tag (`@v4`), not by commit hash | 🟡 | M | Open |
| 15 | Local storage content | ✅ | – | Documents and preferences only; the data export excludes the token |
| 16 | Network destinations | ✅ | – | No analytics, no beacon, no WebSocket, no unexpected domain |

## 3. What was tested

### 3.1 Text injection (finding 4)
`inlineMk` (`factsheet/src/viz/util.js:482`) turns the user's text into HTML. I ran 12 hostile inputs through the real function and rendered the result in Chromium, checking for unexpected tags, `on…` attributes and pop-ups:

- `<img src=x onerror=alert(1)>` → shown as plain text, no image created.
- Links with `javascript:`, `data:` or `<script>` → the link is dropped, only its label remains.
- Quote-breaking attempts in link addresses (`"onmouseover="…`, with bold/underline/subscript markers inside the address, `&quot;`, `&#34;`) → every quote is neutralised; the result stays a single harmless `<a>` with `href`, `class`, `data-f` attributes.
- Colour tags with injected attributes → ignored.

Result: **0 unexpected elements, 0 event attributes, 0 pop-ups.** This confirms and closes the "point to watch" raised in the first (French) report.

### 3.2 SVG import (finding 5)
`sanitizeSvg` / `cleanSvgTree` (`factsheet/src/viz/picto.js`) was run on 9 files in Chromium: embedded `<script>`, `onload`/`onclick`, `<foreignObject>` with an iframe, `javascript:` and external links, `<use>` and `<image>` pointing to another site, CSS `@import` / `url(https://…)`, `<set>`/`<animate>` tricks, a 200,000-element file, a non-SVG file and a broken file.

Result: every dangerous part was removed, oversized and invalid files were refused with a message, **0 pop-ups and 0 external requests** during the test.

### 3.3 Other imports (finding 10)
- Data files (CSV/JSON) for charts: errors are caught and a "Fichier illisible" message is shown (`vizdata.js:212-217, 246-251`), so a booby-trapped file cannot crash the tool.
- Organigramme images: only `data:image/` is accepted (`organigramme/js/model.js:69`).
- **Residual point:** a Factsheet *project file* (.json) can reference an image on a remote web address, which the browser would then load when the file is opened. The sender would learn that the file was opened and the viewer's IP address. It cannot run code. Mitigation: open project files from trusted sources only; planned code fix is to accept only `data:image/` or local `assets/` paths.

### 3.4 Dependencies (finding 9)
`npm audit` on `factsheet/package-lock.json`: **found 0 vulnerabilities** (production and development packages). Bundled libraries (`three`, `pdf-lib`, `d3-*`) are included.

## 4. Fix applied in this review

`.gitignore` now also excludes `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.csv`, `*credentials*`, `*secret*`, `.DS_Store`. I verified that no file currently tracked by git matches these patterns, so nothing existing is affected.

## 5. What is well done

- No secret or real data anywhere, including history.
- Text and SVG handling is defensive and passes hostile tests.
- Pages use `rel="noopener"` on external links; no `eval`, `document.write`, service worker, analytics.
- Library versions are pinned; the PDF libraries are copied into the repository.
- GitHub workflows have minimal permissions and use no secrets.
- The data export excludes the GitHub token.

## 6. Remaining recommended actions

- [ ] When using the Atelier again: new token, 30-day expiry, this repository only; click "Remove token" when done.
- [ ] Publish only needed files on Pages (finding 13).
- [ ] Add a Content Security Policy, page by page (finding 12).
- [ ] Host the Tabler icons, three.js and fonts in the repository, or add integrity hashes (findings 7 and 11).
- [ ] Refuse remote image URLs when opening a project file (finding 10).
- [ ] Review the diff of `js/app-update.js` after each design-system sync (finding 8).
- [ ] Enable GitHub two-factor authentication, Dependabot alerts and secret scanning if not already on.

## 7. Limits of this review

- The secret search relies on known key formats; an unusual custom password could be missed (none seen).
- Tests ran in headless Chromium only, on the functions that handle text and SVG; the full apps were not exercised end to end.
- Whether the repository is public or private, and whether the removed token was also revoked on GitHub, could not be checked from here.
- "Low risk" is not "no risk": see the plain-language summary below.

## 8. Plain-language summary for non-technical readers

- These are drawing and layout tools that run **inside your own browser**. They have no server and no account: there is nothing to log in to and nothing to hack remotely.
- Your documents are saved **on your computer only**. They are not uploaded anywhere unless you use the Atelier on purpose.
- The code contains **no password or key**, and none ever did in its history.
- Text and images you type or import are **cleaned before display**; we tried booby-trapped text and drawings and none could run code.
- The building blocks the tools rely on were checked against the public list of known flaws: **none found**.
- Honest caveat: the only realistic risk is **opening a project file from someone you do not trust** (it could make the tool fetch an image from the sender's server, revealing that you opened it), and a **stolen GitHub token** if you use the Atelier. Both are avoidable with the habits above.
