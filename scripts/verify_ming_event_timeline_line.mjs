import {chromium} from 'playwright';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});

try {
  await page.goto(`file://${path.join(root,'events.html')}`,{waitUntil:'domcontentloaded'});
  await page.click('[data-stage="s1"]');
  const audit=await page.evaluate(()=>{
    const stream=document.getElementById('eventstream');
    stream.scrollTop=stream.scrollHeight-stream.clientHeight;
    const cards=[...document.querySelectorAll('#eventstream .eventcard')];
    const segments=cards.map(card=>{
      const body=card.querySelector('.eventbody');
      const bodyStyle=getComputedStyle(body);
      const bodyRect=body.getBoundingClientRect();
      const dotRect=card.querySelector('.eventdot').getBoundingClientRect();
      return {
        borderWidth:parseFloat(bodyStyle.borderLeftWidth),
        borderStyle:bodyStyle.borderLeftStyle,
        axisX:bodyRect.left,
        dotCenterX:dotRect.left+dotRect.width/2,
      };
    });
    return {
      scrollTop:stream.scrollTop,
      cards:cards.length,
      everyCardDrawsAxis:segments.every(segment=>segment.borderWidth===1&&segment.borderStyle==='solid'),
      everyDotAligns:segments.every(segment=>Math.abs(segment.axisX-segment.dotCenterX)<=1),
    };
  });
  if (!(audit.scrollTop>0&&audit.cards===15&&audit.everyCardDrawsAxis&&audit.everyDotAligns)) {
    throw new Error(`Event timeline axis is not continuous after scrolling: ${JSON.stringify(audit)}`);
  }
  console.log(`Event timeline axis verified across ${audit.cards} cards after scrolling.`);
} finally {
  await browser.close();
}
