window.__scanFaint=function(){
  function parse(c){var m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;var p=m[1].split(/[ ,\/]+/).map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function over(f,b){var a=f.a;return {r:f.r*a+b.r*(1-a),g:f.g*a+b.g*(1-a),b:f.b*a+b.b*(1-a),a:1};}
  function lum(c){function f(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
  function ratio(a,b){var l1=lum(a),l2=lum(b);if(l1<l2){var t=l1;l1=l2;l2=t;}return (l1+0.05)/(l2+0.05);}
  function bgOf(el){var stack=[];for(var e=el;e;e=e.parentElement){var cs=getComputedStyle(e);var c=parse(cs.backgroundColor);if(c&&c.a>0){stack.push(c);if(c.a>=1)break;}}
    var base={r:255,g:255,b:255,a:1}; if(!stack.length||stack[stack.length-1].a<1){var pb=parse(getComputedStyle(document.body).backgroundColor);base=(pb&&pb.a>0)?pb:{r:16,g:30,b:52,a:1};}
    var cur=base;for(var i=stack.length-1;i>=0;i--)cur=over(stack[i],cur);return cur;}
  var T=[parse('rgb(99,128,140)'),parse('rgb(125,135,152)'),parse('rgb(89,100,122)')];
  var out=[];
  document.querySelectorAll('body *').forEach(function(el){
    var r=el.getBoundingClientRect(); if(!(r.width>0&&r.height>0))return;
    var has=false;for(var n=el.firstChild;n;n=n.nextSibling)if(n.nodeType===3&&n.textContent.trim())has=true; if(!has)return;
    var cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none')return;
    var c=parse(cs.color); var hit=c&&T.filter(function(t){return Math.abs(c.r-t.r)<=1&&Math.abs(c.g-t.g)<=1&&Math.abs(c.b-t.b)<=1})[0]; if(!hit)return;
    var op=1;for(var e=el;e;e=e.parentElement){var o=parseFloat(getComputedStyle(e).opacity);if(isFinite(o))op*=o;}
    var bg=bgOf(el); var fg=over({r:c.r,g:c.g,b:c.b,a:c.a*op},bg);
    out.push({sel:el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.className&&el.className.baseVal===undefined?'.'+String(el.className).trim().split(/\s+/).slice(0,2).join('.'):''),t:el.textContent.trim().slice(0,24),fs:parseFloat(cs.fontSize),ratio:+ratio(fg,bg).toFixed(2)});
  });
  return JSON.stringify({token:getComputedStyle(document.body).getPropertyValue('--text-faint').trim(),n:out.length,items:out});
};
'ok'
