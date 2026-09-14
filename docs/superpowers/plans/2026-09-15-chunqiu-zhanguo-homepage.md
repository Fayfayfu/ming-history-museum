# Spring and Autumn Warring States Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained, browser-ready homepage prototype that uses a real openly licensed Zhou ritual-bell photograph to lead visitors from material beauty into the question of how the Spring and Autumn world became the Warring States world.

**Architecture:** Keep the prototype isolated under `prototypes/chunqiu-zhanguo-homepage/` with semantic HTML, one focused stylesheet, one small progressive-enhancement script, a local optimized artifact image, and a Node verification script. The page works without JavaScript; JavaScript adds pointer light, placeholder navigation notices, and smooth anchor movement. No existing `ming_*` data or production museum page is modified.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, local SVG decoration, local WebP/JPEG media, Node.js, `sharp`, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-15-chunqiu-zhanguo-homepage-design.md`

## Global Constraints

- Use the exact hero copy defined in the spec: `开卷`, `礼乐征伐`, the approved lead, approved subtitle, and `展开列国长卷`.
- Do not display `2026`, `现代的你`, a current-year narrative, or modern provincial boundaries.
- Use a real openly licensed ritual-bell photograph; do not substitute an SVG/CSS imitation for the artifact.
- Preserve artifact title, dating wording, object number, collection, author, license, source links, and modification notes in `MEDIA-CREDITS.md` and the page footer.
- Do not generate or add inscriptions, damage, motifs, or shapes absent from the source image.
- Keep the prototype independent of external runtime assets, frameworks, online APIs, maps, fonts, and scripts.
- The long-scroll map is a visual orientation device and must say `全景方位示意，不代表精确历史疆界`.
- Audio is out of scope and must not autoplay or appear as a fake historical recording.
- Core copy and content remain readable with JavaScript disabled.
- Support keyboard operation, visible focus, `prefers-reduced-motion`, and a 390-pixel viewport without horizontal overflow.

---

### Task 1: Establish the media source and verification contract

**Files:**
- Create: `prototypes/chunqiu-zhanguo-homepage/MEDIA-CREDITS.md`
- Create: `prototypes/chunqiu-zhanguo-homepage/assets/ritual-bell-source.jpg`
- Create: `prototypes/chunqiu-zhanguo-homepage/assets/ritual-bell.webp`
- Create: `prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs`

**Interfaces:**
- Consumes: Wikimedia Commons original-file redirect for `Zhou dynasty ritual bell, Rijksmuseum.jpg`; Rijksmuseum object metadata for `AK-MAK-9`.
- Produces: local `assets/ritual-bell.webp`; exported verification constants `ROOT`, `HTML_PATH`, `CREDITS_PATH`; executable `node verify-homepage.mjs`.

- [ ] **Step 1: Write the failing structural verification script**

Create `verify-homepage.mjs` with assertions that fail while the page and credits do not exist:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const HTML_PATH = path.join(ROOT, 'index.html');
export const CREDITS_PATH = path.join(ROOT, 'MEDIA-CREDITS.md');

assert.ok(fs.existsSync(HTML_PATH), 'index.html must exist');
assert.ok(fs.existsSync(CREDITS_PATH), 'MEDIA-CREDITS.md must exist');

const html = fs.readFileSync(HTML_PATH, 'utf8');
const credits = fs.readFileSync(CREDITS_PATH, 'utf8');

for (const required of ['开卷', '礼乐征伐', '展开列国长卷', '全景方位示意，不代表精确历史疆界']) {
  assert.ok(html.includes(required), `missing required copy: ${required}`);
}
for (const forbidden of ['2026年的你', '现代的你']) {
  assert.ok(!html.includes(forbidden), `forbidden current framing: ${forbidden}`);
}
for (const credit of ['AK-MAK-9', 'Rijksmuseum', 'Lệ Xuân', 'CC BY-SA 4.0']) {
  assert.ok(credits.includes(credit), `missing media credit: ${credit}`);
}
assert.ok(!/(https?:)?\/\/(?!www\.w3\.org\/2000\/svg)/.test(html.replace(/href="https?:\/\/[^\"]+"/g, '')), 'no remote runtime asset is allowed');

console.log('HOMEPAGE_STATIC_OK');
```

- [ ] **Step 2: Run the verifier and confirm the intended failure**

Run:

```bash
node prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs
```

Expected: failure with `index.html must exist`.

- [ ] **Step 3: Download the openly licensed source image**

Run with network approval:

```bash
mkdir -p prototypes/chunqiu-zhanguo-homepage/assets
curl -L 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Zhou%20dynasty%20ritual%20bell%2C%20Rijksmuseum.jpg' -o prototypes/chunqiu-zhanguo-homepage/assets/ritual-bell-source.jpg
```

Expected: a JPEG larger than 1 MB. Verify with:

```bash
file prototypes/chunqiu-zhanguo-homepage/assets/ritual-bell-source.jpg
du -h prototypes/chunqiu-zhanguo-homepage/assets/ritual-bell-source.jpg
```

- [ ] **Step 4: Create the local web image**

Run:

```bash
node -e "import('sharp').then(({default: sharp}) => sharp('prototypes/chunqiu-zhanguo-homepage/assets/ritual-bell-source.jpg').rotate().resize({ width: 1800, withoutEnlargement: true }).webp({ quality: 88 }).toFile('prototypes/chunqiu-zhanguo-homepage/assets/ritual-bell.webp'))"
```

Expected: `ritual-bell.webp` exists, is 1800 pixels wide or smaller, and is materially smaller than the source JPEG.

- [ ] **Step 5: Write exact media credits**

Create `MEDIA-CREDITS.md` with:

```markdown
# Media Credits

## Ritual bell

- Object title: Ritual bell
- Dating wording: after 482 BCE
- Culture/style: Zhou dynasty, China
- Material: bronze
- Object number: AK-MAK-9
- Collection: Rijksmuseum, Amsterdam; on loan from the Royal Asian Art Society in the Netherlands
- Collection record: https://www.rijksmuseum.nl/en/collection/object/Ritual-bell--1cf30147319e008158873fe234f03c02
- Collection-record copyright status: Public domain
- Prototype photograph: Zhou dynasty ritual bell, Rijksmuseum.jpg
- Photographer: Lệ Xuân
- Photograph source: https://commons.wikimedia.org/wiki/File:Zhou_dynasty_ritual_bell,_Rijksmuseum.jpg
- Photograph license: Creative Commons Attribution-ShareAlike 4.0 International
- License link: https://creativecommons.org/licenses/by-sa/4.0/
- Local modifications: automatic EXIF rotation, resize to a maximum width of 1800 pixels, WebP encoding, CSS crop, exposure reduction, color grading, vignette, and pointer-controlled light overlay. No artifact details were generated or painted in.
- Source checked: 2026-09-15
```

- [ ] **Step 6: Commit the media contract and source files**

```bash
git add prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs prototypes/chunqiu-zhanguo-homepage/MEDIA-CREDITS.md prototypes/chunqiu-zhanguo-homepage/assets/ritual-bell-source.jpg prototypes/chunqiu-zhanguo-homepage/assets/ritual-bell.webp
git commit -m "feat: add licensed ritual bell media"
```

---

### Task 2: Build the semantic homepage and no-JavaScript experience

**Files:**
- Create: `prototypes/chunqiu-zhanguo-homepage/index.html`
- Modify: `prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs`

**Interfaces:**
- Consumes: local `assets/ritual-bell.webp`; exact hero copy and content boundaries from the spec.
- Produces: anchors `#opening`, `#question`, `#scroll`; placeholder links with `[data-preview-link]`; artifact surface `[data-artifact-surface]`; live notice `#prototype-notice`.

- [ ] **Step 1: Extend the failing verifier for page structure**

Add assertions:

```js
for (const selectorContract of [
  'id="opening"',
  'id="question"',
  'id="scroll"',
  'data-artifact-surface',
  'data-preview-link',
  'id="prototype-notice"',
  'assets/ritual-bell.webp',
  'href="#scroll"',
]) {
  assert.ok(html.includes(selectorContract), `missing HTML contract: ${selectorContract}`);
}
assert.ok(html.includes('《论语·季氏》'), 'Analects attribution must be visible');
assert.ok(html.includes('当礼乐征伐不再自天子出，谁来维持天下秩序？'), 'central question must be visible');
```

- [ ] **Step 2: Run the verifier and confirm it still fails**

Run:

```bash
node prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs
```

Expected: failure with `index.html must exist`.

- [ ] **Step 3: Create semantic HTML**

Create an HTML document with:

- a skip link;
- `header` and navigation;
- `main` containing `#opening`, `#question`, and `#scroll`;
- a real `<img>` with width, height, descriptive alt text, and local source;
- a normal anchor `<a href="#scroll">展开列国长卷</a>` that works without JavaScript;
- the exact approved quotation and plain-language explanation;
- a four-phase long scroll: `周室秩序`, `霸主与盟会`, `领土国家`, `秦并六国`;
- six preview entries: `春秋代序`, `列国之变`, `人间悲欢`, `百家之言`, `器物有声`, `研究台`;
- a source footer linking to the Rijksmuseum record, Commons file page, and CC BY-SA 4.0 license;
- a polite `role="status"` notice for inactive preview links.

Use `<button data-preview-link>` for inactive future entries so they never navigate to missing pages.

- [ ] **Step 4: Run the verifier and confirm structural assertions pass up to the styling contracts**

Run:

```bash
node prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs
```

Expected: `HOMEPAGE_STATIC_OK`.

- [ ] **Step 5: Commit the semantic page**

```bash
git add prototypes/chunqiu-zhanguo-homepage/index.html prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs
git commit -m "feat: build spring autumn homepage structure"
```

---

### Task 3: Apply the visual system and progressive interactions

**Files:**
- Create: `prototypes/chunqiu-zhanguo-homepage/styles.css`
- Create: `prototypes/chunqiu-zhanguo-homepage/app.js`
- Modify: `prototypes/chunqiu-zhanguo-homepage/index.html`
- Modify: `prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs`

**Interfaces:**
- Consumes: HTML contracts from Task 2.
- Produces: CSS custom properties `--ink`, `--paper`, `--bronze`, `--verdigris`, `--cinnabar`, `--light-x`, `--light-y`; `initArtifactLight(surface)` and `initPreviewNotices(buttons, notice)` in `app.js`.

- [ ] **Step 1: Extend the verifier for local assets and behavior hooks**

Add assertions:

```js
for (const localAsset of ['styles.css', 'app.js']) {
  assert.ok(html.includes(localAsset), `missing local asset: ${localAsset}`);
}
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
for (const token of ['--ink', '--paper', '--bronze', '--verdigris', '--cinnabar', 'prefers-reduced-motion']) {
  assert.ok(css.includes(token), `missing CSS contract: ${token}`);
}
for (const hook of ['initArtifactLight', 'initPreviewNotices']) {
  assert.ok(js.includes(hook), `missing JS hook: ${hook}`);
}
```

- [ ] **Step 2: Run the verifier and confirm the intended failure**

Run:

```bash
node prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs
```

Expected: failure with `missing local asset: styles.css`.

- [ ] **Step 3: Implement the visual system**

Build `styles.css` around:

- deep blue-black and charcoal backgrounds;
- warm ivory typography;
- bronze, verdigris, and restrained cinnabar accents;
- editorial asymmetry on desktop and ordered single-column flow on mobile;
- full-bleed real artifact photograph with dark exposure, gradient mask, and local pointer light;
- a large restrained Song-style title using local system font fallbacks;
- a long-scroll diagram made from semantic HTML and local inline SVG lines;
- explicit focus states and readable contrast;
- no neon, glassmorphism, generic black-gold, particle loops, or war-game styling;
- complete `@media (prefers-reduced-motion: reduce)` rules;
- breakpoints at 1024 and 680 pixels, with no horizontal overflow at 390 pixels.

- [ ] **Step 4: Implement progressive enhancement**

Create `app.js`:

```js
function initArtifactLight(surface) {
  if (!surface || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  surface.addEventListener('pointermove', (event) => {
    const rect = surface.getBoundingClientRect();
    surface.style.setProperty('--light-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    surface.style.setProperty('--light-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
  });
}

function initPreviewNotices(buttons, notice) {
  if (!notice) return;
  for (const button of buttons) {
    button.addEventListener('click', () => {
      notice.textContent = `${button.textContent.trim()}将在下一阶段展开；本轮先验证首页。`;
    });
  }
}

initArtifactLight(document.querySelector('[data-artifact-surface]'));
initPreviewNotices(document.querySelectorAll('[data-preview-link]'), document.querySelector('#prototype-notice'));
```

- [ ] **Step 5: Link the local stylesheet and deferred script**

Add:

```html
<link rel="stylesheet" href="styles.css">
<script src="app.js" defer></script>
```

- [ ] **Step 6: Run static and syntax verification**

Run:

```bash
node --check prototypes/chunqiu-zhanguo-homepage/app.js
node prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs
```

Expected: `HOMEPAGE_STATIC_OK` and no JavaScript syntax error.

- [ ] **Step 7: Commit visual and interaction work**

```bash
git add prototypes/chunqiu-zhanguo-homepage/index.html prototypes/chunqiu-zhanguo-homepage/styles.css prototypes/chunqiu-zhanguo-homepage/app.js prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs
git commit -m "feat: style and animate spring autumn homepage"
```

---

### Task 4: Verify in a real browser and deliver visible evidence

**Files:**
- Create: `prototypes/chunqiu-zhanguo-homepage/verify-homepage.browser.mjs`
- Create: `prototypes/chunqiu-zhanguo-homepage/screenshots/homepage-desktop.png`
- Create: `prototypes/chunqiu-zhanguo-homepage/screenshots/homepage-mobile.png`
- Modify: `prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs`

**Interfaces:**
- Consumes: completed local prototype; HTTP base URL from `HOMEPAGE_URL` with default `http://127.0.0.1:4175/`.
- Produces: `HOMEPAGE_BROWSER_OK`; desktop and mobile screenshots; final local preview URL.

- [ ] **Step 1: Write the browser verification script**

Create a Playwright script that:

- opens the local page;
- checks the hero title and main CTA;
- asserts no horizontal overflow at 1440×1000 and 390×844;
- clicks the CTA and confirms `#scroll` is visible;
- clicks one preview entry and confirms the live notice is populated;
- emulates reduced motion and confirms computed `scroll-behavior` is `auto`;
- takes the two required screenshots.

Use:

```js
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.HOMEPAGE_URL ?? 'http://127.0.0.1:4175/';
fs.mkdirSync(path.join(root, 'screenshots'), { recursive: true });

const browser = await chromium.launch({ headless: true });
for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: '礼乐征伐', exact: true }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`${viewport.name} horizontal overflow: ${overflow}px`);
  await page.getByRole('link', { name: '展开列国长卷' }).click();
  await page.locator('#scroll').waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(root, 'screenshots', `homepage-${viewport.name}.png`), fullPage: true });
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
await page.goto(url);
await page.locator('[data-preview-link]').first().click();
const notice = await page.locator('#prototype-notice').textContent();
if (!notice?.includes('下一阶段展开')) throw new Error('preview notice missing');
const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
if (scrollBehavior !== 'auto') throw new Error(`reduced motion scroll behavior is ${scrollBehavior}`);
await browser.close();
console.log('HOMEPAGE_BROWSER_OK');
```

- [ ] **Step 2: Start a local static server**

Run:

```bash
python3 -m http.server 4175 --directory prototypes/chunqiu-zhanguo-homepage
```

Expected: server listens at `http://127.0.0.1:4175/`.

- [ ] **Step 3: Run browser verification**

Run in a second shell:

```bash
node prototypes/chunqiu-zhanguo-homepage/verify-homepage.browser.mjs
```

Expected: `HOMEPAGE_BROWSER_OK` and two screenshots.

- [ ] **Step 4: Inspect screenshots at original detail**

Inspect both screenshots and reject the design if any of these are true:

- the bell reads mainly as a dirty or broken archaeological object;
- the crop hides the recognizable bell silhouette;
- the title competes with the artifact;
- the page resembles a generic black-gold Chinese-style template;
- the mobile hero requires horizontal scrolling;
- the attribution overwhelms the invitation;
- the long scroll looks like a dashboard rather than a historical narrative.

If rejected, adjust crop, exposure, white balance, gradient mask, spacing, or typography without generating new artifact details, then rerun Steps 3 and 4.

- [ ] **Step 5: Run final verification**

```bash
node --check prototypes/chunqiu-zhanguo-homepage/app.js
node prototypes/chunqiu-zhanguo-homepage/verify-homepage.mjs
node prototypes/chunqiu-zhanguo-homepage/verify-homepage.browser.mjs
```

Expected: `HOMEPAGE_STATIC_OK`, `HOMEPAGE_BROWSER_OK`, and no syntax error.

- [ ] **Step 6: Commit verified prototype**

```bash
git add prototypes/chunqiu-zhanguo-homepage
git commit -m "test: verify spring autumn homepage prototype"
```

- [ ] **Step 7: Open the prototype for user review**

Open `http://127.0.0.1:4175/` in the Codex browser panel and also open both screenshot files. Report that this is a visual prototype, not the final historical website, and state whether the bell passed the explicit “beautiful rather than merely corroded” visual check.
