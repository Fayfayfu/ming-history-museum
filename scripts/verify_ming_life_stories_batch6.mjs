import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import sharp from 'sharp';

process.env.MING_RENDERER_FIXTURE = '1';
const {personPageCss, renderFeature} = await import('./build_ming_person_pages.mjs');
delete process.env.MING_RENDERER_FIXTURE;

const names = ['于谦', '唐寅', '戚继光'];
const bannedTitles = ['生卒与出身', '进入历史现场', '主要行动与位置', '结局与历史影响'];
const expectedFeature = {
  于谦: 'crisis-decision',
  唐寅: 'gallery',
  戚继光: 'training-system'
};
const routes = {于谦: 'yu-qian', 唐寅: 'tang-yin', 戚继光: 'qi-ji-guang'};
const mobileFeatureSelector = {于谦: '.feature-crisis-decision', 唐寅: '.gallery', 戚继光: '.feature-training-system'};
const semanticConcepts = {
  于谦: [['反对南迁'], ['北京保卫'], ['景泰'], ['夺门'], ['平反']],
  唐寅: [['解元'], ['科场'], ['职业'], ['题跋'], ['市场']],
  戚继光: [['募兵'], ['编组'], ['军纪'], ['蓟镇'], ['纪效新书'], ['练兵实纪']]
};
const directAuthorityUrls = new Set([
  'https://zh.wikisource.org/zh-hans/明史/卷170',
  'https://zh.wikisource.org/zh-hans/于忠肅公集/卷1',
  'https://zh.wikisource.org/zh-hant/明史/卷286',
  'https://www.dpm.org.cn/collection/paint/234421.html?hl=唐寅斋印',
  'https://zh.wikisource.org/zh-hans/明史/卷212',
  'https://www.shidianguji.com/book/LS0026/chapter/1k6tolyonkf0p'
].map(url => new URL(url).href));
const artworkSourceUrls = new Set([
  'https://www.metmuseum.org/art/collection/search/45773',
  'https://www.metmuseum.org/art/collection/search/45756',
  'https://www.metmuseum.org/art/collection/search/45760',
  'https://www.metmuseum.org/art/collection/search/53796'
]);
const museumRoot = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const expectedTangDisplay = {
  birthDeath: '1470—1523或1524',
  lifespan: '约53—54岁',
  confidence: '整体高；卒年中'
};
const expectedTangIdentityOriginal = '唐寅，字伯虎，一字子畏。';
const expectedTangExamOriginal = '敏政总裁会试。江阴富人徐经贿其家僮，得试题。事露，言者劾敏政，语连寅，下诏狱，谪为吏。';

function isDirectAuthority(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && directAuthorityUrls.has(parsed.href);
  } catch {
    return false;
  }
}

function hasAllConcepts(text, conceptGroups) {
  return conceptGroups.every(alternatives => alternatives.some(term => text.includes(term)));
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameNonTargetArray(current, baseline, allowedNames) {
  return sameJson(current.filter(item => !allowedNames.has(item.name)), baseline.filter(item => !allowedNames.has(item.name)));
}

function withoutAllowedPeople(document, allowedNames) {
  return {...document, people: Object.fromEntries(Object.entries(document.people || {}).filter(([name]) => !allowedNames.has(name)))};
}

function sameNonTargetPeopleDocument(current, baseline, allowedNames) {
  return sameJson(withoutAllowedPeople(current, allowedNames), withoutAllowedPeople(baseline, allowedNames));
}

function chineseCharacterCount(text) {
  return (String(text).match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) || []).length;
}

function hasExpectedArtworkImages(images, expectedCount) {
  return expectedCount >= 4 && expectedCount <= 6 && images.length === expectedCount && images.every(Boolean);
}

function hasReusableRights(work) {
  return work?.license === 'Public Domain' && (work?.rightsEvidence || '').trim().length >= 15;
}

function hasExpectedArtworkSource(source) {
  if (typeof source !== 'string' || !source.trim()) return false;
  try {
    const parsed = new URL(source.trim());
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && artworkSourceUrls.has(parsed.href);
  } catch {
    return false;
  }
}

function hasExactArtworkSourceSet(works) {
  if (!Array.isArray(works) || works.length !== artworkSourceUrls.size) return false;
  const sources = works.map(work => work?.source);
  const uniqueSources = new Set(sources);
  return uniqueSources.size === artworkSourceUrls.size && [...artworkSourceUrls].every(source => uniqueSources.has(source));
}

async function validArtwork(work) {
  const metadataComplete = Boolean(
    work?.title && work?.date && work?.medium && work?.image && hasExpectedArtworkSource(work?.source) &&
    work?.collection && hasReusableRights(work) && work?.confidence && (work?.reading || '').length >= 35
  );
  if (!metadataComplete) return false;
  const localFile = path.resolve(museumRoot, work.image);
  if (!localFile.startsWith(`${museumRoot}${path.sep}`)) return false;
  try {
    const stats = await fs.stat(localFile);
    if (!stats.isFile() || stats.size === 0) return false;
    const metadata = await sharp(localFile).metadata();
    return Boolean(metadata.width && metadata.height);
  } catch {
    return false;
  }
}

async function runMutationSelfChecks() {
  const selfAssert = (condition, message) => { if (!condition) throw new Error(`Batch 6 verifier self-check failed: ${message}`); };
  const rejectedSources = [
    '',
    'javascript:alert(1)',
    'data:text/plain,source',
    'http://zh.wikisource.org/zh-hans/明史/卷170',
    'https://example.invalid/direct',
    'https://zh.wikisource.org/',
    'https://zh.wikisource.org/zh-hans/明史',
    'https://www.dpm.org.cn/',
    'https://www.shidianguji.com/book/LS0026'
  ];
  selfAssert([...directAuthorityUrls].every(isDirectAuthority), 'canonical authority rejected');
  selfAssert(rejectedSources.every(url => !isDirectAuthority(url)), 'unsafe or generic authority accepted');

  for (const [name, concepts] of Object.entries(semanticConcepts)) {
    const complete = concepts.map(([term]) => term).join('；');
    selfAssert(hasAllConcepts(complete, concepts), `${name} complete semantic chain rejected`);
    concepts.forEach((_, missingIndex) => {
      const mutant = concepts.filter((__, index) => index !== missingIndex).map(([term]) => term).join('；');
      selfAssert(!hasAllConcepts(mutant, concepts), `${name} semantic mutant ${missingIndex + 1} accepted`);
    });
  }

  const allowed = new Set(['目标']);
  const baselineArray = [{name: '目标', value: 1}, {name: '非目标', value: 1}];
  selfAssert(sameNonTargetArray([{name: '目标', value: 2}, {name: '非目标', value: 1}], baselineArray, allowed), 'allowed core mutation rejected');
  selfAssert(!sameNonTargetArray([{name: '目标', value: 1}, {name: '非目标', value: 2}], baselineArray, allowed), 'out-of-scope core mutation accepted');
  const baselineDocument = {version: 1, people: {目标: {value: 1}, 非目标: {value: 1}}};
  selfAssert(sameNonTargetPeopleDocument({version: 1, people: {目标: {value: 2}, 非目标: {value: 1}}}, baselineDocument, allowed), 'allowed people mutation rejected');
  selfAssert(!sameNonTargetPeopleDocument({version: 1, people: {目标: {value: 1}, 非目标: {value: 2}}}, baselineDocument, allowed), 'out-of-scope people mutation accepted');
  selfAssert(!sameNonTargetPeopleDocument({version: 2, people: {目标: {value: 1}, 非目标: {value: 1}}}, baselineDocument, allowed), 'out-of-scope metadata mutation accepted');

  const artwork = {
    title: '测试作品', date: '明代', medium: '纸本', image: 'assets/works/does-not-exist.jpg',
    source: 'https://www.metmuseum.org/art/collection/search/45773', collection: '测试馆', license: 'Public Domain',
    rightsEvidence: '馆藏记录明确标为 Public Domain。', confidence: '高', reading: '这段测试释读文字只用于验证作品元数据约束，并确保长度达到规定的最低字符数量。'
  };
  selfAssert(hasReusableRights(artwork), 'reusable rights rejected');
  for (const license of ['All Rights Reserved', 'CC0', 'CC BY 4.0', 'CC BY-SA 4.0', 'public domain']) {
    selfAssert(!hasReusableRights({...artwork, license}), `alternative license accepted: ${license}`);
  }
  selfAssert(!hasReusableRights({...artwork, rightsEvidence: ''}), 'missing rights evidence accepted');
  selfAssert([...artworkSourceUrls].every(hasExpectedArtworkSource), 'canonical Met artwork source rejected');
  for (const source of [
    'https://museum.example/item/1',
    'https://evil.example/art/collection/search/45773',
    'https://www.metmuseum.org/',
    'https://www.metmuseum.org/art/collection/search/99999',
    'https://www.metmuseum.org/art/collection/search/45773/extra',
    'http://www.metmuseum.org/art/collection/search/45773'
  ]) selfAssert(!hasExpectedArtworkSource(source), `unexpected artwork source accepted: ${source}`);
  const exactArtworkSet = [...artworkSourceUrls].map(source => ({source}));
  selfAssert(hasExactArtworkSourceSet(exactArtworkSet), 'exact Met artwork source set rejected');
  selfAssert(!hasExactArtworkSourceSet(Array.from({length: 4}, () => ({source: 'https://www.metmuseum.org/art/collection/search/45773'}))), 'duplicate Met artwork source set accepted');
  selfAssert(!hasExactArtworkSourceSet(exactArtworkSet.filter(work => !work.source.endsWith('/53796'))), 'artwork source set missing object ID accepted');
  selfAssert(!(await validArtwork(artwork)), 'missing local artwork file accepted');
  selfAssert(chineseCharacterCount('甲乙abc') === 2 && chineseCharacterCount('abc123') === 0, 'Chinese character counter mutation');
  selfAssert(!hasExpectedArtworkImages([], 4), 'empty artwork image set accepted');
}

await runMutationSelfChecks();
if (process.argv.includes('--self-test')) {
  console.log('Batch 6 verifier mutation self-checks: PASS');
  process.exit(0);
}

execFileSync('npm', ['run', 'build:museum'], {stdio: 'inherit'});

const core = JSON.parse(await fs.readFile('data/ming_core.json', 'utf8'));
const pagesDocument = JSON.parse(await fs.readFile('data/ming_person_pages.json', 'utf8'));
const pages = pagesDocument.people || {};
const creative = JSON.parse(await fs.readFile('data/ming_creative_works.json', 'utf8'));
const historicalSlicesDocument = JSON.parse(await fs.readFile('data/ming_historical_slices_batch2.json', 'utf8'));
const historicalSlices = historicalSlicesDocument.people || {};
const tangYinDossier = JSON.parse(await fs.readFile('data/research/ming_life_stories_batch6_tang_yin.json', 'utf8'));

const baselineCore = JSON.parse(execFileSync('git', ['show', '41e5646:data/ming_core.json'], {encoding: 'utf8'}));
const baselinePagesDocument = JSON.parse(execFileSync('git', ['show', '41e5646:data/ming_person_pages.json'], {encoding: 'utf8'}));
const baselinePages = baselinePagesDocument.people || {};
const baselineCreative = JSON.parse(execFileSync('git', ['show', '41e5646:data/ming_creative_works.json'], {encoding: 'utf8'}));
const baselineHistoricalSlices = JSON.parse(execFileSync('git', ['show', '41e5646:data/ming_historical_slices_batch2.json'], {encoding: 'utf8'}));
const targetNames = new Set(names);
const zhengHe = core.find(item => item.name === '郑和');
const baselineZhengHe = baselineCore.find(item => item.name === '郑和');
if (!sameJson(zhengHe, baselineZhengHe) || !sameJson(pages.郑和, baselinePages.郑和)) {
  errors.push('郑和: changed outside batch scope');
}
assert(sameNonTargetArray(core, baselineCore, targetNames), 'core: changed outside batch scope');
assert(sameNonTargetPeopleDocument(pagesDocument, baselinePagesDocument, targetNames), 'pages: changed outside batch scope');
assert(sameNonTargetPeopleDocument(creative, baselineCreative, new Set(['唐寅'])), 'creative: changed outside batch scope');
assert(sameNonTargetPeopleDocument(historicalSlicesDocument, baselineHistoricalSlices, targetNames), 'historical slices: changed outside batch scope');

function assertScene(scene, name, banned) {
  assert(Boolean(scene?.year), `${name}: scene missing year`);
  assert(Boolean(scene?.reignYears), `${name}: scene missing reignYears`);
  assert(Boolean(scene?.age), `${name}: scene missing age`);
  assert(Boolean(scene?.kicker), `${name}: scene missing kicker`);
  assert(Boolean(scene?.title), `${name}: scene missing title`);
  assert(!banned.includes(scene?.title), `${name}: banned scene title`);
  assert((scene?.preview || '').length >= 28, `${name}: scene preview too short`);
  assert(Array.isArray(scene?.body) && scene.body.length >= 2 && scene.body.every(paragraph => chineseCharacterCount(paragraph) >= 55), `${name}: scene body incomplete`);
  assert(Boolean(scene?.evidenceNote), `${name}: scene missing evidenceNote`);
  assert(Boolean(scene?.confidence), `${name}: scene missing confidence`);
  const source = scene?.primarySource;
  assert(Boolean(source?.title && source?.location && Array.isArray(source?.original) && source.original.length && source?.reading && source?.boundary && source?.url && source?.confidence), `${name}: scene primarySource incomplete`);
  assert(Boolean(scene?.interpretationBoundary), `${name}: scene missing interpretationBoundary`);
}

for (const name of names) {
  const card = core.find(item => item.name === name);
  const page = pages[name];
  if (!card) {
    errors.push(`${name}: missing core card`);
    continue;
  }
  assert((card.summary || '').length >= 34, `${name}: summary too short`);
  assert((card.evaluation || '').length >= 38, `${name}: evaluation too short`);
  assert([card.source1, card.source2].every(isDirectAuthority), `${name}: weak card source`);
  if (!page) {
    errors.push(`${name}: missing person page`);
    continue;
  }
  assert(page.readingMode === 'clear-biography', `${name}: not clear biography`);
  const scenes = Array.isArray(page.scenes) ? page.scenes : [];
  assert(scenes.length >= 5 && scenes.length <= 6, `${name}: wrong scene count`);
  scenes.forEach(scene => assertScene(scene, name, bannedTitles));
  assert(page.feature?.type === expectedFeature[name], `${name}: wrong exhibition focus`);
}

const joined = name => JSON.stringify({core: core.find(item => item.name === name), page: pages[name]});
const semanticError = {
  于谦: '于谦: crisis chain incomplete',
  唐寅: '唐寅: cultural production incomplete',
  戚继光: '戚继光: training system incomplete'
};
for (const name of names) assert(hasAllConcepts(joined(name), semanticConcepts[name]), semanticError[name]);

assert(pages.于谦?.feature?.items?.length === 6, '于谦: decision chain must have six steps');
assert(creative.people?.唐寅?.works?.length >= 4 && creative.people.唐寅.works.length <= 6, '唐寅: artwork count');
assert(hasExactArtworkSourceSet(creative.people?.唐寅?.works), '唐寅: artwork sources must match four expected Met records exactly');
const tangArtworkValidity = await Promise.all((creative.people?.唐寅?.works || []).map(validArtwork));
assert(tangArtworkValidity.length >= 4 && tangArtworkValidity.every(Boolean), '唐寅: incomplete artwork metadata, rights, or local file');
assert(pages.戚继光?.feature?.items?.length === 8, '戚继光: training system must have eight parts');
const tangYinCard = core.find(item => item.name === '唐寅');
assert(tangYinCard?.birth === 1470 && tangYinCard?.death === 1524, '唐寅: numeric birth/death fields changed');
assert(tangYinCard?.display?.birthDeath === '1470—1523或1524', '唐寅: birth-death display boundary missing');
assert(tangYinCard?.display?.lifespan === '约53—54岁', '唐寅: lifespan display boundary missing');
assert(tangYinCard?.display?.confidence === '整体高；卒年中', '唐寅: confidence display boundary missing');
assert(pages.唐寅?.scenes?.[5]?.age === '约30—54岁（卒年有两说）', '唐寅: final-scene age boundary missing');
const tangIdentitySource = pages.唐寅?.scenes?.[0]?.primarySource;
const tangExamSource = pages.唐寅?.scenes?.[2]?.primarySource;
assert((tangIdentitySource?.original || []).join('') === expectedTangIdentityOriginal, '唐寅: Ming Shi identity quote is not exact');
assert(!(tangIdentitySource?.original || []).join('').includes('吴县人'), '唐寅: Ming Shi identity quote wrongly supplies hometown');
assert((tangExamSource?.original || []).join('') === expectedTangExamOriginal, '唐寅: Ming Shi exam-case quote is not exact');
assert(!(tangExamSource?.original || []).join('').includes('程敏政主会试') && !(tangExamSource?.original || []).join('').includes('寅亦下诏狱'), '唐寅: paraphrase remains inside primary-source original');
const dossierIdentityClaim = tangYinDossier.claims?.[0]?.claim || '';
const dossierExamClaim = tangYinDossier.claims?.[2]?.claim || '';
const dossierBoundaries = tangYinDossier.boundaries || [];
assert(dossierIdentityClaim.includes('《明史》卷286只记唐寅字伯虎、一字子畏') && dossierIdentityClaim.includes('故宫博物院') && dossierIdentityClaim.includes('吴县人'), '唐寅 dossier: identity source support not separated');
assert(dossierExamClaim.includes(expectedTangExamOriginal), '唐寅 dossier: exam-case exact source sequence missing');
assert(dossierBoundaries.some(item => item.includes('《明史》卷286') && item.includes('不支持“吴县人”') && item.includes('故宫博物院')), '唐寅 dossier: hometown source boundary missing');
const yuMobilization = (pages.于谦?.scenes?.[1]?.primarySource?.original || []).join('');
for (const term of ['两京', '河南', '山东', '南京', '江北', '北京诸府', '运粮军']) {
  assert(yuMobilization.includes(term), `于谦: mobilization source missing ${term}`);
}
assert(pages.戚继光?.feature?.items?.[7]?.label === '检验与成法', '戚继光: item 8 must use evidence-safe label');
const qiPageText = JSON.stringify(pages.戚继光 || {});
assert(!qiPageText.includes('支持者离场后，将领与体系一起暴露政治依赖'), '戚继光: obsolete scene title remains');
assert(qiPageText.includes('支持者离场后，将领与体系一同暴露出对政治支持的依赖'), '戚继光: revised scene title missing');
const yuSlice = JSON.stringify(historicalSlices.于谦 || {});
const tangSlice = JSON.stringify(historicalSlices.唐寅 || {});
const qiSlice = JSON.stringify(historicalSlices.戚继光 || {});
assert(!yuSlice.includes('必须被清算') && yuSlice.includes('不能反证'), '于谦: historical slice implies deterministic purge');
assert(!/长期不稳定|改变了.{0,12}轨迹/.test(tangSlice) && tangSlice.includes('以卖画为生') && tangSlice.includes('不足以连续还原'), '唐寅: historical slice overstates economic trajectory');
assert(!/缺额|旧军队不能打/.test(qiSlice) && qiSlice.includes('不习战'), '戚继光: historical slice overstates old army condition');

const rendererFixtures = [
  {
    name: '于谦',
    feature: {
      type: 'crisis-decision',
      eyebrow: 'CRISIS DECISION',
      title: '危机中的六步决策',
      intro: '只验证专属渲染结构，不替代人物内容数据。',
      items: Array.from({length: 6}, (_, index) => ({label: `决策 ${index + 1}`, text: `第 ${index + 1} 步的可测试说明。`})),
      conclusion: '决策链结论。'
    },
    counts: {decisionSteps: 6, trainingParts: 0, trainingBooks: 0}
  },
  {
    name: '戚继光',
    feature: {
      type: 'training-system',
      eyebrow: 'TRAINING SYSTEM',
      title: '训练系统的八个部分',
      intro: '只验证专属渲染结构，不替代人物内容数据。',
      items: Array.from({length: 8}, (_, index) => ({label: `训练 ${index + 1}`, task: `任务 ${index + 1}`, method: `方法 ${index + 1}`, dependency: `条件 ${index + 1}`})),
      books: [
        {title: '《纪效新书》', environment: '东南环境', use: '训练与编组用途。'},
        {title: '《练兵实纪》', environment: '蓟镇环境', use: '边防训练用途。'}
      ],
      conclusion: '训练系统结论。'
    },
    counts: {decisionSteps: 0, trainingParts: 8, trainingBooks: 2}
  }
];

async function verifyRendererFixtures() {
  const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const fixturePage = await browser.newPage({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1});
    for (const viewport of [{label: 'desktop', width: 1440, height: 1000}, {label: 'mobile', width: 390, height: 844}]) {
      await fixturePage.setViewportSize({width: viewport.width, height: viewport.height});
      for (const fixture of rendererFixtures) {
        await fixturePage.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${personPageCss}</style></head><body>${renderFeature({feature: fixture.feature}, fixture.name)}</body></html>`);
        const result = await fixturePage.evaluate(() => ({
          decisionSteps: document.querySelectorAll('.feature-crisis-decision .decision-step').length,
          trainingParts: document.querySelectorAll('.feature-training-system .training-part').length,
          trainingBooks: document.querySelectorAll('.feature-training-system .training-book').length,
          bodyWidth: document.body.scrollWidth,
          viewport: innerWidth
        }));
        assert(result.decisionSteps === fixture.counts.decisionSteps, `${fixture.name}: fixture ${viewport.label} decision-step count`);
        assert(result.trainingParts === fixture.counts.trainingParts, `${fixture.name}: fixture ${viewport.label} training-part count`);
        assert(result.trainingBooks === fixture.counts.trainingBooks, `${fixture.name}: fixture ${viewport.label} training-book count`);
        assert(result.bodyWidth === result.viewport, `${fixture.name}: fixture ${viewport.label} horizontal overflow`);
      }
    }
  } finally {
    await browser.close();
  }
}

const rendererErrorCountBefore = errors.length;
await verifyRendererFixtures();
if (errors.length === rendererErrorCountBefore) {
  console.log('Batch 6 renderer fixture 通过：桌面/移动端 6/8/2 selectors 与无横向溢出。');
}

if (!errors.length) {
  const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
  const hallUrl = name => `${pathToFileURL(path.join(root, 'people.html')).href}?person=${encodeURIComponent(name)}`;
  const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1});
    for (const name of names) {
      await page.goto(hallUrl(name), {waitUntil: 'networkidle'});
      const drawer = await page.evaluate(() => {
        const tableRow = [...document.querySelectorAll('#rows tr[data-id]')].find(row => row.querySelector('.name')?.textContent.trim() === '唐寅');
        return {
        question: document.querySelector('#detail .profile-preview-head h5')?.textContent.trim() || '',
        lead: document.querySelector('#detail .profile-preview > p')?.textContent.trim() || '',
        nodes: [...document.querySelectorAll('#detail .profile-quick-node')].map(node => ({
          year: node.querySelector('.profile-quick-date b')?.textContent.trim() || '',
          reignYear: node.querySelector('.profile-quick-reign')?.textContent.trim() || '',
          title: node.querySelector('.profile-quick-copy > span')?.textContent.trim() || '',
          preview: node.querySelector('.profile-quick-summary')?.textContent.trim() || ''
        })),
        enter: document.querySelector('#detail .profile-enter')?.getAttribute('href') || '',
        lifeFact: [...document.querySelectorAll('#detail .facts > .fact')].find(node => node.querySelector('span')?.textContent.trim() === '生卒 / 寿命')?.textContent.trim() || '',
        period: document.querySelector('#detail .person-period')?.textContent.trim() || '',
        seal: document.querySelector('#detail .seal')?.textContent.trim() || '',
        tableLife: tableRow?.children[3]?.textContent.trim() || '',
        tableConfidence: tableRow?.children[12]?.textContent.trim() || '',
        bodyWidth: document.body.scrollWidth,
        viewport: innerWidth
        };
      });
      assert(Boolean(drawer.question && drawer.lead), `${name}: drawer question or lead missing`);
      assert(drawer.nodes.length >= 5 && drawer.nodes.length <= 6, `${name}: desktop quick-node count`);
      assert(drawer.nodes.every(node => node.year && node.reignYear && node.title && node.preview), `${name}: desktop quick-node incomplete`);
      assert(drawer.enter === `people/${routes[name]}.html`, `${name}: wrong independent page target`);
      if (name === '唐寅') {
        assert(drawer.tableLife.includes(expectedTangDisplay.birthDeath) && drawer.tableLife.includes(expectedTangDisplay.lifespan), '唐寅: table lifespan boundary missing');
        assert(drawer.tableConfidence === expectedTangDisplay.confidence, '唐寅: table confidence boundary missing');
        assert(drawer.lifeFact.includes(expectedTangDisplay.birthDeath) && drawer.lifeFact.includes(expectedTangDisplay.lifespan), '唐寅: drawer lifespan boundary missing');
        assert(drawer.period.includes('1523或1524'), '唐寅: drawer period boundary missing');
        assert(drawer.seal.includes(expectedTangDisplay.confidence), '唐寅: drawer confidence boundary missing');
      }
      assert(drawer.bodyWidth === drawer.viewport, `${name}: desktop horizontal overflow`);
    }
    const fallbackPage = await browser.newPage({viewport: {width: 1440, height: 1000}, javaScriptEnabled: false});
    await fallbackPage.goto(pathToFileURL(path.join(root, 'people.html')).href, {waitUntil: 'load'});
    const fallbackTangRow = fallbackPage.locator('#rows tr').filter({hasText: '唐寅'}).first();
    const fallbackTangLife = (await fallbackTangRow.locator('td').nth(3).textContent())?.trim() || '';
    const fallbackTangConfidence = (await fallbackTangRow.locator('td').nth(12).textContent())?.trim() || '';
    assert(fallbackTangLife.includes(expectedTangDisplay.birthDeath) && fallbackTangLife.includes(expectedTangDisplay.lifespan), '唐寅: fallback table lifespan boundary missing');
    assert(fallbackTangConfidence === expectedTangDisplay.confidence, '唐寅: fallback table confidence boundary missing');
    await fallbackPage.close();
    const sourceProviderChecks = [
      {name: '于谦', index: 0, expected: '维基文库录入本'},
      {name: '于谦', index: 2, expected: '识典古籍数字文本'},
      {name: '唐寅', index: 5, expected: '故宫博物院馆藏页'}
    ];
    for (const check of sourceProviderChecks) {
      const personUrl = pathToFileURL(path.join(root, 'people', `${routes[check.name]}.html`)).href;
      await page.goto(personUrl, {waitUntil: 'networkidle'});
      await page.locator(`.source-trigger[data-source-index="${check.index}"]`).click();
      const provider = (await page.locator('#sourceDialogConfidence').textContent())?.trim() || '';
      assert(provider.includes(check.expected), `${check.name}: source provider mismatch for scene ${check.index + 1}`);
      await page.locator('#sourceDialogClose').click();
    }
    await page.goto(pathToFileURL(path.join(root, 'people', 'tang-yin.html')).href, {waitUntil: 'networkidle'});
    const tangHero = await page.evaluate(() => ({
      subtitle: document.querySelector('.hero h1 small')?.textContent.trim() || '',
      facts: [...document.querySelectorAll('.hero-fact')].map(node => node.textContent.trim())
    }));
    assert(tangHero.subtitle.includes(expectedTangDisplay.birthDeath), '唐寅: independent-page birth-death boundary missing');
    assert(tangHero.facts.some(value => value.includes(expectedTangDisplay.lifespan)), '唐寅: independent-page lifespan boundary missing');
    assert(tangHero.facts.some(value => value.includes(expectedTangDisplay.confidence)), '唐寅: independent-page confidence boundary missing');
    await page.setViewportSize({width: 390, height: 844});
    for (const name of names) {
      await page.goto(hallUrl(name), {waitUntil: 'networkidle'});
      if (name === '唐寅') {
        const artworkImages = page.locator('.art-card img');
        const artworkCount = await artworkImages.count();
        for (let index = 0; index < artworkCount; index += 1) {
          await artworkImages.nth(index).scrollIntoViewIfNeeded();
        }
        await page.waitForFunction(() => {
          const images = [...document.querySelectorAll('.art-card img')];
          return images.length > 0 && images.every(image => image.complete);
        });
      }
      const mobile = await page.evaluate(featureSelector => ({
        pathname: decodeURIComponent(location.pathname),
        chapters: document.querySelectorAll('.story > .chapter').length,
        feature: document.querySelector(featureSelector) !== null,
        decisionSteps: document.querySelectorAll('.feature-crisis-decision .decision-step').length,
        trainingParts: document.querySelectorAll('.feature-training-system .training-part').length,
        trainingBooks: document.querySelectorAll('.feature-training-system .training-book').length,
        artworkImages: [...document.querySelectorAll('.art-card img')].map(image => image.complete && image.naturalWidth > 0),
        bodyWidth: document.body.scrollWidth,
        viewport: innerWidth
      }), mobileFeatureSelector[name]);
      assert(mobile.pathname.endsWith(`/people/${routes[name]}.html`), `${name}: mobile route did not redirect`);
      assert(mobile.chapters >= 5 && mobile.chapters <= 6, `${name}: mobile chapter count`);
      assert(mobile.feature, `${name}: mobile feature missing`);
      if (name === '于谦') assert(mobile.decisionSteps === 6, '于谦: mobile decision-step count');
      if (name === '戚继光') {
        assert(mobile.trainingParts === 8, '戚继光: mobile training-part count');
        assert(mobile.trainingBooks === 2, '戚继光: mobile training-book count');
      }
      if (name === '唐寅') assert(hasExpectedArtworkImages(mobile.artworkImages, creative.people?.唐寅?.works?.length ?? 0), '唐寅: artwork image count or load failed');
      assert(mobile.bodyWidth === mobile.viewport, `${name}: mobile horizontal overflow`);
    }
  } finally {
    await browser.close();
  }
}

if (errors.length) {
  console.error(`人物文案第六批未通过（${errors.length}项）：`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('人物文案第六批通过：三人人物卡、场景证据、差异化展项与桌面/移动端页面完整。');
