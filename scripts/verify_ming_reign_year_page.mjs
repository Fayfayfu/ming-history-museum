import path from 'node:path';
import { chromium } from 'playwright';

const outputRoot = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const pageUrl = (file, query = '') => `file://${path.join(outputRoot, file)}${query}`;
const failures = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}: ${JSON.stringify(details)}`);
};

const browser = await chromium.launch({ headless: true, executablePath: chrome });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(pageUrl('events.html'), { waitUntil: 'domcontentloaded' });

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

  await page.click('[data-event="e076"]');
  const eventDrawerDate = await page.locator('.event-detail-date').textContent();
  check(eventDrawerDate.includes('万历四十八年／泰昌元年') && eventDrawerDate.includes('1620年'), 'event drawer must retain both the era date and Gregorian date', eventDrawerDate);

  await page.goto(pageUrl('people.html', '?person=%E6%9C%B1%E6%A0%87'), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#drawer.open');
  const zhuBiao = await page.evaluate(() => ({
    slice: document.querySelector('.history-slice-coord')?.textContent.replace(/\s+/g, ' ').trim() || '',
    chapters: [...document.querySelectorAll('.life-year span')].map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
    related: [...document.querySelectorAll('.related-events time')].map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
  }));
  check(zhuBiao.slice.includes('洪武二十五年') && zhuBiao.slice.includes('1392年'), 'historical slices must show era and Gregorian dates together', zhuBiao.slice);
  check(zhuBiao.chapters.some((text) => text.includes('至正十五年') && text.includes('1355')), 'pre-Ming life chapters must retain the relevant preceding reign title', zhuBiao.chapters);
  check(zhuBiao.chapters.some((text) => text.includes('洪武元年') && text.includes('1368')), 'Ming life chapters must show era and Gregorian dates together', zhuBiao.chapters);
  check(zhuBiao.related.some((text) => text.includes('洪武二十五年') && text.includes('1392')), 'related events in a person drawer must show era and Gregorian dates together', zhuBiao.related);

  if (failures.length) throw new Error(`Reign-year page verification failed:\n- ${failures.join('\n- ')}`);
  console.log('Reign-year labels verified in event cards, event drawer, and person-story surfaces.');
} finally {
  await browser.close();
}
