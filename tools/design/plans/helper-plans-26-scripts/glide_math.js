// the shipped release-velocity math (inspector.js attachGlide), run on traces
const W=100, REST=80, MINM=0.25, MINT=0.6;
function releaseV(trail, upT){ const tr=trail, last=tr[tr.length-1]; if (upT-last.t>REST) return 0; let i=tr.length-1; while(i>0&&tr[i-1].t>=last.t-W) i--; if(i===tr.length-1&&i>0) i--; const dt=last.t-tr[i].t; return dt>=8?(last.x-tr[i].x)/dt:0; }
function trace(step, dx, nMoves, stallN, stallStep){ const tr=[{x:0,t:0}]; let t=0,x=0; for(let k=0;k<nMoves;k++){ t+=step; x+=dx; tr.push({x,t}); const w=tr; while(w.length>2&&w[1].t<=t-W) w.shift(); } for(let k=0;k<stallN;k++){ t+=stallStep; tr.push({x,t}); while(tr.length>2&&tr[1].t<=t-W) tr.shift(); } return {tr,upT:t+1}; }
const rows=[];
// the test's case A: 8 moves of -10px, then 2 zero samples; the sample gap is 8ms at 1x and stretches with the CPU throttle
for (const cpu of [1,2,3,4,6]) { const g=8*cpu+2*cpu; /* sleep(8) + dispatch cost */ const {tr,upT}=trace(g, -10, 8, 2, g); const v=releaseV(tr,upT); rows.push({cpuSlowdown:cpu, sampleGapMs:g, moveSpeed:+(10/g).toFixed(3), releaseV:+v.toFixed(3), glides:Math.abs(v)>=MINM}); }
console.log(JSON.stringify(rows));
// a real desk flick (hardware stamps, 8ms apart, 0.5 px/ms) with a stall of N ms before the click releases
const out=[]; for (const stall of [0,16,32,48,64,79,90]) { const tr=[{x:0,t:0}]; let t=0,x=0; for(let k=0;k<10;k++){t+=8;x+=-4; tr.push({x,t}); while(tr.length>2&&tr[1].t<=t-W) tr.shift();} const upT=t+stall; if(stall>0){} const v=releaseV(tr,upT); out.push({stallBeforeUpMs:stall, releaseV:+v.toFixed(3), glides:Math.abs(v)>=MINM}); }
console.log(JSON.stringify(out));
