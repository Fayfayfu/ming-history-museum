import fs from 'node:fs/promises';

const outputRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const data = JSON.parse(await fs.readFile('data/ming_person_pages.json', 'utf8'));
const page = data.people?.朱元璋;
const errors = [];

const clearModePeople = Object.entries(data.people || {}).filter(([, person]) => person.readingMode === 'clear-biography').map(([name]) => name);
if (JSON.stringify(clearModePeople) !== JSON.stringify(['朱元璋'])) errors.push(`clear-biography 应只用于朱元璋，实际为：${clearModePeople.join('、') || '无'}`);

if (!page) errors.push('缺少朱元璋人物页数据');
if (page?.readingMode !== 'clear-biography') errors.push('朱元璋未启用 clear-biography 阅读模式');
if (page?.scenes?.length !== 6) errors.push(`朱元璋阶段数量应为 6，实际为 ${page?.scenes?.length ?? 0}`);

for (const [index, scene] of (page?.scenes || []).entries()) {
  const previewLength = [...(scene.preview || '')].length;
  if (previewLength < 20 || previewLength > 72) errors.push(`第 ${index + 1} 幕 preview 应为 20—72 字的一句摘要，实际为 ${previewLength} 字`);
  if (!scene.reignYears) errors.push(`第 ${index + 1} 幕缺少年号纪年`);
  if (!scene.evidenceNote) errors.push(`第 ${index + 1} 幕缺少 evidenceNote`);
  if (!scene.primarySource?.location) errors.push(`第 ${index + 1} 幕缺少原典位置`);
}

const expectedTitles = ['在饥荒中失去家人', '参加起义军', '击败主要对手', '建立明朝', '废除丞相', '继承安排留下危机'];
for (const [index, title] of expectedTitles.entries()) {
  if (page?.scenes?.[index]?.title !== title) errors.push(`第 ${index + 1} 幕标题应为“${title}”`);
}

let peopleHtml = '';
let personHtml = '';
try {
  peopleHtml = await fs.readFile(`${outputRoot}/people.html`, 'utf8');
  personHtml = await fs.readFile(`${outputRoot}/people/zhu-yuan-zhang.html`, 'utf8');
} catch (error) {
  errors.push(`构建产物不可读：${error.message}`);
}

if (peopleHtml) {
  const datasetMatch = peopleHtml.match(/<script id="dataset" type="application\/json">([\s\S]*?)<\/script>/);
  const builtData = datasetMatch ? JSON.parse(datasetMatch[1]) : null;
  const builtPage = builtData?.personPages?.people?.朱元璋;
  if (!builtPage) errors.push('人物馆构建产物没有嵌入朱元璋人物页数据');
  if (builtPage?.scenes?.[0]?.preview !== page?.scenes?.[0]?.preview) errors.push('人物馆构建产物没有同步第一幕简短摘要');
  if (builtPage?.scenes?.[5]?.preview !== page?.scenes?.[5]?.preview) errors.push('人物馆构建产物没有同步继承阶段简短摘要');
  if (!peopleHtml.includes('class="profile-quick-summary"')) errors.push('人物馆生成器没有速览摘要渲染合同');
  if (!peopleHtml.includes('class="profile-quick-reign"')) errors.push('人物馆生成器没有双纪年渲染合同');
}

if (personHtml) {
  if (!personHtml.includes('class="chapter-source-note"')) errors.push('独立人物页没有渲染段末证据浅注');
  if (!personHtml.includes('史料依据')) errors.push('独立人物页浅注缺少“史料依据”标签');
  if (!personHtml.includes('解释边界')) errors.push('独立人物页没有渲染必要的解释边界');
  if (!personHtml.includes('查看原文')) errors.push('独立人物页没有保留查看原文入口');
  if (!personHtml.includes('元 · 至正四年至十二年') || !personHtml.includes('明 · 洪武二十五年至三十一年')) errors.push('独立人物页没有渲染公元与年号双纪年');
  if (personHtml.includes('FACT ANCHOR · 史实支点')) errors.push('朱元璋仍在使用旧的醒目史实支点块');
  if (personHtml.includes('REASONED INFERENCE · 合理推演')) errors.push('朱元璋仍在使用旧的醒目合理推演块');
}

for (const [name, slug] of [['朱棣', 'zhu-di'], ['王守仁', 'wang-shou-ren']]) {
  try {
    const legacyHtml = await fs.readFile(`${outputRoot}/people/${slug}.html`, 'utf8');
    if (!legacyHtml.includes('FACT ANCHOR · 史实支点') || !legacyHtml.includes('REASONED INFERENCE · 合理推演')) errors.push(`${name}不应被切换到朱元璋专用浅注模式`);
  } catch (error) {
    errors.push(`${name}构建产物不可读：${error.message}`);
  }
}

if (errors.length) {
  console.error(`朱元璋人物页可读性验证失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('朱元璋人物页可读性验证通过：6 幕清晰生平、速览事实摘要、段末证据浅注和原文入口均已就绪。');
