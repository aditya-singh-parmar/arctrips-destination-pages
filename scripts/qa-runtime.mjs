import {chromium} from '@playwright/test';
import {readdirSync} from 'fs';
/* QA_DIR / QA_BASE so the DEPLOYED copy (public/prototype, served at /prototype/)
   can be checked, not just the local one. The owner reviews the deployed site. */
const DIR=process.env.QA_DIR||'design/prototype';
const BASE=process.env.QA_BASE||'http://127.0.0.1:4321/prototype/';
const pages=readdirSync(DIR).filter(f=>f.endsWith('.html')&&!f.startsWith('_')).sort();
const b=await chromium.launch();
let bad=0;
for(const p of pages){
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  const pg=await ctx.newPage();
  const errs=[];
  pg.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,120));});
  pg.on('pageerror',e=>errs.push('PAGEERROR '+String(e.message).slice(0,120)));
  await pg.goto(BASE+p,{waitUntil:"load",timeout:20000}).catch(e=>errs.push('NAV '+e.message));
  const empty=await pg.evaluate(()=>{
    const out=[];
    document.querySelectorAll('[id]').forEach(el=>{
      if(el.tagName==='SCRIPT'||el.tagName==='SPAN')return;
      if(el.children.length===0&&!el.textContent.trim()&&!el.hasAttribute('hidden')&&el.offsetParent!==null&&['DIV','UL','TBODY','NAV','DL','P','H3','H2','SECTION'].includes(el.tagName))out.push(el.tagName.toLowerCase()+'#'+el.id);
    });
    return out;
  }).catch(()=>['<eval failed>']);
  if(errs.length||empty.length){bad++;console.log('### '+p);
    errs.slice(0,4).forEach(e=>console.log('   ERR  '+e));
    if(empty.length)console.log('   EMPTY '+empty.join(', '));}
  await ctx.close();
}
await b.close();
console.log('\n'+bad+' of '+pages.length+' pages with errors or empty containers');
