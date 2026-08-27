import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('.');
const museumRoot = path.join(root, 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const expected = new Map([['徐霞客', 5], ['张景岳', 5], ['宋应星', 5]]);

const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));

test('行旅、医学与技术知识组各自组织知识，不套用虚假的作品展陈', async () => {
  const pages = (await readJson('data/ming_person_pages_batch15.json')).people;
  assert.deepEqual(Object.keys(pages), [...expected.keys()]);
  for (const [name, count] of expected) {
    const page = pages[name];
    assert.equal(page.scenes.length, count);
    assert.ok(page.sources.length >= 3);
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2);
      assert.ok(scene.evidenceNote && scene.interpretationBoundary);
      assert.match(scene.primarySource?.url || '', /^https:\/\//);
    }
  }
  assert.equal(pages.徐霞客.feature.type, 'voyage');
  assert.match(JSON.stringify(pages.徐霞客), /抄写|编次|版本/);
  assert.equal(pages.张景岳.feature.type, 'materia');
  assert.match(JSON.stringify(pages.张景岳), /不提供.*诊疗|现代医学/);
  assert.equal(pages.宋应星.feature.type, 'translation');
  assert.match(JSON.stringify(pages.宋应星), /工匠|版本|亲见/);
  assert.ok(pages.徐霞客.work);
  assert.equal(pages.张景岳.work, undefined);
  assert.equal(pages.宋应星.work, undefined);
});

test('第十五批被两条构建管线载入，并生成独立页与按需详情', async () => {
  const pageBuilder = await fs.readFile(path.join(root, 'scripts/build_ming_person_pages.mjs'), 'utf8');
  const hallBuilder = await fs.readFile(path.join(root, 'scripts/build_ming_html.mjs'), 'utf8');
  assert.match(pageBuilder, /ming_person_pages_batch15\.json/);
  assert.match(hallBuilder, /ming_person_pages_batch15\.json/);
  const pages = (await readJson('data/ming_person_pages_batch15.json')).people;
  for (const [name, count] of expected) {
    const page = pages[name];
    const html = await fs.readFile(path.join(museumRoot, 'people', `${page.slug}.html`), 'utf8');
    const detail = await readJson(`outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/assets/data/people-details/${page.slug}.json`);
    assert.match(html, new RegExp(`<h1>${name}`));
    assert.equal(detail.drawer.personPage.scenes.length, count);
  }
});
