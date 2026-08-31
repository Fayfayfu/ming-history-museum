import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const names = ['邓愈', '沐英', '傅友德', '蓝玉'];
const file = 'data/ming_person_pages_batch31_founding_commanders_remainder.json';
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

test('开国将领第二组均使用升级人物卡', async () => {
  const pages = JSON.parse(await fs.readFile(file, 'utf8')).people;
  const portraits = JSON.parse(await fs.readFile('data/ming_portraits.json', 'utf8')).people;
  const institutions = JSON.parse(await fs.readFile('data/ming_person_institutions.json', 'utf8')).institutions;
  const linked = new Set(institutions.flatMap((institution) => institution.people.map((person) => person.name)));
  assert.deepEqual(Object.keys(pages).sort(), names.slice().sort());
  for (const name of names) {
    const page = pages[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.ok(page.scenes.length >= 4 && page.scenes.length <= 6);
    assert.ok(page.sources.length >= 2);
    assert.ok(portraits[name]?.file, `${name} requires portrait metadata`);
    assert.ok(linked.has(name), `${name} requires institution relationship metadata`);
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2, `${name}: scene requires two body paragraphs`);
      assert.ok(scene.evidenceNote && scene.confidence && scene.interpretationBoundary);
      assert.ok(scene.primarySource?.title && scene.primarySource?.location && scene.primarySource?.original?.length && scene.primarySource?.reading && scene.primarySource?.boundary && scene.primarySource?.url && scene.primarySource?.confidence);
      for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) assert.doesNotMatch(text, hedge);
    }
  }
});
