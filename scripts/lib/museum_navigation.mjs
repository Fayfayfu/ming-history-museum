const NAV_LINKS=[
  ['index.html','序厅','home'],
  ['people.html','人物馆','people'],
  ['events.html','事件馆','events'],
  ['institutions.html','制度馆','institutions'],
  ['exhibitions.html','专题展','exhibitions'],
  ['index.html#research','研究台','research']
];

export const MUSEUM_NAV_CSS=`
.skip{position:fixed;left:12px;top:-70px;z-index:200;background:#fff;color:#181713;padding:10px 14px}.skip:focus{top:12px}
.museum-nav{height:72px;position:sticky;top:0;z-index:80;display:flex;align-items:center;justify-content:space-between;padding:0 max(24px,calc((100vw - 1492px)/2));background:rgba(24,23,19,.96);color:#eee7d5;border-bottom:1px solid #554c3d;backdrop-filter:blur(18px)}
.museum-brand{display:flex;gap:11px;align-items:center;color:inherit;text-decoration:none}.museum-brand b{display:block;font:800 18px/1.1 "Songti SC","STSong",serif;letter-spacing:.08em}.museum-brand small{display:block;margin-top:4px;font:9px/1 ui-monospace,monospace;letter-spacing:.16em;color:#a99f8a}.brand-seal{width:38px;height:38px;display:grid;place-items:center;border:1px solid #c14a38;color:#d85743;font:700 25px/1 "STKaiti","KaiTi",serif;transform:rotate(-3deg)}
.museum-links{height:100%;display:flex;align-items:stretch}.museum-links a{display:grid;place-items:center;padding:0 20px;color:#cfc5b0;text-decoration:none;font-family:"Songti SC","STSong","Noto Serif CJK SC",serif;font-size:14px;font-weight:700;line-height:1;border-left:1px solid #39362f;position:relative}.museum-links a:hover,.museum-links a.active{color:#fff;background:#292721;box-shadow:none}.museum-links a.active:after{content:"";position:absolute;height:3px;left:18px;right:18px;bottom:0;background:#b43a2c}
@media(max-width:960px){.museum-nav{padding-inline:16px}.museum-links a{padding-inline:9px}}
@media(max-width:720px){.museum-nav{height:auto;min-height:66px;padding:8px 14px;align-items:flex-start}.museum-brand small{display:none}.museum-links{align-self:stretch}.museum-links a{padding-inline:9px;font-size:12px}.museum-links a:last-child{display:none}}
@media(max-width:520px){.museum-links a{padding-inline:6px;font-size:11px}.museum-links a:nth-last-child(-n+2){display:none}}
`;

export function renderMuseumNavigation(active,{prefix='',skipTarget='main'}={}){
  const links=NAV_LINKS.map(([href,label,key])=>`<a${active===key?' class="active"':''} href="${prefix}${href}">${label}</a>`).join('');
  return `<a class="skip" href="#${skipTarget}">跳到主要内容</a><nav class="museum-nav" aria-label="博物馆主导航"><a class="museum-brand" href="${prefix}index.html"><span class="brand-seal">明</span><span><b>步入大明</b><small>数字历史博物馆</small></span></a><div class="museum-links">${links}</div></nav>`;
}
