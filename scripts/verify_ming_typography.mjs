import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const scopePages = ['people.html', 'events.html'];
const untouchedPages = ['index.html', 'institutions.html', 'exhibitions.html', 'people/yu-qian.html'];
const fonts = [
  ['MingMuseumSans-Regular.woff2', 'Ming Museum Sans'],
];

for (const [file] of fonts) {
  const full = path.join(root, 'assets/fonts', file);
  const stat = await fs.stat(full);
  assert.ok(stat.size > 10_000, `${file} must be a real self-hosted WOFF2`);
}
for (const license of ['OFL-Source-Han-Sans.txt', 'README.md']) {
  assert.ok((await fs.stat(path.join(root, 'assets/fonts', license))).size > 100, `${license} must ship with fonts`);
}
for (const file of scopePages) {
  const html = await fs.readFile(path.join(root, file), 'utf8');
  assert.match(html, /data-museum-typography="scope-note-only"/, `${file} must include only the readable footer treatment`);
}
for (const file of untouchedPages) {
  const html = await fs.readFile(path.join(root, file), 'utf8');
  assert.doesNotMatch(html, /data-museum-typography=/, `${file} must preserve its original typography`);
}

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({headless: true, executablePath: chrome});
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  await page.goto(new URL(`file://${path.resolve(root, 'people.html')}`).href, {waitUntil: 'load'});
  await page.evaluate(async () => document.fonts.ready);
  const result = await page.evaluate((fontFamilies) => {
    const style = selector => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const css = getComputedStyle(node);
      return {fontFamily: css.fontFamily, fontSize: parseFloat(css.fontSize), lineHeight: css.lineHeight, color: css.color};
    };
    const loaded = Object.fromEntries(fontFamilies.map((family) => [family, document.fonts.check(`15px "${family}"`)]));
    return {
      loaded,
      scope: style('.people-scope-footer .scope'),
      method: style('.method p'),
    };
  }, fonts.map(([, family]) => family));
  assert.ok(Object.values(result.loaded).every(Boolean), `the footer font must load: ${JSON.stringify(result.loaded)}`);
  assert.match(result.scope.fontFamily, /Ming Museum Sans/, 'museum scope note must use the Source Han Sans derivative');
  assert.ok(result.scope.fontSize >= 15, `scope note must be at least 15px: ${result.scope.fontSize}`);
  assert.doesNotMatch(result.method.fontFamily, /Ming Museum/, 'main content must preserve the original page typography');
  console.log(`TYPOGRAPHY_SUMMARY ${JSON.stringify(result)}`);
} finally {
  await browser.close();
}

console.log('Original museum typography preserved; only the people/events footer notes use the readability treatment.');
