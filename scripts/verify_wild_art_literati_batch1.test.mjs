import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('.');
const targets = ['沈周', '仇英', '徐渭', '马守真', '文徵明'];

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

async function allPersonPages() {
  const files = (await fs.readdir(path.join(root, 'data')))
    .filter((file) => /^ming_person_pages.*\.json$/.test(file));
  const pages = {};
  for (const file of files) {
    const data = await readJson(path.join('data', file));
    Object.assign(pages, data.people || {});
  }
  return pages;
}

test('艺术与文人网络第一批五人全部进入独立人物页', async () => {
  const pages = await allPersonPages();
  for (const name of targets) assert.ok(pages[name], `${name}应有独立人物页数据`);

  const selected = targets.map((name) => pages[name]);
  assert.equal(new Set(selected.map((page) => page.slug)).size, targets.length, 'slug必须互不重复');
  assert.equal(new Set(selected.map((page) => page.heroQuestion)).size, targets.length, '核心问题必须因人而异');
  assert.equal(new Set(selected.map((page) => page.feature?.type)).size, targets.length, '特色模块不得套用同一类型');

  for (const [index, page] of selected.entries()) {
    const name = targets[index];
    assert.equal(page.readingMode, 'clear-biography', `${name}应使用清晰传记模式`);
    assert.ok(page.scenes.length >= 4 && page.scenes.length <= 6, `${name}应有4至6幕`);
    assert.ok(page.sources.length >= 3, `${name}至少需要三项来源`);
    assert.ok(page.sources.every((source) => /^https:\/\//.test(source.url)), `${name}来源链接必须为HTTPS`);
    for (const [sceneIndex, scene] of page.scenes.entries()) {
      const label = `${name}第${sceneIndex + 1}幕`;
      assert.ok(scene.year, `${label}缺公历时间`);
      assert.ok(scene.reignYears, `${label}缺朝次年号`);
      assert.equal(scene.body.length, 2, `${label}应有两段正文`);
      assert.ok(scene.evidenceNote, `${label}缺史料依据`);
      assert.match(scene.confidence, /^(高|中|低)$/, `${label}置信度无效`);
      assert.ok(scene.interpretationBoundary, `${label}缺解释边界`);
      assert.match(scene.primarySource?.url || '', /^https:\/\//, `${label}缺可打开的证据链接`);
      assert.ok(scene.primarySource?.original?.length, `${label}缺原文或馆藏记录摘录`);
    }
  }
});

test('争议、生卒与伤害责任没有被艺术家传奇抹平', async () => {
  const pages = await allPersonPages();
  const xu = JSON.stringify(pages['徐渭'] || {});
  assert.match(xu, /杀妻|杀其继室/);
  assert.match(xu, /责任|不能.*浪漫化|不作.*诊断/);
  assert.doesNotMatch(xu, /艺术疗愈/);

  const ma = JSON.stringify(pages['马守真'] || {});
  assert.match(ma, /传马守真|归属|鉴定/);
  assert.match(ma, /王穉登|王稚登/);
  assert.match(ma, /不能.*爱情|不.*私人感情|才子佳人/);

  const qiu = JSON.stringify(pages['仇英'] || {});
  assert.match(qiu, /约1505|生年.*争议|约149/);
  assert.match(qiu, /工匠|漆工/);

  const wen = JSON.stringify(pages['文徵明'] || {});
  assert.match(wen, /十次|十试/);
  assert.match(wen, /1523/);
  assert.match(wen, /1526/);
});

test('作品模块覆盖五人并保留作品归属等级', async () => {
  const creative = await readJson('data/ming_creative_works.json');
  for (const name of targets) {
    assert.ok(creative.people[name], `${name}缺作品模块`);
    assert.ok(creative.people[name].works?.length >= 2, `${name}至少需要两件可核验作品`);
    for (const work of creative.people[name].works) {
      assert.match(work.display || '', /^(panorama|landscape|portrait)$/, `${name}《${work.title}》缺画幅展陈类型`);
      await fs.access(path.join(root, 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9', work.image));
    }
  }
  assert.match(JSON.stringify(creative.people['马守真']), /传马守真/);
  assert.match(JSON.stringify(creative.people['文徵明']), /故宫博物院|大都会艺术博物馆/);
});

test('横向长卷只保留通栏总览，局部查看统一交给全屏查看器', async () => {
  process.env.MING_RENDERER_FIXTURE = '1';
  const { personPageCss, renderFeature } = await import(`./build_ming_person_pages.mjs?art-layout=${Date.now()}`);
  const pages = await allPersonPages();
  const qiuHtml = renderFeature(pages['仇英'], '仇英');
  const shenHtml = renderFeature(pages['沈周'], '沈周');
  const wenHtml = renderFeature(pages['文徵明'], '文徵明');

  for (const [name, html] of [['仇英', qiuHtml], ['沈周', shenHtml]]) {
    assert.match(html, /art-card-panorama/, `${name}长卷没有切换为通栏卡片`);
    assert.match(html, /art-panorama-overview/, `${name}长卷缺完整总览`);
    assert.match(html, /data-artwork-open/, `${name}长卷缺查看大图入口`);
    assert.doesNotMatch(html, /art-panorama-detail/, `${name}长卷仍重复渲染内嵌细节带`);
  }
  assert.doesNotMatch(qiuHtml, /请横向拖动|下方横向浏览细节/, '仇英页仍提示已经删除的内嵌长卷交互');
  assert.doesNotMatch(wenHtml, /art-card-panorama/, '文徵明立轴不应误用长卷布局');
  assert.match(personPageCss, /\.art-card-panorama\{[^}]*grid-column:1\/-1/);
  assert.match(personPageCss, /\.art-panorama-overview img\{[^}]*object-fit:contain/);
  assert.doesNotMatch(personPageCss, /\.art-panorama-detail\{/);
});

test('构建后的五张独立页和按需详情数据可访问', async () => {
  const pages = await allPersonPages();
  const museumRoot = path.join(root, 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
  for (const name of targets) {
    const page = pages[name];
    assert.ok(page, `${name}缺页面数据，无法核验构建结果`);
    const html = await fs.readFile(path.join(museumRoot, 'people', `${page.slug}.html`), 'utf8');
    assert.match(html, new RegExp(`<h1>${name}`));
    assert.match(html, new RegExp(page.feature.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /WORKS IN THE NETWORK · 作品现场/);
    assert.match(html, new RegExp(creativeImageName(name)));
    const detail = await readJson(path.join(
      'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/assets/data/people-details',
      `${page.slug}.json`,
    ));
    assert.equal(detail.drawer.person.name, name);
    assert.equal(detail.drawer.personPage.slug, page.slug);
    assert.ok(detail.drawer.creativeWorks?.works?.length, `${name}抽屉缺作品模块`);
  }
});

function creativeImageName(name) {
  const images = {
    '沈周': 'shen-zhou-autumn-colors.jpg',
    '仇英': 'qiu-ying-han-palace.jpg',
    '徐渭': 'xu-wei-grapes.jpg',
    '马守真': 'ma-shouzhen-orchid-rock.jpg',
    '文徵明': 'wen-zhengming-living-aloft.jpg',
  };
  return images[name];
}
