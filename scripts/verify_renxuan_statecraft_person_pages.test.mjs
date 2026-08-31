import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const names = ['杨士奇', '杨荣', '杨溥', '王景弘', '宋礼'];
const file = 'data/ming_person_pages_batch35_renxuan_statecraft.json';
const outputRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, 'utf8'));
}

test('任宣国家经略五人均使用可读传记结构', async () => {
  const batch = await readJson(file);
  assert.equal(batch.version, 1);
  assert.deepEqual(Object.keys(batch.people).sort(), names.slice().sort());

  for (const name of names) {
    const page = batch.people[name];
    assert.equal(page.readingMode, 'clear-biography', `${name} must use clear biography mode`);
    assert.ok(page.slug && page.theme && page.eyebrow && page.heroQuestion && page.lead && page.thesis);
    assert.ok(page.scenes.length >= 4 && page.scenes.length <= 6, `${name} needs a dynamic four-to-six scene biography`);
    assert.ok(page.sources.length >= 2, `${name} needs at least two sources`);
    assert.ok(page.localEvidenceLinks?.portrait, `${name} must declare a portrait link`);
    assert.ok(page.localEvidenceLinks?.institutions?.length >= 1, `${name} must declare institution links`);

    for (const source of page.sources) {
      assert.ok(source.label && source.kind && source.url, `${name} source needs a full citation`);
      assert.match(source.confidence, /高|中/, `${name} source confidence must be explicit`);
    }

    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2, `${name} must have exactly two body paragraphs per scene`);
      assert.ok(scene.evidenceNote && scene.confidence && scene.interpretationBoundary, `${name} scene needs evidence metadata`);
      assert.ok(scene.primarySource?.title && scene.primarySource?.location && scene.primarySource?.original?.length);
      assert.ok(scene.primarySource?.reading && scene.primarySource?.boundary && scene.primarySource?.url && scene.primarySource?.confidence);
      for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) {
        assert.doesNotMatch(text, hedge, `${name} narrative must keep source caveats out of the reading flow`);
      }
    }
  }
});

test('任宣国家经略五人与本地画像、机构、事件和切片可交叉', async () => {
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
    assert.equal(portrait?.file, page.localEvidenceLinks.portrait, `${name} portrait must match the registry`);
    await fs.access(`${outputRoot}/${portrait.file}`);
    assert.equal(directlyLinkedNames.has(name), true, `${name} must have a direct local institution relation`);

    for (const institutionId of page.localEvidenceLinks.institutions) {
      assert.ok(institutionIds.has(institutionId), `${name} links unknown institution ${institutionId}`);
    }
    for (const eventId of page.localEvidenceLinks.events || []) {
      const event = eventById.get(eventId);
      assert.ok(event, `${name} links unknown event ${eventId}`);
      assert.ok(event.people.includes(name), `${name} must appear in local event ${eventId}`);
    }
    for (const sliceLink of page.localEvidenceLinks.historicalSlices || []) {
      const [sliceFile, sliceName] = sliceLink.split('#');
      const slice = await readJson(sliceFile);
      assert.ok(slice.people?.[sliceName], `${name} historical slice must resolve`);
      assert.equal(sliceName, name);
    }
  }
});

test('王景弘与宋礼分别保留航海材料和工程协作边界', async () => {
  const pages = (await readJson(file)).people;
  const wang = pages['王景弘'];
  const song = pages['宋礼'];

  assert.match(wang.lead, /生卒年待考/);
  assert.equal(wang.localEvidenceLinks.institutions.includes('nanjing-defence'), true);
  assert.match(wang.scenes[3].primarySource.url, /劉家港天妃宮石刻通番事蹟記/);
  assert.equal(song.localEvidenceLinks.institutions.includes('ministry-works'), true);
  assert.equal(song.localEvidenceLinks.events.includes('e024'), true);
  assert.match(song.scenes[2].body.join(''), /白英/);
});
