/* ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * gl-color.js — the CSS colour filters, on the GPU, for devices that cannot run ctx.filter.
 *
 * WHY THIS EXISTS. Ezra, with a red square on his phone (queue 661): *"These effects still don't work
 * on mobile, this is probably the biggest issue you still haven't solved."* Seven tiles badged "no
 * change at this value" — and those seven are exactly the set the dead-effect probe can judge, so it
 * had called its ENTIRE domain dead. The badge also refutes itself: grayscale can only reach that
 * wording on a NON-grey pixel, and grayscale on a non-grey pixel must change it. The only way both
 * happen is that `ctx.filter` never applied.
 *
 * `js/compositor.js` has known this was possible for weeks — `ctxFilterOK()` renders a red pixel
 * through `grayscale(1)` and reads it back, because assigning an unsupported or invalid string to
 * `ctx.filter` is **silently ignored**: no throw, no warning, the draw just proceeds unfiltered. And
 * `FM.cssFxUnavailable()` was written to answer "which effects are dead on this device" and had no
 * callers at all. Saying so is v13.94. **This is the half that makes them WORK.**
 *
 * 🔑 THE SCOPE IS DELIBERATE AND IT IS THE WHOLE SAFETY ARGUMENT. This is a FALLBACK. It is consulted
 * only where `ctx.filter` is already proven not to work, so on every healthy device nothing changes,
 * nothing is measured, and no shader is ever compiled. A fallback cannot regress a path it never runs
 * on — which is the only responsible way to ship a fix for a device I cannot test on.
 *
 * WHAT IT COVERS: brightness · contrast · saturate · hue · grayscale · sepia · invert — the seven
 * COLOUR members of `FM.CSS_FX`, and precisely the seven on his screenshot. `blur` and `glow` are the
 * other two and are NOT here: both read neighbouring pixels, so they need a convolution and a second
 * pass rather than a per-pixel matrix. They are a separate piece of work and are honestly still dead
 * on such a device.
 *
 * THE MATHS IS THE CSS SPEC'S, not an approximation: the filter shorthand functions are defined as
 * colour matrices in sRGB, so a shader that applies the same matrices in the same order reproduces
 * them exactly rather than merely closely. The suite asserts that against the real `ctx.filter` on a
 * healthy machine, which is the only place both paths can be compared.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const FM = window.FM = window.FM || {};

  const VS = 'attribute vec2 p; varying vec2 uv;' +
             'void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';

  /* One shader, driven by a uniform matrix, rather than one program per effect stack. A colour filter
     chain composes: every op below is a 4x5 affine map on RGBA, and the product of the chain is one
     matrix. So the shader never changes and is compiled exactly once, however long the stack. */
  const FS = [
    'precision highp float;',
    'varying vec2 uv;',
    'uniform sampler2D src;',
    'uniform mat4 m;',
    'uniform vec4 off;',
    'void main(){',
    '  /* ⚠️ 1.0 - uv.y. The framebuffer\'s origin is BOTTOM-left; texImage2D from a canvas puts the',
    '     image\'s FIRST row at v=0, i.e. the TOP. Sampling uv directly hands back a vertically',
    '     MIRRORED picture — measured: the GPU\'s row 0 was the source\'s row 1, with the right',
    '     colour values in the wrong place. Exactly the flip gl-warp.js hit, in the other direction. */',
    '  vec4 c = texture2D(src, vec2(uv.x, 1.0 - uv.y));',
    '  /* ⚠️ NO PREMULTIPLY MATHS HERE, AND THAT IS THE CORRECTION RATHER THAN THE SHORTCUT. The first',
    '     version divided by alpha on the way in and multiplied on the way out, reasoning that a canvas',
    '     stores premultiplied colour. It does — but UNPACK_PREMULTIPLY_ALPHA_WEBGL is false on the',
    '     upload and premultipliedAlpha is false on the framebuffer, so the texture is ALREADY',
    '     un-premultiplied and the output is expected un-premultiplied too. Dividing again scaled every',
    '     translucent pixel by 1/alpha and the matrix then clamped it flat.',
    '     MEASURED: grayscale of (255,205,0) at 40% alpha gave 102 where ctx.filter gives 200 — and 102',
    '     is exactly the alpha, the fingerprint of a value driven past 1.0 and clamped. Opaque pixels',
    '     matched throughout, which is why only the translucent row disagreed. */',
    '  float a = c.a;',
    '  vec4 r = m * vec4(c.rgb, 1.0) + off;',
    '  gl_FragColor = vec4(clamp(r.rgb, 0.0, 1.0), a);',
    '}'
  ].join('\n');

  /* MEASURED, not read off a spec: CSS `blur(Npx)` and an feGaussianBlur of stdDeviation N do not
     agree across the specs, and the only answer that counts is what ctx.filter draws here. The suite
     compares the two paths and fails on a wrong value. */
  const BLUR_SIGMA = 1.0;
  const BLUR_FS = [
    'precision highp float;',
    'varying vec2 uv;',
    'uniform sampler2D src;',
    'uniform vec2 step;',
    'uniform float sigma;',
    'uniform int taps;',
    'uniform float flip;',
    'void main(){',
    '  vec2 base = vec2(uv.x, flip > 0.5 ? 1.0 - uv.y : uv.y);',
    '  vec2 st = vec2(step.x, flip > 0.5 ? -step.y : step.y);',
    '  float wsum = 0.0;',
    '  vec4 acc = vec4(0.0);',
    '  for (int i = -64; i <= 64; i++) {',
    '    if (i < -taps || i > taps) continue;',
    '    float fi = float(i);',
    '    float w = exp(-(fi * fi) / (2.0 * sigma * sigma));',
    '    acc += texture2D(src, base + st * fi) * w;',
    '    wsum += w;',
    '  }',
    '  gl_FragColor = acc / max(wsum, 1e-5);',
    '}'
  ].join('\n');

  let _cv = null, _gl = null, _tex = null, _quad = null, _prog = null, _u = null, _dead = false;
  let _blurProg = null, _ub = null, _fb = null, _fbTex = null, _fbW = 0, _fbH = 0;
  const _stats = { gpu: 0, cpu: 0, compiled: 0, lost: 0, reason: '' };

  function reset() {
    _gl = null; _cv = null; _tex = null; _quad = null; _prog = null; _u = null;
    _blurProg = null; _ub = null; _fb = null; _fbTex = null; _fbW = 0; _fbH = 0;
  }

  function compileBlur(g) {
    if (_blurProg) return _blurProg;
    const sh = (type, src) => {
      const s2 = g.createShader(type); g.shaderSource(s2, src); g.compileShader(s2);
      if (!g.getShaderParameter(s2, g.COMPILE_STATUS)) throw new Error('blur shader: ' + g.getShaderInfoLog(s2));
      return s2;
    };
    const p = g.createProgram();
    g.attachShader(p, sh(g.VERTEX_SHADER, VS));
    g.attachShader(p, sh(g.FRAGMENT_SHADER, BLUR_FS));
    g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error('blur link: ' + g.getProgramInfoLog(p));
    _blurProg = p;
    _ub = { src: g.getUniformLocation(p, 'src'), step: g.getUniformLocation(p, 'step'),
            sigma: g.getUniformLocation(p, 'sigma'), taps: g.getUniformLocation(p, 'taps'),
            flip: g.getUniformLocation(p, 'flip') };
    _stats.compiled++;
    return p;
  }

  function gl() {
    if (_dead) return null;
    if (_gl) return _gl;
    try {
      _cv = document.createElement('canvas');
      /* premultipliedAlpha:false on BOTH ends, and UNPACK_PREMULTIPLY_ALPHA_WEBGL false to match, so
         the colour is un-premultiplied all the way through and the shader needs no alpha arithmetic at
         all — which is what the CSS filter functions are defined on. See the note in the shader for the
         measurement that settled it. */
      const opts = { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, depth: false, stencil: false };
      _gl = _cv.getContext('webgl2', opts) || _cv.getContext('webgl', opts);
      if (!_gl) { _dead = true; _stats.reason = 'no WebGL context'; return null; }
      _cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); _stats.lost++; reset(); }, false);
      _gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, false);
      _tex = _gl.createTexture();
      _gl.bindTexture(_gl.TEXTURE_2D, _tex);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
      // LINEAR here, unlike gl-warp: this is a 1:1 blit with no coordinate mapping, so there is nothing
      // to resample and the filter choice never shows — but LINEAR is the safer default if it ever is.
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
      _quad = _gl.createBuffer();
      _gl.bindBuffer(_gl.ARRAY_BUFFER, _quad);
      _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), _gl.STATIC_DRAW);
      return _gl;
    } catch (e) { _dead = true; _stats.reason = String(e && e.message || e); return null; }
  }

  function compile(g) {
    if (_prog) return _prog;
    const sh = (type, src) => {
      const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error('colour shader: ' + g.getShaderInfoLog(s));
      return s;
    };
    const p = g.createProgram();
    g.attachShader(p, sh(g.VERTEX_SHADER, VS));
    g.attachShader(p, sh(g.FRAGMENT_SHADER, FS));
    g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error('colour link: ' + g.getProgramInfoLog(p));
    _prog = p;
    _u = { src: g.getUniformLocation(p, 'src'), m: g.getUniformLocation(p, 'm'), off: g.getUniformLocation(p, 'off') };
    _stats.compiled++;
    return p;
  }

  /* ── THE MATRICES, straight from the CSS Filter Effects spec ────────────────────────────────────
   * Each op is a 3x3 linear map on RGB plus a 3-vector offset. They are multiplied together in stack
   * order so any chain costs one matrix, and a chain of ten is exactly as cheap as a chain of one.
   * ⚠️ ORDER MATTERS AND IS NOT COMMUTATIVE — grayscale then sepia is a different picture from sepia
   * then grayscale, which is the entire subject of queue 593/603 (his stack put the colour back). The
   * product is built in the same order ctx.filter would apply them. */
  function ident() { return { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], o: [0, 0, 0] }; }
  function mul(a, b) {   // apply a, then b
    const A = a.m, B = b.m, m = new Array(9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      m[r * 3 + c] = B[r * 3] * A[c] + B[r * 3 + 1] * A[3 + c] + B[r * 3 + 2] * A[6 + c];
    }
    const o = [0, 0, 0];
    for (let r = 0; r < 3; r++) o[r] = B[r * 3] * a.o[0] + B[r * 3 + 1] * a.o[1] + B[r * 3 + 2] * a.o[2] + b.o[r];
    return { m: m, o: o };
  }
  // sRGB luminance coefficients, as the spec's grayscale/saturate matrices use them.
  const LR = 0.2126, LG = 0.7152, LB = 0.0722;
  function lerpToward(target, amt) {   // (1-amt)·identity + amt·target, the spec's own interpolation
    const I = ident().m, m = new Array(9);
    for (let i = 0; i < 9; i++) m[i] = I[i] * (1 - amt) + target[i] * amt;
    return { m: m, o: [0, 0, 0] };
  }

  function opMatrix(type, v) {
    const a = Number.isFinite(v) ? v : 1;
    switch (type) {
      case 'brightness': return { m: [a, 0, 0, 0, a, 0, 0, 0, a], o: [0, 0, 0] };
      case 'contrast': { const t = 0.5 - 0.5 * a; return { m: [a, 0, 0, 0, a, 0, 0, 0, a], o: [t, t, t] }; }
      case 'grayscale': return lerpToward([LR, LG, LB, LR, LG, LB, LR, LG, LB], Math.max(0, Math.min(1, a)));
      case 'sepia': return lerpToward([0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131], Math.max(0, Math.min(1, a)));
      case 'saturate': return { m: [
        LR + (1 - LR) * a, LG - LG * a, LB - LB * a,
        LR - LR * a, LG + (1 - LG) * a, LB - LB * a,
        LR - LR * a, LG - LG * a, LB + (1 - LB) * a], o: [0, 0, 0] };
      case 'invert': { const k = Math.max(0, Math.min(1, a)); return { m: [1 - 2 * k, 0, 0, 0, 1 - 2 * k, 0, 0, 0, 1 - 2 * k], o: [k, k, k] }; }
      case 'hue': {
        const r = (a || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
        return { m: [
          0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
          0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
          0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072],
          o: [0, 0, 0] };
      }
      default: return null;   // blur and glow read neighbouring pixels — not a per-pixel matrix
    }
  }
  FM._glColorMatrix = opMatrix;   // suite seam: the arithmetic is asserted directly, not only through pixels

  /* ops = [{type, value}, …] in stack order. Returns null for anything it cannot express, and the
     caller must then behave exactly as it did before — a partial answer would be worse than none. */
  FM.glColor = {
    supports: function (type) { return !!opMatrix(type, 1); },
    /* srcCanvas → a CANVAS carrying the filtered picture, ready for drawImage. Never an ImageData:
       the readback is what makes a GPU path slower than the thing it replaces. */
    apply: function (srcCanvas, W, H, ops) {
      if (FM._noGL) { _stats.cpu++; _stats.reason = 'disabled by FM._noGL'; return null; }
      if (!srcCanvas || !ops || !ops.length || !(W > 0) || !(H > 0)) { _stats.cpu++; return null; }
      let acc = ident();
      for (let i = 0; i < ops.length; i++) {
        const om = opMatrix(ops[i].type, ops[i].value);
        if (!om) { _stats.cpu++; _stats.reason = 'unsupported op: ' + ops[i].type; return null; }
        acc = mul(acc, om);
      }
      const g = gl();
      if (!g) { _stats.cpu++; return null; }
      try {
        if (g.isContextLost && g.isContextLost()) { reset(); _stats.cpu++; _stats.reason = 'context lost'; return null; }
        const p = compile(g);
        if (_cv.width !== W || _cv.height !== H) { _cv.width = W; _cv.height = H; }
        g.useProgram(p);
        g.bindBuffer(g.ARRAY_BUFFER, _quad);
        const loc = g.getAttribLocation(p, 'p');
        g.enableVertexAttribArray(loc);
        g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, _tex);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, srcCanvas);
        g.uniform1i(_u.src, 0);
        // column-major mat4 from the 3x3, with the unused row/column left as the identity
        const M = acc.m;
        g.uniformMatrix4fv(_u.m, false, new Float32Array([
          M[0], M[3], M[6], 0,
          M[1], M[4], M[7], 0,
          M[2], M[5], M[8], 0,
          0, 0, 0, 1]));
        g.uniform4f(_u.off, acc.o[0], acc.o[1], acc.o[2], 0);
        g.viewport(0, 0, W, H);
        g.drawArrays(g.TRIANGLES, 0, 3);
        _stats.gpu++;
        return _cv;
      } catch (e) { _stats.cpu++; _stats.reason = String(e && e.message || e); return null; }
    },
    /* ═══ BLUR — the eighth of the nine, and the one he uses (queue 661) ══════════════════════════
     * A Gaussian is NOT a colour matrix: it reads neighbouring pixels, so it needs two passes and a
     * place to put the first one. That is the whole reason it was left out of the matrix path rather
     * than bolted onto it.
     * SEPARABLE: a 2-D Gaussian is the same as a horizontal pass followed by a vertical one, which
     * turns an N×N kernel into 2N taps. At radius 20 that is 41 taps instead of 1,681.
     * ⚠️ THE RADIUS→SIGMA CONSTANT IS MEASURED, NOT LOOKED UP. The specs disagree with each other about
     * whether `blur(Npx)` means a standard deviation of N or of N/2, and the only answer that matters is
     * the one that matches what `ctx.filter` actually draws on this machine. The suite compares the two
     * and would fail on a wrong constant, so the number below is the one that agreed. */
    blur: function (srcCanvas, W, H, radiusPx) {
      if (FM._noGL) { _stats.cpu++; return null; }
      if (!srcCanvas || !(W > 0) || !(H > 0) || !(radiusPx > 0.05)) { _stats.cpu++; return null; }
      const g = gl();
      if (!g) { _stats.cpu++; return null; }
      try {
        if (g.isContextLost && g.isContextLost()) { reset(); _stats.cpu++; return null; }
        const p = compileBlur(g);
        if (_cv.width !== W || _cv.height !== H) { _cv.width = W; _cv.height = H; }
        // A ping-pong target for the horizontal pass. Allocated once and resized with the canvas.
        if (!_fbTex) {
          _fbTex = g.createTexture();
          g.bindTexture(g.TEXTURE_2D, _fbTex);
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
          _fb = g.createFramebuffer();
        }
        if (_fbW !== W || _fbH !== H) {
          g.bindTexture(g.TEXTURE_2D, _fbTex);
          g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, W, H, 0, g.RGBA, g.UNSIGNED_BYTE, null);
          _fbW = W; _fbH = H;
        }
        const sigma = Math.max(0.2, radiusPx * BLUR_SIGMA);
        const taps = Math.min(64, Math.max(1, Math.ceil(sigma * 3)));
        g.useProgram(p);
        g.bindBuffer(g.ARRAY_BUFFER, _quad);
        const loc = g.getAttribLocation(p, 'p');
        g.enableVertexAttribArray(loc);
        g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
        g.uniform1i(_ub.src, 0);
        g.uniform1f(_ub.sigma, sigma);
        g.uniform1i(_ub.taps, taps);
        g.viewport(0, 0, W, H);

        // pass 1 — horizontal, source canvas → framebuffer texture
        g.bindFramebuffer(g.FRAMEBUFFER, _fb);
        g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, _fbTex, 0);
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, _tex);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, srcCanvas);
        g.uniform2f(_ub.step, 1 / W, 0);
        g.uniform1f(_ub.flip, 1);      // the canvas upload is top-down; the framebuffer is not
        g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT);
        g.drawArrays(g.TRIANGLES, 0, 3);

        // pass 2 — vertical, framebuffer texture → the visible canvas
        g.bindFramebuffer(g.FRAMEBUFFER, null);
        g.bindTexture(g.TEXTURE_2D, _fbTex);
        g.uniform2f(_ub.step, 0, 1 / H);
        g.uniform1f(_ub.flip, 0);      // …and pass 2 reads a framebuffer, which is already bottom-up
        g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT);
        g.drawArrays(g.TRIANGLES, 0, 3);

        g.bindTexture(g.TEXTURE_2D, _tex);
        _stats.gpu++;
        return _cv;
      } catch (e) { _stats.cpu++; _stats.reason = String(e && e.message || e); return null; }
    },
    stats: function () { return Object.assign({}, _stats); },
    available: function () { return !FM._noGL && !!gl(); },
    _reset: function () { reset(); _dead = false; _stats.gpu = 0; _stats.cpu = 0; _stats.compiled = 0; _stats.reason = ''; }
  };
})();
