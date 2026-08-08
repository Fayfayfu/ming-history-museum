import fs from 'node:fs/promises';
import path from 'node:path';

const read = async name => JSON.parse(await fs.readFile(`data/${name}`, 'utf8'));
const core = await read('ming_core.json');
const importantChildren = await read('ming_children_important.json');
const allChildren = await read('ming_children.json');
const events = await read('ming_events.json');
const storytelling = await read('ming_storytelling.json');
const portraits = await read('ming_portraits.json');
const lineages = await read('ming_imperial_lineages.json');
const batches = [];
for (let index = 2; index <= 8; index += 1) batches.push(await read(`ming_historical_slices_batch${index}.json`));

const outputRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const validConfidence = new Set(['高', '中', '低', '未知']);
const requiredCore = ['category', 'name', 'office', 'hometown', 'summary', 'evaluation', 'confidence', 'domains'];
const requiredSlice = ['year', 'age', 'place', 'title', 'before', 'object', 'known', 'unknown', 'action', 'consequence', 'boundary', 'confidence'];
const errors = [];
const reviews = [];
const notes = [];

const duplicateNames = values => [...new Set(values.filter((name, index) => values.indexOf(name) !== index))];
const coreNames = new Set(core.map(person => person.name));
const knownNames = new Set([...coreNames, ...importantChildren.map(person => person.name), ...allChildren.map(person => person.name)]);
const duplicates = duplicateNames(core.map(person => person.name));
if (duplicates.length) errors.push(`人物主表重名：${duplicates.join('、')}`);

for (const person of core) {
  const missing = requiredCore.filter(field => person[field] === undefined || person[field] === '' || (Array.isArray(person[field]) && person[field].length === 0));
  if (missing.length) errors.push(`${person.name} 缺少字段：${missing.join('、')}`);
  if (person.category === '后妃') errors.push(`${person.name} 仍使用旧分类“后妃”`);
  if (!validConfidence.has(person.confidence)) errors.push(`${person.name} 置信度值无效：${person.confidence}`);
  if (Number.isFinite(person.birth) && Number.isFinite(person.death) && person.birth > person.death) errors.push(`${person.name} 生卒年倒置`);
  if (Number.isFinite(person.office_start) && Number.isFinite(person.office_end) && person.office_start > person.office_end) errors.push(`${person.name} 任期倒置`);
  if (typeof person.score === 'number' && (person.score < 0 || person.score > 100)) errors.push(`${person.name} 总分超出百分制`);
  const urls = [person.source1, person.source2].filter(Boolean);
  if (urls.length < 2) reviews.push(`${person.name}：人物卡少于两条来源`);
  for (const url of urls) {
    try { new URL(url); } catch { errors.push(`${person.name}：无效来源链接 ${url}`); }
  }
  if (urls.some(url => /wikipedia\.org|chinaknowledge\.de/.test(url))) reviews.push(`${person.name}：至少一条来源属于通识入口，建议补一手或专业机构来源`);
  if (urls.some(url => /^https:\/\/ctext\.org\/?(?:zh)?$/.test(url))) reviews.push(`${person.name}：使用无具体篇章的泛化来源链接`);
}

const sliceEntries = [];
for (const [name, person] of Object.entries(storytelling.people || {})) {
  if (person.historicalSlice) sliceEntries.push({name, slice: person.historicalSlice, origin: '人物深描'});
}
for (let index = 0; index < batches.length; index += 1) {
  for (const [name, slice] of Object.entries(batches[index].people || {})) sliceEntries.push({name, slice, origin: `第${index + 2}批`});
}
const duplicateSlices = duplicateNames(sliceEntries.map(item => item.name));
if (duplicateSlices.length) errors.push(`历史切片重复覆盖：${duplicateSlices.join('、')}`);
for (const {name, slice, origin} of sliceEntries) {
  if (!knownNames.has(name)) errors.push(`${origin}历史切片找不到人物主卡或子嗣记录：${name}`);
  const missing = requiredSlice.filter(field => slice[field] === undefined || slice[field] === '');
  if (missing.length) errors.push(`${name} ${origin}历史切片缺少：${missing.join('、')}`);
  if (!validConfidence.has(slice.confidence)) errors.push(`${name} ${origin}历史切片置信度值无效：${slice.confidence}`);
}

const coveredNames = new Set(sliceEntries.map(item => item.name));
const coveredCoreNames = new Set([...coveredNames].filter(name => coreNames.has(name)));
const uncovered = core.map(person => person.name).filter(name => !coveredCoreNames.has(name));
const expectedDeferred = batches.at(-1).meta?.deferred || [];
const deferredMismatch = [...new Set([...uncovered.filter(name => !expectedDeferred.includes(name)), ...expectedDeferred.filter(name => !uncovered.includes(name))])];
if (deferredMismatch.length) errors.push(`第八批待补证名单与实际未覆盖人物不一致：${deferredMismatch.join('、')}`);

const eventUnknown = [];
for (const event of events.events || []) {
  if (!event.id || !event.title || !event.year || !event.stage || !event.confidence) errors.push(`事件字段不完整：${event.id || event.title || '未命名事件'}`);
  if (!validConfidence.has(event.confidence)) errors.push(`${event.title} 置信度值无效：${event.confidence}`);
  for (const name of event.people || []) if (!knownNames.has(name)) eventUnknown.push(`${event.title} → ${name}`);
}
if (eventUnknown.length) reviews.push(`事件提及但无正式人物卡/子嗣记录（${eventUnknown.length}项）：${eventUnknown.slice(0, 20).join('；')}${eventUnknown.length > 20 ? '……' : ''}`);

const missingPortraitFiles = [];
for (const [name, portrait] of Object.entries(portraits.people || {})) {
  if (!portrait.file) continue;
  try { await fs.access(path.join(outputRoot, portrait.file)); } catch { missingPortraitFiles.push(`${name} → ${portrait.file}`); }
}
if (missingPortraitFiles.length) errors.push(`画像文件缺失：${missingPortraitFiles.join('；')}`);

const emperors = core.filter(person => person.category === '皇帝').map(person => person.name);
const lineageMissing = emperors.filter(name => !lineages.people?.[name]);
if (lineageMissing.length) errors.push(`皇帝缺少独立帝系关系：${lineageMissing.join('、')}`);
for (const name of emperors) {
  const lineage = lineages.people?.[name];
  if (!lineage) continue;
  if (!Array.isArray(lineage.relations) || lineage.relations.length < 3 || !lineage.succession || !lineage.boundary || !validConfidence.has(lineage.confidence)) errors.push(`${name} 帝系关系结构不完整`);
  if (!Array.isArray(lineage.sources) || lineage.sources.length < 2) reviews.push(`${name}：帝系来源少于两条`);
}

const categoryCounts = Object.entries(core.reduce((result, person) => {
  result[person.category] = (result[person.category] || 0) + 1;
  return result;
}, {})).sort((a, b) => b[1] - a[1]);
const confidenceCounts = Object.entries(core.reduce((result, person) => {
  result[person.confidence] = (result[person.confidence] || 0) + 1;
  return result;
}, {}));
notes.push(`重要子嗣 ${importantChildren.length} 条；全量子嗣 ${allChildren.length} 条；事件 ${(events.events || []).length} 条。`);
notes.push(`画像元数据 ${Object.keys(portraits.people || {}).length} 人，已登记文件缺失 ${missingPortraitFiles.length} 项。`);

const status = errors.length ? 'FAIL' : reviews.length ? 'PASS WITH REVIEW' : 'PASS';
const report = `# 明史数字博物馆 · 全馆质量审校

- 审校日期：2026-08-08
- 结论：**${status}**
- 结构性错误：**${errors.length}**
- 史源与内容复核项：**${reviews.length}**
- 置信度：结构检查 **高**；史实内容整体 **中**（本轮检查不能替代逐条原典校勘）

## 覆盖概况

| 项目 | 数量 |
|---|---:|
| 正式人物卡 | ${core.length} |
| 已有“历史切片”正式人物卡 | ${coveredCoreNames.size} / ${core.length} |
| 含重要子嗣的全部历史切片 | ${coveredNames.size} |
| 尚待补证人物 | ${uncovered.length} |
| 皇帝独立帝系关系 | ${Object.keys(lineages.people || {}).length} / ${emperors.length} |
| 事件 | ${(events.events || []).length} |
| 画像元数据 | ${Object.keys(portraits.people || {}).length} |

## 人物分类

${categoryCounts.map(([name, count]) => `- ${name}：${count}`).join('\n')}

## 人物卡置信度

${confidenceCounts.map(([name, count]) => `- ${name}：${count}`).join('\n')}

## 第八批待补证名单

${uncovered.length ? uncovered.map(name => `- ${name}`).join('\n') : '- 无'}

这些人物没有被模板化补写。进入下一轮前，应先把具体纪传、实录或专业机构材料补到人物卡，再写现场。

## 结构性错误

${errors.length ? errors.map(item => `- ${item}`).join('\n') : '- 无。JSON结构、人物引用、切片字段、画像文件与帝系覆盖均通过。'}

## 史源与内容复核项

${reviews.length ? reviews.map(item => `- ${item}`).join('\n') : '- 无。'}

## 方法边界

- “通过”表示数据结构一致、页面依赖可解析、核心字段齐备，不表示所有历史判断已经得到逐字原典复核。
- 史实、解释、合理推断与艺术想象必须继续分层；无法确认的心理活动只能放在明确标注的想象层。
- 维基百科、ChinaKnowledge、无具体篇章的古籍入口可用于导航，不应作为争议结论的唯一支撑。

## 备注

${notes.map(item => `- ${item}`).join('\n')}
`;

await fs.mkdir('docs', {recursive: true});
await fs.writeFile('docs/明史数字博物馆_全馆质量审校_2026-08-08.md', report);
console.log(JSON.stringify({status, core: core.length, coreSlices: coveredCoreNames.size, allSlices: coveredNames.size, uncovered, errors: errors.length, reviews: reviews.length, categories: Object.fromEntries(categoryCounts)}, null, 2));
if (errors.length) process.exit(1);
