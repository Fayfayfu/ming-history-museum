import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('.');
const museumRoot = path.join(root, 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const expected = new Map([['陈继儒', 5], ['吴承恩', 5], ['汤显祖', 5]]);

const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));

test('文艺与文化传播组使用各自的证据边界，不把作品名气写成作者证明', async () => {
  const pages = (await readJson('data/ming_person_pages_batch14.json')).people;
  assert.deepEqual(Object.keys(pages), [...expected.keys()]);
  for (const [name, count] of expected) {
    const page = pages[name];
    assert.equal(page.scenes.length, count);
    assert.ok(page.sources.length >= 3);
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2);
      assert.ok(scene.interpretationBoundary && scene.evidenceNote);
      assert.match(scene.primarySource?.url || '', /^https:\/\//);
    }
  }
  assert.match(JSON.stringify(pages.陈继儒), /托名|署名/);
  assert.match(JSON.stringify(pages.吴承恩), /无署名刻本|作者归属/);
  assert.match(JSON.stringify(pages.汤显祖), /不.*自传|版本/);
});

test('构建器载入第十四批，构建后的独立页和按需详情均正确', async () => {
  const builder = await fs.readFile(path.join(root, 'scripts/build_ming_person_pages.mjs'), 'utf8');
  assert.match(builder, /ming_person_pages_batch14\.json/);
  const pages = (await readJson('data/ming_person_pages_batch14.json')).people;
  for (const [name, count] of expected) {
    const page = pages[name];
    const html = await fs.readFile(path.join(museumRoot, 'people', `${page.slug}.html`), 'utf8');
    const detail = await readJson(`outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/assets/data/people-details/${page.slug}.json`);
    assert.match(html, new RegExp(`<h1>${name}`));
    assert.equal(detail.drawer.personPage.scenes.length, count);
  }
});
