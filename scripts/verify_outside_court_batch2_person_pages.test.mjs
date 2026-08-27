import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('.');
const museumRoot = path.join(root, 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const names = ['李贽', '何心隐', '傅山'];
const expectedSceneCounts = new Map([
  ['李贽', 6],
  ['何心隐', 5],
  ['傅山', 6],
]);

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

test('思想与行动组以可变章节替代固定六幕，并为每幕保留证据与边界', async () => {
  const pages = (await readJson('data/ming_person_pages_batch13.json')).people;
  assert.deepEqual(Object.keys(pages), names);

  for (const name of names) {
    const page = pages[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.equal(page.scenes.length, expectedSceneCounts.get(name));
    assert.equal(page.portrait.label, 'AI想象像');
    assert.match(page.portrait.note, /艺术想象/);
    assert.ok(page.sources.length >= 3);
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2, `${name} 的章节应保持两段正文`);
      assert.ok(scene.year && scene.reignYears && scene.evidenceNote && scene.interpretationBoundary);
      assert.match(scene.primarySource?.url || '', /^https:\/\//);
      assert.ok(scene.primarySource?.boundary);
    }
  }

  assert.match(JSON.stringify(pages.李贽), /现代自由主义|反孔孟/);
  assert.match(JSON.stringify(pages.何心隐), /不能.*张居正|不作确定归属|责任/);
  assert.match(JSON.stringify(pages.傅山), /托名争议|署名不是自动/);
});

test('傅山补齐独立历史切片，且独立页构建器载入第九、第十批切片', async () => {
  const slice = (await readJson('data/ming_historical_slices_batch10.json')).people.傅山;
  assert.ok(slice);
  assert.match(slice.year, /1636/);
  assert.match(slice.title, /鸣冤/);
  assert.match(slice.boundary, /不把后来的遗民声望倒灌/);

  const personBuilder = await fs.readFile(path.join(root, 'scripts/build_ming_person_pages.mjs'), 'utf8');
  assert.match(personBuilder, /ming_historical_slices_batch9\.json/);
  assert.match(personBuilder, /ming_historical_slices_batch10\.json/);
  assert.match(personBuilder, /ming_person_pages_batch13\.json/);
});

test('构建后，三张独立人物卡和按需详情均可访问', async () => {
  const pages = (await readJson('data/ming_person_pages_batch13.json')).people;
  for (const name of names) {
    const page = pages[name];
    const html = await fs.readFile(path.join(museumRoot, 'people', `${page.slug}.html`), 'utf8');
    const detail = await readJson(`outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/assets/data/people-details/${page.slug}.json`);
    assert.match(html, new RegExp(`<h1>${name}`));
    assert.equal(detail.drawer.person.name, name);
    assert.equal(detail.drawer.personPage.scenes.length, expectedSceneCounts.get(name));
  }
});
