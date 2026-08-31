import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const file = 'data/ming_person_pages_batch38_late_court_security.json';
const names = ['汪直', '刘瑾', '钱宁', '蒋瓛', '田尔耕'];
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, 'utf8'));
}

test('厂卫与晚明诏狱五人采用完整升级人物卡', async () => {
  const batch = await readJson(file);
  assert.equal(batch.version, 1);
  assert.deepEqual(Object.keys(batch.people).sort(), names.slice().sort());

  for (const name of names) {
    const page = batch.people[name];
    assert.equal(page.readingMode, 'clear-biography', `${name} must use clear biography mode`);
    assert.ok(page.slug && page.theme && page.eyebrow && page.heroQuestion && page.lead && page.thesis);
    assert.ok(page.scenes.length >= 4 && page.scenes.length <= 6, `${name} must have 4-6 scenes`);
    assert.ok(page.sources.length >= 2, `${name} needs two or more sources`);
    assert.ok(page.localEvidenceLinks?.portrait, `${name} must link a portrait`);
    assert.ok(page.localEvidenceLinks?.institutions?.length, `${name} must link an institution`);

    for (const source of page.sources) {
      assert.ok(source.label && source.kind && source.url);
      assert.match(source.confidence, /高|中/);
    }
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2, `${name} must have exactly two body paragraphs per scene`);
      assert.ok(scene.evidenceNote && scene.confidence && scene.interpretationBoundary);
      assert.ok(scene.primarySource?.title && scene.primarySource?.location && scene.primarySource?.reading && scene.primarySource?.boundary && scene.primarySource?.url);
      assert.ok(Array.isArray(scene.primarySource.original) && scene.primarySource.original.length);
      assert.match(scene.confidence, /高|中|低|未知/);
      assert.match(scene.primarySource.confidence, /高|中|低|未知/);
      for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) {
        assert.doesNotMatch(text, hedge, `${name} narration should keep evidence caveats out of story fields`);
      }
    }
  }
});

test('厂卫与晚明诏狱五人的本地画像、机构、历史切片与事件均可解析', async () => {
  const batch = await readJson(file);
  const portraits = (await readJson('data/ming_portraits.json')).people;
  const institutions = (await readJson('data/ming_person_institutions.json')).institutions;
  const byInstitution = new Map(institutions.map((institution) => [institution.id, institution]));
  const events = (await readJson('data/ming_events.json')).events;
  const outputRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';

  for (const name of names) {
    const page = batch.people[name];
    const portrait = portraits[name];
    assert.equal(portrait?.file, page.localEvidenceLinks.portrait, `${name} portrait must match registry`);
    await fs.access(`${outputRoot}/${portrait.file}`);
    for (const institutionId of page.localEvidenceLinks.institutions) {
      const institution = byInstitution.get(institutionId);
      assert.ok(institution, `${name} references unknown institution ${institutionId}`);
      assert.ok((institution.people || []).some((person) => person.name === name), `${name} needs a direct local institution relationship`);
    }
    for (const sliceLink of page.localEvidenceLinks.historicalSlices || []) {
      const [sliceFile, sliceName] = sliceLink.split('#');
      const slice = await readJson(sliceFile);
      assert.ok(slice.people?.[sliceName], `${name} historical slice must resolve`);
      assert.equal(sliceName, name);
    }
    for (const eventTitle of page.relatedEvents) {
      assert.ok(events.some((event) => event.title === eventTitle && event.people?.includes(name)), `${name} event ${eventTitle} must be locally linked`);
    }
  }
});
