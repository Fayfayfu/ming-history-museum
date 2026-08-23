import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);
const failures = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}: ${JSON.stringify(details)}`);
};

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const file = path.resolve(root, pathname.replace(/^\/+/, '') || 'people/qiu-ying.html');
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error('invalid path');
    const body = await fs.readFile(file);
    response.writeHead(200, {'content-type': mime.get(path.extname(file)) || 'application/octet-stream'});
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const baseUrl = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({headless: true, executablePath: chrome});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  await page.goto(`${baseUrl}/people/qiu-ying.html`, {waitUntil: 'networkidle'});
  await page.locator('.art-card-panorama').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.art-card-panorama img')].every((image) => image.complete && image.naturalWidth > 0));
  const desktop = await page.evaluate(() => {
    const grid = document.querySelector('.art-grid');
    const panorama = document.querySelector('.art-card-panorama');
    const overview = document.querySelector('.art-panorama-overview img');
    const landscape = document.querySelector('.art-card-landscape');
    const rect = (node) => node?.getBoundingClientRect();
    return {
      gridWidth: rect(grid)?.width || 0,
      panoramaWidth: rect(panorama)?.width || 0,
      landscapeWidth: rect(landscape)?.width || 0,
      landscapeDisplay: landscape ? getComputedStyle(landscape).display : '',
      landscapeColumns: landscape ? getComputedStyle(landscape).gridTemplateColumns : '',
      overviewFit: overview ? getComputedStyle(overview).objectFit : '',
      overviewRatio: overview ? rect(overview).width / rect(overview).height : 0,
      naturalRatio: overview ? overview.naturalWidth / overview.naturalHeight : 0,
      panoramaImages: panorama?.querySelectorAll('img[data-artwork-viewer]').length || 0,
      detailStrips: panorama?.querySelectorAll('.art-panorama-detail').length || 0,
      openButtons: panorama?.querySelectorAll('[data-artwork-open]').length || 0,
      bodyWidth: document.body.scrollWidth,
      viewport: innerWidth,
    };
  });
  check(Math.abs(desktop.panoramaWidth - desktop.gridWidth) < 3, '长卷卡片没有占满作品网格', desktop);
  check(Math.abs(desktop.landscapeWidth - desktop.panoramaWidth) < 3 && desktop.landscapeDisplay === 'grid' && desktop.landscapeColumns.split(' ').length === 2, '长卷后的单件横幅没有改为平衡的通栏图文布局', desktop);
  check(desktop.overviewFit === 'contain' && Math.abs(desktop.overviewRatio - desktop.naturalRatio) < 0.05, '长卷总览没有完整等比展示', desktop);
  check(desktop.panoramaImages === 1 && desktop.detailStrips === 0 && desktop.openButtons === 1, '长卷没有收敛为单张总览加一个全屏入口', desktop);
  check(desktop.bodyWidth === desktop.viewport, '桌面页面出现整页水平溢出', desktop);
  await page.locator('.art-grid').screenshot({path: '/tmp/qiu-ying-art-gallery-desktop.png'});

  await page.setViewportSize({width: 390, height: 844});
  await page.reload({waitUntil: 'networkidle'});
  await page.locator('.art-card-panorama').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.art-card-panorama img')].every((image) => image.complete && image.naturalWidth > 0));
  const mobile = await page.evaluate(() => {
    const panorama = document.querySelector('.art-card-panorama');
    const cards = [...document.querySelectorAll('.art-card')].map((card) => card.getBoundingClientRect().width);
    return {
      panoramaImages: panorama?.querySelectorAll('img[data-artwork-viewer]').length || 0,
      detailStrips: panorama?.querySelectorAll('.art-panorama-detail').length || 0,
      cardWidths: cards,
      bodyWidth: document.body.scrollWidth,
      viewport: innerWidth,
    };
  });
  check(mobile.panoramaImages === 1 && mobile.detailStrips === 0, '移动端仍重复显示长卷细节带', mobile);
  check(new Set(mobile.cardWidths.map(Math.round)).size === 1, '移动端作品卡没有统一切为单列', mobile);
  check(mobile.bodyWidth === mobile.viewport, '移动端出现整页水平溢出', mobile);
  await page.locator('.art-grid').screenshot({path: '/tmp/qiu-ying-art-gallery-mobile.png'});

  await page.setViewportSize({width: 1440, height: 1000});
  await page.goto(`${baseUrl}/people/wen-zhengming.html`, {waitUntil: 'networkidle'});
  const wen = await page.evaluate(() => ({
    works: document.querySelectorAll('.art-card').length,
    portraits: document.querySelectorAll('.art-card-portrait').length,
    landscapes: document.querySelectorAll('.art-card-landscape').length,
    panoramas: document.querySelectorAll('.art-card-panorama').length,
    allContained: [...document.querySelectorAll('.art-frame img')].every((image) => getComputedStyle(image).objectFit === 'contain'),
  }));
  check(wen.works === 2 && wen.portraits === 1 && wen.landscapes === 1 && wen.panoramas === 0 && wen.allContained, '文徵明作品的自适应分类或完整展示不正确', wen);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) throw new Error(`Art gallery layout verification failed:\n- ${failures.join('\n- ')}`);
console.log(JSON.stringify({pass: true, checks: 7, screenshots: ['/tmp/qiu-ying-art-gallery-desktop.png', '/tmp/qiu-ying-art-gallery-mobile.png']}));
