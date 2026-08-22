import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('.');

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

async function findPersonPage(name) {
  const files = (await fs.readdir(path.join(root, 'data')))
    .filter((file) => /^ming_person_pages.*\.json$/.test(file));
  for (const file of files) {
    const data = await readJson(path.join('data', file));
    if (data.people?.[name]) return data.people[name];
  }
  return null;
}

test('洪承畴基础卡按文臣仕履呈现并移除维基百科主来源', async () => {
  const core = await readJson('data/ming_core.json');
  const records = core.filter((person) => person.name === '洪承畴');
  assert.equal(records.length, 1);
  const person = records[0];
  assert.equal(person.category, '文臣');
  assert.equal(person.office_end, 1661);
  assert.match(person.summary, /陕西|松锦/);
  assert.match(person.summary, /清廷|南方|江南/);
  assert.doesNotMatch(`${person.source1}\n${person.source2}`, /wikipedia\.org/);
  assert.match(person.notes, /降清/);
});

test('洪承畴独立页提供六幕可核传记与精确事件链接', async () => {
  const page = await findPersonPage('洪承畴');
  assert.ok(page, '应有洪承畴独立页数据');
  assert.equal(page.slug, 'hong-cheng-chou');
  assert.equal(page.readingMode, 'clear-biography');
  assert.equal(page.scenes.length, 6);
  for (const [index, scene] of page.scenes.entries()) {
    assert.ok(scene.year, `第${index + 1}幕缺公历时间`);
    assert.ok(scene.reignYears, `第${index + 1}幕缺朝次年号`);
    assert.equal(scene.body.length, 2, `第${index + 1}幕应有两段正文`);
    assert.ok(scene.evidenceNote, `第${index + 1}幕缺史料依据`);
    assert.ok(scene.interpretationBoundary, `第${index + 1}幕缺解释边界`);
    assert.match(scene.primarySource?.url || '', /^https:\/\//, `第${index + 1}幕缺可打开的原典链接`);
  }
  assert.deepEqual(page.relatedEvents, ['陕北民变扩展', '松锦之战失败']);
  assert.ok(page.sources.length >= 4);
});

test('洪承畴页将野史作为后世记忆而非确定事实呈现', async () => {
  const page = await findPersonPage('洪承畴');
  assert.ok(page?.feature, '应有传说辨析专区');
  assert.equal(page.feature.type, 'myth');
  assert.match(`${page.feature.title}\n${page.feature.intro}`, /野史|传说|记忆/);
  assert.equal(page.feature.items.length, 4, '四列传说辨析区不应留空列');
  const featureText = JSON.stringify(page.feature);
  assert.match(featureText, /庄妃劝降/);
  assert.match(featureText, /范文程/);
  assert.match(featureText, /夏完淳/);
  assert.match(featureText, /无法确认|不能证明|未载/);
  assert.match(featureText, /出处|《清史稿》|沈阳故宫博物院/);
});

test('洪承畴的明代仕履连入都察院与兵部且不混入清制', async () => {
  const data = await readJson('data/ming_person_institutions.json');
  for (const id of ['censorate', 'ministry-war']) {
    const institution = data.institutions.find((item) => item.id === id);
    const links = institution?.people?.filter((person) => person.name === '洪承畴') || [];
    assert.equal(links.length, 1, `${id}应有且仅有一条洪承畴关系`);
    assert.equal(links[0].confidence, '高');
    assert.match(links[0].period, /1629|1638|崇祯/);
    assert.match(links[0].note, /明|文官|清朝/);
    assert.ok(links[0].sources?.length);
  }
});

test('构建后洪承畴独立页可从人物馆访问', async () => {
  const museumRoot = path.join(root, 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
  const html = await fs.readFile(path.join(museumRoot, 'people/hong-cheng-chou.html'), 'utf8');
  assert.match(html, /<h1>洪承畴/);
  assert.match(html, /庄妃劝降/);
  assert.match(html, /清代后世绘像/);
  const detail = await readJson('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/assets/data/people-details/hong-cheng-chou.json');
  assert.equal(detail.id, 'hong-cheng-chou');
  assert.equal(detail.drawer.person.name, '洪承畴');
  assert.equal(detail.drawer.personPage.slug, 'hong-cheng-chou');
  assert.equal(detail.drawer.personPage.scenes.length, 6);
});
