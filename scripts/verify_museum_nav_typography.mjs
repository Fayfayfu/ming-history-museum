import {MUSEUM_NAV_CSS} from './lib/museum_navigation.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const required=[
  ['font-family:"Songti SC","STSong","Noto Serif CJK SC",serif','navigation must use one explicit Chinese serif stack instead of inheriting page copy'],
  ['font-size:14px','desktop hall links must use the shared 14px readable size'],
  ['font-weight:700','hall links must retain the shared 700 weight']
];

const failures=required
  .filter(([declaration])=>!MUSEUM_NAV_CSS.includes(declaration))
  .map(([,message])=>message);

const outputRoot=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
for(const file of ['index.html','people.html','events.html','institutions.html','exhibitions.html']){
  const html=await fs.readFile(path.join(outputRoot,file),'utf8');
  for(const [declaration,message] of required){
    if(!html.includes(declaration))failures.push(`${file}: ${message}`);
  }
}

if(failures.length){
  console.error(`Museum navigation typography verification failed (${failures.length}):`);
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Museum navigation typography verification passed: all halls share one explicit 14px Chinese serif contract.');
