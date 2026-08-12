import {chromium} from 'playwright';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const pageUrl=`file://${path.join(root,'people.html')}?person=${encodeURIComponent('朱元璋')}`;
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});

try{
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  await page.goto(pageUrl,{waitUntil:'networkidle'});

  const result=await page.evaluate(()=>{
    const panel=document.querySelector('#drawer .panel');
    if(!panel)throw new Error('未找到人物抽屉滚动容器');

    panel.scrollTop=600;
    const zhuYuanzhangBefore=panel.scrollTop;
    closeDetail();
    openDetail(personRecord('朱元璋'));
    const zhuYuanzhangReopened=panel.scrollTop;

    openDetail(personRecord('朱允炆'));
    const zhuYunwenFirstOpen=panel.scrollTop;

    panel.scrollTop=500;
    const zhuYunwenBefore=panel.scrollTop;
    closeDetail();
    openDetail(personRecord('朱允炆'));
    const zhuYunwenReopened=panel.scrollTop;

    return {zhuYuanzhangBefore,zhuYuanzhangReopened,zhuYunwenFirstOpen,zhuYunwenBefore,zhuYunwenReopened};
  });

  const errors=[];
  if(result.zhuYuanzhangBefore<500)errors.push(`测试前未能滚动朱元璋抽屉：${result.zhuYuanzhangBefore}`);
  if(Math.abs(result.zhuYuanzhangReopened-result.zhuYuanzhangBefore)>2)errors.push(`重新打开同一人物未保持定位：${result.zhuYuanzhangBefore} → ${result.zhuYuanzhangReopened}`);
  if(result.zhuYunwenFirstOpen!==0)errors.push(`切换到新人物未回到顶部：${result.zhuYunwenFirstOpen}`);
  if(result.zhuYunwenBefore<400)errors.push(`测试前未能滚动朱允炆抽屉：${result.zhuYunwenBefore}`);
  if(Math.abs(result.zhuYunwenReopened-result.zhuYunwenBefore)>2)errors.push(`朱允炆重新打开后未保持定位：${result.zhuYunwenBefore} → ${result.zhuYunwenReopened}`);
  if(errors.length){
    console.error(`人物抽屉滚动状态验证失败（${errors.length}项）：`);
    errors.forEach(error=>console.error(`- ${error}`));
    process.exitCode=1;
  }else{
    console.log('人物抽屉滚动状态验证通过：新人物回到顶部，同一人物保持阅读位置。');
  }
}finally{
  await browser.close();
}
