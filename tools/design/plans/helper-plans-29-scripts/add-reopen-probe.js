(async function(){ const out={}; try{
 if(FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close();
 const me=await FM.projects.create({name:'add',width:540,height:960}); await new Promise(r=>setTimeout(r,400));
 const sheet=document.getElementById('add-sheet'); if(!sheet){ return JSON.stringify({err:'no add-sheet'}); }
 const frames=(ms)=>new Promise(res=>{ const rows=[]; const t0=performance.now(); (function f(){ const pager=sheet.querySelector('.addmenu-pager'); rows.push({t:Math.round(performance.now()-t0),top:Math.round(sheet.getBoundingClientRect().top*10)/10,sl:pager?Math.round(pager.scrollLeft):null,cw:pager?pager.clientWidth:null}); if(performance.now()-t0<ms) requestAnimationFrame(f); else res(rows); })(); });
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 FM.mobile.openAdd(); await wait(700);
 const pager=sheet.querySelector('.addmenu-pager'); out.pagerClass=pager&&pager.className; out.cw=pager&&pager.clientWidth;
 // find a tab whose pager has more than one page, go to its last page (what a swipe does), remember it
 const tabs=[...sheet.querySelectorAll('.addmenu-tab')]; out.tabPages=[];
 for(const tb of tabs){ tb.click(); await wait(250); const pg=sheet.querySelector('.addmenu-pager'); out.tabPages.push([tb.textContent.trim(), pg?Math.round(pg.scrollWidth/pg.clientWidth*10)/10:null]); }
 let chosen=null; for(const tb of tabs){ tb.click(); await wait(250); const pg=sheet.querySelector('.addmenu-pager'); if(pg&&pg.scrollWidth>pg.clientWidth*1.5){ chosen=tb; pg.scrollLeft=pg.scrollWidth-pg.clientWidth; await wait(500); out.afterScroll=Math.round(pg.scrollLeft); out.chosen=tb.textContent.trim(); break; } }
 FM.mobile.closeAdd(); await wait(700);
 // reopen: record every frame
 const p=frames(900); FM.mobile.openAdd(); const rows=await p;
 const sls=rows.map(r=>r.sl), tops=rows.map(r=>r.top);
 out.n=rows.length; out.firstSl=sls[0]; out.slChanges=sls.filter((v,i)=>i&&v!==sls[i-1]).length; out.slSeq=[...new Set(sls)].join('>');
 out.topStart=tops[0]; out.topEnd=tops[tops.length-1]; let rev=0,dir=0; tops.forEach((v,i)=>{ if(i&&v!==tops[i-1]){ const d=Math.sign(v-tops[i-1]); if(dir&&d&&d!==dir) rev++; if(d) dir=d; } }); out.topReversals=rev; out.minTop=Math.min(...tops);
 out.rowsHead=rows.slice(0,6); out.rowsMid=rows.slice(Math.floor(rows.length/2)-1,Math.floor(rows.length/2)+3);
 try{ await FM.projects.remove(me);}catch(e){}
 }catch(e){ out.err=(e&&e.message||String(e))+' '+((e&&e.stack)||'').slice(0,200); } return JSON.stringify(out); })()
