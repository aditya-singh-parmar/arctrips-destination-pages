import {chromium} from '@playwright/test';
import {mkdirSync} from 'fs';
const OUT='/private/tmp/claude-501/-Users-aditya-Projects-arctrips-Destination-Pages/2087685f-3b31-4c8b-99ac-c9cf03473c36/scratchpad/ucl/s2';
mkdirSync(OUT,{recursive:true});
const pages=['hiking-ucluelet','kayaking-ucluelet','whale-watching-ucluelet','restaurants-ucluelet'];
const b=await chromium.launch();
for(const vp of [{width:1440,height:900,n:'d'},{width:390,height:844,n:'m'}]){
 for(const p of pages){
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height}});
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:4321/prototype/'+p+'.html',{waitUntil:'load'});
  await pg.evaluate(async()=>{const h=document.body.scrollHeight;for(let y=0;y<h;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}window.scrollTo(0,0);});
  await pg.waitForFunction(()=>[...document.images].every(i=>i.complete),null,{timeout:15000}).catch(()=>{});
  await pg.waitForTimeout(300);
  await pg.screenshot({path:`${OUT}/${vp.n}-${p}-0.png`});
  await pg.evaluate(()=>window.scrollTo(0,900));await pg.waitForTimeout(300);
  await pg.screenshot({path:`${OUT}/${vp.n}-${p}-1.png`});
  const h=await pg.evaluate(()=>document.body.scrollHeight);
  await pg.evaluate((y)=>window.scrollTo(0,y),h-1300);await pg.waitForTimeout(400);
  await pg.screenshot({path:`${OUT}/${vp.n}-${p}-2.png`});
  await ctx.close();
 }
}
await b.close();
console.log('done');
