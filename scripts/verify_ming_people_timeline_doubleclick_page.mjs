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

async function openRitualIfPresent(page) {
  const skip = page.locator('[data-scroll-skip]');
  if (!await skip.count() || !await skip.isVisible()) return;
  await skip.click();
  await page.waitForFunction(() => document.body.dataset.ritualState === 'open');
}

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

async function moveTimelineToMiddle(page) {
  const position = await page.evaluate(() => {
    const surface = document.querySelector('#peopleTimelineView');
    if (!surface) return null;
    const maxScrollLeft = surface.scrollWidth - surface.clientWidth;
    const requestedScrollLeft = Math.max(1, Math.floor(maxScrollLeft / 2));
    surface.scrollLeft = requestedScrollLeft;
    return { maxScrollLeft, requestedScrollLeft, scrollLeft: surface.scrollLeft };
  });
  if (!position?.maxScrollLeft || position.scrollLeft < 1) {
    throw new Error(`Timeline could not move to a nonzero scrollLeft: ${JSON.stringify(position)}`);
  }
  return position;
}

async function closeDrawer(page) {
  if (!await page.locator('#drawer.open').count()) return;
  await page.locator('#close').click();
  await page.waitForFunction(() => !document.querySelector('#drawer')?.classList.contains('open'));
}

async function verifyDesktopPage(page, file) {
  await page.goto(url(file), { waitUntil: 'domcontentloaded' });
  await openRitualIfPresent(page);
  await page.waitForSelector('#peopleTimelineView');
  const initialScroll = await moveTimelineToMiddle(page);
  const name = await visiblePerson(page);
  const avatar = page.locator(`[data-timeline-person="${name}"] .timeline-person-select`);
  await avatar.click();
  const afterClick = await page.evaluate(() => ({
    drawerOpen: document.querySelector('#drawer')?.classList.contains('open') || false,
    selected: document.querySelector('.timeline-person.is-selected')?.dataset.timelinePerson || '',
  }));
  check(!afterClick.drawerOpen && afterClick.selected === name, `${file} single-click must select without opening the drawer`, afterClick);

  const beforeDoubleClick = await page.evaluate(() => document.querySelector('#peopleTimelineView')?.scrollLeft || 0);
  check(beforeDoubleClick >= 1, `${file} must exercise avatar double-click at a nonzero scrollLeft`, { beforeDoubleClick });
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
  return { file, name, initialScroll, afterClick, beforeDoubleClick, afterDoubleClick };
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

async function verifyMobilePage(browser, file) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    await page.goto(url(file), { waitUntil: 'domcontentloaded' });
    await openRitualIfPresent(page);
    const bareUrl = new URL(page.url());
    check(!bareUrl.search && !bareUrl.hash && bareUrl.pathname.endsWith(`/${file}`), `${file} mobile test must begin at its bare URL`, { href: page.url() });
    const name = '朱元璋';
    await page.locator(`[data-timeline-person="${name}"] .timeline-person-select`).dblclick();
    await page.waitForURL(/\/people\/zhu-yuan-zhang\.html$/, { timeout: 3000 });
    const result = await page.evaluate(() => ({
      pathname: new URL(location.href).pathname,
      drawerOpen: document.querySelector('#drawer')?.classList.contains('open') || false,
    }));
    check(
      result.pathname.endsWith('/people/zhu-yuan-zhang.html') && !result.drawerOpen && pageErrors.length === 0,
      `${file} mobile double-click must route to the existing profile without a drawer or page errors`,
      { name, result, pageErrors },
    );
    return { file, name, ...result, pageErrors };
  } finally {
    await context.close();
  }
}

async function verifyMobile(browser) {
  const results = [];
  for (const file of files) results.push(await verifyMobilePage(browser, file));
  return results;
}

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pages = [];
  for (const file of files) pages.push(await verifyDesktopPage(page, file));
  const keyboard = await verifyKeyboard(page);
  const mobile = await verifyMobile(browser);
  check(Array.isArray(mobile) && mobile.length === files.length, 'mobile double-click verification must cover all five timeline pages', mobile);
  if (failures.length) throw new Error(`Timeline double-click verification failed:\n- ${failures.join('\n- ')}`);
  console.log(JSON.stringify({ status: 'ok', pages, keyboard, mobile }));
} finally {
  await browser?.close();
}
