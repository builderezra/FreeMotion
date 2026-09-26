/* queue 947 — a THROWAWAY prototype for the options pictures (tools/design/947-render.py). Nothing here ships.
   Home is open on Projects; P947.play(opt) opens the real New project dialog and runs option opt's entrance with
   Web Animations, paused, so P947.freeze(p) can hold it at any progress 0..1 for a still.
   A · the orb BECOMES the card — the + disc swells and travels up, circle to rounded card, its colours
       draining into the card's own colour as it lands; the fields rise in one by one.
   B · a blank canvas is DRAWN — a 9:16 frame (a new project's canvas) rises out of the +, its outline drawing
       itself in the orb's colours, then grows into the card and fills; the fields rise in.
   C · a ripple REVEALS it — a ring of the orb's colours spreads from the + and the dimmed screen opens behind
       it as a growing circle; the card rises from below with a small overshoot. */
(function () {
  let anims = [];
  const DUR = 640;
  function kf(el, frames, o) { const a = el.animate(frames, Object.assign({ duration: DUR, fill: 'both' }, o || {})); a.pause(); anims.push(a); return a; }
  function stagger(card, from) {
    const kids = Array.prototype.slice.call(card.querySelectorAll('.hm-dlg-title, .hm-dlg-scroll > *, .hm-dlg-actions, .hm-dlg-card > .dialog-actions'));
    kids.slice(0, 14).forEach(function (k, i) {
      const s = Math.min(.82, from + i * .035), e = Math.min(1, s + .22);
      kf(k, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 0, transform: 'translateY(12px)', offset: s }, { opacity: 1, transform: 'none', offset: e }, { opacity: 1, transform: 'none' }]);
    });
  }
  window.P947 = {
    play: function (opt) {
      anims.forEach(function (a) { a.cancel(); }); anims = [];
      document.querySelectorAll('.p947-x').forEach(function (n) { n.remove(); });
      const orb = document.getElementById('hm-new');
      const O = orb.getBoundingClientRect();
      const oc = getComputedStyle(orb);
      const orbPaint = oc.backgroundImage;
      orb.click();                                   // the real dialog, filled in by the real code
      const dlg = document.getElementById('hm-dialog'), card = dlg.querySelector('.hm-dlg-card');
      dlg.style.animation = 'none'; card.style.animation = 'none';
      const C = card.getBoundingClientRect();
      const cc = getComputedStyle(card);
      const scrim = getComputedStyle(dlg).backgroundColor;
      const blur = getComputedStyle(dlg).backdropFilter || 'none';
      const unblur = blur === 'none' ? 'none' : 'blur(0px)';
      const ox = O.left + O.width / 2, oy = O.top + O.height / 2;
      const box = function (l, t, w, h, r) { return { left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px', borderRadius: r }; };
      const layer = function () { const d = document.createElement('div'); d.className = 'p947-x'; d.style.cssText = 'position:fixed;pointer-events:none;box-sizing:border-box;'; dlg.insertBefore(d, card); return d; };
      card.style.position = 'relative'; card.style.zIndex = '2';
      /* the card's own surface (glass tint, blur, rim) waits for the flight to land, or it shows as a ghost box from frame 1 */
      const bare = { backgroundColor: 'rgba(0,0,0,0)', backgroundImage: 'none', borderColor: 'rgba(0,0,0,0)', boxShadow: 'none', backdropFilter: 'none' };

      if (opt === 'A') {
        kf(dlg, [{ backgroundColor: 'rgba(4,6,10,0)', backdropFilter: unblur }, { backgroundColor: scrim, backdropFilter: blur, offset: .45 }, { backgroundColor: scrim, backdropFilter: blur }]);
        const m = layer();
        m.style.backgroundImage = orbPaint; m.style.boxShadow = cc.boxShadow;
        kf(m, [box(O.left, O.top, O.width, O.height, O.width / 2 + 'px'), Object.assign(box(C.left, C.top - 10, C.width, C.height + 10, cc.borderRadius), { offset: .62 }), box(C.left, C.top, C.width, C.height, cc.borderRadius)], { easing: 'cubic-bezier(.45,0,.2,1)' });
        const paint = document.createElement('div'); paint.style.cssText = 'position:absolute;inset:0;border-radius:inherit;border:' + cc.border + ';background:' + cc.backgroundColor + ';';
        m.appendChild(paint);
        kf(paint, [{ opacity: 0 }, { opacity: 0, offset: .36 }, { opacity: 1, offset: .8 }, { opacity: 1 }]);
        /* the orb's + rides along on the flying disc (the disc sits over the real orb from the first frame), and turns away */
        const plus = document.createElement('div');
        plus.style.cssText = 'position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;background:linear-gradient(#fff,#fff) center/100% 3px no-repeat,linear-gradient(#fff,#fff) center/3px 100% no-repeat;border-radius:2px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.25));';
        m.appendChild(plus);
        kf(plus, [{ opacity: 1, transform: 'rotate(0deg)' }, { opacity: 0, transform: 'rotate(90deg) scale(.6)', offset: .18 }, { opacity: 0, transform: 'rotate(90deg)' }]);
        kf(card, [bare, Object.assign({ offset: .96 }, bare), { backgroundColor: cc.backgroundColor, backgroundImage: cc.backgroundImage, borderColor: cc.borderColor, boxShadow: cc.boxShadow, backdropFilter: cc.backdropFilter }]);
        /* scaled away, not faded: the orb's + is a knock-out, and animating its opacity isolates it and fills the + in */
        kf(orb, [{ transform: 'translateX(-50%) rotate(0deg) scale(1)' }, { transform: 'translateX(-50%) rotate(90deg) scale(.001)', offset: .2 }, { transform: 'translateX(-50%) scale(.001)' }]);
        stagger(card, .5);
      } else if (opt === 'B') {
        kf(dlg, [{ backgroundColor: 'rgba(4,6,10,0)', backdropFilter: unblur }, { backgroundColor: scrim, backdropFilter: blur, offset: .35 }, { backgroundColor: scrim, backdropFilter: blur }]);
        const f = layer();
        const fw = 22, fh = fw * 16 / 9;
        const mid = { w: 120, h: 120 * 16 / 9 };
        const my = Math.max(60, C.top + C.height / 2 - mid.h / 2);
        kf(f, [box(ox - fw / 2, oy - fh / 2, fw, fh, '4px'), Object.assign(box(C.left + C.width / 2 - mid.w / 2, my, mid.w, mid.h, '8px'), { offset: .4 }), Object.assign(box(C.left + C.width / 2 - mid.w / 2, my, mid.w, mid.h, '8px'), { offset: .48 }), box(C.left, C.top, C.width, C.height, cc.borderRadius)], { easing: 'cubic-bezier(.4,0,.2,1)' });
        const NS = 'http://www.w3.org/2000/svg';
        const s = document.createElementNS(NS, 'svg'); s.setAttribute('width', '100%'); s.setAttribute('height', '100%'); s.style.cssText = 'position:absolute;inset:0;overflow:visible;';
        s.innerHTML = '<defs><linearGradient id="p947g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7FD4FF"/><stop offset=".35" stop-color="#6BF0C8"/><stop offset=".7" stop-color="#8FB8FF"/><stop offset="1" stop-color="#C86BFF"/></linearGradient></defs>';
        const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', '1.5'); r.setAttribute('y', '1.5'); r.setAttribute('width', 'calc(100% - 3px)'); r.setAttribute('height', 'calc(100% - 3px)');
        r.style.cssText = 'width:calc(100% - 3px);height:calc(100% - 3px);fill:none;stroke:url(#p947g);stroke-width:4;rx:6px;';
        r.setAttribute('pathLength', '1'); r.style.strokeDasharray = '1'; s.appendChild(r); f.appendChild(s);
        kf(r, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0, offset: .42 }, { strokeDashoffset: 0, offset: .8 }, { strokeDashoffset: 0, opacity: 0 }]);
        const glow = document.createElement('div'); glow.style.cssText = 'position:absolute;inset:0;border-radius:inherit;box-shadow:0 0 30px rgba(80,180,255,.75), inset 0 0 22px rgba(200,107,255,.35);';
        f.appendChild(glow);
        kf(glow, [{ opacity: 0 }, { opacity: 1, offset: .4 }, { opacity: 1, offset: .55 }, { opacity: 0 }]);
        const paint = document.createElement('div'); paint.style.cssText = 'position:absolute;inset:0;border-radius:inherit;background:' + cc.backgroundColor + ';border:' + cc.border + ';';
        f.insertBefore(paint, s);
        kf(paint, [{ opacity: 0 }, { opacity: 0, offset: .5 }, { opacity: 1, offset: .82 }, { opacity: 1 }]);
        kf(card, [bare, Object.assign({ offset: .96 }, bare), { backgroundColor: cc.backgroundColor, backgroundImage: cc.backgroundImage, borderColor: cc.borderColor, boxShadow: cc.boxShadow, backdropFilter: cc.backdropFilter }]);
        kf(orb, [{ transform: 'translateX(-50%) scale(1)' }, { transform: 'translateX(-50%) scale(.86)', offset: .12 }, { transform: 'translateX(-50%) scale(1)', offset: .3 }, { transform: 'translateX(-50%) scale(1)' }]);
        stagger(card, .58);
      } else {
        const far = Math.hypot(Math.max(ox, innerWidth - ox), Math.max(oy, innerHeight - oy));
        kf(dlg, [{ clipPath: 'circle(0px at ' + ox + 'px ' + oy + 'px)' }, { clipPath: 'circle(' + far + 'px at ' + ox + 'px ' + oy + 'px)', offset: .55 }, { clipPath: 'circle(' + far + 'px at ' + ox + 'px ' + oy + 'px)' }], { easing: 'cubic-bezier(.3,0,.2,1)' });
        const ring = document.createElement('div'); ring.className = 'p947-x';
        ring.style.cssText = 'position:fixed;pointer-events:none;border-radius:50%;z-index:211;padding:3px;background:' + orbPaint + ';-webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;filter:drop-shadow(0 0 10px rgba(127,212,255,.7));';
        document.body.appendChild(ring);
        const R = function (rad) { return box(ox - rad, oy - rad, rad * 2, rad * 2, '50%'); };
        kf(ring, [Object.assign(R(29), { opacity: 1 }), Object.assign(R(far * .62), { opacity: .9, offset: .45 }), Object.assign(R(far), { opacity: 0, offset: .62 }), Object.assign(R(far), { opacity: 0 })], { easing: 'cubic-bezier(.3,0,.2,1)' });
        kf(card, [{ opacity: 0, transform: 'translateY(90px) scale(.92)' }, { opacity: 0, transform: 'translateY(90px) scale(.92)', offset: .22 }, { opacity: 1, transform: 'translateY(-8px) scale(1.01)', offset: .7 }, { opacity: 1, transform: 'none' }], { easing: 'cubic-bezier(.3,0,.3,1)' });
        kf(orb, [{ transform: 'translateX(-50%) rotate(0deg)' }, { transform: 'translateX(-50%) rotate(135deg)', offset: .5 }, { transform: 'translateX(-50%) rotate(135deg)' }], { easing: 'cubic-bezier(.3,0,.2,1)' });
        stagger(card, .45);
      }
      P947.freeze(0);
      return true;
    },
    freeze: function (p) { anims.forEach(function (a) { a.pause(); a.currentTime = p * DUR; }); },
  };
})();
