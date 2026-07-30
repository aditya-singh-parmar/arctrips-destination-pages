import {chromium} from '@playwright/test';
import {mkdirSync} from 'fs';
const OUT='/private/tmp/claude-501/-Users-aditya-Projects-arctrips-Destination-Pages/2087685f-3b31-4c8b-99ac-c9cf03473c36/scratchpad/ucl/shots';
mkdirSync(OUT,{recursive:true});
const pages=['hiking-ucluelet','kayaking-ucluelet','whale-watching-ucluelet','restaurants-ucluelet'];
const b=await chromium.launch();
for(const vp of [{width:1440,height:900,n:'d'},{width:390,height:844,n:'m'}]){
 for(const p of pages){
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1});
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:4321/prototype/'+p+'.html',{waitUntil:'load'});
  await pg.evaluate(async()=>{const h=document.body.scrollHeight;for(let y=0;y<h;y+=300){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,90));}window.scrollTo(0,0);});
  await pg.waitForFunction(()=>[...document.images].every(i=>i.complete),null,{timeout:30000}).catch(()=>{});
  await pg.waitForTimeout(500);
  await pg.screenshot({path:`${OUT}/${vp.n}-${p}.png`,fullPage:true});
  console.log(vp.n,p,'shot');
  await ctx.close();
 }
}
await b.close();
