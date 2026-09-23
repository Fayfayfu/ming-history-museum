import fs from 'node:fs/promises';
import { MUSEUM_BOUNDARIES, MUSEUM_TIMELINE_SCOPE } from './lib/museum_temporal_scope.mjs';

const core = JSON.parse(await fs.readFile('data/ming_core.json', 'utf8'));
const children = JSON.parse(await fs.readFile('data/ming_children_important.json', 'utf8'));
const events = JSON.parse(await fs.readFile('data/ming_events.json', 'utf8'));
const southernMingBranch = JSON.parse(await fs.readFile('data/ming_southern_ming_branch.json', 'utf8'));
const politicalPhaseData = JSON.parse(await fs.readFile('data/ming_political_phases.json', 'utf8'));

const WIDTH = 5200;
const HEIGHT = 3000;
const PLOT = { left: 150, right: WIDTH - 150, top: 260, bottom: HEIGHT - 250 };
const outDir = 'data/diagram';

const emperorOrder = ['朱元璋','朱允炆','朱棣','朱高炽','朱瞻基','朱祁镇','朱祁钰','朱见深','朱祐樘','朱厚照','朱厚熜','朱载坖','朱翊钧','朱常洛','朱由校','朱由检'];
const parentAliases = {
  '明太祖朱元璋':'朱元璋','建文帝朱允炆':'朱允炆','明成祖朱棣':'朱棣','明仁宗朱高熾':'朱高炽',
  '明宣宗朱瞻基':'朱瞻基','明英宗朱祁鎮':'朱祁镇','景泰帝朱祁鈺':'朱祁钰','明憲宗朱見深':'朱见深',
  '明孝宗 朱祐樘':'朱祐樘','明孝宗朱祐樘':'朱祐樘','明武宗朱厚照':'朱厚照','明世宗朱厚熜':'朱厚熜',
  '明穆宗朱載坖':'朱载坖','明神宗朱翊鈞':'朱翊钧','明光宗朱常洛':'朱常洛','明熹宗朱由校':'朱由校',
  '崇祯帝朱由檢':'朱由检'
};

const normalize = (value) => String(value ?? '')
  .replaceAll('熾','炽').replaceAll('鎮','镇').replaceAll('鈺','钰').replaceAll('見','见')
  .replaceAll('載','载').replaceAll('鈞','钧').replaceAll('檢','检').replaceAll('權','权')
  .replaceAll('標','标').replaceAll('潤','润').replaceAll('煥','焕').replaceAll('獻','献')
  .replace(/\s+/g, '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rand = (s, salt = '') => (hash(`${s}:${salt}`) % 100000) / 100000;
const southernMingByName = new Map((southernMingBranch.primary || []).map(item => [normalize(item.name), item]));

function roleOf(person) {
  if (southernMingByName.has(normalize(person.name))) return 'southern';
  if (person.category === '皇帝') return 'emperor';
  if (['文臣','武官','宦官'].includes(person.category)) return 'official';
  if (person.category === '在野人物') return 'commoner';
  if (person.category === '政权人物') return 'regime';
  if (person.category === '域外人物') return 'foreign';
  return 'royal';
}
function networkPoliticalPhases(name) {
  return (politicalPhaseData.people?.[name] || []).map(({ regime, start, end, role, confidence }) => ({
    regime, start, end, role, confidence,
  }));
}

const nodes = core.map(p => ({
  ...p,
  id: normalize(p.name),
  display: p.name,
  role: roleOf(p),
  subtype: p.category,
  score: Number.isFinite(+p.score) ? +p.score : null,
  birthYear: Number.isFinite(+p.birth) ? +p.birth : null,
  deathYear: Number.isFinite(+p.death) ? +p.death : null,
  politicalPhases: networkPoliticalPhases(p.name),
  sourceType: '核心人物'
}));
const known = new Map(nodes.map(n => [n.id, n]));

for (const child of children) {
  const id = normalize(child.name);
  if (known.has(id)) continue;
  const n = {
    ...child,
    id,
    display: child.name,
    role: 'royal',
    subtype: '皇室子女',
    score: Number.isFinite(+child.score) ? +child.score : null,
    birthYear: /^\d{3,4}$/.test(String(child.birth)) ? +child.birth : null,
    deathYear: /^\d{3,4}$/.test(String(child.death)) ? +child.death : null,
    sourceType: '重要皇室子嗣'
  };
  nodes.push(n);
  known.set(id, n);
}

const expectedNetworkPeople = 200;
if (nodes.length !== expectedNetworkPeople) throw new Error(`Expected ${expectedNetworkPeople} unique people, got ${nodes.length}`);

const edgesByPair = new Map();
const pairKey = (a,b) => [a,b].sort((x,y)=>x.localeCompare(y,'zh-CN')).join('|');
function addEdge(aRaw, bRaw, type, weight = 1, detail = '') {
  const a = normalize(aRaw), b = normalize(bRaw);
  if (!known.has(a) || !known.has(b) || a === b) return;
  const key = pairKey(a,b);
  const edge = edgesByPair.get(key) || { a, b, types: new Set(), weights: {}, details: new Set() };
  edge.types.add(type);
  edge.weights[type] = (edge.weights[type] || 0) + weight;
  if (detail) edge.details.add(detail);
  edgesByPair.set(key, edge);
}

for (let i = 0; i < emperorOrder.length - 1; i++) addEdge(emperorOrder[i], emperorOrder[i+1], 'succession', 1, '帝位承接');
for (const child of children) {
  const parent = parentAliases[child.parent] || child.parent;
  addEdge(parent, child.name, 'lineage', 1, `${child.parent}—${child.name}`);
}

for (const event of events.events) {
  const people = [...new Set((event.people || []).map(normalize).filter(n => known.has(n)))];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) addEdge(people[i], people[j], 'event', 1, event.title);
  }
}

function numberList(value) {
  return String(value ?? '').match(/\d{4}/g)?.map(Number) || [];
}
const emperors = emperorOrder.map(name => {
  const n = known.get(normalize(name));
  return { node:n, starts:numberList(n.office_start), ends:numberList(n.office_end) };
});
function reignOverlap(start, end, emperor) {
  let total = 0;
  const len = Math.max(emperor.starts.length, emperor.ends.length);
  for (let i = 0; i < len; i++) {
    const s = emperor.starts[i] ?? emperor.starts[0];
    const e = emperor.ends[i] ?? emperor.ends[0];
    total += Math.max(0, Math.min(end, e) - Math.max(start, s) + 1);
  }
  return total;
}
function centralYear(n) {
  const starts = numberList(n.office_start), ends = numberList(n.office_end);
  if (starts.length && ends.length) return (Math.min(...starts) + Math.max(...ends)) / 2;
  if (n.birthYear && n.deathYear) return Math.min(n.deathYear, n.birthYear + 35);
  if (n.birthYear) return n.birthYear + 30;
  if (n.deathYear) return n.deathYear - 25;
  return 1506;
}
function reignAnchorYear(n) {
  const starts = numberList(n.office_start), ends = numberList(n.office_end);
  if (starts.length && ends.length) return (Math.min(...starts) + Math.max(...ends)) / 2;
  return centralYear(n);
}
function dominantEmperor(n) {
  const starts = numberList(n.office_start), ends = numberList(n.office_end);
  if (starts.length && ends.length) {
    const start = Math.min(...starts), end = Math.max(...ends);
    return emperors.map(e => ({...e, overlap:reignOverlap(start,end,e)})).sort((a,b)=>b.overlap-a.overlap)[0]?.node;
  }
  const year = centralYear(n);
  return emperors.map(e => {
    const ranges = e.starts.map((s,i)=>[s,e.ends[i] ?? e.ends[0]]);
    const distance = Math.min(...ranges.map(([s,t]) => year < s ? s-year : year > t ? year-t : 0));
    return {...e,distance};
  }).sort((a,b)=>a.distance-b.distance)[0]?.node;
}

// Ensure every person is visible as part of the network. These dashed edges mean only
// "principal active reign / approximate contemporary reign", never direct acquaintance.
const degreeBeforeFallback = new Map(nodes.map(n => [n.id,0]));
for (const e of edgesByPair.values()) { degreeBeforeFallback.set(e.a,degreeBeforeFallback.get(e.a)+1); degreeBeforeFallback.set(e.b,degreeBeforeFallback.get(e.b)+1); }
for (const n of nodes) {
  if (n.role === 'emperor' || n.role === 'royal' || n.role === 'southern' || degreeBeforeFallback.get(n.id) > 0) continue;
  const anchor = dominantEmperor(n);
  if (anchor) addEdge(n.id, anchor.id, 'era', 1, '主要活跃朝／约略同时代');
}

const edges = [...edgesByPair.values()].map(e => ({...e, types:[...e.types], details:[...e.details]}));
const byId = new Map(nodes.map(n => [n.id,n]));
const degree = new Map(nodes.map(n => [n.id,0]));
for (const e of edges) {
  const w = (e.weights.succession || 0) * 4 + (e.weights.lineage || 0) * 3 + (e.weights.event || 0) * 1.4 + (e.weights.era || 0) * .5;
  degree.set(e.a, degree.get(e.a) + w);
  degree.set(e.b, degree.get(e.b) + w);
}

const roleColor = { emperor:'#fb7185', official:'#22d3ee', commoner:'#fbbf24', royal:'#a78bfa', regime:'#f472b6', foreign:'#38bdf8', southern:'#d8a447' };
const roleFill = { emperor:'#4a1525', official:'#083344', commoner:'#422006', royal:'#2e1065', regime:'#4a1837', foreign:'#11344a', southern:'#4a3412' };
const roleLabel = { emperor:'北京明廷皇帝', official:'官员（文臣／武官／宦官）', commoner:'百姓／在野人物', royal:'重要皇族', regime:'政权人物', foreign:'域外人物', southern:'南明延续政权人物' };

for (const n of nodes) {
  const d = degree.get(n.id);
  const scoreBoost = n.score == null ? 0 : Math.max(0, n.score - 70) / 8;
  n.influence = d + scoreBoost + (n.role === 'emperor' ? 8 : 0);
  n.fontSize = n.influence >= 21 ? 25 : n.influence >= 13 ? 21 : n.influence >= 8 ? 17 : 13;
  n.radius = n.role === 'emperor' ? 19 : n.fontSize >= 21 ? 15 : n.fontSize >= 17 ? 12 : 9;
  n.collision = 28 + n.fontSize * Math.max(2.5, n.display.length * .58);
  const year = Math.max(MUSEUM_TIMELINE_SCOPE.start, Math.min(MUSEUM_TIMELINE_SCOPE.end, centralYear(n)));
  n.targetX = PLOT.left + ((year - MUSEUM_TIMELINE_SCOPE.start) / (MUSEUM_TIMELINE_SCOPE.end - MUSEUM_TIMELINE_SCOPE.start)) * (PLOT.right - PLOT.left);
  const bands = { emperor:1400, official:780, southern:1770, regime:1980, royal:2200, foreign:2410, commoner:2600 };
  n.targetY = bands[n.role] + (rand(n.id,'band') - .5) * (n.role === 'official' ? 920 : 350);
  n.x = n.targetX + (rand(n.id,'x') - .5) * 220;
  n.y = n.targetY + (rand(n.id,'y') - .5) * 220;
  n.vx = 0; n.vy = 0;
}

const scopeX = year => PLOT.left + ((year - MUSEUM_TIMELINE_SCOPE.start) / (MUSEUM_TIMELINE_SCOPE.end - MUSEUM_TIMELINE_SCOPE.start)) * (PLOT.right - PLOT.left);
const beijingMingEndX = scopeX(1644);
const southernMingEndX = scopeX(1662);

// Keep emperors on their actual reign-time anchors. Other people settle around evidence-backed links.
for (const n of nodes.filter(n => n.role === 'emperor')) {
  const i = emperorOrder.indexOf(n.display);
  n.fixedX = Math.min(beijingMingEndX, scopeX(reignAnchorYear(n)));
  n.fixedY = 1420 + (i % 2 ? 34 : -34);
  n.x = n.fixedX; n.y = n.fixedY;
}
for (const n of nodes.filter(node => node.role === 'southern')) {
  const ruler = southernMingByName.get(n.id);
  n.fixedX = scopeX(ruler?.start ?? centralYear(n));
  n.fixedY = 1770 + ((ruler?.start ?? 1644) - 1644) * 18;
  n.x = n.fixedX; n.y = n.fixedY;
}

const linkDistance = e => e.types.includes('succession') ? 250 : e.types.includes('lineage') ? 190 : e.types.includes('event') ? 235 : 330;
const linkStrength = e => e.types.includes('succession') ? .024 : e.types.includes('lineage') ? .018 : e.types.includes('event') ? .007 + Math.min(.01,(e.weights.event||0)*.002) : .004;

for (let iter = 0; iter < 720; iter++) {
  const temp = 1 - iter / 720;
  for (const n of nodes) {
    if (n.fixedX != null) continue;
    n.vx += (n.targetX - n.x) * .0018;
    n.vy += (n.targetY - n.y) * .0030;
  }
  for (const e of edges) {
    const a = byId.get(e.a), b = byId.get(e.b);
    const dx = b.x-a.x, dy=b.y-a.y;
    const dist = Math.hypot(dx,dy) || 1;
    const pull = (dist-linkDistance(e))*linkStrength(e);
    const fx = dx/dist*pull, fy=dy/dist*pull;
    if (a.fixedX == null) { a.vx += fx; a.vy += fy; }
    if (b.fixedX == null) { b.vx -= fx; b.vy -= fy; }
  }
  for (let i=0;i<nodes.length;i++) {
    const a=nodes[i];
    for (let j=i+1;j<nodes.length;j++) {
      const b=nodes[j];
      let dx=b.x-a.x, dy=b.y-a.y, dist=Math.hypot(dx,dy) || .01;
      const minDist=(a.collision+b.collision)*.52;
      if (dist >= minDist) continue;
      const push=(minDist-dist)*.055*(.65+temp);
      const fx=dx/dist*push, fy=dy/dist*push;
      if (a.fixedX == null) { a.vx -= fx; a.vy -= fy; }
      if (b.fixedX == null) { b.vx += fx; b.vy += fy; }
    }
  }
  for (const n of nodes) {
    if (n.fixedX != null) { n.x=n.fixedX; n.y=n.fixedY; n.vx=0; n.vy=0; continue; }
    n.vx *= .76; n.vy *= .76;
    n.x += Math.max(-24,Math.min(24,n.vx)); n.y += Math.max(-24,Math.min(24,n.vy));
    n.x=Math.max(PLOT.left+35,Math.min(PLOT.right-35,n.x));
    n.y=Math.max(PLOT.top+55,Math.min(PLOT.bottom-55,n.y));
  }
}

function dominantEdgeType(e) {
  if (e.types.includes('succession')) return 'succession';
  if (e.types.includes('lineage')) return 'lineage';
  if (e.types.includes('event')) return 'event';
  return 'era';
}
const edgeStyle = {
  succession:{stroke:'#fbbf24',width:3.2,opacity:.78,dash:''},
  lineage:{stroke:'#a78bfa',width:2.1,opacity:.58,dash:''},
  event:{stroke:'#64748b',width:1.15,opacity:.30,dash:''},
  era:{stroke:'#475569',width:1.1,opacity:.34,dash:'9 10'}
};

const edgeSvg = edges.map(e => {
  const a=byId.get(e.a), b=byId.get(e.b), type=dominantEdgeType(e), s=edgeStyle[type];
  const eventCount=e.weights.event||0;
  const title=[`${a.display} ↔ ${b.display}`,e.types.map(t=>({succession:'帝位承接',lineage:'父子／父女',event:`共同事件${eventCount?` ×${eventCount}`:''}`,era:'主要活跃朝／约略同时代'}[t])).join('；'),...e.details.slice(0,5)].join('｜');
  return `<line class="edge edge-${type}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${s.stroke}" stroke-width="${s.width + Math.min(2,Math.max(0,eventCount-1)*.35)}" stroke-opacity="${s.opacity}"${s.dash?` stroke-dasharray="${s.dash}"`:''}><title>${esc(title)}</title></line>`;
}).join('\n');

const nodeSvg = [...nodes].sort((a,b)=>a.influence-b.influence).map(n => {
  const color=roleColor[n.role], fill=roleFill[n.role];
  const category = n.role === 'official' ? `${roleLabel[n.role]} · ${n.subtype}` : roleLabel[n.role];
  const southernStage = n.role === 'southern'
    ? `${southernMingByName.get(n.id)?.era || '南明'}政权人物`
    : '';
  const phaseStage = n.politicalPhases?.length
    ? `政权阶段 ${n.politicalPhases.map(phase => `${phase.regime} ${phase.start}—${phase.end} · ${phase.role} · ${phase.confidence}置信度`).join('；')}`
    : '';
  const politicalStage = [southernStage, phaseStage].filter(Boolean).join('｜');
  const score = n.score == null ? '待考' : n.score;
  const relations = Math.round(degree.get(n.id)*10)/10;
  const halo = n.influence >= 13 ? `<circle r="${n.radius+8}" fill="none" stroke="${color}" stroke-opacity=".18" stroke-width="3"/>` : '';
  return `<g class="node role-${n.role}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})">
    <title>${esc(`${n.display}｜${category}${politicalStage ? `｜${politicalStage}` : ''}｜评分 ${score}｜关系权重 ${relations}｜置信度 ${n.confidence||'未知'}`)}</title>
    ${halo}<circle r="${n.radius}" fill="#0f172a"/><circle r="${n.radius}" fill="${fill}" stroke="${color}" stroke-width="${n.role==='emperor'?3:2}"/>
    <text x="0" y="${-(n.radius+9)}" fill="#f8fafc" stroke="#0f172a" stroke-width="5" paint-order="stroke" font-size="${n.fontSize}" font-weight="${n.fontSize>=21?700:600}" text-anchor="middle">${esc(n.display)}</text>
  </g>`;
}).join('\n');

const roleCounts = Object.fromEntries(Object.keys(roleLabel).map(role=>[role,nodes.filter(n=>n.role===role).length]));
const edgeCounts = Object.fromEntries(['succession','lineage','event','era'].map(type=>[type,edges.filter(e=>e.types.includes(type)).length]));
const generated = new Intl.DateTimeFormat('zh-CN',{dateStyle:'long',timeZone:'Asia/Shanghai'}).format(new Date());
const boundarySvg = MUSEUM_BOUNDARIES.map(boundary => {
  const x = scopeX(boundary.year);
  const isBreak = boundary.year === 1644 || boundary.year === 1662 || boundary.year === 1664;
  return `<g aria-label="${esc(`${boundary.year} ${boundary.label}`)}"><line x1="${x}" y1="250" x2="${x}" y2="2740" stroke="${isBreak ? '#d8a447' : '#475569'}" stroke-width="${isBreak ? 2.5 : 1.2}" stroke-dasharray="${isBreak ? '8 10' : '4 13'}"/><text x="${x + 10}" y="232" fill="${isBreak ? '#f0c96a' : '#94a3b8'}" font-size="15" font-weight="700">${boundary.year} · ${esc(boundary.label)}</text></g>`;
}).join('');
const southernBranchStart = scopeX(1644);
const southernBranchEnd = southernMingEndX;
const southernBranchSvg = `<g aria-label="南明延续政权分支"><line x1="${southernBranchStart}" y1="1770" x2="${southernBranchEnd}" y2="1770" stroke="#d8a447" stroke-width="2.4" stroke-dasharray="8 10"/><text x="${southernBranchStart + 18}" y="1740" fill="#f0c96a" font-size="17" font-weight="700">南明延续政权 · 1644—1662</text><text x="${southernBranchStart + 18}" y="1760" fill="#94a3b8" font-size="13">弘光、隆武、永历为并行延续政权人物，不追加为北京明廷帝序。</text></g>`;
const coordinateMeta = {
  boundaries: Object.fromEntries(MUSEUM_BOUNDARIES.map(boundary => [boundary.year, +scopeX(boundary.year).toFixed(1)])),
  beijingMingSpine: { start: +scopeX(MUSEUM_TIMELINE_SCOPE.start).toFixed(1), end: +beijingMingEndX.toFixed(1) },
  southernMingBranch: { start: +southernBranchStart.toFixed(1), end: +southernMingEndX.toFixed(1) }
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="title desc">
<title id="title">明史${nodes.length}人物关系网</title>
<desc id="desc">北京明廷16帝作为主轴；南明延续政权以并行分支显示。节点颜色只区分身份与政权位置，不表示人物评价；连线表示帝位承接、父子父女、共同历史事件或主要活跃朝。</desc>
<defs>
  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#1e293b" stroke-width="1"/></pattern>
  <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#0f172a"/><stop offset=".5" stop-color="#111827"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
  <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#020617" flood-opacity=".65"/></filter>
</defs>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&amp;display=swap');
  text{font-family:'JetBrains Mono','Noto Sans SC','PingFang SC',sans-serif}
  .edge{vector-effect:non-scaling-stroke}.node{filter:url(#shadow)}
</style>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#fade)"/><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>
<g aria-label="title block">
  <text x="150" y="92" fill="#f8fafc" font-size="46" font-weight="700">明史 ${nodes.length} 人物关系网</text>
  <text x="150" y="142" fill="#94a3b8" font-size="19">1368—1664 · 1644 北京明廷覆亡，1662 永历政权终局，1664 夔东抵抗终局 · 关系来自现有研究底表、重要子嗣表与 ${events.events.length} 条事件记录</text>
  <text x="150" y="182" fill="#64748b" font-size="15">姓名越大＝关系中心性与研究评分越高；悬停节点或连线可查看说明</text>
  <text x="5050" y="92" fill="#94a3b8" font-size="17" text-anchor="end">${nodes.length} NODES · ${edges.length} EDGES</text>
</g>
<g aria-label="era spine"><line x1="${scopeX(MUSEUM_TIMELINE_SCOPE.start)}" y1="1420" x2="${beijingMingEndX}" y2="1420" stroke="#334155" stroke-width="2" stroke-dasharray="5 14"/></g>
<g aria-label="北京明廷十六帝主线"><text x="${PLOT.left}" y="1380" fill="#fbbf24" font-size="17" font-weight="700">北京明廷帝系 · 16帝（1368—1644）</text></g>
<g aria-label="历史范围断点">${boundarySvg}</g>
${southernBranchSvg}
<g aria-label="relationships">${edgeSvg}</g>
<g aria-label="people">${nodeSvg}</g>
<g aria-label="legend" transform="translate(150 ${HEIGHT-176})">
  <rect x="0" y="-64" width="4900" height="132" rx="12" fill="#0b1220" fill-opacity=".94" stroke="#334155"/>
  ${Object.entries(roleLabel).map(([role,label],i)=>`<g transform="translate(${34+i*695} -28)"><circle r="9" fill="${roleFill[role]}" stroke="${roleColor[role]}" stroke-width="2"/><text x="21" y="5" fill="#cbd5e1" font-size="13">${label} · ${roleCounts[role]}人</text></g>`).join('')}
  <g transform="translate(34 10)"><line x1="0" y1="0" x2="48" y2="0" stroke="#fbbf24" stroke-width="4"/><text x="62" y="5" fill="#cbd5e1" font-size="14">帝位承接 ${edgeCounts.succession}</text></g>
  <g transform="translate(500 10)"><line x1="0" y1="0" x2="48" y2="0" stroke="#a78bfa" stroke-width="3"/><text x="62" y="5" fill="#cbd5e1" font-size="14">父子／父女 ${edgeCounts.lineage}</text></g>
  <g transform="translate(1030 10)"><line x1="0" y1="0" x2="48" y2="0" stroke="#64748b" stroke-width="2"/><text x="62" y="5" fill="#cbd5e1" font-size="14">共同事件 ${edgeCounts.event}</text></g>
  <g transform="translate(1510 10)"><line x1="0" y1="0" x2="48" y2="0" stroke="#64748b" stroke-width="2" stroke-dasharray="8 8"/><text x="62" y="5" fill="#cbd5e1" font-size="14">时代锚定 ${edgeCounts.era}</text></g>
  <text x="34" y="47" fill="#64748b" font-size="13">口径：共同事件只表示同载于同一事件，不自动等于盟友或敌人；时代锚定只用于无其他关系记录的人物；政权颜色不表示忠奸或评分。生成于 ${generated}。</text>
</g>
</svg>`;

await fs.mkdir(outDir,{recursive:true});
await fs.writeFile(`${outDir}/明史人物关系网.svg`,svg,'utf8');
await fs.writeFile(`${outDir}/明史人物关系网.data.json`,JSON.stringify({
  meta:{nodes:nodes.length,edges:edges.length,roleCounts,edgeCounts,scope:MUSEUM_TIMELINE_SCOPE,boundaries:MUSEUM_BOUNDARIES,coordinates:coordinateMeta,generated},
  nodes:nodes.map(n=>({id:n.id,name:n.display,role:n.role,subtype:n.subtype,score:n.score,confidence:n.confidence||'未知',politicalPhases:n.politicalPhases||[],influence:+n.influence.toFixed(2),x:+n.x.toFixed(1),y:+n.y.toFixed(1)})),
  edges:edges.map(e=>({source:e.a,target:e.b,types:e.types,eventCount:e.weights.event||0,details:e.details}))
},null,2),'utf8');

console.log(JSON.stringify({nodes:nodes.length,edges:edges.length,roleCounts,edgeCounts,svg:`${outDir}/明史人物关系网.svg`},null,2));
