(async function(){ const out={}; try{
 const src=await fetch('js/fx-thumbs.js').then(r=>r.text());
 const tableKeys=(name)=>{ const a=src.indexOf('const '+name+' = {'); if(a<0) return null; let d=0,i=src.indexOf('{',a),j=i; for(;j<src.length;j++){ const ch=src[j]; if(ch==='{')d++; else if(ch==='}'){d--; if(!d)break;} } return src.slice(i,j+1); };
 const types=FM.fxRegistry.allIncludingHidden().filter(Boolean).map(d=>d.type); const T=new Set(types);
 // OVERRIDES keys: lines at 4-space indent "name: function" or "name:" within the block
 const ob=tableKeys('OVERRIDES'); const okeys=[...ob.matchAll(/^    ([a-z0-9_]+):\s/gm)].map(m=>m[1]); out.overrideKeys=okeys.length;
 out.overrideNotType=okeys.filter(k=>!T.has(k));
 const dup={}; okeys.forEach(k=>dup[k]=(dup[k]||0)+1); out.overrideDup=Object.keys(dup).filter(k=>dup[k]>1);
 // PHOTO_OF
 const pb=tableKeys('PHOTO_OF'); const photoOf={}; [...pb.matchAll(/^\s+([a-z0-9_]+):\s*\[([^\]]*)\]/gm)].forEach(m=>{ photoOf[m[1]]=[...m[2].matchAll(/'([a-z0-9_]+)'/g)].map(x=>x[1]); });
 const owner={}; out.photoOfDup=[]; out.photoOfNotType=[]; Object.keys(photoOf).forEach(p=>photoOf[p].forEach(t=>{ if(owner[t]) out.photoOfDup.push(t+' in '+owner[t]+' and '+p); owner[t]=p; if(!T.has(t)) out.photoOfNotType.push(t); }));
 // FILTER_SUBJECT
 const fb=tableKeys('FILTER_SUBJECT'); const fsub={}; [...fb.matchAll(/([a-z0-9_]+):\s*'([a-z0-9_]+)'/g)].forEach(m=>{ fsub[m[1]]=m[2]; }); out.filterSubjects=Object.keys(fsub).length;
 const flib=(FM.filters&&FM.filters.all?FM.filters.all():[]).map(f=>f.id); out.filterLib=flib.length;
 out.filterSubjectNotFilter=Object.keys(fsub).filter(k=>flib.indexOf(k)<0);
 out.filterWithoutSubject=flib.filter(k=>!(k in fsub));
 // photos exist
 const keys=FM.fxThumbs._photoKeys(); out.photoKeys=keys.length; out.photoMissing=[];
 for(const k of keys){ const r=await fetch('fx-art/'+k+'.jpg?v=1'); if(!r.ok) out.photoMissing.push(k+' '+r.status); }
 const allPhotos=new Set(Object.keys(photoOf).concat(Object.values(fsub))); out.photoNames=[...allPhotos].length;
 // SUBJECT_OF keys
 const sb=tableKeys('SUBJECT_OF'); const skeys=[...sb.matchAll(/^\s+([a-z0-9_]+):\s*'/gm)].map(m=>m[1]).concat([...sb.matchAll(/,\s*([a-z0-9_]+):\s*'/g)].map(m=>m[1])); out.subjectNotType=[...new Set(skeys)].filter(k=>!T.has(k));
 // categories
 const cats=[...new Set(FM.fxRegistry.allIncludingHidden().filter(Boolean).map(d=>d.category))]; out.cats=cats;
 const sec=tableKeys('SECTION_ART'); const secKeys=[...sec.matchAll(/(?:^|[,{\s])([a-z0-9_]+):\s*(?:photoArt|paint)/g)].map(m=>m[1]); out.catWithoutArt=cats.filter(c=>secKeys.indexOf(c)<0);
 const sbc=tableKeys('SUBJECT_BY_CATEGORY'); const sbcKeys=[...sbc.matchAll(/([a-z0-9_]+):\s*'/g)].map(m=>m[1]); out.catWithoutForm=cats.filter(c=>sbcKeys.indexOf(c)<0);
 // appliesTo media/text effects -> subject
 out.mediaOnly=FM.fxRegistry.allIncludingHidden().filter(d=>d&&d.appliesTo==='media').map(d=>d.type);
 out.textOnly=FM.fxRegistry.allIncludingHidden().filter(d=>d&&d.appliesTo==='text').map(d=>d.type);
 // every type resolves a subject that sampleFor can build, and previewScene works; override writes only registry keys
 out.subjectBad=[]; out.overrideUnknownKey=[]; out.previewThrew=[]; out.fxCount=0;
 for(const t of types){ out.fxCount++; try{ const subj=FM.fxThumbs._subjectOf(t); const sc=FM.fxThumbs.previewScene(t); const hero=sc.layers.find(l=>l.effects&&l.effects.length&&l.effects.some(e=>e.type===t)); if(!hero){ out.subjectBad.push(t+' no hero'); continue; } const e=hero.effects.find(e=>e.type===t); const rk=FM.fxRegistry.paramsOf(t).map(p=>p.key); Object.keys(e.params||{}).forEach(k=>{ if(rk.indexOf(k)<0) out.overrideUnknownKey.push(t+'.'+k); }); }catch(err){ out.previewThrew.push(t+': '+err.message); } }
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
