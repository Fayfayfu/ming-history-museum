import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const taskId = '019fc8d2-0e97-7ed3-a23b-47b434c01dc9';
const archive = path.join(root, 'data/media-originals/imagegen-archive', taskId);
const manifest = JSON.parse(await readFile(path.join(archive, 'manifest.json'), 'utf8'));
const failures = [];

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const seen = new Set();
for (const entry of manifest.files) {
  if (seen.has(entry.file)) failures.push(`重复归档路径：${entry.file}`);
  seen.add(entry.file);
  try {
    const bytes = await readFile(path.join(root, entry.file));
    if (bytes.length !== entry.bytes) failures.push(`文件大小不符：${entry.file}`);
    if (hash(bytes) !== entry.sha256) failures.push(`SHA-256不符：${entry.file}`);
  } catch {
    failures.push(`文件不存在：${entry.file}`);
  }
}

const exhibitionData = JSON.parse(await readFile(path.join(root, 'data/ming_exhibitions.json'), 'utf8'));
for (const exhibition of exhibitionData.exhibitions) {
  const htmlPath = path.join(root, 'outputs', taskId, '明史数字博物馆', `exhibit-${exhibition.id}.html`);
  const html = await readFile(htmlPath, 'utf8');
  for (const image of [exhibition.scene.image, exhibition.perspectiveRoom.image]) {
    if (!html.includes(`src="${image}"`)) failures.push(`专题页未展示：${exhibition.id} -> ${image}`);
  }
}

const summary = {
  manifestEntries: manifest.files.length,
  uniquePaths: seen.size,
  portraits: manifest.files.filter((entry) => entry.category === 'portrait').length,
  scenes: manifest.files.filter((entry) => entry.category === 'scene').length,
  adoptedScenes: manifest.files.filter((entry) => entry.category === 'scene' && entry.status === 'adopted').length,
  candidateScenes: manifest.files.filter((entry) => entry.category === 'scene' && entry.status === 'candidate').length,
  exhibitionPagesChecked: exhibitionData.exhibitions.length,
  displayedSceneSlotsChecked: exhibitionData.exhibitions.length * 2,
};

if (failures.length) {
  console.error(JSON.stringify({ summary, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ summary, result: 'PASS' }, null, 2));
