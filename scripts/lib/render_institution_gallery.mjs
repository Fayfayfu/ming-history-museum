const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

const topicLabels={
  overview:'国家机器',
  document_to_decree:'奏章成令',
  supervision_officials:'谁监督官员',
  justice_vs_imperial_prison:'三法司与诏狱',
  military_command:'谁来调兵',
  central_local:'中央与地方'
};

function renderHead(){
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>制度馆｜步入大明数字历史博物馆</title><style>
:root{--ink:#171611;--ink2:#211f19;--paper:#e9e0ca;--bone:#f4ecd9;--red:#a73528;--red2:#d55442;--gold:#b58a3c;--muted:#a99f8d;--line:rgba(233,224,202,.19);--darkline:#3b362b;--civil:#7089ad;--justice:#b95b4e;--inner:#866786;--military:#6e8792;--local:#6f9278}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--ink);color:var(--paper);font-family:"Songti SC","STSong","Noto Serif CJK SC",serif;overflow-x:hidden}body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.14;z-index:100;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.72' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.14'/%3E%3C/svg%3E")}button,a{font:inherit}.skip{position:fixed;left:12px;top:-70px;z-index:200;background:#fff;color:#181713;padding:10px 14px}.skip:focus{top:12px}.museum-nav{height:72px;position:sticky;top:0;z-index:60;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(16px,4vw,70px);background:rgba(23,22,17,.97);border-bottom:1px solid var(--darkline);backdrop-filter:blur(18px)}.museum-brand{display:flex;gap:11px;align-items:center;color:inherit;text-decoration:none}.museum-brand b{display:block;font-size:18px;letter-spacing:.08em}.museum-brand small{display:block;margin-top:4px;font:9px/1 ui-monospace,monospace;letter-spacing:.16em;color:var(--muted)}.brand-seal{width:38px;height:38px;display:grid;place-items:center;border:1px solid var(--red2);color:var(--red2);font:700 25px/1 "STKaiti","KaiTi",serif;transform:rotate(-3deg)}.museum-links{height:100%;display:flex}.museum-links a{display:grid;place-items:center;padding:0 17px;color:#cfc5b0;text-decoration:none;font-size:13px;border-left:1px solid rgba(255,255,255,.08);position:relative}.museum-links a:hover,.museum-links a.active{background:#28251f;color:#fff}.museum-links a.active:after{content:"";position:absolute;left:16px;right:16px;bottom:0;height:3px;background:var(--red2)}
.hall-hero{min-height:clamp(500px,72vh,760px);display:grid;grid-template-columns:1.25fr .75fr;grid-template-rows:1fr auto;padding:clamp(70px,9vh,120px) clamp(24px,6vw,96px) 34px;background:radial-gradient(circle at 73% 35%,rgba(175,132,55,.11),transparent 24rem),#12110e;position:relative;overflow:hidden;border-bottom:1px solid var(--line)}.hall-hero:after{content:"制";position:absolute;right:2vw;top:-5rem;font-size:34rem;line-height:1;color:rgba(233,224,202,.025);font-weight:900}.hero-title{align-self:center;position:relative;z-index:2}.hero-title>span{font:700 10px/1 ui-monospace,monospace;letter-spacing:.24em;color:var(--red2)}.hero-title h1{font-size:clamp(68px,9vw,128px);line-height:.8;letter-spacing:-.09em;margin:27px 0 34px}.hero-title p{max-width:700px;margin:0;font-size:16px;line-height:1.95;color:#c7bca8}.hero-year{align-self:center;justify-self:end;width:min(100%,320px);padding:28px 0 28px 34px;border-left:1px solid var(--gold);position:relative;z-index:2}.hero-year output{display:block;font:700 clamp(72px,9vw,132px)/.75 Georgia,serif;color:rgba(233,224,202,.88);letter-spacing:-.07em}.hero-year b{display:block;margin-top:28px;font-size:20px}.hero-year p{margin:12px 0 0;color:var(--muted);font-size:12px;line-height:1.7}.dynasty-ruler{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);position:relative;z-index:2}.phase-button,.view-button{border:0;color:var(--paper);background:transparent;cursor:pointer}.phase-button{min-height:62px;padding:17px 14px;text-align:left;border-right:1px solid var(--line);font-size:12px}.phase-button:hover,.phase-button[aria-pressed="true"]{background:rgba(181,138,60,.1);box-shadow:inset 0 -3px var(--red2);color:#fff}.dynasty-ruler input{grid-column:1/-1;width:100%;height:20px;margin:8px 0 0;accent-color:var(--red2)}
.atlas-shell{display:grid;grid-template-columns:176px minmax(0,1fr);min-height:980px;border-top:1px solid var(--line)}.topic-rail{position:sticky;top:72px;align-self:start;display:grid;background:#171511;border-right:1px solid var(--line)}.view-button{min-height:86px;padding:18px 14px;text-align:left;border-bottom:1px solid var(--line);font-size:12px;line-height:1.45}.view-button:before{content:attr(data-index);display:block;margin-bottom:9px;color:var(--gold);font:8px/1 ui-monospace,monospace}.view-button:hover,.view-button[aria-pressed="true"]{background:#27231d;color:#fff;box-shadow:inset 3px 0 var(--red2)}.atlas-field{min-width:0}.view-band{min-height:132px;display:grid;grid-template-columns:1fr minmax(280px,.7fr);gap:32px;align-items:end;padding:28px clamp(24px,4vw,62px);border-bottom:1px solid var(--line);background:#191713}.view-band h2{margin:0;font-size:clamp(35px,4vw,59px);line-height:1}.view-band p{margin:0;color:var(--muted);font-size:13px;line-height:1.75}.graph-stage{height:900px;position:relative;overflow:hidden;background:radial-gradient(ellipse at 50% 0,rgba(184,145,72,.07),transparent 43%),#11100d}.imperial-axis{position:absolute;left:50%;top:3%;bottom:4%;width:1px;background:linear-gradient(transparent,var(--gold) 12%,rgba(181,138,60,.16) 85%,transparent)}.imperial-axis:before{content:"皇权中轴";position:absolute;top:6%;left:10px;white-space:nowrap;color:rgba(181,138,60,.56);font:8px/1 ui-monospace,monospace;letter-spacing:.16em}.relation-layer{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}.relation-layer path{fill:none;stroke-width:.24;opacity:.48;vector-effect:non-scaling-stroke}.relation-layer path.document_flow{stroke:#d5ae58;stroke-dasharray:1.2 .8}.relation-layer path.direct_imperial_control{stroke:#df7b62}.relation-layer path.formal_subordination{stroke:#9aa8b5}.relation-layer path.supervision_review{stroke:#c16053;stroke-dasharray:.6 .6}.relation-layer path.special_imperial_mandate{stroke:#9a6c99;stroke-width:.34}.relation-layer path.military_coordination{stroke:#718f9f;stroke-dasharray:1.6 .6}.relation-layer path.operational_coordination{stroke:#70967a}.institution-node{position:absolute;left:calc(var(--x)*1% + var(--nudge-x,0px));top:calc(var(--y)*1%);transform:translate(-50%,-50%);transition:opacity .22s ease,transform .22s ease,border-color .22s ease;z-index:4;width:clamp(94px,9vw,132px);min-height:54px;padding:9px 10px;border:1px solid rgba(197,160,87,.34);background:rgba(21,20,16,.94);color:var(--paper);text-align:left;cursor:pointer;box-shadow:0 7px 22px rgba(0,0,0,.24)}.institution-node[data-id="court_judicial_review"]{--nudge-x:-28px}.institution-node[data-id="three_judicial_offices"]{--nudge-x:28px}.institution-node span{display:block;font-size:13px;font-weight:700;line-height:1.25}.institution-node small{display:block;margin-top:6px;color:var(--muted);font:8px/1 ui-monospace,monospace}.institution-node[data-region="axis"]{border-color:rgba(197,160,87,.8)}.institution-node[data-region="supervision"]{border-color:rgba(185,91,78,.64)}.institution-node[data-region="inner"]{border-color:rgba(134,103,134,.72)}.institution-node[data-region="military"]{border-color:rgba(110,135,146,.66)}.institution-node[data-region="local"]{border-color:rgba(111,146,120,.66)}.institution-node:hover,.institution-node:focus-visible{outline:0;background:#2b2821;box-shadow:0 0 0 2px rgba(213,84,66,.45)}.institution-node.is-dimmed{opacity:.18}.institution-node.is-focused{z-index:8;transform:translate(-50%,-50%) scale(1.045);border-color:var(--red2)}.relation-legend{display:grid;grid-template-columns:repeat(7,1fr);list-style:none;padding:0;margin:0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.relation-legend li{padding:13px 10px;border-right:1px solid var(--line);font-size:10px;color:var(--muted)}.relation-legend li:last-child{border-right:0}.relation-legend i{display:block;width:34px;height:2px;margin-bottom:9px;background:var(--paper)}.relation-legend li:nth-child(2) i{background:var(--red2)}.relation-legend li:nth-child(3) i{background:#9aa8b5}.relation-legend li:nth-child(4) i{background:var(--justice)}.relation-legend li:nth-child(5) i{background:var(--inner)}.relation-legend li:nth-child(6) i{background:var(--military)}.relation-legend li:nth-child(7) i{background:var(--local)}.mobile-structure{display:none}.method-band{display:grid;grid-template-columns:.65fr 1.35fr;gap:42px;padding:50px clamp(24px,4vw,62px);border-bottom:1px solid var(--line)}.method-band h2{margin:0;font-size:28px}.method-band p{margin:0;color:var(--muted);font-size:13px;line-height:1.85}.method-band p+p{grid-column:2}.footer{padding:35px clamp(24px,6vw,100px);display:flex;justify-content:space-between;color:#70695c;font:10px/1.5 ui-monospace,monospace;border-top:1px solid var(--line)}
.institution-drawer{position:fixed;z-index:90;right:0;top:72px;bottom:0;width:min(430px,92vw);padding:34px;background:var(--paper);color:var(--ink);box-shadow:-24px 0 60px rgba(0,0,0,.38);overflow:auto;transition:transform .25s ease}.drawer-close{float:right;padding:8px 10px;border:1px solid #9c8d71;background:transparent;color:var(--ink);cursor:pointer}.institution-drawer h2{clear:both;margin:55px 0 17px;font-size:44px}.institution-drawer>p{font-size:13px;line-height:1.8;color:#5f584c}.institution-drawer #detailState{display:inline-block;padding:6px 8px;border:1px solid #9c8d71;font:700 9px/1.4 ui-monospace,monospace}.institution-drawer #detailBoundary{padding:13px;border-left:3px solid var(--red);background:#d9cdb5}.institution-drawer #detailConfidence{color:var(--red);font:700 10px/1.6 ui-monospace,monospace}.institution-drawer #detailPeople{display:flex;gap:6px;flex-wrap:wrap;margin:24px 0}.institution-drawer #detailPeople a{padding:7px 9px;border:1px solid #a69a82;color:#7f2f27;text-decoration:none;font-size:11px}.institution-drawer #detailSources{list-style:none;padding:0;margin:0}.institution-drawer #detailSources a{display:grid;grid-template-columns:1fr auto;gap:8px;padding:9px 0;border-bottom:1px solid #c8bda6;color:#4f493f;text-decoration:none;font-size:11px}[hidden]{display:none!important}
@media(max-width:1080px){.museum-links a{padding:0 10px}.institution-node{width:100px}.view-band{grid-template-columns:1fr}.view-band p{max-width:650px}}
@media(max-width:800px){.museum-nav{height:auto;min-height:68px;padding:8px 14px;align-items:flex-start}.museum-brand small{display:none}.museum-links{align-self:stretch}.museum-links a{padding:0 8px;font-size:11px}.museum-links a:last-child{display:none}.hall-hero{grid-template-columns:1fr;grid-template-rows:auto auto auto;gap:35px;padding:65px 20px 25px}.hero-title h1{font-size:67px}.hero-year{justify-self:start;border-left:0;border-top:1px solid var(--gold);padding:20px 0;width:100%}.hero-year output{font-size:72px}.dynasty-ruler{grid-template-columns:1fr 1fr}.atlas-shell{display:block}.topic-rail{position:static;display:flex;overflow:auto}.view-button{min-width:142px}.view-band{padding:28px 20px}.graph-stage{display:none}.mobile-structure{display:block;padding:18px 16px 48px}.mobile-system-group{border:1px solid var(--line);margin-bottom:10px}.mobile-system-head{display:flex;align-items:center;justify-content:space-between;padding:14px;background:#211f19}.mobile-system-head b{font-size:16px}.mobile-system-head span{font:9px/1 ui-monospace,monospace;color:var(--muted)}.mobile-node-list{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line)}.mobile-node{border:0;background:#171611;color:var(--paper);min-height:58px;padding:12px;text-align:left;font-size:13px}.mobile-node small{display:block;margin-top:6px;color:var(--muted);font:8px/1 ui-monospace,monospace}.relation-legend{grid-template-columns:1fr 1fr}.relation-legend li{border-bottom:1px solid var(--line)}.method-band{grid-template-columns:1fr;padding:38px 20px}.method-band p+p{grid-column:auto}.institution-drawer{top:auto;width:100%;height:min(88svh,760px)}.footer{display:block}.footer span{display:block;margin-top:8px}}
@media(max-width:470px){.museum-links a{padding:0 5px;font-size:10px}.museum-links a[href="exhibitions.html"]{display:none}.hero-title h1{font-size:58px}.phase-button{padding:12px 8px;font-size:11px}.mobile-node-list{grid-template-columns:1fr}.relation-legend{grid-template-columns:1fr}.relation-legend li{border-right:0}}
.relation-layer path.is-focused{opacity:1;stroke-width:.55}.relation-label{fill:#d6c9ae;stroke:#11100d;stroke-width:.28;paint-order:stroke;font:1.25px/1 sans-serif;text-anchor:middle}.institution-node.is-context{opacity:.48}.institution-node.is-dimmed{opacity:.18}
@media(prefers-reduced-motion:reduce){.institution-node,.institution-drawer{transition-duration:0s!important;animation:none!important}html{scroll-behavior:auto}}
</style>`;
}

function renderMuseumNav(){
  return `<a class="skip" href="#main">跳到主要内容</a><nav class="museum-nav" aria-label="博物馆主导航"><a class="museum-brand" href="index.html"><span class="brand-seal">明</span><span><b>步入大明</b><small>数字历史博物馆</small></span></a><div class="museum-links"><a href="index.html">序厅</a><a href="people.html">人物馆</a><a href="events.html">事件馆</a><a class="active" href="institutions.html">制度馆</a><a href="exhibitions.html">专题展</a><a href="index.html#research">研究台</a></div></nav>`;
}

function renderHero(graph){
  const buttons=graph.phases.map(phase=>`<button class="phase-button" type="button" data-phase="${esc(phase.id)}" aria-pressed="${phase.id==='mid_late_ming'}">${esc(phase.name.split('：')[0])}</button>`).join('');
  return `<header class="hall-hero"><div class="hero-title"><span>INSTITUTION GALLERY · 1368—1644</span><h1>大明如何运转</h1><p>沿皇权中轴观察中枢、外廷、监察、内廷、军事与地方治理。</p></div><div class="hero-year"><output id="yearValue">1600</output><b id="phaseName">正统至崇祯</b><p id="phaseSummary">票拟、批红、督抚和厂卫关系随年份变化。</p></div><div class="dynasty-ruler">${buttons}<input id="yearRange" aria-label="选择年份" type="range" min="1368" max="1644" value="1600" step="1"></div></header>`;
}

function renderAtlas(graph,layout){
  const viewButtons=graph.views.map((view,index)=>`<button class="view-button" type="button" data-index="0${index+1}" data-view="${esc(view.id)}" aria-pressed="${view.id==='overview'}">${esc(topicLabels[view.id]||view.name)}</button>`).join('');
  const nodes=graph.institutions.map(node=>{const point=layout[node.id];return `<button class="institution-node system-${esc(node.system)}" type="button" data-id="${esc(node.id)}" data-system="${esc(node.system)}" data-region="${esc(point.region)}" data-tier="${esc(point.tier)}" style="--x:${esc(point.x)};--y:${esc(point.y)}" hidden><span>${esc(node.name)}</span><small>${esc(node.confidence)}置信度</small></button>`}).join('');
  return `<section class="atlas-shell"><nav class="topic-rail" aria-label="制度阅读问题">${viewButtons}</nav><div class="atlas-field"><header class="view-band"><h2 id="viewTitle">${esc(graph.views[0].name)}</h2><p id="viewQuestion">${esc(graph.views[0].question)}</p></header><div class="graph-stage" aria-label="可交互明朝机构关系图"><div class="imperial-axis" aria-hidden="true"></div><svg class="relation-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g id="relationPaths"></g></svg><div id="institutionNodes">${nodes}</div></div><div class="mobile-structure" id="mobileStructure" aria-label="移动端机构分组"></div><ul class="relation-legend" aria-label="关系类型图例"><li><i></i>文书流转</li><li><i></i>皇帝直辖</li><li><i></i>法定统属</li><li><i></i>监察复核</li><li><i></i>特别授权</li><li><i></i>军事协同</li><li><i></i>业务协同</li></ul><section class="method-band"><h2>如何读这张图</h2><p id="viewBoundary">${esc(graph.views[0].boundary)}</p><p>箭头按关系类型解释，不等于现代组织架构中的单一上下级汇报线。西厂等间歇设置机构只在有证据的年份范围显示。</p></section></div></section>`;
}

function renderDrawer(){
  return `<aside class="institution-drawer" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="detailTitle" hidden><button class="drawer-close" type="button" aria-label="关闭机构档案">关闭</button><h2 id="detailTitle">机构档案</h2><p id="detailState"></p><p id="detailSummary"></p><p id="detailBoundary"></p><p id="detailConfidence"></p><div id="detailPeople"></div><ul id="detailSources"></ul></aside>`;
}

function clientRuntime(){
  return `const graph=JSON.parse(document.getElementById('institutionGraphData').textContent);
const state={year:1600,view:'overview',hoveredNode:null,selectedNode:null,lastTrigger:null};
const institutionById=new Map(graph.institutions.map(item=>[item.id,item]));
const relationById=new Map(graph.relations.map(item=>[item.id,item]));
const sourceById=new Map(graph.sources.map(item=>[item.id,item]));
const systemById=new Map(graph.systems.map(item=>[item.id,item]));
const phaseById=new Map(graph.phases.map(item=>[item.id,item]));
const drawer=document.querySelector('.institution-drawer');
const stateLabels={active_until_reform_in_1380:'1380年改革前存续',evolving_advisory_center:'辅政机制持续演变',abolished_in_1380:'1380年罢除',organization_evolved:'组织形态演变',repeated_reorganization:'反复改组',restored_and_later_stabilized:'恢复后渐趋稳定',intermittent_with_dali_temple:'随大理寺状态变化',functions_evolved:'职能持续演变',powers_varied:'权力随时期变化',power_varied:'权势随时期变化',intermittent:'阶段内反复设置',reopened:'正德重开',reorganized_in_1380:'1380年改组',effectiveness_changed:'效能随时期变化',dispatches_gradually_regularized:'差遣逐渐常态化'};

function activePeriod(item,year){
  return item.active_periods.find(period=>year>=period.start&&year<=period.end);
}

function activeAt(item,year){
  return item.active_periods.some(period=>year>=period.start&&year<=period.end);
}

function phaseForYear(year){
  return graph.phases.find(phase=>year>=phase.start&&year<=phase.end)||graph.phases.at(-1);
}

function viewRecord(){
  return graph.views.find(view=>view.id===state.view);
}

function currentRelations(){
  const relationIds=new Set(viewRecord().relation_ids);
  return graph.relations.filter(relation=>relationIds.has(relation.id)&&activeAt(relation,state.year)&&activeAt(institutionById.get(relation.from),state.year)&&activeAt(institutionById.get(relation.to),state.year));
}

function pathFor(from,to){
  const a=graph.atlas_layout[from],b=graph.atlas_layout[to];
  const bend=Math.max(4,Math.abs(b.x-a.x)*.28);
  return 'M '+a.x+' '+a.y+' C '+(a.x+(b.x>a.x?bend:-bend))+' '+a.y+', '+(b.x-(b.x>a.x?bend:-bend))+' '+b.y+', '+b.x+' '+b.y;
}

function renderNodes(){
  const topicIds=new Set(viewRecord().institution_ids);
  for(const button of document.querySelectorAll('.institution-node')){
    const node=institutionById.get(button.dataset.id);
    button.hidden=!activeAt(node,state.year);
    button.classList.toggle('is-context',!topicIds.has(node.id));
    button.classList.toggle('is-focused',node.id===(state.selectedNode||state.hoveredNode));
  }
}

function renderRelations(){
  const group=document.getElementById('relationPaths');
  group.replaceChildren();
  for(const relation of currentRelations()){
    const a=graph.atlas_layout[relation.from],b=graph.atlas_layout[relation.to];
    if(!a||!b)continue;
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',pathFor(relation.from,relation.to));
    path.setAttribute('class','relation-path '+relation.type);
    path.dataset.id=relation.id;
    path.dataset.from=relation.from;
    path.dataset.to=relation.to;
    const title=document.createElementNS('http://www.w3.org/2000/svg','title');
    title.textContent=relation.label;
    path.append(title);
    const label=document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('class','relation-label');
    label.setAttribute('x',(a.x+b.x)/2);
    label.setAttribute('y',(a.y+b.y)/2-.8);
    label.dataset.id=relation.id;
    label.dataset.from=relation.from;
    label.dataset.to=relation.to;
    label.textContent=relation.label;
    label.hidden=state.view==='overview';
    group.append(path,label);
  }
}

function renderMobile(){
  const root=document.getElementById('mobileStructure');
  const topicIds=new Set(viewRecord().institution_ids);
  root.replaceChildren();
  for(const system of graph.systems){
    const nodes=graph.institutions.filter(node=>node.system===system.id&&activeAt(node,state.year));
    if(!nodes.length)continue;
    const section=document.createElement('section');
    section.className='mobile-system-group';
    const head=document.createElement('header');
    head.className='mobile-system-head';
    const title=document.createElement('b');
    title.textContent=system.name;
    const count=document.createElement('span');
    count.textContent=nodes.length+'个当前节点';
    head.append(title,count);
    const list=document.createElement('div');
    list.className='mobile-node-list';
    for(const node of nodes){
      const button=document.createElement('button');
      button.type='button';
      button.className='mobile-node';
      button.classList.toggle('is-context',!topicIds.has(node.id));
      button.dataset.id=node.id;
      button.append(document.createTextNode(node.name));
      const small=document.createElement('small');
      small.textContent=node.confidence+'置信度 · 查看档案';
      button.append(small);
      button.addEventListener('click',()=>openDrawer(node.id,button));
      list.append(button);
    }
    section.append(head,list);
    root.append(section);
  }
}

function focusIds(id){
  const ids=new Set([id]);
  for(const relation of currentRelations())if(relation.from===id||relation.to===id){ids.add(relation.from);ids.add(relation.to);}
  return ids;
}

function setFocus(id){
  const focus=id?focusIds(id):null;
  document.querySelectorAll('.institution-node').forEach(node=>{
    node.classList.toggle('is-dimmed',Boolean(focus&&!focus.has(node.dataset.id)));
    node.classList.toggle('is-focused',node.dataset.id===id);
  });
  document.querySelectorAll('.relation-path').forEach(path=>path.classList.toggle('is-focused',Boolean(id&&(path.dataset.from===id||path.dataset.to===id))));
  document.querySelectorAll('.relation-label').forEach(label=>{
    const focused=Boolean(id&&(label.dataset.from===id||label.dataset.to===id));
    label.classList.toggle('is-focused',focused);
    label.hidden=state.view==='overview'&&!focused;
  });
}

function stateFor(node){
  const period=activePeriod(node,state.year);
  if(!period)return '当前年份未设置';
  const label=stateLabels[period.state]||'当前年份存续';
  return label+' · '+period.start+'—'+period.end;
}

function populateDrawer(node){
  document.getElementById('detailTitle').textContent=node.name;
  document.getElementById('detailState').textContent=systemById.get(node.system).name+' · '+stateFor(node);
  document.getElementById('detailSummary').textContent=node.summary;
  document.getElementById('detailBoundary').textContent=node.id==='western_depot'?'成化年间只能标记为阶段内反复设置；逐年开闭尚未补齐，不得伪造连续常设状态。':node.boundary;
  document.getElementById('detailConfidence').textContent='置信度：'+node.confidence;
  const people=document.getElementById('detailPeople');
  people.replaceChildren();
  const linked=graph.people_by_institution[node.id]||[];
  if(linked.length){
    for(const person of linked){
      const a=document.createElement('a');
      a.href='people.html?person='+encodeURIComponent(person.name);
      a.textContent=person.name;
      a.title=person.relation+'：'+person.note;
      people.append(a);
    }
  }else people.textContent='人物馆暂未建立正式任职关联';
  const sources=document.getElementById('detailSources');
  sources.replaceChildren();
  for(const sourceId of node.source_ids){
    const source=sourceById.get(sourceId);
    if(!source)continue;
    const li=document.createElement('li'),a=document.createElement('a'),label=document.createElement('b'),mark=document.createElement('span');
    a.href=source.url;
    a.target='_blank';
    a.rel='noreferrer';
    label.textContent=source.title;
    mark.textContent='打开 ↗';
    a.append(label,mark);
    li.append(a);
    sources.append(li);
  }
}

function openDrawer(id,trigger=document.activeElement){
  const node=institutionById.get(id);
  if(!node)return;
  state.selectedNode=id;
  state.lastTrigger=trigger;
  populateDrawer(node);
  drawer.hidden=false;
  drawer.setAttribute('aria-hidden','false');
  document.body.classList.add('drawer-open');
  drawer.querySelector('.drawer-close').focus();
  setFocus(id);
}

function closeDrawer(){
  drawer.setAttribute('aria-hidden','true');
  drawer.hidden=true;
  document.body.classList.remove('drawer-open');
  state.selectedNode=null;
  setFocus(state.hoveredNode);
  state.lastTrigger?.focus?.();
}

function renderAtlas(){
  const phase=phaseForYear(state.year);
  document.getElementById('yearRange').value=state.year;
  document.getElementById('yearValue').textContent=state.year;
  document.getElementById('phaseName').textContent=phase.name.split('：')[0];
  document.getElementById('phaseSummary').textContent=phase.summary;
  document.querySelectorAll('.phase-button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.phase===phase.id)));
  const view=viewRecord();
  document.getElementById('viewTitle').textContent=view.name;
  document.getElementById('viewQuestion').textContent=view.question;
  document.getElementById('viewBoundary').textContent=view.boundary;
  document.querySelectorAll('.view-button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===state.view)));
  if(state.selectedNode&&!activeAt(institutionById.get(state.selectedNode),state.year)){
    state.hoveredNode=null;
    closeDrawer();
  }
  renderNodes();
  renderRelations();
  renderMobile();
  setFocus(state.selectedNode||state.hoveredNode);
}

window.setInstitutionYear=function(year){
  state.year=Math.max(1368,Math.min(1644,Number(year)));
  renderAtlas();
};
document.getElementById('yearRange').addEventListener('input',event=>setInstitutionYear(event.target.value));
document.querySelectorAll('.phase-button').forEach(button=>button.addEventListener('click',()=>setInstitutionYear(phaseById.get(button.dataset.phase).default_year)));
document.querySelectorAll('.view-button').forEach(button=>button.addEventListener('click',()=>{
  state.view=button.dataset.view;
  renderAtlas();
}));
document.querySelectorAll('.institution-node').forEach(button=>{
  button.addEventListener('pointerenter',()=>{
    state.hoveredNode=button.dataset.id;
    setFocus(state.hoveredNode);
  });
  button.addEventListener('pointerleave',()=>{
    state.hoveredNode=null;
    setFocus(state.selectedNode);
  });
  button.addEventListener('click',()=>openDrawer(button.dataset.id,button));
});
drawer.querySelector('.drawer-close').addEventListener('click',closeDrawer);
addEventListener('keydown',event=>{if(event.key==='Escape'&&!drawer.hidden)closeDrawer();});
renderAtlas();`;
}

export function renderInstitutionGallery({graph,peopleByInstitution,layout}){
  const payload=JSON.stringify({...graph,people_by_institution:peopleByInstitution,atlas_layout:layout}).replaceAll('</script>','<\\/script>');
  return `<!doctype html><html lang="zh-CN"><head>${renderHead()}</head><body>${renderMuseumNav()}<main id="main">${renderHero(graph)}${renderAtlas(graph,layout)}${renderDrawer()}</main><footer class="footer"><b>步入大明 · 制度馆</b><span>${graph.institutions.length}个规范节点 · ${graph.relations.length}条关系 · ${graph.views.length}种阅读视图</span></footer><script id="institutionGraphData" type="application/json">${payload}</script><script>${clientRuntime()}</script></body></html>`;
}
