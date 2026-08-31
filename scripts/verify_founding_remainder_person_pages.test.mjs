import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const names = ['马皇后', '郭子兴', '陈友谅', '张士诚'];
const file = 'data/ming_person_pages_batch30_founding_remainder.json';
const outputRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, 'utf8'));
}

test('开国余部四人均为动态清晰传记人物卡', async () => {
  const batch = await readJson(file);
  assert.equal(batch.version, 1);
  assert.deepEqual(Object.keys(batch.people).sort(), names.slice().sort());

  for (const name of names) {
    const page = batch.people[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.ok(page.slug && page.theme && page.eyebrow && page.heroQuestion && page.lead && page.thesis);
    assert.ok(page.scenes.length >= 4 && page.scenes.length <= 6, `${name} needs a dynamic 4-6 scene biography`);
    assert.ok(page.sources.length >= 2, `${name} needs at least two sources`);
    assert.ok(page.localEvidenceLinks?.portrait, `${name} needs local portrait evidence`);
    assert.ok(Array.isArray(page.localEvidenceLinks?.institutions), `${name} needs explicit institution-link coverage`);

    for (const source of page.sources) {
      assert.ok(source.label && source.kind && source.url);
      assert.match(source.confidence, /高|中/, `${name} source needs explicit confidence`);
    }

    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2, `${name} scenes use exactly two body paragraphs`);
      assert.ok(scene.evidenceNote && scene.interpretationBoundary);
      assert.ok(scene.primarySource?.title && scene.primarySource?.location && scene.primarySource?.url && scene.primarySource?.boundary);
      assert.match(scene.confidence, /高|中/, `${name} scene needs explicit confidence`);
      for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) {
        assert.doesNotMatch(text, hedge, `${name} narration must stay biographical: ${text}`);
      }
    }
  }
});

test('开国余部四人的画像和可用机构链接均可核验', async () => {
  const pages = (await readJson(file)).people;
  const portraits = (await readJson('data/ming_portraits.json')).people;
  const institutions = (await readJson('data/ming_person_institutions.json')).institutions;
  const institutionById = new Map(institutions.map((institution) => [institution.id, institution]));

  for (const name of names) {
    const page = pages[name];
    const portrait = portraits[name];
    assert.equal(portrait?.file, page.localEvidenceLinks.portrait, `${name} portrait must match local registry`);
    await fs.access(`${outputRoot}/${portrait.file}`);
    for (const institutionId of page.localEvidenceLinks.institutions) {
      assert.ok(institutionById.has(institutionId), `${name} links unknown institution ${institutionId}`);
    }
  }

  assert.deepEqual(pages['马皇后'].localEvidenceLinks.institutions, ['imperial-harem']);
  for (const name of ['郭子兴', '陈友谅', '张士诚']) {
    assert.deepEqual(pages[name].localEvidenceLinks.institutions, [], `${name} must not be mislinked to a Ming-only institution`);
    assert.match(pages[name].institutionBoundary, /尚无|未建立/, `${name} must expose the local institution-index boundary`);
  }
});

test('四张人物卡覆盖开国前史中各自的关键节点', async () => {
  const pages = (await readJson(file)).people;
  assert.equal(pages['马皇后'].scenes.length, 5);
  assert.equal(pages['郭子兴'].scenes.length, 4);
  assert.equal(pages['陈友谅'].scenes.length, 5);
  assert.equal(pages['张士诚'].scenes.length, 5);
  assert.match(pages['马皇后'].lead, /明朝建立后册为皇后/);
  assert.match(pages['郭子兴'].lead, /1352年据濠州起兵/);
  assert.match(pages['陈友谅'].lead, /1363年鄱阳湖/);
  assert.match(pages['张士诚'].lead, /1367年平江失守/);
});
