import {chromium} from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto('file://'+path.join(root,'people.html'),{waitUntil:'networkidle'});

const expectedGroups=[
  {label:'中枢与监察',options:['内阁','都察院']},
  {label:'六部',options:['吏部','户部','礼部','兵部','刑部','工部']},
  {label:'内廷',options:['司礼监']},
  {label:'厂卫',options:['锦衣卫','东厂','西厂']}
];
const groups=await page.locator('#institution optgroup').evaluateAll(nodes=>nodes.map(node=>({
  label:node.label,
  options:[...node.querySelectorAll('option')].map(option=>option.value)
})));
const expectedPeople={内阁:'张居正',都察院:'海瑞',吏部:'蹇义',户部:'夏原吉',礼部:'徐光启',兵部:'于谦',刑部:'张璁',工部:'宋礼',司礼监:'王振',锦衣卫:'朱元璋',东厂:'魏忠贤',西厂:'汪直'};
const filters=[];
for(const [institution,expectedPerson] of Object.entries(expectedPeople)){
  await page.selectOption('#institution',institution);
  filters.push({
    institution,
    expectedPerson,
    names:await page.locator('#rows .name').allTextContents()
  });
}
const result={
  groups,
  filters,
  rosterColumnCount:await page.locator('.roster thead th').count()
};
result.pass=JSON.stringify(groups)===JSON.stringify(expectedGroups)
  && result.rosterColumnCount===15
  && filters.every(item=>item.names.includes(item.expectedPerson));
await fs.writeFile(path.join(root,'机构筛选验收报告.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
await browser.close();
if(!result.pass)process.exit(1);
