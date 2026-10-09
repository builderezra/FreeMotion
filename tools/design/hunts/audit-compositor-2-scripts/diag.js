(async function(){ const out={rows:{}}; try{
 if(FM.home.isOpen()) FM.home.close();
 const T="bend bulge contourlines crt curl displacemap dissolve dither dots edge electricedges emboss fisheye fractalwarp glass gridrepeat grunge halftone hexarray hextiles iridescence kaleidoscope lensdistort mirrortile nightvision noise palettemap polarcoords polardisplace radialrepeat ripple scanlines sketch squeeze stripes threshold tilerotate tunnel turbulentdisplace twirl unsharpmask vhstape voronoi".split(' ');
 const K=FM._FX_TABLES&&FM._FX_TABLES.PIXEL_FX||FM._pixelFx;
 const W=160,H=120;
 for(const t of T){ const r={}; const reg=FM.fxRegistry.get?FM.fxRegistry.get(t):null; const inst=FM.fxRegistry.makeInstance(t);
   const fn=K&&K[t]; r.arity=fn?fn.length:null; const src=fn?fn.toString():''; r.srcLen=src.length; r.usesArgs5=/arguments\[5\]/.test(src); r.mentionsPs=/\bps\b|Ps\b/.test(src);
   const defs=(reg&&reg.params)||(FM.fxRegistry.all().find(e=>e.type===t)||{}).params||[]; r.pxParams=defs.filter(p=>p.unit==='px').map(p=>p.key);
   r.params=defs.map(p=>p.key+(p.unit?':'+p.unit:'')).join(',');
   // does the kernel itself react to ps? same buffer, ps 1 vs 0.5, raw params
   if(fn && inst){ const mk=()=>{const d=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;d[i]=(x*3+y)&255;d[i+1]=(y*5)&255;d[i+2]=((x>>3)*40+(y>>3)*17)&255;d[i+3]=255;}return d;};
     const run=ps=>{const d=mk();try{fn(d,W,H,inst.params,0.5,ps);}catch(e){return 'err';} return d;};
     const a=run(1),b=run(0.5); if(a==='err'||b==='err') r.psReacts='err'; else { let n=0; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) n++; r.psReacts=n>0; r.psDiffPx=n; } }
   out.rows[t]=r; }
 }catch(e){out.err=e.message;} return JSON.stringify(out);})()
