window.__sz=function(){
  var seen=new WeakSet();
  function by(v,d){
    if(v==null)return 0; var t=typeof v;
    if(t==='string')return v.length*1; if(t==='number'||t==='boolean')return 8;
    if(t!=='object'&&t!=='function')return 0;
    if(seen.has(v))return 0; seen.add(v);
    try{
      if(typeof HTMLCanvasElement!=='undefined'&&v instanceof HTMLCanvasElement)return v.width*v.height*4;
      if(typeof ImageBitmap!=='undefined'&&v instanceof ImageBitmap){var b=v.width*v.height*4;return b;}
      if(typeof OffscreenCanvas!=='undefined'&&v instanceof OffscreenCanvas)return v.width*v.height*4;
      if(typeof HTMLImageElement!=='undefined'&&v instanceof HTMLImageElement)return (v.naturalWidth||0)*(v.naturalHeight||0)*4;
      if(typeof HTMLVideoElement!=='undefined'&&v instanceof HTMLVideoElement)return 64;
      if(typeof AudioBuffer!=='undefined'&&v instanceof AudioBuffer)return v.length*v.numberOfChannels*4;
      if(ArrayBuffer.isView(v))return v.byteLength;
      if(v instanceof ArrayBuffer)return v.byteLength;
      if(typeof Blob!=='undefined'&&v instanceof Blob)return 0; // disk/handle, not counted
      if(typeof Node!=='undefined'&&v instanceof Node)return 64;
      if(d<=0)return 32;
      var s=0;
      if(v instanceof Map){v.forEach(function(x,k){s+=by(k,d-1)+by(x,d-1)+16});return s;}
      if(v instanceof Set){v.forEach(function(x){s+=by(x,d-1)+16});return s;}
      if(v instanceof WeakMap||v instanceof WeakSet)return 0;
      if(Array.isArray(v)){for(var i=0;i<v.length;i++)s+=by(v[i],d-1)+8;return s;}
      for(var k in v){ if(Object.prototype.hasOwnProperty.call(v,k)){s+=k.length+by(v[k],d-1)+8;} }
      return s;
    }catch(e){return 0;}
  }
  var out={};
  Object.keys(FM.__audit||{}).forEach(function(k){
    var v; try{v=FM.__audit[k]();}catch(e){out[k]=null;return;}
    var n=null,type=Object.prototype.toString.call(v).slice(8,-1);
    if(v instanceof Map||v instanceof Set)n=v.size; else if(Array.isArray(v))n=v.length; else if(v&&type==='Object')n=Object.keys(v).length;
    seen=new WeakSet();
    out[k]=[n,by(v,4)];
  });
  return out;
};
'sizer ok'
