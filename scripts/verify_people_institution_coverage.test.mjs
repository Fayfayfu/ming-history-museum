import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const data = JSON.parse(await fs.readFile('data/ming_person_institutions.json', 'utf8'));
const root = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const names = [
  '傅友德', '张玉', '朱能', '丘福', '石亨', '戚继光', '俞大猷', '马芳',
  '李成梁', '李如松', '刘綎', '秦良玉', '毛文龙', '吴三桂', '郑和', '王景弘', '张永', '文徵明',
];

test('军事、内廷与翰林人物均有来源限定的关联机构', () => {
  const links = new Map();
  for (const institution of data.institutions) {
    for (const person of institution.people || []) {
      links.set(person.name, [...(links.get(person.name) || []), { institution, person }]);
    }
  }
  for (const name of names) {
    const entries = links.get(name) || [];
    assert.ok(entries.length, `${name} must have an institution relationship`);
    assert.ok(entries.some(({ person }) => person.sources?.length), `${name} must retain source links`);
  }
  assert.equal((links.get('秦良玉') || [])[0].institution.name, '石柱宣慰司／白杆兵');
  assert.equal((links.get('毛文龙') || [])[0].institution.name, '东江镇');
  assert.equal((links.get('文徵明') || [])[0].institution.name, '翰林院');
});

test('南明君主以所属政权呈现，不伪装为机构任职', async () => {
  const builder = await fs.readFile('scripts/build_ming_html.mjs', 'utf8');
  assert.match(builder, /function southernRulerRegimeFactHtml/);
  const html = await fs.readFile(`${root}/people.html`, 'utf8');
  assert.match(html, /所属政权/);
  assert.match(html, /南明延续支；不并入北京明廷帝系/);
});

test('跨朝人物把每一政权阶段的机构、任期与君主经历并入身份与政权经历，不重复另列关联机构', async () => {
  const index = JSON.parse(await fs.readFile(`${root}/assets/data/people-index.json`, 'utf8'));
  const expected = {
    '洪承畴': {
      明: ['都察院', '兵部'],
      清: ['清廷大学士中枢', '五省经略'],
    },
    '吴三桂': {
      明: ['山海关与辽东防线'],
      清: ['平西王藩', '征南军'],
    },
  };

  for (const [name, institutionsByRegime] of Object.entries(expected)) {
    const summary = index.people.find((person) => person.name === name);
    assert.ok(summary?.detailUrl, `${name} must have a detail shard`);
    const detail = JSON.parse(await fs.readFile(`${root}/${summary.detailUrl}`, 'utf8'));
    const phases = detail.drawer.politicalPhases;
    for (const [regime, institutionNames] of Object.entries(institutionsByRegime)) {
      const phase = phases.find((item) => item.regime === regime);
      assert.ok(phase, `${name} must retain its ${regime} phase`);
      assert.deepEqual(phase.institutions.map((item) => item.name), institutionNames);
      if (name === '洪承畴' && regime === '明') {
        assert.equal(phase.tenure, '任期26年');
        assert.equal(phase.sovereigns, '历万历、天启、崇祯三帝');
      }
      if (name === '洪承畴' && regime === '清') {
        assert.equal(phase.tenure, '任期19年');
        assert.equal(phase.sovereigns, '历清太宗、顺治二帝');
      }
      if (name === '吴三桂' && regime === '明') {
        assert.equal(phase.tenure, '任期14年');
        assert.equal(phase.sovereigns, '历崇祯帝一帝');
      }
      if (name === '吴三桂' && regime === '清') {
        assert.equal(phase.tenure, '任期18年');
        assert.equal(phase.sovereigns, '历顺治、康熙二帝');
      }
    }
  }

  const builder = await fs.readFile('scripts/build_ming_html.mjs', 'utf8');
  assert.match(builder, /phase\.institutions/);
  assert.match(builder, /phaseHasInstitutions/);
  assert.match(builder, /function politicalPhaseTenureLines/);
  assert.match(builder, /phase=>phase\.regime==='清'/);
  assert.match(builder, /const hasMultiStageIdentity=\(p\.politicalPhases\|\|\[\]\)\.length>1/);
  assert.match(builder, /const identityTimelineFacts=hasMultiStageIdentity\?'':identityFact\+periodFact/);
  assert.match(builder, /const stageMeta=\[phase\.tenure,phase\.sovereigns\]/);
  assert.match(builder, /身份与政权经历/);
  assert.match(builder, /\(p\.institutions\|\|\[\]\)\.length&&!phaseHasInstitutions/);
  assert.match(builder, /person-identity-flow ol\{grid-template-columns:repeat\(auto-fit,minmax\(250px,1fr\)\)/);
  assert.match(builder, /@media\(max-width:620px\)\{\.person-identity-flow\{padding-bottom:0\}/);
});
