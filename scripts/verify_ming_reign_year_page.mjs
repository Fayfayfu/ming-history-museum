import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const outputRoot = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.jpg', 'image/jpeg'], ['.png', 'image/png'], ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'],
]);
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const file = path.resolve(outputRoot, pathname.replace(/^\/+/, '') || 'people.html');
    if (file !== outputRoot && !file.startsWith(`${outputRoot}${path.sep}`)) throw new Error('invalid path');
    const body = await fs.readFile(file);
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
    }).end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const pageUrl = (file, query = '') => `${baseUrl}/${file}${query}`;
const failures = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}: ${JSON.stringify(details)}`);
};

const browser = await chromium.launch({ headless: true, executablePath: chrome });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(pageUrl('events.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-event="e076"]');

  const eventCards = await page.evaluate(() => Object.fromEntries(
    ['e001', 'e018', 'e076'].map((id) => {
      const card = document.querySelector(`[data-event="${id}"]`);
      return [id, {
        primary: card?.querySelector('.eventdate strong')?.textContent.trim() || '',
        secondary: card?.querySelector('.eventdate span')?.textContent.trim() || '',
      }];
    }),
  ));
  check(eventCards.e001.primary === '洪武元年' && eventCards.e001.secondary === '1368年正月', 'event cards must pair the reign year with the Gregorian date', eventCards.e001);
  check(eventCards.e018.primary === '建文四年' && eventCards.e018.secondary === '1402年六月', 'event cards must follow the actual era rather than the later emperor label', eventCards.e018);
  check(eventCards.e076.primary === '万历四十八年' && eventCards.e076.secondary === '1620年', 'ambiguous accession years must use the curated card label', eventCards.e076);

  const eventTypography = await page.evaluate(() => {
    const card = document.querySelector('[data-event="e076"]');
    const size = (selector) => Number.parseFloat(getComputedStyle(card.querySelector(selector)).fontSize);
    const lineHeight = (selector) => Number.parseFloat(getComputedStyle(card.querySelector(selector)).lineHeight);
    return {
      dateSecondary: size('.eventdate span'),
      meta: size('.eventmeta'),
      brief: size('.eventbrief p'),
      briefLineHeight: lineHeight('.eventbrief p'),
      briefLabel: size('.eventbrief b'),
      personLink: size('.personjump'),
      institutionTag: size('.institutiontag'),
      stageLabel: Number.parseFloat(getComputedStyle(document.querySelector('.stagechip b')).fontSize),
      stageMeta: Number.parseFloat(getComputedStyle(document.querySelector('.stagechip span')).fontSize),
      status: Number.parseFloat(getComputedStyle(document.querySelector('.event-status')).fontSize),
    };
  });
  check(
    eventTypography.dateSecondary >= 12
      && eventTypography.meta >= 13
      && eventTypography.brief >= 15
      && eventTypography.briefLineHeight >= 24
      && eventTypography.briefLabel >= 12
      && eventTypography.personLink >= 13
      && eventTypography.institutionTag >= 12
      && eventTypography.stageLabel >= 14
      && eventTypography.stageMeta >= 12
      && eventTypography.status >= 13,
    'event hall reading text must meet the approved readable type scale',
    eventTypography,
  );

  await page.click('[data-event="e076"]');
  await page.waitForSelector('#drawer.open .event-detail-copy');
  const eventDrawerDate = await page.locator('.event-detail-date').textContent();
  check(eventDrawerDate.includes('万历四十八年／泰昌元年') && eventDrawerDate.includes('1620年'), 'event drawer must retain both the era date and Gregorian date', eventDrawerDate);

  await page.goto(pageUrl('people.html', '?person=%E6%9C%B1%E6%A0%87'), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#drawer.open #detail .facts');
  const zhuBiao = await page.evaluate(() => ({
    slice: document.querySelector('.history-slice-coord')?.textContent.replace(/\s+/g, ' ').trim() || '',
    chapters: [...document.querySelectorAll('.life-year span')].map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
    related: [...document.querySelectorAll('.related-events time')].map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
  }));
  check(zhuBiao.slice.includes('洪武二十五年') && zhuBiao.slice.includes('1392年'), 'historical slices must show era and Gregorian dates together', zhuBiao.slice);
  check(zhuBiao.chapters.some((text) => text.includes('至正十五年') && text.includes('1355')), 'pre-Ming life chapters must retain the relevant preceding reign title', zhuBiao.chapters);
  check(zhuBiao.chapters.some((text) => text.includes('洪武元年') && text.includes('1368')), 'Ming life chapters must show era and Gregorian dates together', zhuBiao.chapters);
  check(zhuBiao.related.some((text) => text.includes('洪武二十五年') && text.includes('1392')), 'related events in a person drawer must show era and Gregorian dates together', zhuBiao.related);

  await page.goto(pageUrl('people.html', '?person=%E4%BA%8E%E8%B0%A6'), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#drawer.open #detail .facts');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#drawer')?.classList.contains('open'));
  await page.click('#peopleTableTab');
  const yuQianTenures = await page.evaluate(() => {
    const row = [...document.querySelectorAll('#rows tr')].find((candidate) => candidate.querySelector('.name')?.textContent.trim() === '于谦');
    return [...(row?.querySelectorAll('.reignline') || [])].map((node) => node.textContent.replace(/\s+/g, ' ').trim());
  });
  check(
    JSON.stringify(yuQianTenures) === JSON.stringify([
      '永乐帝 · 1421—1424',
      '洪熙帝 · 1424—1425',
      '宣德帝 · 1425—1435',
      '正统朝 · 英宗 · 1435—1449',
      '景泰帝 · 1449—1457',
      '天顺朝 · 英宗 · 1457—1457',
    ]),
    'key tenures must be rendered in chronological order across interrupted reigns',
    yuQianTenures,
  );

  await page.goto(pageUrl('people.html'), { waitUntil: 'domcontentloaded' });
  await page.click('#peopleTableTab');
  const verifyAliasPortrait = async (query, expectedName) => {
    await page.fill('#search', query);
    const rows = page.locator('#rows tr[data-id]');
    await rows.first().waitFor();
    const result = await rows.evaluateAll((items) => items.map((row) => row.querySelector('.name')?.textContent.trim()));
    check(JSON.stringify(result) === JSON.stringify([expectedName]), `${query} must resolve to ${expectedName} only`, result);
    await rows.first().click();
    await page.waitForSelector('#drawer.open #detail .facts');
    const portrait = page.locator('#detail .portrait img');
    await portrait.waitFor();
    await page.waitForFunction(() => document.querySelector('#detail .portrait img')?.naturalWidth > 0);
    const drawer = await page.evaluate(() => ({
      name: document.querySelector('#detail h2')?.textContent.trim(),
      label: document.querySelector('#detail .portrait-label')?.textContent.trim(),
      loaded: document.querySelector('#detail .portrait img')?.naturalWidth > 0,
    }));
    check(drawer.name === expectedName && drawer.label === 'AI想象像' && drawer.loaded, `${expectedName} drawer must load its explicit AI portrait`, drawer);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#drawer')?.classList.contains('open'));
  };
  await verifyAliasPortrait('傅青主', '傅山');
  await verifyAliasPortrait('扩廓帖木儿', '王保保');

  if (failures.length) throw new Error(`Reign-year page verification failed:\n- ${failures.join('\n- ')}`);
  console.log('Reign-year labels verified in event cards, event drawer, and person-story surfaces.');
} finally {
  try {
    await browser.close();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
