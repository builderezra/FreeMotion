global.window=global; global.self=global; global.location={hostname:'localhost',search:''};
global.FM={}; require('/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/wt-au26/js/collab-signal.js');
const S=FM.collab.signal||FM.collab.sig||FM.collab.codes; const MQ=S.mqtt;
function rnd(n){return Math.floor(Math.random()*n)}
let bad=0;
for(let it=0;it<3000;it++){
  const pk=[]; const n=1+rnd(6);
  for(let k=0;k<n;k++){ const pl=new Uint8Array(rnd(300)).map(()=>rnd(256)); pk.push(MQ.publish('fm1/t'+rnd(99),pl)); }
  const all=Buffer.concat(pk.map(p=>Buffer.from(p)));
  const r1=MQ.reader(); const whole=r1(new Uint8Array(all));
  const r2=MQ.reader(); let got=[]; let pos=0; let nul=false;
  while(pos<all.length){const c=1+rnd(7); const o=r2(new Uint8Array(all.subarray(pos,pos+c))); pos+=c; if(o===null){nul=true;break;} got=got.concat(o);}
  if(nul||got.length!==whole.length||got.length!==n){bad++; if(bad<4) console.log('chunk mismatch',n,got.length,whole&&whole.length,nul);}
}
console.log('chunk-invariance bad',bad);
// big valid burst
const one=MQ.publish('fm1/x',new Uint8Array(100)); const burst=[]; for(let i=0;i<700;i++) burst.push(...one);
console.log('burst bytes',burst.length,'reader result', MQ.reader()(new Uint8Array(burst))===null?'NULL (malformed)':'ok');
// a packet with remaining length exactly 4 byte varlen
console.log('varlen 4B', MQ.reader()(new Uint8Array([0x30,0x80,0x80,0x80,0x01])).length);
