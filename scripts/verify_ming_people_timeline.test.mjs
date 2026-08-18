import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const verifierPath = path.join(repoRoot, 'scripts/verify_ming_people_timeline.mjs');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const baseline = {
  core: JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/ming_core.json'), 'utf8')),
  children: JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'data/ming_children_important.json'), 'utf8'),
  ),
  timelineData: JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'data/ming_people_timeline.json'), 'utf8'),
  ),
};

function runVerifier(mutate = () => {}) {
  const fixture = structuredClone(baseline);
  mutate(fixture);
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'people-timeline-verifier-'));
  const dataDir = path.join(fixtureRoot, 'data');
  fs.mkdirSync(dataDir);
  fs.writeFileSync(path.join(dataDir, 'ming_core.json'), JSON.stringify(fixture.core));
  fs.writeFileSync(
    path.join(dataDir, 'ming_children_important.json'),
    JSON.stringify(fixture.children),
  );
  fs.writeFileSync(
    path.join(dataDir, 'ming_people_timeline.json'),
    JSON.stringify(fixture.timelineData),
  );

  try {
    return spawnSync(process.execPath, [verifierPath], {
      cwd: fixtureRoot,
      encoding: 'utf8',
    });
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function assertVerifierRejects(mutate, messagePattern) {
  const result = runVerifier(mutate);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0, `verifier unexpectedly accepted fixture:\n${output}`);
  assert.match(output, messagePattern);
}

test('verifier accepts the curated 165-person timeline', () => {
  const result = runVerifier();
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('default verify gate runs data, all timeline test suites, legacy regression, and every timeline page verifier', () => {
  assert.equal(
    packageJson.scripts['verify:people-timeline-unit'],
    'node --test scripts/lib/people_timeline.test.mjs scripts/verify_ming_people_timeline.test.mjs',
  );
  assert.deepEqual(packageJson.scripts.verify.split(' && '), [
    'npm run verify:people-timeline',
    'npm run verify:people-timeline-unit',
    'npm run verify:people-timeline-variants-unit',
    'node --test scripts/lib/ming_reign_year.test.mjs',
    'node scripts/verify_ming_museum.mjs',
    'npm run verify:people-timeline-page',
    'npm run verify:people-timeline-variants-page',
    'npm run verify:people-timeline-doubleclick-page',
    'node scripts/verify_ming_reign_year_page.mjs',
    'npm run verify:people-on-demand-data',
    'npm run verify:people-on-demand-page',
  ]);
  assert.equal(
    packageJson.scripts['verify:people-timeline-variants-page'],
    'node scripts/verify_ming_people_timeline_variants_page.mjs',
  );
  assert.equal(
    packageJson.scripts['verify:people-timeline-doubleclick-page'],
    'node scripts/verify_ming_people_timeline_doubleclick_page.mjs',
  );
});

test('museum build promotes B2 to the formal people hall while keeping all preview backups', () => {
  const buildSource = fs.readFileSync(path.join(repoRoot, 'scripts/build_ming_museum.mjs'), 'utf8');
  assert.match(buildSource, /renderPeopleTimelineFormalPage\(peopleHallBaseHtml,\s*'b2'\)/);
  assert.match(buildSource, /Object\.values\(PEOPLE_TIMELINE_VARIANTS\)/);
});

test('curated first-activity corrections and authority upgrades stay locked', () => {
  const expected = {
    郑和: [1401, '约1399—1402', '中', ['MS304']],
    王振: [1431, '约1426—1435', '中', ['MS304', 'IHP_WANGZHEN']],
    何心隐: [1553, '1553', '高', ['IHP_HEXINYIN_1553']],
    宋应星: [1615, '1615', '高', ['AHNU_SONGYINGXING_1615']],
    李贽: [1552, '1552', '高', ['CHINAKONGZI_LIZHI_1552']],
    吴承恩: [1529, '1529', '高', ['SHEYANG_HAIHE_1529', 'NPM_SHEYANG_EDITION']],
    邓愈: [1353, '约1352—1353', '中', ['MS126']],
    沈周: [1467, '1467', '高', ['NPM_SHEN_1467']],
    马守真: [1572, '1572', '中', ['MET_MA_1572']],
    刘大夏: [1459, '1459', '高', ['YUEYANG_LIUDAXIA_1459']],
    刘瑾: [1499, '约1492—1505', '中', ['MS016', 'MS304']],
    魏忠贤: [1589, '1589', '高', ['DPM_WEIZHONGXIAN_1589']],
    客氏: [1613, '约1605—1620', '中', ['DPM_KE_NURSE', 'MS305']],
    汤显祖: [1571, '1571', '高', ['DPM_TANGXIANZU_1571']],
    洪承畴: [1616, '1616', '高', ['QSG237']],
    徐霞客: [1608, '约1608', '中', ['CHNMUSEUM_XUXIAKE']],
    方孝孺: [1382, '1382', '高', ['MS141']],
    商辂: [1435, '1435', '高', ['DPM_SHANGLU_1435']],
    李东阳: [1451, '约1450—1451', '中', ['MS181']],
    徐光启: [1597, '1597', '高', ['MS251']],
  };

  for (const [name, [year, label, confidence, refs]] of Object.entries(expected)) {
    const person = baseline.timelineData.people.find((candidate) => candidate.name === name);
    assert.ok(person, `missing corrected person ${name}`);
    assert.deepEqual(
      [
        person.timeline_year,
        person.timeline_year_label,
        person.timeline_year_confidence,
        person.timeline_source_refs,
      ],
      [year, label, confidence, refs],
      `${name} first-activity correction drifted`,
    );
  }
});

test('curated round-2 evidence mappings stay locked', () => {
  const expected = {
    吴承恩: {
      person: {
        timeline_year_basis:
          '淮安政协文史网具体整理页逐字引录《海鹤蟠桃篇》小序“嘉靖己丑”，干支换算为1529年；国立故宫数位目录确认《射阳先生存稿》明万历十八年刊本',
        timeline_year_range: undefined,
        timeline_source_refs: ['SHEYANG_HAIHE_1529', 'NPM_SHEYANG_EDITION'],
      },
      sources: {
        SHEYANG_HAIHE_1529: {
          label: '淮安政协文史网·《海鹤蟠桃篇》小序（嘉靖己丑）',
          url: 'https://zx.huaian.gov.cn/col/14066_664815/art/m/17592480/1760690382465qIv3YFTw.html',
          kind: '地方文史机构',
        },
        NPM_SHEYANG_EDITION: {
          label: '国立故宫博物院善本古籍数位目录·《射阳先生存稿》',
          url: 'https://catalog.digitalarchives.tw/item/00/12/61/2d.html',
          kind: '博物馆',
        },
      },
    },
    客氏: {
      person: {
        timeline_year_basis:
          '故宫博物院《魏忠贤乱政和客氏》正文载客氏“十八岁由奶子府选入宫，为朱由校之乳母”；具体入宫年未载，只能界定在朱由校出生（1605）至即位（1620）的约束区间，取中点',
        timeline_year_range: { start: 1605, end: 1620 },
        timeline_source_refs: ['DPM_KE_NURSE', 'MS305'],
      },
      sources: {
        DPM_KE_NURSE: {
          label: '故宫博物院·傅同钦《魏忠贤乱政和客氏》',
          url: 'https://www.dpm.org.cn/Uploads/pdf/1609/T00055_00.pdf',
          kind: '博物馆研究',
        },
        MS305: {
          label: '《明史》卷305',
          url: 'https://zh.wikisource.org/wiki/明史/卷305',
          kind: '正史',
        },
      },
    },
  };

  for (const [name, evidence] of Object.entries(expected)) {
    const person = baseline.timelineData.people.find((candidate) => candidate.name === name);
    assert.ok(person, `missing round-2 person ${name}`);
    assert.deepEqual(
      {
        timeline_year_basis: person.timeline_year_basis,
        timeline_year_range: person.timeline_year_range,
        timeline_source_refs: person.timeline_source_refs,
      },
      evidence.person,
      `${name} round-2 basis/range/source mapping drifted`,
    );

    const sources = Object.fromEntries(
      Object.keys(evidence.sources).map((sourceId) => [
        sourceId,
        baseline.timelineData.source_catalog[sourceId],
      ]),
    );
    assert.deepEqual(sources, evidence.sources, `${name} round-2 source metadata drifted`);
  }
});

test('verifier rejects a self-consistent roster that is not exactly 165 people', () => {
  assertVerifierRejects(({ core, timelineData }) => {
    const removed = core.shift();
    timelineData.people = timelineData.people.filter((person) => person.name !== removed.name);
  }, /exactly 165 people/);
});

test('傅山 remains a sourced 1636 public-activity anchor under his formal name', () => {
  const person = baseline.core.find((candidate) => candidate.name === '傅山');
  const timeline = baseline.timelineData.people.find((candidate) => candidate.name === '傅山');
  assert.deepEqual(
    [person?.alt, person?.category, timeline?.timeline_year, timeline?.timeline_year_label,
      timeline?.timeline_role, timeline?.timeline_source_refs],
    ['字青主，号真山、朱衣道人', '在野人物', 1636, '1636', '明遗民、书画医家', ['DPM_FUSHAN', 'DPM_FUSHAN_1636']],
  );
});

test('王保保 remains a sourced 1362 command anchor with his Mongol name visible', () => {
  const person = baseline.core.find((candidate) => candidate.name === '王保保');
  const timeline = baseline.timelineData.people.find((candidate) => candidate.name === '王保保');
  assert.deepEqual(
    [person?.alt, person?.category, timeline?.timeline_year, timeline?.timeline_year_label,
      timeline?.timeline_role, timeline?.timeline_source_refs],
    ['扩廓帖木儿', '政权人物', 1362, '1362', '北元名将', ['MS124']],
  );
});

test('verifier rejects a self-consistent roster that is not exactly 16 emperors', () => {
  assertVerifierRejects(({ core, timelineData }) => {
    core.find((person) => person.name === '朱元璋').category = '武官';
    timelineData.people.find((person) => person.name === '朱元璋').timeline_size = 'standard';
  }, /exactly 16 emperors/);
});

test('verifier locks featured anchors to name, year, and source', () => {
  assertVerifierRejects(({ timelineData }) => {
    const yuQian = timelineData.people.find((person) => person.name === '于谦');
    yuQian.timeline_year = 1422;
    yuQian.timeline_year_label = '1422';
    yuQian.timeline_source_refs = ['MS195'];
  }, /于谦.*1421.*MS170/);
});

test('verifier rejects source kinds outside the explicit allowlist', () => {
  assertVerifierRejects(({ timelineData }) => {
    timelineData.source_catalog.MS170.kind = '搜索摘要';
  }, /source kind.*搜索摘要/);
});

test('verifier requires every person to cite an authoritative or primary source', () => {
  assertVerifierRejects(({ timelineData }) => {
    timelineData.source_catalog.MS170.kind = '地方文史';
  }, /于谦.*authoritative source/);
});

test('verifier rejects an approximate year without a structured range', () => {
  assertVerifierRejects(({ timelineData }) => {
    delete timelineData.people.find((person) => person.name === '吴三桂').timeline_year_range;
  }, /吴三桂.*timeline_year_range/);
});

test('verifier rejects an approximate year that is not the rounded range midpoint', () => {
  assertVerifierRejects(({ timelineData }) => {
    const wuSangui = timelineData.people.find((person) => person.name === '吴三桂');
    wuSangui.timeline_year_range = { start: 1628, end: 1632 };
    wuSangui.timeline_year = 1631;
  }, /吴三桂.*rounded midpoint/);
});

test('verifier rejects an approximate label that does not match its structured range', () => {
  assertVerifierRejects(({ timelineData }) => {
    const wuSangui = timelineData.people.find((person) => person.name === '吴三桂');
    wuSangui.timeline_year_range = { start: 1628, end: 1632 };
    wuSangui.timeline_year_label = '约1628-1632';
  }, /吴三桂.*range label/);
});

test('verifier rejects high confidence on an approximate range', () => {
  assertVerifierRejects(({ timelineData }) => {
    const wuSangui = timelineData.people.find((person) => person.name === '吴三桂');
    wuSangui.timeline_year_range = { start: 1628, end: 1632 };
    wuSangui.timeline_year_confidence = '高';
  }, /吴三桂.*approximate confidence/);
});
