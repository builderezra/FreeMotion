(function(){ const out={}; const seen={}; 
 document.querySelectorAll('button,[role=button],a,summary,.btn,.ic,[class*=icon]').forEach(el=>{ const t=(el.textContent||'').trim(); if(!t||t.length>3) return; for(const ch of t){ const o=ch.codePointAt(0); if(o>0x2000 && !seen[ch]) seen[ch]={cp:o.toString(16),n:0}; if(seen[ch]) seen[ch].n++; } });
 out.glyphs=Object.keys(seen).map(k=>k+' U+'+seen[k].cp+' x'+seen[k].n);
 // tofu test: width of glyph vs width of U+FFFF-ish missing glyph in the app font
 const cv=document.createElement('canvas').getContext('2d'); cv.font='16px '+getComputedStyle(document.body).fontFamily;
 const tofu=cv.measureText('￿').width; out.tofuW=tofu; out.missing=Object.keys(seen).filter(k=>cv.measureText(k).width===tofu && tofu>0);
 return JSON.stringify(out);})()
