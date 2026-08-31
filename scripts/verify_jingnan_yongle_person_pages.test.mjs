import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const names = ['朱棣', '方孝孺', '姚广孝'];
const file = 'data/ming_person_pages_batch29_jingnan_yongle.json';
const outputRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, 'utf8'));
}

test('靖难至永乐三人升级人物页结构完整', async () => {
  const batch = await readJson(file);
  const pages = batch.people;
  assert.equal(batch.version, 1);
  assert.deepEqual(Object.keys(pages).sort(), names.slice().sort());

  for (const name of names) {
    const page = pages[name];
    assert.equal(page.readingMode, 'clear-biography', `${name} must use clear biography mode`);
    assert.ok(page.slug && page.theme && page.eyebrow && page.heroQuestion && page.lead && page.thesis);
    assert.ok(page.scenes.length >= 4 && page.scenes.length <= 6, `${name} scene count must be dynamic 4-6`);
    assert.ok(page.sources.length >= 2, `${name} needs at least two source entries`);
    assert.ok(page.localEvidenceLinks?.portrait, `${name} must declare portrait evidence link`);
    assert.ok(page.localEvidenceLinks?.events?.length >= 1, `${name} must link local events`);
    assert.ok(page.localEvidenceLinks?.historicalSlices?.length >= 1, `${name} must link local historical slice`);

    for (const source of page.sources) {
      assert.ok(source.label && source.kind && source.url);
      assert.match(source.confidence, /高|中/, `${name} source confidence must be explicit`);
    }

    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2, `${name} scene must use two body paragraphs`);
      assert.ok(scene.evidenceNote && scene.interpretationBoundary, `${name} scene needs evidence boundaries`);
      assert.ok(scene.primarySource?.url && scene.primarySource?.boundary, `${name} scene needs primary source boundary`);
      assert.match(scene.confidence, /高|中/, `${name} scene confidence must be explicit`);
      for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) {
        assert.doesNotMatch(text, hedge, `${name}: ${text}`);
      }
    }
  }
});

test('靖难至永乐三人与本地画像、机构、事件和切片可交叉', async () => {
  const pages = (await readJson(file)).people;
  const portraits = (await readJson('data/ming_portraits.json')).people;
  const institutions = (await readJson('data/ming_person_institutions.json')).institutions;
  const events = (await readJson('data/ming_events.json')).events;

  const institutionIds = new Set(institutions.map((institution) => institution.id));
  const directlyLinkedNames = new Set(institutions.flatMap((institution) => (institution.people || []).map((person) => person.name)));
  const eventById = new Map(events.map((event) => [event.id, event]));

  for (const name of names) {
    const page = pages[name];
    const portrait = portraits[name];
    assert.equal(portrait?.file, page.localEvidenceLinks.portrait, `${name} portrait must match local portrait registry`);
    await fs.access(`${outputRoot}/${portrait.file}`);

    for (const institutionId of page.localEvidenceLinks.institutions) {
      assert.ok(institutionIds.has(institutionId), `${name} links unknown institution ${institutionId}`);
    }

    for (const eventId of page.localEvidenceLinks.events) {
      const event = eventById.get(eventId);
      assert.ok(event, `${name} links unknown event ${eventId}`);
      assert.ok(event.people.includes(name), `${name} must appear in local event ${eventId}`);
    }

    for (const sliceLink of page.localEvidenceLinks.historicalSlices) {
      const [sliceFile, sliceName] = sliceLink.split('#');
      const slice = await readJson(sliceFile);
      assert.ok(slice.people?.[sliceName], `${name} historical slice link must resolve`);
      assert.equal(sliceName, name);
    }
  }

  assert.equal(directlyLinkedNames.has('朱棣'), true, '朱棣 should already have direct institution links');
  assert.equal(directlyLinkedNames.has('方孝孺'), true, '方孝孺 should already have a direct institution link');
  assert.equal(directlyLinkedNames.has('姚广孝'), false, '姚广孝 local direct institution gap should stay visible');
  assert.match(pages['姚广孝'].institutionBoundary, /暂未/, '姚广孝 page must record the local institution coverage gap');
});

test('朱棣保持皇帝页标准并覆盖永乐统治主线', async () => {
  const page = (await readJson(file)).people['朱棣'];
  const requiredEvents = ['靖难之役爆发', '南京陷落与永乐帝即位', '郑和首次下西洋', '正式迁都北京', '永乐帝北征途中去世'];

  assert.equal(page.theme, 'reign');
  assert.equal(page.scenes.length, 6);
  assert.equal(page.feature?.type, 'reach');
  assert.ok(page.feature.items.length >= 6);
  for (const title of requiredEvents) assert.ok(page.relatedEvents.includes(title), `朱棣 must include ${title}`);
});
