import { access, copyFile, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const projectRoot = process.cwd();
const taskId = '019fc8d2-0e97-7ed3-a23b-47b434c01dc9';
const archiveRepoPath = `data/media-originals/imagegen-archive/${taskId}`;
const archive = path.resolve(
  archiveRepoPath,
);
const manifestPath = path.join(archive, 'manifest.json');

const adoptedScenes = {
  'yongle-capital': ['永乐迁都', '主场景', '北京营建', 'main'],
  'zheng-he-voyages': ['郑和下西洋', '主场景', '南京龙江港远航整备', 'main'],
  'tumu-crisis': ['土木堡之变', '主场景', '北京城防准备', 'main'],
  'zhang-reform': ['张居正改革', '主场景', '北京官署考成运作', 'main'],
  'imjin-war': ['万历援朝', '主场景', '平壤雪地攻城', 'main'],
  'fall-1644': ['1644王朝崩解', '主场景', '北京城破与失序', 'main'],
  'yongle-canal': ['永乐迁都', '多方视角', '大运河漕运', 'perspectives'],
  'zheng-he-port': ['郑和下西洋', '多方视角', '海外港市相遇', 'perspectives'],
  'tumu-court': ['土木堡之变', '多方视角', '败讯抵京与固守争论', 'perspectives'],
  'zhang-land-survey': ['张居正改革', '多方视角', '乡村清丈', 'perspectives'],
  'imjin-village': ['万历援朝', '多方视角', '战争后方村落', 'perspectives'],
  'fall-nanjing': ['1644王朝崩解', '多方视角', '南京留都运作', 'perspectives'],
};

const candidates = {
  'exec-ff6c65cc-0126-4c59-ae71-8661e13bb9a7.png': ['scene', '永乐迁都', '主场景', '北京营建', 'main'],
  'exec-d1efb1cd-e2ae-438b-905c-a56aa594b932.png': ['scene', '土木堡之变', '主场景', '北京城防准备', 'main'],
  'exec-f940e3b1-a809-489b-957a-de789f0213e9.png': ['scene', '张居正改革', '主场景', '北京官署考成运作', 'main'],
  'exec-0cc06699-0873-4528-a30e-471de281e4f9.png': ['scene', '万历援朝', '主场景', '平壤雪地攻城', 'main'],
  'exec-2e14562d-61f3-4449-a5af-5390b3a693d0.png': ['scene', '1644王朝崩解', '主场景', '北京城破与失序', 'main'],
  'exec-59b9d858-cc42-49c5-8481-20d1445dd595.png': ['scene', '永乐迁都', '多方视角', '大运河漕运', 'perspectives'],
  'exec-625e4783-19a3-4a54-bfb3-311046d2f304.png': ['scene', '郑和下西洋', '多方视角', '海外港市相遇', 'perspectives'],
  'exec-8275a0dc-08bd-4f9c-b16b-12b5d157a8f8.png': ['scene', '土木堡之变', '多方视角', '败讯抵京与固守争论', 'perspectives'],
  'exec-18b5105d-937d-4ba0-830f-21ea4e6cbb8a.png': ['scene', '张居正改革', '多方视角', '乡村清丈', 'perspectives'],
  'exec-62318361-2abb-429e-9baf-1f5261a5ff1e.png': ['scene', '万历援朝', '多方视角', '战争后方村落', 'perspectives'],
  'exec-27225f95-2888-43b7-b2ed-6661f1ed1f15.png': ['portrait', '张璁', 'AI想象像', '另一构图', 'portrait'],
};

function portraitName(projectFile) {
  return path.basename(projectFile, path.extname(projectFile))
    .replace(/^\d+_/, '')
    .replace(/_AI想象像_原图$/, '')
    .replace(/_AI想象像$/, '')
    .replace(/_原图$/, '');
}

function portraitOriginalPath(projectFile) {
  if (projectFile.startsWith('data/media-originals/portraits/')) return projectFile;
  const marker = '/assets/portraits/';
  const assetRelative = projectFile.split(marker)[1];
  if (!assetRelative) throw new Error(`无法解析人物资产路径：${projectFile}`);
  const extension = path.extname(assetRelative);
  const directory = path.dirname(assetRelative);
  const stem = path.basename(assetRelative, extension);
  const originalStem = stem.endsWith('_AI想象像')
    ? `${stem}_原图`
    : `${stem}_AI想象像_原图`;
  return path.posix.join('data/media-originals/portraits', directory, `${originalStem}.png`);
}

function classify(entry) {
  const originalFile = entry.originalFile || path.basename(entry.file);
  const projectFile = entry.matchingProjectFiles?.[0] || '';

  if (entry.adopted && projectFile.includes('/portraits/')) {
    const person = portraitName(projectFile);
    return {
      category: 'portrait',
      subtype: 'character-portrait',
      status: 'adopted',
      displayName: `${person} AI想象像`,
      confidence: '高（SHA-256精确匹配项目采用文件）',
      file: portraitOriginalPath(projectFile),
    };
  }

  if (entry.adopted && projectFile.includes('/exhibitions/')) {
    const slug = path.basename(projectFile, path.extname(projectFile));
    const [topic, slot, content, group] = adoptedScenes[slug];
    return {
      category: 'scene',
      subtype: group === 'main' ? 'exhibition-main' : 'exhibition-perspective',
      status: 'adopted',
      displayName: `${topic}｜${slot}｜${content}`,
      confidence: '高（SHA-256精确匹配项目采用文件）',
      file: `data/media-originals/scenes/adopted/专题_${topic}_${slot}_${content}_采用.png`,
    };
  }

  const candidate = candidates[originalFile];
  if (!candidate) throw new Error(`未定义分类：${originalFile}`);
  const [type, topic, slot, content, group] = candidate;
  if (type === 'portrait') {
    return {
      category: 'portrait',
      subtype: 'character-portrait',
      status: 'candidate',
      displayName: `${topic} AI想象像｜${content}`,
      confidence: '高（与已采用张璁稿同批生成，人物和提示词锚点一致）',
      file: 'data/media-originals/portraits/batch-15/1501_张璁_AI想象像_候选02.png',
    };
  }
  return {
    category: 'scene',
    subtype: group === 'main' ? 'exhibition-main' : 'exhibition-perspective',
    status: 'candidate',
    displayName: `${topic}｜${slot}｜${content}｜候选02`,
    confidence: '高（画面内容、生成批次、展览提示与对应已采用稿一致）',
    file: `data/media-originals/scenes/candidates/专题_${topic}_${slot}_${content}_候选02.png`,
  };
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const updatedFiles = [];
const cleanupSources = new Set();

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function sha256(file) {
  const bytes = await readFile(file);
  return createHash('sha256').update(bytes).digest('hex');
}

function resolveRecordedFile(file) {
  return file.startsWith('data/')
    ? path.join(projectRoot, file)
    : path.join(archive, file);
}

for (const entry of manifest.files) {
  const sourceRelative = entry.file;
  const recordedSource = resolveRecordedFile(sourceRelative);
  const classified = classify(entry);
  const destination = path.join(projectRoot, classified.file);
  await mkdir(path.dirname(destination), { recursive: true });

  const candidatesForSource = [
    destination,
    recordedSource,
    ...(entry.matchingProjectFiles || []).map((file) => path.join(projectRoot, file)),
  ];
  let exactSource = null;
  for (const file of [...new Set(candidatesForSource)]) {
    if (await exists(file) && await sha256(file) === entry.sha256) {
      exactSource = file;
      break;
    }
  }
  if (!exactSource) throw new Error(`找不到哈希匹配的原图来源：${entry.originalFile || entry.file}`);

  if (!(await exists(destination))) await copyFile(exactSource, destination);
  if (await sha256(destination) !== entry.sha256) {
    throw new Error(`目标文件哈希冲突，拒绝覆盖：${classified.file}`);
  }
  const isOldArchiveAsset = recordedSource.startsWith(path.join(archive, 'portraits'))
    || recordedSource.startsWith(path.join(archive, 'scenes'));
  if (recordedSource !== destination && isOldArchiveAsset) {
    if (await exists(recordedSource) && await sha256(recordedSource) === entry.sha256) {
      cleanupSources.add(recordedSource);
    }
  }
  updatedFiles.push({
    ...entry,
    ...classified,
    originalFile: entry.originalFile || path.basename(sourceRelative),
    file: classified.file,
  });
}

for (const source of cleanupSources) await unlink(source);

updatedFiles.sort((a, b) => a.file.localeCompare(b.file, 'zh-CN'));
const count = (predicate) => updatedFiles.filter(predicate).length;
manifest.version = 8;
manifest.organizedAt = '2026-08-08T23:55:00+08:00';
manifest.policy = '人物原图统一存入data/media-originals/portraits，场景原图统一存入data/media-originals/scenes；场景仅按adopted与candidates分层，主场景与多方视角由文件名和subtype表达；originalFile保留最初exec-UUID，SHA-256与matchingProjectFiles保留来源及采用链。';
manifest.summary = {
  images: updatedFiles.length,
  bytes: updatedFiles.reduce((sum, file) => sum + file.bytes, 0),
  adopted: count((file) => file.status === 'adopted'),
  candidates: count((file) => file.status === 'candidate'),
  portraits: count((file) => file.category === 'portrait'),
  scenes: count((file) => file.category === 'scene'),
  sceneAdopted: count((file) => file.category === 'scene' && file.status === 'adopted'),
  sceneCandidates: count((file) => file.category === 'scene' && file.status === 'candidate'),
};
manifest.files = updatedFiles;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const sceneRows = updatedFiles
  .filter((file) => file.category === 'scene')
  .map((file) => {
    const use = file.status === 'adopted'
      ? `已接入：${file.matchingProjectFiles.find((item) => item.includes('/assets/exhibitions/')) || '项目资产'}`
      : '未接入网站；保留为同主题候选/二次叙事素材';
    return `| ${file.displayName} | ${file.status === 'adopted' ? '已采用' : '候选'} | \`${file.file}\` | ${use} | ${file.confidence} |`;
  })
  .join('\n');

const portraitRows = updatedFiles
  .filter((file) => file.category === 'portrait')
  .map((file) => `| ${file.displayName} | ${file.status === 'adopted' ? '已采用' : '候选'} | \`${file.file}\` | \`${file.originalFile}\` |`)
  .join('\n');

const catalog = `# Imagegen 原图分类目录\n\n` +
  `任务归档：\`019fc8d2-0e97-7ed3-a23b-47b434c01dc9\`  \n` +
  `整理日期：2026-08-08\n\n` +
  `## 结论\n\n` +
  `- 共 76 张：54 张人物画像、22 张大场景图。\n` +
  `- 已采用 65 张：53 张人物画像、6 张专题主场景、6 张专题“多方视角”场景。\n` +
  `- 未采用 11 张：1 张张璁人物候选稿、10 张专题场景候选稿。\n` +
  `- 当前网站并非只使用少量场景：12 个正式场景位全部有图并已写入构建后的专题页；另外 10 张是同一批主题的候选构图，当前没有网页引用。\n\n` +
  `## 目录与命名规则\n\n` +
  `- \`data/media-originals/portraits/\`：全部人物原图；沿用 \`batch-N/编号_姓名_AI想象像_原图.png\`，通用人物稿放入 \`imagined/\`。\n` +
  `- \`data/media-originals/scenes/adopted/\`：12 张网站已采用场景；主场景与多方视角直接看文件名。\n` +
  `- \`data/media-originals/scenes/candidates/\`：10 张同主题候选稿；主场景与多方视角直接看文件名。\n` +
  `- 人物命名：\`编号_姓名_AI想象像_原图或候选序号.png\`。\n` +
  `- 场景命名：\`专题_专题名_场景位_内容_采用或候选序号.png\`。\n` +
  `- \`manifest.json\` 的 \`originalFile\` 保留原始 \`exec-UUID\`，\`sha256\` 和 \`matchingProjectFiles\` 保留完整采用链。\n\n` +
  `## 场景图清单\n\n` +
  `| 内容 | 状态 | 归档路径 | 网站使用情况 | 识别置信度 |\n` +
  `|---|---|---|---|---|\n${sceneRows}\n\n` +
  `## 人物画像清单\n\n` +
  `| 人物 | 状态 | 归档路径 | 原始文件名 |\n` +
  `|---|---|---|---|\n${portraitRows}\n`;

await writeFile(path.join(archive, 'CATALOG.md'), catalog);
console.log(JSON.stringify(manifest.summary, null, 2));
