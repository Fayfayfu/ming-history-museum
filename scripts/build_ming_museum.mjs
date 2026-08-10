import fs from 'node:fs/promises';
import {
  validatePeopleTimelineData,
  layoutPeopleTimeline,
  renderPeopleTimeline,
  PEOPLE_TIMELINE_CSS,
  peopleTimelineClientScript,
} from './lib/people_timeline.mjs';

// Rebuild the research baseline first, then derive two focused exhibition halls.
await import('./build_ming_html.mjs');

const root = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9';
const museum = `${root}/明史数字博物馆`;
const baseline = await fs.readFile(`${root}/明史人物谱_1368-1644.html`, 'utf8');
const events = JSON.parse(await fs.readFile('data/ming_events.json', 'utf8'));
const core = JSON.parse(await fs.readFile('data/ming_core.json', 'utf8'));
const importantChildren = JSON.parse(await fs.readFile('data/ming_children_important.json', 'utf8'));
const allChildren = JSON.parse(await fs.readFile('data/ming_children.json', 'utf8'));
const portraits = JSON.parse(await fs.readFile('data/ming_portraits.json', 'utf8'));
const storytelling = JSON.parse(await fs.readFile('data/ming_storytelling.json', 'utf8'));
const timelineData = JSON.parse(await fs.readFile('data/ming_people_timeline.json', 'utf8'));
const canonicalName = value => String(value||'').replaceAll('熾','炽').replaceAll('鎮','镇').replaceAll('鈺','钰').replaceAll('見','见').replaceAll('載','载').replaceAll('鈞','钧').replaceAll('檢','检').replace(/\s+/g,'');
const emperorNames = new Set(core.filter(person=>person.category==='皇帝').map(person=>canonicalName(person.name)));
const peopleTotal = core.length + importantChildren.filter(person=>!emperorNames.has(canonicalName(person.name))).length;
const timelinePeople = validatePeopleTimelineData({core,children:importantChildren,timelineData});
const timelineLayout = layoutPeopleTimeline(timelinePeople);
const escapeHallHtml = value => String(value ?? '')
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  .replace(/'/g,'&#39;');
const rosterHeaderHtml = baseline.match(/<table class="roster">[\s\S]*?<thead><tr>([\s\S]*?)<\/tr><\/thead>/)?.[1] || '';
const rosterHeaders = [...rosterHeaderHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(([,header]) => header
  .replace(/<[^>]+>/g,'')
  .replace(/&amp;/g,'&')
  .replace(/&lt;/g,'<')
  .replace(/&gt;/g,'>')
  .replace(/&quot;/g,'"')
  .replace(/&#39;/g,"'")
  .replace(/\s+/g,' ')
  .trim());
if (rosterHeaders.length !== 15) throw new Error(`Expected 15 roster headers, found ${rosterHeaders.length}`);
const childCountFor = person => {
  if (person.category !== '皇帝') return '—';
  const key = canonicalName(person.name);
  const records = allChildren.filter(child => canonicalName(child.parent).includes(key));
  const important = importantChildren.filter(child => canonicalName(child.parent).includes(key)).length;
  return `子 ${records.filter(child=>child.sex==='男').length} · 女 ${records.filter(child=>child.sex==='女').length} · 合计 ${records.length} · 重要 ${important}`;
};
const fallbackPeopleRows = timelinePeople.map(person => {
  const life = `${person.birth || '待考'}—${person.death || '待考'}`;
  const tenure = person.office || person.title || '待考';
  const description = [person.summary,person.evaluation].filter(Boolean).join(' ');
  const lineage = person.hometown || person.parent_name || '待考';
  const cellForHeader = header => {
    if (header === '时间锚点') return person.timeline_year_label;
    if (header === '人物') return person.name;
    if (header === '身份') return person.category;
    if (header.startsWith('生卒 / 寿命')) return life;
    if (header.startsWith('关键任期')) return tenure;
    if (header === '生平事迹与史学评价') return description;
    if (/^(治国与制度|军事与危机|社会文化|长期遗产|责任与代价)/.test(header)) return '—';
    if (header.startsWith('加权总分')) return person.score ?? '—';
    if (header === '置信度') return person.confidence || person.timeline_year_confidence;
    if (header === '家乡 / 世系') return lineage;
    if (header.startsWith('本人子女数量')) return childCountFor(person);
    throw new Error(`Unsupported roster header: ${header}`);
  };
  const cells = rosterHeaders.map(cellForHeader);
  return `<tr data-id="${escapeHallHtml(person.name)}">${cells.map((cell,index)=>`<td${index===1?' class="name"':''}>${escapeHallHtml(cell)}</td>`).join('')}</tr>`;
}).join('');
const timelinePortraitFor = name => {
  const registered = portraits.people?.[name];
  if (['image','imagined'].includes(registered?.status) && registered?.file) {
    return {
      file: registered.file,
      kind: registered.status === 'imagined' ? 'imagined' : 'sourced',
      label: registered.portraitKind || (registered.status === 'imagined' ? 'AI想象像' : '历史图像'),
      objectPosition: registered.objectPosition || '',
      portraitTransform: registered.portraitTransform || '',
      transformOrigin: registered.transformOrigin || '',
    };
  }
  const story = storytelling.people?.[name];
  return story?.portrait ? {
    file: story.portrait,
    kind: 'imagined',
    label: story.portraitKind || 'AI想象像',
    objectPosition: story.objectPosition || '',
    portraitTransform: story.portraitTransform || '',
    transformOrigin: story.transformOrigin || '',
  } : null;
};
const peopleTimelineHtml = renderPeopleTimeline({people:timelinePeople,layout:timelineLayout,portraitFor:timelinePortraitFor});

await fs.mkdir(museum, {recursive:true});
// Keep the generated museum asset tree as an exact mirror. This prevents
// removed or superseded originals from leaking into later deployment bundles.
await fs.rm(`${museum}/assets`, {recursive:true, force:true});
await fs.cp(`${root}/assets`, `${museum}/assets`, {recursive:true,force:true});

const nav = active => `<a class="skip" href="#main">跳到主要内容</a><nav class="museum-nav" aria-label="博物馆主导航"><a class="museum-brand" href="index.html"><span class="brand-seal">明</span><span><b>步入大明</b><small>数字历史博物馆</small></span></a><div class="museum-links"><a ${active==='home'?'class="active"':''} href="index.html">序厅</a><a ${active==='people'?'class="active"':''} href="people.html">人物馆</a><a ${active==='events'?'class="active"':''} href="events.html">事件馆</a><a href="institutions.html">制度馆</a><a href="exhibitions.html">专题展</a><a href="index.html#research">研究台</a></div></nav>`;

const hallCSS = `
.skip{position:fixed;left:12px;top:-70px;z-index:100;background:#fff;color:#181713;padding:10px 14px}.skip:focus{top:12px}
.museum-nav{height:72px;position:sticky;top:0;z-index:55;display:flex;align-items:center;justify-content:space-between;padding:0 max(24px,calc((100vw - 1492px)/2));background:rgba(24,23,19,.96);color:#eee7d5;border-bottom:1px solid #554c3d;backdrop-filter:blur(18px)}
.museum-brand{display:flex;gap:11px;align-items:center;color:inherit;text-decoration:none}.museum-brand b{display:block;font:800 18px/1.1 "Songti SC","STSong",serif;letter-spacing:.08em}.museum-brand small{display:block;margin-top:4px;font:9px/1 ui-monospace,monospace;letter-spacing:.16em;color:#a99f8a}.brand-seal{width:38px;height:38px;display:grid;place-items:center;border:1px solid #c14a38;color:#d85743;font:700 25px/1 "STKaiti","KaiTi",serif;transform:rotate(-3deg)}
.museum-links{height:100%;display:flex;align-items:stretch}.museum-links a{display:grid;place-items:center;padding:0 20px;color:#cfc5b0;text-decoration:none;font:700 13px/1 inherit;border-left:1px solid #39362f;position:relative}.museum-links a:hover,.museum-links a.active{color:#fff;background:#292721}.museum-links a.active:after{content:"";position:absolute;height:3px;left:18px;right:18px;bottom:0;background:#b43a2c}
.people-page .eventlab{display:none}.events-page .stats,.events-page .timeline,.events-page .toolbar,.events-page .statusline,.events-page .tablewrap,.events-page .method{display:none}.events-page .eventlab{margin-top:22px}.events-page .shell{padding-bottom:58px}
.hall-note{margin:18px 0 0;padding:12px 16px;border-left:3px solid var(--gold);background:rgba(169,121,43,.08);color:var(--muted);font-size:13px;line-height:1.7}
@media(max-width:720px){.museum-nav{height:auto;min-height:66px;padding:8px 14px;align-items:flex-start}.museum-brand small{display:none}.museum-links{align-self:stretch}.museum-links a{padding:0 9px;font-size:12px}.museum-links a:last-child{display:none}}
`;

function baseHall(kind) {
  let html = baseline
    .replace('<body>', kind === 'people'
      ? `<body class="people-page" data-people-view="timeline">${nav(kind)}`
      : `<body class="events-page">${nav(kind)}`)
    .replace('<main class="shell">', '<main class="shell" id="main">');
  if (kind === 'people') {
    html = html
      .replace('</style>', `${hallCSS}${PEOPLE_TIMELINE_CSS}</style>`)
      .replace('</head>', `<noscript><style>.people-view-tabs,#peopleTimelineView{display:none!important}.people-page>.shell>.timeline,.people-page>.shell>.toolbar,.people-page>.shell>.statusline,.people-page>.shell>.tablewrap,.people-page>.shell>.method{display:revert!important}</style></noscript></head>`)
      .replace('<section class="timeline">', `${peopleTimelineHtml}<section class="timeline">`)
      .replace('<button id="peopleTableTab" type="button" role="tab" aria-selected="false" data-people-view="table">', '<button id="peopleTableTab" type="button" role="tab" aria-selected="false" aria-controls="peopleTableView" data-people-view="table">')
      .replace('<section class="tablewrap">', '<section class="tablewrap" id="peopleTableView" role="tabpanel" aria-labelledby="peopleTableTab">')
      .replace('<tbody id="rows"></tbody>', `<tbody id="rows">${fallbackPeopleRows}</tbody>`)
      .replace('<title>明史人物谱与大事年表｜1368—1662</title>', '<title>人物馆｜步入大明数字历史博物馆</title>')
      .replace('Ming Biographical Register · Research Baseline 04', 'PEOPLE GALLERY · RESEARCH COLLECTION')
      .replace('<h1>明史人物谱<small>1368—1662</small></h1>', '<h1>人物馆<small>1368—1644</small></h1>')
      .replace('人物不只存在于官职表：这里同时收录帝王宗室、后妃、文武官员、内廷人物、改变明朝命运的同时代政权人物、与明朝发生关键互动的域外人物，以及通过艺术、医学、出版与实地考察留下影响的在野人物。可按制度身份与历史领域交叉检索；评价分数是透明研究量表，不是“历史人物战力榜”。', '先看人，再看人与权力、制度和时代的关系。沿帝系进入一朝，或按身份与领域寻找皇帝、宗室、后妃、官员、内廷人物、同时代政权人物、域外人物和在野人物。每一条记录都把事实、评价、评分与证据入口分开呈现。')
      .replace('<b>双重范围</b><br>人物表以北京明朝 1368—1644 为主体；事件年表延伸至南明终局 1662。', '<b>本馆范围</b><br>北京明朝人物以 1368—1644 为主体；生涯跨越 1644 者保留。')
      .replace(
        /function focusPerson\(name\)\{([^\n]*?)openDetail\(person\)\}/,
        (_, beforeOpenDetail) => `async function focusPerson(name){${beforeOpenDetail}openDetail(person);const portrait=document.querySelector('#detail .portrait img');if(portrait&&!portrait.complete)await new Promise(resolve=>{portrait.addEventListener('load',resolve,{once:true});portrait.addEventListener('error',resolve,{once:true});if(portrait.complete)resolve()})}`,
      )
      .replace('renderEvents();render();', "renderEvents();render();const peopleParams=new URLSearchParams(location.search);const requestedEvent=peopleParams.get('event');const requestedPerson=peopleParams.get('person');if(requestedEvent&&eventRecord(requestedEvent)){state.event=requestedEvent;state.parent='';document.getElementById('personEvent').value=requestedEvent;document.getElementById('parent').value='';render()}else if(requestedPerson)focusPerson(requestedPerson);")
      .replace('</body>', `<script>${peopleTimelineClientScript()}</script></body>`);
  } else {
    html = html
      .replace('</style>', `${hallCSS}</style>`)
      .replace('<title>明史人物谱与大事年表｜1368—1662</title>', '<title>事件馆｜步入大明数字历史博物馆</title>')
      .replace('Ming Biographical Register · Research Baseline 04', 'EVENT GALLERY · SIX HISTORICAL CHAPTERS')
      .replace('<h1>明史人物谱<small>1368—1662</small></h1>', '<h1>事件馆<small>1368—1662</small></h1>')
      .replace('人物不只存在于官职表：这里同时收录帝王宗室、后妃、文武官员、内廷人物、改变明朝命运的同时代政权人物、与明朝发生关键互动的域外人物，以及通过艺术、医学、出版与实地考察留下影响的在野人物。可按制度身份与历史领域交叉检索；评价分数是透明研究量表，不是“历史人物战力榜”。', '把近三百年历史放回时间与因果之中。95 件事件分为六个历史章节，从建国、扩张、危机、改革一直走到北京陷落和南明终局；可按类型、人物、地点和制度自由检索。')
      .replace('<b>双重范围</b><br>人物表以北京明朝 1368—1644 为主体；事件年表延伸至南明终局 1662。', '<b>本馆范围</b><br>起于 1368 年明朝建立，止于 1662 年永历帝被杀。')
      .replace(/<div class="scope"><b>本馆范围<\/b>.*?<\/div>/s, '<div class="scope"><b>本馆范围</b><br>起于 1368 年明朝建立，止于 1662 年永历帝被杀。<br><b>展览逻辑</b><br>六个阶段不是唯一分期，而是识别结构变化的参观路径。<br><b>置信度</b><br>81 件为高、14 件为中；因果与长期影响属于结构化研究判断。<br><b>跨馆</b><br>点击人物标签，前往人物馆查看生平、任期与评价。</div>')
      .replace(/function focusPerson\(name\)\{[^\n]*\}/, "function focusPerson(name){location.href='people.html?person='+encodeURIComponent(name)}")
      .replace('renderEvents();render();', "renderEvents();render();const eventParams=new URLSearchParams(location.search);const requestedStage=eventParams.get('stage');const requestedQuery=eventParams.get('q');const requestedCategory=eventParams.get('category');const requestedEvent=eventParams.get('event');if(requestedStage&&eventStages.some(s=>s.id===requestedStage))eventState.stage=requestedStage;if(requestedQuery){eventState.q=requestedQuery;document.getElementById('eventSearch').value=requestedQuery}if(requestedCategory&&eventCategories.includes(requestedCategory)){eventState.category=requestedCategory;document.getElementById('eventCategory').value=requestedCategory}renderEvents();if(requestedEvent&&eventRecord(requestedEvent))openEventDetail(eventRecord(requestedEvent));");
  }
  return html;
}

await fs.writeFile(`${museum}/people.html`, baseHall('people'), 'utf8');
await fs.writeFile(`${museum}/events.html`, baseHall('events'), 'utf8');

const stageCards = events.stages.map((stage,index)=>{
  const count=events.events.filter(e=>e.stage===stage.id).length;
  return `<a class="era" href="events.html?stage=${stage.id}"><span class="era-no">0${index+1}</span><span class="era-years">${stage.range}</span><h3>${stage.label}</h3><p>${stage.thesis}</p><em>${count} 件展品 →</em></a>`;
}).join('');

const portraitFor = name => {
  const sourced = portraits.people?.[name];
  if (sourced?.status === 'image' && sourced.file) {
    return {file:sourced.file, kind:'sourced', label:''};
  }
  const imagined = storytelling.people?.[name]?.portrait;
  return imagined ? {file:imagined, kind:'imagined', label:'AI想象像'} : null;
};
const featured = [
  ['朱元璋','开国与国家重建','一个流民皇帝如何重新组织国家？'],
  ['朱棣','内战、迁都与世界视野','夺位者如何塑造永乐时代？'],
  ['于谦','危城中的政治选择','皇帝被俘后，国家为何没有崩溃？'],
  ['张居正','改革与反作用','改革为何能成功，又为何迅速逆转？']
].map(([name,kicker,question])=>{
  const p=core.find(x=>x.name===name);
  const portrait=portraitFor(name);
  return `<a class="figure" href="people.html?person=${encodeURIComponent(name)}">${portrait?`<img src="${portrait.file}" alt="${name}${portrait.kind==='imagined'?'AI想象像':'人物画像'}">${portrait.label?`<span class="figure-art-label">${portrait.label}</span>`:''}`:`<span class="figure-fallback">${name[0]}</span>`}<span class="figure-copy"><small>${kicker}</small><b>${name}</b><em>${p?.birth||'待考'}—${p?.death||'待考'}</em><p>${question}</p></span></a>`;
}).join('');

const index = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>步入大明｜数字历史博物馆</title><style>
:root{--ink:#171611;--ink2:#26231c;--paper:#e8dfc9;--bone:#f4ecd9;--red:#a73528;--red2:#d35442;--gold:#ad8334;--line:rgba(232,223,201,.23);--muted:#aba18e}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--ink);color:var(--paper);font-family:"Songti SC","STSong","Noto Serif CJK SC",serif}body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.18;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.72' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.18'/%3E%3C/svg%3E")}a{color:inherit}.skip{position:fixed;left:12px;top:-70px;z-index:100;background:#fff;color:#181713;padding:10px 14px}.skip:focus{top:12px}.museum-nav{height:76px;position:fixed;inset:0 0 auto;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(20px,4vw,72px);background:linear-gradient(#171611,rgba(23,22,17,.82));border-bottom:1px solid var(--line);backdrop-filter:blur(16px)}.museum-brand{display:flex;gap:11px;align-items:center;text-decoration:none}.museum-brand b{display:block;font-size:18px;letter-spacing:.08em}.museum-brand small{display:block;margin-top:4px;font:9px/1 ui-monospace,monospace;letter-spacing:.16em;color:var(--muted)}.brand-seal{width:40px;height:40px;display:grid;place-items:center;border:1px solid var(--red2);color:var(--red2);font:700 26px/1 "STKaiti","KaiTi",serif;transform:rotate(-3deg)}.museum-links{height:100%;display:flex}.museum-links a{display:grid;place-items:center;padding:0 20px;text-decoration:none;font-size:13px;border-left:1px solid rgba(255,255,255,.08);position:relative}.museum-links a:hover,.museum-links a.active{background:rgba(255,255,255,.05);color:#fff}.museum-links a.active:after{content:"";position:absolute;height:3px;left:18px;right:18px;bottom:0;background:var(--red2)}
.hero{min-height:100svh;display:grid;grid-template-columns:1fr minmax(360px,600px) 1fr;align-items:center;position:relative;overflow:hidden;padding:110px clamp(24px,6vw,100px) 55px;background:radial-gradient(circle at 50% 56%,rgba(167,53,40,.19),transparent 26rem),linear-gradient(90deg,transparent 49.9%,rgba(232,223,201,.16) 50%,transparent 50.1%)}.hero:after{content:"";position:absolute;width:min(70vw,930px);height:min(70vw,930px);border:1px solid rgba(232,223,201,.08);border-radius:50%;left:50%;top:55%;transform:translate(-50%,-50%);box-shadow:0 0 0 110px rgba(232,223,201,.018),0 0 0 220px rgba(232,223,201,.012)}.year-pillar{position:relative;z-index:2;justify-self:end;font:700 clamp(56px,9vw,150px)/.8 Georgia,serif;color:rgba(232,223,201,.13);writing-mode:vertical-rl}.year-pillar.right{justify-self:start;transform:rotate(180deg)}.hero-center{position:relative;z-index:3;text-align:center;min-width:0}.hero-kicker{font:700 11px/1 ui-monospace,monospace;letter-spacing:.32em;color:var(--red2)}.hero h1{font-size:clamp(72px,8.6vw,128px);line-height:.78;letter-spacing:-.1em;margin:36px 0 29px;text-indent:-.1em;white-space:nowrap;word-break:keep-all}.hero h1 span{display:block;margin-top:29px;font-size:.33em;line-height:1;letter-spacing:.18em;text-indent:.18em;color:#bcb19c;white-space:nowrap}.hero p{font-size:16px;line-height:2;color:#c0b6a3;max-width:510px;margin:auto}.enter{display:inline-flex;align-items:center;gap:18px;margin-top:35px;padding:15px 20px;border:1px solid var(--red2);text-decoration:none;font-size:14px;color:#fff}.enter:after{content:"↓";color:var(--red2);font-size:20px}.hero-index{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);font:10px/1 ui-monospace,monospace;letter-spacing:.16em;color:#797265;z-index:3}
.section{padding:110px clamp(24px,6vw,100px);border-top:1px solid var(--line)}.section-head{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:end;margin-bottom:54px}.eyebrow{font:700 11px/1 ui-monospace,monospace;letter-spacing:.24em;color:var(--red2)}.section h2{font-size:clamp(42px,6vw,84px);line-height:.95;letter-spacing:-.05em;margin:14px 0 0}.section-head p{font-size:15px;line-height:1.9;color:var(--muted);margin:0;max-width:590px}.doors{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line)}.door{min-height:520px;position:relative;overflow:hidden;padding:38px;text-decoration:none;display:flex;flex-direction:column;justify-content:flex-end;background:#201e18;border-right:1px solid var(--line)}.door:last-child{border-right:0}.door:before{content:"";position:absolute;inset:30px;border:1px solid rgba(232,223,201,.17);transition:.5s}.door:after{content:"";position:absolute;width:330px;height:330px;border:1px solid rgba(232,223,201,.12);border-radius:50%;right:-100px;top:-90px;box-shadow:0 0 0 54px rgba(255,255,255,.02),0 0 0 108px rgba(255,255,255,.012);transition:.6s}.door.events{background:linear-gradient(145deg,#381d18,#1d1915)}.door.institutions{background:linear-gradient(145deg,#172727,#191714)}.door:hover:before{inset:22px;border-color:var(--red2)}.door:hover:after{transform:scale(1.08)}.door-no{position:absolute;top:50px;left:52px;font:700 11px/1 ui-monospace,monospace;color:var(--red2);letter-spacing:.12em}.door h3{position:relative;font-size:clamp(46px,5vw,76px);line-height:.9;margin:0 0 23px;letter-spacing:-.06em}.door p{position:relative;line-height:1.8;color:#bdb29f;font-size:14px}.door em{position:relative;font:700 11px/1 ui-monospace,monospace;letter-spacing:.12em;color:var(--red2);font-style:normal;margin-top:25px}
.eras{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-left:1px solid var(--line)}.era{min-height:310px;padding:28px;text-decoration:none;border-right:1px solid var(--line);border-bottom:1px solid var(--line);position:relative;transition:.25s}.era:hover{background:#211f19;transform:translateY(-4px)}.era-no{font:700 40px/1 Georgia,serif;color:rgba(232,223,201,.13)}.era-years{float:right;font:10px/1 ui-monospace,monospace;color:var(--red2)}.era h3{font-size:25px;line-height:1.2;margin:38px 0 12px}.era p{font-size:13px;line-height:1.75;color:var(--muted)}.era em{position:absolute;bottom:25px;left:28px;font:10px/1 ui-monospace,monospace;color:var(--red2);font-style:normal}
.figures{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.figure{height:470px;position:relative;overflow:hidden;background:#242119;text-decoration:none}.figure img,.figure-fallback{width:100%;height:100%;display:block;object-fit:cover;object-position:50% 16%;filter:grayscale(.35) sepia(.28) contrast(.88);transition:.6s}.figure-fallback{display:grid;place-items:center;font-size:100px;color:#6e281f;background:#2a251d}.figure:after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 32%,rgba(15,14,11,.94) 88%)}.figure:hover img{transform:scale(1.04);filter:grayscale(.05) sepia(.15)}.figure-art-label{position:absolute;z-index:3;top:14px;right:14px;padding:6px 8px;border:1px solid rgba(244,236,217,.45);background:rgba(23,22,17,.78);color:#eee4cf;font:700 9px/1 ui-monospace,monospace;letter-spacing:.12em;backdrop-filter:blur(8px)}.figure-copy{position:absolute;z-index:2;inset:auto 24px 24px}.figure-copy small{display:block;color:var(--red2);font:700 10px/1.3 ui-monospace,monospace}.figure-copy b{display:block;font-size:38px;margin:8px 0 4px}.figure-copy em{font:11px/1 ui-monospace,monospace;color:var(--muted);font-style:normal}.figure-copy p{font-size:13px;line-height:1.55;margin:15px 0 0;color:#d6cdbb}
.routes{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}.route{background:var(--ink);padding:28px;text-decoration:none;min-height:270px}.route:hover{background:#28241d}.route-time{font:700 30px/1 Georgia,serif;color:var(--red2)}.route small{display:block;margin-top:6px;font:10px/1 ui-monospace,monospace;color:var(--muted)}.route h3{font-size:24px;line-height:1.25;margin:35px 0 12px}.route p{font-size:13px;line-height:1.7;color:var(--muted)}
.research{background:var(--paper);color:var(--ink)}.research .eyebrow{color:var(--red)}.research .section-head p{color:#635c50}.desks{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #b9ae95}.desk{padding:30px;border-right:1px solid #b9ae95}.desk:last-child{border-right:0}.desk b{font-size:20px}.desk p{font-size:13px;line-height:1.8;color:#665e51}.desk a{color:var(--red)}.footer{padding:35px clamp(24px,6vw,100px);display:flex;justify-content:space-between;color:#70695c;font:10px/1.5 ui-monospace,monospace;border-top:1px solid var(--line)}
@media(max-width:960px){.hero{grid-template-columns:1fr}.year-pillar{display:none}.section-head{grid-template-columns:1fr}.doors{grid-template-columns:1fr}.door{border-right:0;border-bottom:1px solid var(--line)}.door:last-child{border-bottom:0}.eras{grid-template-columns:1fr 1fr}.figures,.routes{grid-template-columns:1fr 1fr}.desks{grid-template-columns:1fr}.desk{border-right:0;border-bottom:1px solid #b9ae95}.museum-nav{padding:0 16px}.museum-links a{padding:0 9px}}
@media(max-width:620px){.museum-nav{height:68px}.museum-brand small{display:none}.museum-links a{padding:0 8px;font-size:12px}.museum-links a:last-child{display:none}.hero{padding-inline:20px}.hero h1{font-size:clamp(64px,20vw,78px)}.section{padding:75px 20px}.doors,.eras,.figures,.routes{grid-template-columns:1fr}.door{min-height:420px;padding:30px}.figures{gap:8px}.figure{height:430px}.footer{display:block}.footer span{display:block;margin-top:8px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.door:before,.door:after,.era,.figure img{transition:none}}
</style></head><body>${nav('home')}<main id="main"><section class="hero"><div class="year-pillar">1368</div><div class="hero-center"><div class="hero-kicker">MING · A WALKABLE HISTORY</div><h1>步入大明<span>数字历史博物馆</span></h1><p>这里不是一条从头背到尾的年表。你可以跟随一个人、一场战争、一项制度或一个问题，穿过近三百年的明代历史。</p><a class="enter" href="#halls">从序厅入馆</a></div><div class="year-pillar right">1662</div><div class="hero-index">人物 ${peopleTotal} · 事件 ${events.events.length} · 历史阶段 ${events.stages.length}</div></section>
<section class="section" id="halls"><header class="section-head"><div><div class="eyebrow">CHOOSE A GALLERY</div><h2>选择你的入口</h2></div><p>从人物认识行动者，从事件建立时间骨架，从制度理解权力与政令如何运转。三个展厅彼此连接，不要求按唯一顺序参观。</p></header><div class="doors"><a class="door" href="people.html"><span class="door-no">GALLERY 01 · ${peopleTotal} PEOPLE</span><h3>人物馆</h3><p>沿帝系认识皇帝与重要子嗣，也可以按身份与领域寻找文武官员、内廷人物、在野人物及与明朝发生关键互动的域外人物。</p><em>进入人物馆 →</em></a><a class="door events" href="events.html"><span class="door-no">GALLERY 02 · ${events.events.length} EVENTS</span><h3>事件馆</h3><p>从建国到南明终局，把战争、制度、财政、政治、社会和文化放回时间轴，追问事件为什么发生、又留下了什么。</p><em>进入事件馆 →</em></a><a class="door institutions" href="institutions.html"><span class="door-no">GALLERY 03 · 29 INSTITUTIONS</span><h3>制度馆</h3><p>按年份切换中书省、内阁、六部、三法司、厂卫、军事和地方治理，追踪国家机器如何连接与变化。</p><em>进入制度馆 →</em></a></div></section>
<section class="section"><header class="section-head"><div><div class="eyebrow">SIX HISTORICAL CHAPTERS</div><h2>六个时代展区</h2></div><p>时代划分不是给历史切整齐的格子，而是帮助识别结构变化。点击任一展区，直接进入对应事件。</p></header><div class="eras">${stageCards}</div></section>
<section class="section"><header class="section-head"><div><div class="eyebrow">MEET THE PEOPLE</div><h2>从一个人开始</h2></div><p>人物不是孤立的名片。每张卡片都以一个问题开场，引导你把个人选择放回制度与时代。</p></header><div class="figures">${featured}</div></section>
<section class="section"><header class="section-head"><div><div class="eyebrow">CURATED WALKS</div><h2>带着问题参观</h2></div><p>如果不知道从哪里开始，选一条主题路线。短路线建立基本认识，长路线适合继续比较人物、事件和制度。</p></header><div class="routes"><a class="route" href="events.html?stage=s1"><span class="route-time">15</span><small>分钟 · 初识路线</small><h3>皇权如何建立</h3><p>从开国、分封、法律到丞相制度废除。</p></a><a class="route" href="events.html?q=土木堡"><span class="route-time">30</span><small>分钟 · 危机路线</small><h3>皇帝被俘之后</h3><p>土木堡、景泰即位、北京保卫战与夺门之变。</p></a><a class="route" href="events.html?stage=s5"><span class="route-time">45</span><small>分钟 · 世界路线</small><h3>白银、海贸与战争</h3><p>隆庆开海、全球白银、改革与万历三大征。</p></a><a class="route" href="events.html?stage=s6"><span class="route-time">60</span><small>分钟 · 深度路线</small><h3>1644为何发生</h3><p>财政、气候、辽东战争、民变与南明延续。</p></a></div></section>
<section class="section research" id="research"><header class="section-head"><div><div class="eyebrow">RESEARCH DESK</div><h2>研究台</h2></div><p>展览负责提出问题，研究台负责告诉你证据从哪里来。事实、解释和量化评价并非同一层级。</p></header><div class="desks"><div class="desk"><b>基础史料</b><p>以《明实录》、制度文献和《明史》为主要入口；注意正史的修纂年代与立场。</p><a href="https://www1.ihp.sinica.edu.tw/Research/Groups/scriptaSinica">中央研究院汉籍全文数据库 →</a></div><div class="desk"><b>人物关系</b><p>帝系、亲属、任官与交往关系需要交叉核对，不能只凭后世故事补齐。</p><a href="https://cbdb.hsites.harvard.edu/">中国历代人物传记资料库 →</a></div><div class="desk"><b>如何读评分</b><p>评分只是透明比较工具，不是史学界统一结论。细项、权重和置信度均在人物馆公开。</p><a href="people.html#main">查看评分方法 →</a></div></div></section></main><footer class="footer"><b>步入大明 · 数字历史博物馆</b><span>人物范围 1368—1644 · 事件范围 1368—1662</span></footer></body></html>`;

await fs.writeFile(`${museum}/index.html`, index, 'utf8');
await import('./build_ming_person_pages.mjs');
console.log(`wrote ${museum}/index.html, people.html, events.html and immersive person pages`);
