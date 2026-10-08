import subprocess,sys,json,shutil,os,urllib.parse
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/'
W=SP+'wt-s1/'
MUT=[
 ('M1','js/scene.js',"k.v = Math.max(lo, Math.min(hi, k.v * ratio)); n++;","k.v = Math.max(lo, Math.min(hi, k.v)); n++;",'T23 FM.shiftProp'),
 ('M2','js/inspector.js',"    if (durBefore > 0 && FM.scaleLayerKeyframes) FM.scaleLayerKeyframes(layer, layer.duration / durBefore);\n    // A GROUP AROUND","    // A GROUP AROUND",'FM.setClipSpeed is the'),
 ('M3','js/spine-edit.js',"      if (Math.abs(mv) > 1e-9) addMove(plan, fid, mv);\n","",'T25 Speed'),
 ('M4','js/spine-edit.js',"const rp = ripple(plan, R, i + 1, dt, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);\n    tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);\n    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);\n    const t = FM.time","const rp = ripple(plan, R, i + 1, 0, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);\n    tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);\n    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);\n    const t = FM.time",'T25 Speed'),
 ('M5','js/spine-edit.js',"    if (t >= c.start - 1e-9 && t < c.start + d0 - 1e-9) plan.time = c.start + (t - c.start) * k;\n","",'T25 Speed'),
 ('M6','js/spine-edit.js',"if (nd < ml - SLACK || Math.abs(nd - flatSpan(L) / sp) > 1e-6) return refusePlan('speedShort');   // under the shortest clip","if (false) return refusePlan('speedShort');   // under the shortest clip",'T25 Speed'),
 ('M7','js/spine-edit.js',"plan.writes.push(() => { [L].concat(twins).forEach(x => { FM.setClipSpeed(x, sp); scaleCueKeys(x, k); }); });","plan.writes.push(() => { [L].forEach(x => { FM.setClipSpeed(x, sp); scaleCueKeys(x, k); }); });",'T24 Take sound out'),
 ('M8','js/spine-edit.js',"if (dup) { S.setFlag(dup, 'twin', true); S.setFlag(dup, 'snd', true);","if (dup) { S.setFlag(dup, 'snd', true);",'T24 Take sound out'),
 ('M9','js/spine.js'," && !(sec === 'audio' && twinOfMain(u)));","));",'T24 Take sound out'),
 ('M10','js/spine-edit.js',"plan.writes.push(() => { L.muted = false; S.setFlag(L, 'muteByMode', false); });\n    plan.after = () => { if (FM.reconcileAudio) FM.reconcileAudio(); };\n    plan.live = line('soundBack');","plan.writes.push(() => { });\n    plan.after = () => { if (FM.reconcileAudio) FM.reconcileAudio(); };\n    plan.live = line('soundBack');",'T24 Take sound out'),
 ('M11','js/spine-edit.js',"plan.writes.push(() => { [L].concat(twins).forEach(x => { x.reversed = on; }); });","plan.writes.push(() => { [L].concat(twins).forEach(x => { x.reversed = on; }); if (on && FM.ensureReverseCache) FM.ensureReverseCache(L); });",'Reverse flips'),
 ('M12','js/spine-edit.js',"if (l.muted && !hasTwin) l.muted = false;","if (l.muted) l.muted = false;",'T24 Take sound out'),
 ('M13','js/spine-edit.js',"const rp = ripple(plan, R, i + 1, dt, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);\n        tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);\n        const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);\n        plan.pulse","const rp = ripple(plan, R, i + 1, 0, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);\n        tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);\n        const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);\n        plan.pulse",'Replace with a SHORTER'),
 ('M14','js/spine-edit.js',"for (const t of twins) {\n        let r2","for (const t of []) {\n        let r2",'Replace with a SHORTER'),
 ('M15','js/app.js',"input.addEventListener('cancel', () => { input.remove(); settle(null); });","input.addEventListener('cancel', () => { input.remove(); });",'FM.pickReplacement ALWAYS'),
 ('M16','js/simple-tools.js',"val.textContent = fmtX(sp); if (FM.simpleTimeline","val.textContent = fmtX(sp); if (Math.abs(sp - now) > 1e-9) S.cmd.speed(id, sp); if (FM.simpleTimeline",'the Speed row'),
 ('M17','js/simple-timeline.js',"n.style.width = Math.max(4, parseFloat(n.style.width) * k) + 'px'; }","n.style.width = n.style.width; }",'the Speed row'),
 ('M18','js/spine-edit.js',"FM.shiftProp(L, 'volume', v, t, { min: 0, max: VOL_HI });","FM.setProp(L, 'volume', v, t);",'Volume and Fade'),
 ('M19','js/spine-edit.js',"made.forEach(l => { S.setFlag(l, 'main', true); muteIfMode(l); });   // 2.3: Mute clip sound is on, so the new clip is muted too","made.forEach(l => { S.setFlag(l, 'main', true); });",'Mute clip sound follows'),
 ('M20','js/spine-edit.js',"      if (L.sm && L.sm.muteByMode) { S.setFlag(L, 'muteByMode', false); L.muted = false; }   // 2.3","      // 2.3",'Mute clip sound follows'),
 ('M21','js/simple-tools.js',"const TWO_ROW_MAX = 10;","const TWO_ROW_MAX = 99;",'More is always in reach'),
 ('M22','js/spine-edit.js',"if (R.isMain(id)) { const t = twinsOf(R, R.main[mainIdx(R, id)], map)[0]; if (t) return t; }\n    return L;","return L;",'Volume and Fade'),
 ('M23','js/spine-edit.js',"if (L.sm && L.sm.tail) S.setFlag(L, 'tail', false); });\n    plan.live = line('sped'","});\n    plan.live = line('sped'",'the tray'),
 ('M25','js/spine-edit.js',"    if (L.type !== 'video') return refusePlan('failed');   // a picture has no clock to change\n","",'the tray'),
 ('M24','js/spine-edit.js',"if (!!on === S.muteMode()) return refusePlan('nothingChanged');","",'Mute clip sound: the'),
]
only=sys.argv[1:] 
out=[]
for mid,f,old,new,frag in MUT:
    if only and mid not in only: continue
    path=W+f; s=open(path).read()
    if s.count(old)!=1: out.append((mid,'NOT-FOUND x%d'%s.count(old),frag)); print(mid,'NOT-FOUND',s.count(old),flush=True); continue
    bak=path+'.mutbak'; shutil.copy(path,bak)
    try:
        open(path,'w').write(s.replace(old,new))
        q=urllib.parse.quote('simple P2.3 · '+frag if not frag.startswith(('More is','FM.set')) and 'P2.3' not in frag else frag)
        if frag.startswith('More is'): q=urllib.parse.quote('More is always in reach')
        if frag.startswith('FM.setClipSpeed'): q=urllib.parse.quote('FM.setClipSpeed is the')
        r=subprocess.run([SP+'s1/run.sh','1280',q],capture_output=True,text=True,timeout=900).stdout
        first=r.splitlines()[0] if r else '?'
        caught = '✗' in first and not first.startswith('Regression 0/0')
        out.append((mid,'CAUGHT' if caught else 'SURVIVED',frag,first)); print(mid,'CAUGHT' if caught else 'SURVIVED',frag,'|',first,flush=True)
    finally:
        shutil.move(bak,path)
json.dump(out,open(SP+'s1/mut_results.json','w'),indent=1)
