import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mime = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const file = path.resolve(root, pathname.replace(/^\/+/, '') || 'people.html');
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error('invalid path');
    const body = await fs.readFile(file);
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const failures = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
};

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/people.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#rows tr[data-id]');

  const toolbarLayout = await page.evaluate(() => {
    const primary = document.querySelector('.toolbar-primary')?.getBoundingClientRect();
    const secondary = document.querySelector('.toolbar-secondary')?.getBoundingClientRect();
    const search = document.querySelector('#search')?.getBoundingClientRect();
    const period = document.querySelector('#period')?.getBoundingClientRect();
    return {
      primary: primary ? { top: primary.top, bottom: primary.bottom, height: primary.height } : null,
      secondary: secondary ? { top: secondary.top, bottom: secondary.bottom, height: secondary.height } : null,
      search: search ? { top: search.top, height: search.height } : null,
      period: period ? { top: period.top, height: period.height } : null,
    };
  });
  check(
    toolbarLayout.primary && toolbarLayout.secondary
      && toolbarLayout.secondary.top > toolbarLayout.primary.bottom,
    'people filters use two explicit rows instead of one stretched grid row',
    toolbarLayout,
  );
  check(
    toolbarLayout.search && toolbarLayout.period
      && Math.abs(toolbarLayout.search.top - toolbarLayout.period.top) < 2
      && toolbarLayout.search.height === toolbarLayout.period.height
      && toolbarLayout.search.height < 80,
    'search and period controls must use the same compact height in the primary row',
    toolbarLayout,
  );

  const experienceFilter = await page.evaluate(() => ({
    ariaLabel: document.querySelector('#period')?.getAttribute('aria-label') || '',
    label: document.querySelector('#period .period-filter-label b')?.textContent.trim() || '',
    hint: document.querySelector('#period .period-filter-label small')?.textContent.trim() || '',
    options: [...document.querySelectorAll('#periodOptions .period-option')].map((option) => ({
      text: option.textContent.trim(),
      title: option.getAttribute('title') || '',
      fontSize: Number.parseFloat(getComputedStyle(option).fontSize),
      height: option.getBoundingClientRect().height,
      inputSize: option.querySelector('input')?.getBoundingClientRect().width || 0,
      border: getComputedStyle(option).borderTopWidth,
    })),
  }));
  check(
    experienceFilter.ariaLabel === '按政权经历筛选人物总表，可多选'
      && experienceFilter.label === '政权经历'
      && experienceFilter.hint === '',
    'people roster filter must use a concise label without the redundant scope hint',
    experienceFilter,
  );
  check(
    experienceFilter.options.every((option) => (
      option.fontSize >= 13 && option.height >= 40 && option.inputSize >= 16 && option.border === '0px'
    )),
    'political-experience choices must use readable text-only controls without nested option boxes',
    experienceFilter.options,
  );
  check(
    JSON.stringify(experienceFilter.options.map((option) => option.text))
      === JSON.stringify(['北京明廷', '南明政权', '清初／遗民／大顺'])
      && experienceFilter.options.every((option) => option.title.length > 8),
    'political-experience options must use concrete, explained labels rather than the overlapping 明清交替 period label',
    experienceFilter,
  );

  const direction = page.locator('#direction');
  check(await direction.count() === 1, 'people sorting exposes an ascending/descending control');
  if (await direction.count()) {
    await page.locator('.chip[data-cat="皇帝"]').click();
    await page.locator('#sort').selectOption('time');
    await direction.selectOption('asc');
    const ascendingFirst = (await page.locator('#rows tr[data-id] .name').first().textContent()).trim();
    await direction.selectOption('desc');
    const descendingFirst = (await page.locator('#rows tr[data-id] .name').first().textContent()).trim();
    check(ascendingFirst === '朱元璋', 'ascending time order begins with the earliest emperor', { ascendingFirst });
    check(descendingFirst === '朱由检', 'descending time order begins with the latest Beijing Ming emperor', { descendingFirst });
    await page.locator('#reset').click();
  }

  const southernBanner = await page.evaluate(() => {
    const group = document.querySelector('.ruler-group-southern');
    const buttons = [...document.querySelectorAll('#southernMingRulers .emperor')];
    const branchSurface = group ? getComputedStyle(group, '::before') : null;
    const timeline = document.querySelector('.timeline')?.getBoundingClientRect();
    const branch = group?.getBoundingClientRect();
    return {
      background: group ? getComputedStyle(group).backgroundColor : '',
      branchSurface: branchSurface ? {
        background: branchSurface.backgroundColor,
        top: Number.parseFloat(branchSurface.top),
        bottom: Number.parseFloat(branchSurface.bottom),
      } : null,
      fullHeight: Boolean(timeline && branch
        && branch.top > timeline.top
        && branch.bottom < timeline.bottom),
      buttons: buttons.map((button) => ({
        era: button.querySelector('b')?.textContent.trim() || '',
        detail: button.querySelector('span')?.textContent.trim() || '',
        width: button.getBoundingClientRect().width,
      })),
    };
  });
  check(
    southernBanner.background === 'rgba(0, 0, 0, 0)'
      && southernBanner.branchSurface?.background === 'rgb(24, 33, 27)'
      && southernBanner.branchSurface.top < 0
      && southernBanner.branchSurface.bottom < 0
      && southernBanner.fullHeight,
    'Southern Ming dark-green surface must extend through the full banner height instead of filling only the inner branch box',
    southernBanner,
  );
  check(
    JSON.stringify(southernBanner.buttons.map((button) => button.detail))
      === JSON.stringify(['朱由崧 · 1644', '朱聿键 · 1645', '朱由榔 · 1646'])
      && southernBanner.buttons[0].width <= southernBanner.buttons[2].width
      && southernBanner.buttons[1].width <= southernBanner.buttons[2].width,
    'Hongguang and Longwu must show accession years only while the final Yongli ruler keeps the 1662 endpoint',
    southernBanner.buttons,
  );

  await page.locator('#southernMingRulers [data-southern-ruler="朱聿键"]').click();
  await page.waitForTimeout(100);
  const southernRulerView = {
    drawerOpen: await page.locator('#drawer.open').count(),
    rowCount: await page.locator('#rows tr[data-id]').count(),
    rulerRowCount: await page.locator('#rows tr[data-id="person-u6731-u807f-u952e"]').count(),
    title: (await page.locator('#viewTitle').textContent()).trim(),
  };
  check(southernRulerView.drawerOpen === 0, 'Southern Ming ruler banner does not open a single-person drawer', southernRulerView);
  check(
    southernRulerView.rowCount > 1 && southernRulerView.rulerRowCount === 1,
    'Southern Ming ruler banner shows the ruler together with people active during the rule',
    southernRulerView,
  );
  check(
    southernRulerView.title.includes('隆武') && southernRulerView.title.includes('掌权时期人物'),
    'Southern Ming ruler view explains that it is a period-based people view',
    southernRulerView,
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  console.error(`VERIFY_PEOPLE_FILTER_TOOLBAR_PAGE_FAILED\n${failures.join('\n')}`);
  process.exit(1);
}

console.log('VERIFY_PEOPLE_FILTER_TOOLBAR_PAGE_OK');
