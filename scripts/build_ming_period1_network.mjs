import fs from 'node:fs/promises';

const core = JSON.parse(await fs.readFile('data/ming_core.json', 'utf8'));
const children = JSON.parse(await fs.readFile('data/ming_children_important.json', 'utf8'));
const events = JSON.parse(await fs.readFile('data/ming_events.json', 'utf8'));

const outDir = 'data/diagram';
const WIDTH = 3000;
const HEIGHT = 1700;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const normalize = (value) => String(value ?? '')
  .replaceAll('熾','炽').replaceAll('鎮','镇').replaceAll('鈺','钰').replaceAll('見','见')
  .replaceAll('載','载').replaceAll('鈞','钧').replaceAll('檢','检').replaceAll('權','权')
  .replaceAll('標','标').replaceAll('潤','润').replaceAll('煥','焕').replace(/\s+/g,'');

const sourcePeople = new Map();
for (const p of core) sourcePeople.set(normalize(p.name), {...p, sourceType:'核心人物'});
for (const p of children) if (!sourcePeople.has(normalize(p.name))) sourcePeople.set(normalize(p.name), {...p, sourceType:'重要皇室子嗣'});

const nodeSpecs = [
  // 皇权中心
  ['朱元璋','emperor','洪武帝｜开国皇帝',1500,350,'xl'],

  // 制度与文治
  ['李善长','official','文臣｜开国行政',220,560,'lg'],
  ['刘基','official','文臣｜战略谋划',500,560,'lg'],
  ['宋濂','official','文臣｜礼制文教',780,560,'lg'],

  // 皇储与宗藩：均按洪武时期身份显示
  ['朱标','royal','皇太子｜储君',1110,620,'lg'],
  ['朱允炆','royal','皇太孙｜继承人',1370,620,'lg'],
  ['朱棣','royal','燕王｜北方强藩',1630,620,'lg'],
  ['朱高炽','royal','燕世子｜宗藩继承',1890,620,'md'],
  ['朱橚','royal','周王｜宗藩',1110,900,'md'],
  ['朱柏','royal','湘王｜宗藩',1370,900,'md'],
  ['朱权','royal','宁王｜北方强藩',1630,900,'lg'],

  // 统一战争与边疆
  ['徐达','official','武官｜北伐主帅',2180,500,'lg'],
  ['常遇春','official','武官｜北伐主力',2540,500,'lg'],
  ['汤和','official','武官｜开国将领',2180,720,'md'],
  ['李文忠','official','武官｜北方征战',2540,720,'md'],
  ['邓愈','official','武官｜西北征战',2180,940,'md'],
  ['沐英','official','武官｜镇守云南',2540,940,'lg'],
  ['傅友德','official','武官｜征南主将',2180,1160,'lg'],
  ['蓝玉','official','武官｜北元大捷',2540,1160,'lg']
];

const dims = {
  xl:{w:270,h:108,nameSize:42,sub:21},
  lg:{w:220,h:88,nameSize:34,sub:18},
  md:{w:200,h:78,nameSize:30,sub:17}
};
const palette = {
  emperor:{stroke:'#fb7185',fill:'#4a1525',label:'皇帝'},
  official:{stroke:'#22d3ee',fill:'#083344',label:'官员'},
  commoner:{stroke:'#fbbf24',fill:'#422006',label:'百姓／在野'},
  royal:{stroke:'#a78bfa',fill:'#2e1065',label:'皇族'}
};

const nodes = nodeSpecs.map(([name,role,subtitle,x,y,size]) => {
  const source = sourcePeople.get(normalize(name));
  if (!source) throw new Error(`Missing source record: ${name}`);
  return {id:normalize(name),name,role,subtitle,x,y,size,...dims[size],source};
});
const byId = new Map(nodes.map(n => [n.id,n]));

const eventTitlesByPair = new Map();
for (const event of events.events.filter(e => Number(e.year) >= 1368 && Number(e.year) <= 1402)) {
  const people = [...new Set((event.people || []).map(normalize).filter(id => byId.has(id)))];
  for (let i=0;i<people.length;i++) for (let j=i+1;j<people.length;j++) {
    const key=[people[i],people[j]].sort().join('|');
    const list=eventTitlesByPair.get(key)||[];
    list.push(`${event.year}·${event.title}`);
    eventTitlesByPair.set(key,list);
  }
}

const edgeMap = new Map();
const edgePriority = {context:1,event:2,cooperation:3,family:4,succession:5,conflict:6};
function addEdge(aName,bName,type,label='',evidence=[]) {
  const a=normalize(aName),b=normalize(bName);
  if (!byId.has(a)||!byId.has(b)||a===b) throw new Error(`Invalid edge: ${aName} -> ${bName}`);
  const key=[a,b].sort().join('|');
  const existing=edgeMap.get(key);
  const eventsForPair=eventTitlesByPair.get(key)||[];
  const next={a,b,type,label,evidence:[...new Set([...evidence,...eventsForPair])],types:new Set([type])};
  if (!existing) edgeMap.set(key,next);
  else {
    existing.types.add(type);
    existing.evidence=[...new Set([...existing.evidence,...next.evidence])];
    if (edgePriority[type]>edgePriority[existing.type]) {existing.type=type;existing.label=label||existing.label;}
  }
}

// 皇储转移与宗室关系
addEdge('朱元璋','朱允炆','succession','立为皇太孙');
addEdge('朱元璋','朱标','family','父子');
addEdge('朱标','朱允炆','family','父子',['1392·朱标去世后，朱允炆被立为皇太孙']);
for (const child of ['朱棣','朱橚','朱柏','朱权']) addEdge('朱元璋',child,'family','父子');
addEdge('朱棣','朱高炽','family','父子');

// 洪武开国集团。这里只记录明确的开国行政、北伐和征服活动，不使用“同时代”虚线。
for (const p of ['刘基','宋濂','徐达','常遇春','汤和','李文忠','邓愈','沐英','傅友德']) addEdge('朱元璋',p,'cooperation','开国君臣');
addEdge('朱元璋','李善长','conflict','开国／功臣案');
addEdge('朱元璋','傅友德','conflict','开国／赐死',['人物底表：晚年被赐死，具体罪名与过程有争议（中置信度）']);
addEdge('朱元璋','蓝玉','conflict','北征／蓝玉案');

const edges=[...edgeMap.values()].map(e=>({...e,types:[...e.types]}));

const edgeStyle={
  succession:{stroke:'#fbbf24',width:1.8,opacity:.88,dash:'',marker:'url(#arrow-gold)'},
  family:{stroke:'#a78bfa',width:.65,opacity:.52,dash:'',marker:''},
  cooperation:{stroke:'#64748b',width:.55,opacity:.38,dash:'',marker:''},
  event:{stroke:'#64748b',width:.55,opacity:.36,dash:'',marker:''},
  conflict:{stroke:'#fb7185',width:.75,opacity:.64,dash:'6 9',marker:'url(#arrow-rose)'},
  context:{stroke:'#475569',width:.5,opacity:.22,dash:'5 9',marker:''}
};

function edgePath(a,b,type) {
  const dx=b.x-a.x,dy=b.y-a.y;
  if ((a.id===normalize('朱元璋')&&b.id===normalize('朱允炆'))||(b.id===normalize('朱元璋')&&a.id===normalize('朱允炆'))) {
    return `M${a.x-75} ${a.y+54} C${a.x-130} 470 ${b.x+90} 470 ${b.x} ${b.y-45}`;
  }
  const bend=Math.min(80,Math.abs(dx)*.12);
  const direction=dy>=0?1:-1;
  return `M${a.x} ${a.y} C${a.x} ${a.y+direction*bend} ${b.x} ${b.y-direction*bend} ${b.x} ${b.y}`;
}

const edgeSvg=edges.map(e=>{
  const a=byId.get(e.a),b=byId.get(e.b),s=edgeStyle[e.type];
  const evidence=e.evidence.length?e.evidence.join('；'):'见人物底表摘要';
  return `<path class="edge edge-${e.type}" d="${edgePath(a,b,e.type)}" fill="none" stroke="${s.stroke}" stroke-width="${s.width}" stroke-opacity="${s.opacity}"${s.dash?` stroke-dasharray="${s.dash}"`:''}${s.marker?` marker-end="${s.marker}"`:''}><title>${esc(`${a.name} ↔ ${b.name}｜${e.label}｜${evidence}`)}</title></path>`;
}).join('\n');

// Use a separate derived font size because `name` is the visible person label.
const readableNodeSvg=nodes.map(n=>{
  const p=palette[n.role],x=n.x-n.w/2,y=n.y-n.h/2;
  const confidence=n.source.confidence||'未知';
  const score=n.source.score==null||n.source.score===''?'待考':n.source.score;
  const nameSize=n.nameSize;
  return `<g class="node role-${n.role}" transform="translate(${x} ${y})">
    <title>${esc(`${n.name}｜本期身份：${n.subtitle}｜底表评分 ${score}｜置信度 ${confidence}`)}</title>
    <rect width="${n.w}" height="${n.h}" rx="14" fill="#0f172a"/>
    <rect width="${n.w}" height="${n.h}" rx="14" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${n.size==='xl'?3:2}"/>
    <circle cx="20" cy="20" r="5" fill="${p.stroke}"/>
    <text x="${n.w/2}" y="${n.h*.47}" fill="#f8fafc" font-size="${nameSize}" font-weight="700" text-anchor="middle">${esc(n.name)}</text>
    <text x="${n.w/2}" y="${n.h*.77}" fill="#cbd5e1" font-size="${n.sub}" font-weight="500" text-anchor="middle">${esc(n.subtitle)}</text>
  </g>`;
}).join('\n');

const counts={
  emperor:nodes.filter(n=>n.role==='emperor').length,
  official:nodes.filter(n=>n.role==='official').length,
  commoner:nodes.filter(n=>n.role==='commoner').length,
  royal:nodes.filter(n=>n.role==='royal').length
};
const generated=new Intl.DateTimeFormat('zh-CN',{dateStyle:'long',timeZone:'Asia/Shanghai'}).format(new Date());

const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="title desc">
<title id="title">第一时代：洪武建国与高压国家人物关系图</title>
<desc id="desc">展示1368至1398年洪武建国、制度重建、皇储宗藩、统一战争与功臣清洗中的19位人物关系。</desc>
<defs>
  <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#1e293b" stroke-width="1"/></pattern>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#0f172a"/><stop offset=".5" stop-color="#111827"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
  <marker id="arrow-gold" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><polygon points="0 0,10 4,0 8" fill="#fbbf24"/></marker>
  <marker id="arrow-rose" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><polygon points="0 0,10 4,0 8" fill="#fb7185"/></marker>
</defs>
<style>
  text{font-family:'PingFang SC','Heiti SC','Arial Unicode MS',sans-serif}
</style>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>
<g aria-label="title block">
  <text x="90" y="86" fill="#f8fafc" font-size="56" font-weight="800">第一时代｜洪武建国与高压国家</text>
  <text x="90" y="132" fill="#94a3b8" font-size="22">1368—1398 · 统一战争与制度重建并行，皇权直接统辖行政、军事和基层社会</text>
  <text x="2910" y="86" fill="#94a3b8" font-size="18" text-anchor="end">${nodes.length} 人 · ${edges.length} 条去重关系</text>
</g>
<g aria-label="regions">
  <rect x="70" y="200" width="900" height="1260" rx="24" fill="#0b1220" fill-opacity=".42" stroke="#334155" stroke-dasharray="8 8"/>
  <text x="100" y="244" fill="#64748b" font-size="22" font-weight="700">制度构建与文治</text>
  <rect x="990" y="200" width="1020" height="1260" rx="24" fill="#130f26" fill-opacity=".32" stroke="#4c3d78" stroke-dasharray="8 8"/>
  <text x="1020" y="244" fill="#7c6aac" font-size="22" font-weight="700">皇权、皇储与宗藩</text>
  <rect x="2030" y="200" width="890" height="1260" rx="24" fill="#0b1220" fill-opacity=".42" stroke="#334155" stroke-dasharray="8 8"/>
  <text x="2060" y="244" fill="#64748b" font-size="22" font-weight="700">统一战争与边疆</text>
</g>
<g aria-label="relationships">${edgeSvg}</g>
<g aria-label="people">${readableNodeSvg}</g>
<g aria-label="key labels">
  <rect x="1190" y="444" width="330" height="38" rx="8" fill="#0f172a"/><text x="1355" y="471" fill="#fbbf24" font-size="18" font-weight="700" text-anchor="middle">1392 · 朱标早逝，改立皇太孙</text>
  <rect x="2080" y="1320" width="520" height="38" rx="8" fill="#0f172a"/><text x="2340" y="1347" fill="#fb7185" font-size="18" font-weight="700" text-anchor="middle">高压面向：功臣清洗与案件株连</text>
</g>
<g aria-label="legend" transform="translate(90 1515)">
  <rect width="2820" height="125" rx="14" fill="#0b1220" stroke="#334155"/>
  <g transform="translate(35 38)"><rect width="24" height="18" rx="4" fill="${palette.emperor.fill}" stroke="${palette.emperor.stroke}" stroke-width="2"/><text x="36" y="16" fill="#cbd5e1" font-size="18">皇帝 ${counts.emperor}</text></g>
  <g transform="translate(235 38)"><rect width="24" height="18" rx="4" fill="${palette.official.fill}" stroke="${palette.official.stroke}" stroke-width="2"/><text x="36" y="16" fill="#cbd5e1" font-size="18">官员 ${counts.official}</text></g>
  <g transform="translate(455 38)"><rect width="24" height="18" rx="4" fill="${palette.commoner.fill}" stroke="${palette.commoner.stroke}" stroke-width="2"/><text x="36" y="16" fill="#cbd5e1" font-size="18">百姓／在野 ${counts.commoner}</text></g>
  <g transform="translate(755 38)"><rect width="24" height="18" rx="4" fill="${palette.royal.fill}" stroke="${palette.royal.stroke}" stroke-width="2"/><text x="36" y="16" fill="#cbd5e1" font-size="18">皇族 ${counts.royal}</text></g>
  <g transform="translate(1010 38)"><line x1="0" y1="8" x2="55" y2="8" stroke="#fbbf24" stroke-width="3"/><text x="70" y="16" fill="#cbd5e1" font-size="18">皇位承接</text></g>
  <g transform="translate(1260 38)"><line x1="0" y1="8" x2="55" y2="8" stroke="#a78bfa" stroke-width="2"/><text x="70" y="16" fill="#cbd5e1" font-size="18">父子／父女</text></g>
  <g transform="translate(1530 38)"><line x1="0" y1="8" x2="55" y2="8" stroke="#64748b" stroke-width="2"/><text x="70" y="16" fill="#cbd5e1" font-size="18">合作／君臣</text></g>
  <g transform="translate(1810 38)"><line x1="0" y1="8" x2="55" y2="8" stroke="#fb7185" stroke-width="2" stroke-dasharray="8 7"/><text x="70" y="16" fill="#cbd5e1" font-size="18">冲突／清洗</text></g>
  <text x="35" y="96" fill="#64748b" font-size="15">只画1368—1398年有明确身份、活动或结构性关系的人物；朱允炆、朱棣、朱高炽均按洪武时期身份显示。悬停可查看证据摘要。生成于 ${generated}。</text>
</g>
</svg>`;

await fs.mkdir(outDir,{recursive:true});
const svgPath=`${outDir}/第一时代_洪武建国与高压国家人物关系图.svg`;
const dataPath=`${outDir}/第一时代_洪武建国与高压国家人物关系图.data.json`;
await fs.writeFile(svgPath,svg,'utf8');
await fs.writeFile(dataPath,JSON.stringify({
  meta:{period:'第一时代',title:'洪武建国与高压国家',range:'1368—1398',people:nodes.length,edges:edges.length,counts,generated},
  nodes:nodes.map(n=>({id:n.id,name:n.name,periodRole:n.subtitle,role:n.role,sourceType:n.source.sourceType,confidence:n.source.confidence||'未知',x:n.x,y:n.y})),
  edges:edges.map(e=>({source:e.a,target:e.b,type:e.type,types:e.types,label:e.label,evidence:e.evidence}))
},null,2),'utf8');

console.log(JSON.stringify({svgPath,dataPath,people:nodes.length,edges:edges.length,counts},null,2));
