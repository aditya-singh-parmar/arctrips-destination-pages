import {chromium} from '@playwright/test';
import {ROUTES, ALIASES} from './lib/routes.mjs';
/* Clean URLs are served by next.config.ts rewrites, so this needs a Next server
   (npm run dev / npm start) or the deployed origin, not a static file server.
   QA_BASE points it at the deployed site: the owner reviews that, not localhost. */
const BASE=(process.env.QA_BASE||'http://localhost:3000').replace(/\/$/,'');
/* /search renders its links from the query, so a few queries stand in for the
   states a visitor reaches: towns, places, guides, questions. */
const SEARCH_STATES=['/search?q=a','/search?q=e','/search?q=banff','/search?q=whale','/search?q=beach&in=tofino','/search?q=where&show=questions'];
const pages=[...Object.values(ROUTES),...Object.keys(ALIASES),...SEARCH_STATES].sort();
/* every internal path an anchor may point at: a route, an alias, or a static asset */
const VALID=new Set([...Object.values(ROUTES),...Object.keys(ALIASES)]);
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
  /* Every rendered anchor must be a route, an alias or an asset. This is what
     catches links assembled in JavaScript, which no static scan can see (a
     relative "banff.html" shipped to production this way). */
  const hrefs=await pg.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))).catch(()=>[]);
  const broken=[...new Set(hrefs.filter(h=>{
    if(!h||h[0]==='#'||/^(https?:|mailto:|tel:|\/\/)/.test(h))return false;
    const path=h.split(/[?#]/)[0];
    return !path.startsWith('/prototype/')&&!VALID.has(path);
  }))];
  if(errs.length||empty.length||broken.length){bad++;console.log('### '+p);
    if(broken.length)console.log('   BROKEN LINKS '+broken.slice(0,6).join(', '));
    errs.slice(0,4).forEach(e=>console.log('   ERR  '+e));
    if(empty.length)console.log('   EMPTY '+empty.join(', '));}
  await ctx.close();
}
await b.close();
console.log('\n'+bad+' of '+pages.length+' pages with errors or empty containers');
