import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const names = ['徐达', '常遇春', '汤和', '李文忠'];
const file = 'data/ming_person_pages_batch28_founding_commanders.json';
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

test('开国四将升级人物卡具备完整叙事、画像与机构链接', async () => {
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
    assert.ok(portraits[name]?.file, `${name} 应有已登记画像`);
    assert.ok(linked.has(name), `${name} 应有机构关联`);

    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2, `${name} 每幕应有两段正文`);
      assert.ok(scene.evidenceNote);
      assert.ok(scene.confidence);
      assert.ok(scene.interpretationBoundary);
      assert.ok(scene.primarySource?.title);
      assert.ok(scene.primarySource?.location);
      assert.ok(Array.isArray(scene.primarySource?.original) && scene.primarySource.original.length > 0);
      assert.ok(scene.primarySource?.reading);
      assert.ok(scene.primarySource?.boundary);
      assert.ok(scene.primarySource?.url);
      assert.ok(scene.primarySource?.confidence);
      for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) {
        assert.doesNotMatch(text, hedge, `${name}: ${text}`);
      }
    }
  }
});
