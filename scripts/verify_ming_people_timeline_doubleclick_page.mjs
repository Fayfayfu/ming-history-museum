import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const files = [
  'people.html',
  'people-timeline-current.html',
  'people-timeline-a.html',
  'people-timeline-b.html',
  'people-timeline-c.html',
];
const failures = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
};
const url = (file) => `file://${path.join(root, file)}`;

async function visiblePerson(page) {
  const name = await page.evaluate(() => {
    const surface = document.querySelector('#peopleTimelineView');
    const bounds = surface?.getBoundingClientRect();
    return [...document.querySelectorAll('[data-timeline-person]')].find((person) => {
      const avatar = person.querySelector('.timeline-portrait')?.getBoundingClientRect();
      return bounds && avatar && avatar.left >= bounds.left && avatar.right <= bounds.right
        && avatar.top >= bounds.top && avatar.bottom <= bounds.bottom;
    })?.dataset.timelinePerson || '';
  });
  if (!name) throw new Error('No fully visible timeline avatar');
  return name;
}

async function closeDrawer(page) {
  if (!await page.locator('#drawer.open').count()) return;
  await page.locator('#close').click();
  await page.waitForFunction(() => !document.querySelector('#drawer')?.classList.contains('open'));
}

async function verifyDesktopPage(page, file) {
  await page.goto(url(file), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#peopleTimelineView');
  const name = await visiblePerson(page);
  const avatar = page.locator(`[data-timeline-person="${name}"] .timeline-person-select`);
  await avatar.click();
  const afterClick = await page.evaluate(() => ({
    drawerOpen: document.querySelector('#drawer')?.classList.contains('open') || false,
    selected: document.querySelector('.timeline-person.is-selected')?.dataset.timelinePerson || '',
  }));
  check(!afterClick.drawerOpen && afterClick.selected === name, `${file} single-click must select without opening the drawer`, afterClick);

  const beforeDoubleClick = await page.evaluate(() => document.querySelector('#peopleTimelineView')?.scrollLeft || 0);
  await avatar.dblclick();
  await page.waitForTimeout(100);
  const afterDoubleClick = await page.evaluate(() => ({
    drawerOpen: document.querySelector('#drawer')?.classList.contains('open') || false,
    drawerName: document.querySelector('#detail h2')?.textContent.trim() || '',
    person: new URL(location.href).searchParams.get('person'),
    scrollLeft: document.querySelector('#peopleTimelineView')?.scrollLeft || 0,
  }));
  check(
    afterDoubleClick.drawerOpen
      && afterDoubleClick.drawerName === name
      && afterDoubleClick.person === name
      && Math.abs(afterDoubleClick.scrollLeft - beforeDoubleClick) <= 1,
    `${file} double-click must open the selected profile without horizontal jump`,
    { name, beforeDoubleClick, afterDoubleClick },
  );
  await closeDrawer(page);
  return { file, name, afterClick, beforeDoubleClick, afterDoubleClick };
}

async function verifyKeyboard(page) {
  await page.goto(url('people.html'), { waitUntil: 'domcontentloaded' });
  const name = await visiblePerson(page);
  const avatar = page.locator(`[data-timeline-person="${name}"] .timeline-person-select`);
  await avatar.focus();
  await page.keyboard.press('Enter');
  const selected = await page.evaluate(() => ({
    drawerOpen: document.querySelector('#drawer')?.classList.contains('open') || false,
    selected: document.querySelector('.timeline-person.is-selected')?.dataset.timelinePerson || '',
  }));
  check(!selected.drawerOpen && selected.selected === name, 'keyboard Enter must preserve select-only avatar behavior', selected);
  await page.keyboard.press('Escape');
  const cleared = await page.evaluate(() => document.querySelectorAll('.timeline-person.is-selected').length);
  check(cleared === 0, 'Escape must continue clearing timeline selection', { cleared });
  return { name, selected, cleared };
}

async function verifyMobile(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url('people.html'), { waitUntil: 'domcontentloaded' });
    const name = '朱元璋';
    await page.locator(`[data-timeline-person="${name}"] .timeline-person-select`).dblclick();
    await page.waitForURL(/\/people\/zhu-yuan-zhang\.html$/, { timeout: 3000 });
    const pathname = new URL(page.url()).pathname;
    check(pathname.includes('/people/'), 'mobile double-click must retain the existing person-page route', { name, pathname });
    return { name, pathname };
  } finally {
    await page.close();
  }
}

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pages = [];
  for (const file of files) pages.push(await verifyDesktopPage(page, file));
  const keyboard = await verifyKeyboard(page);
  const mobile = await verifyMobile(browser);
  if (failures.length) throw new Error(`Timeline double-click verification failed:\n- ${failures.join('\n- ')}`);
  console.log(JSON.stringify({ status: 'ok', pages, keyboard, mobile }));
} finally {
  await browser?.close();
}
