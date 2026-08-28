/* ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * gl-warp.js — the WARP_FX family, on the GPU.
 *
 * WHY THIS EXISTS. The oldest open item in REQUESTS.md is "Editing lags, and gets bad fast", and after
 * three months its own summary says the measurable half is finished and what remains is architectural:
 * the cost is a per-pixel JavaScript loop, the gap to smooth is ~50x, and the best single kernel win in
 * that whole time was 11x. **No amount of further kernel tuning closes it.**
 *
 * A fragment shader is a STRING. No build step, no bundler, no npm — which is the only reason this fits
 * a project whose whole rule is vanilla files loaded with <script src>.
 *
 * 📐 MEASURED (tests/_glwarp.html) — one full-size twirl at Ezra's own 1080x1350, against the app's own
 * kernel, on a real GPU:
 *     the CPU kernel today        21.5 ms
 *     GPU: upload + warp           0.58 ms    37x
 *     GPU + blit onto a 2D canvas  1.92 ms    11x     ← what this module does
 *     GPU + blit + getImageData    8.6  ms     2.5x   ← what a naive port would have delivered
 * and the picture is the same: 0.38% of pixels differ, none by more than the sampling-grid rounding
 * LOOP.md rule 14 says to expect from any resample.
 *
 * 🔑 THE THIRD ROW IS THE ENTIRE DESIGN. The readback is what eats the win. Every WARP_FX kernel today
 * ends with its pixels in an ImageData, so the obvious port — run the shader, `getImageData`, carry on
 * as before — would have delivered 2.5x and looked like a disappointment. **Nothing here ever reads
 * pixels back.** The GL canvas is handed straight to `ctx.drawImage`, which is what the CPU path did
 * with its 2D plate anyway, so the seam is the same shape and the fence is never hit.
 *
 * HOW A KERNEL OPTS IN. It gains a `.glsl` string — the body of a function mapping the destination
 * point `xy` to the source point it reads from — and its existing `.prep` object becomes the uniforms,
 * because `prep` already returns exactly the flat set of per-frame scalars a shader wants. A kernel
 * with no `.glsl` is untouched and keeps its JavaScript loop. That is deliberate: 29 kernels do not get
 * ported in one commit, and a partial port must never be a partial app.
 *
 * ⚠️ AND IT MUST BE ABLE TO NOT WORK. WebGL can be unavailable, blocked, or lost at any moment (a
 * context loss is a normal event on a phone under memory pressure, not an error). Every entry point
 * returns null rather than throwing, `drawWarpEffect` falls back to the loop that has always been
 * there, and `FM.glWarp.stats()` says which path ran so the suite can prove the GPU one was actually
 * taken rather than silently skipped — a green test against a permanent fallback would measure nothing.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const FM = window.FM = window.FM || {};

  const VS =
    'attribute vec2 p; varying vec2 uv;' +
    'void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';

  let _cv = null, _gl = null, _tex = null, _quad = null, _dead = false;
  const _progs = new Map();          // glsl body → { prog, u: {name → location} }
  const _stats = { gpu: 0, cpu: 0, compiled: 0, lost: 0, chained: 0, chains: 0, reason: '' };

  /* ONE canvas and ONE context for the whole app. A WebGL context is an expensive object and browsers
     cap how many may exist at once (~16); allocating one per effect per layer would hit that ceiling on
     a stacked project and start silently killing the OLDEST contexts, which is a bug that looks like
     random effects going blank. */
  function gl() {
    if (_dead) return null;
    if (_gl) return _gl;
    try {
      _cv = document.createElement('canvas');
      /* alpha:true + premultipliedAlpha:false makes the whole path UN-premultiplied, which is what
         `getImageData` gives and therefore what every kernel in compositor.js is written against.
         Left at the default the source is un-premultiplied on upload and re-premultiplied on present,
         so a semi-transparent edge comes back darker — visible exactly where a warp is most obvious.
         preserveDrawingBuffer:true because the compositor blits the canvas in a LATER statement than
         the draw; without it the browser is entitled to have cleared it, and the failure mode is an
         effect that renders as nothing at all on some devices and fine on this one. */
      _gl = _cv.getContext('webgl2', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, depth: false, stencil: false })
         || _cv.getContext('webgl',  { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, depth: false, stencil: false });
      if (!_gl) { _dead = true; _stats.reason = 'no WebGL context'; return null; }
      /* A LOST CONTEXT IS A NORMAL EVENT, not an error — a phone under memory pressure takes it back.
         Everything is dropped and rebuilt on the next call rather than the app being left holding dead
         GL objects, which throw on use and would take the whole render down with them. */
      _cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); _stats.lost++; reset(); }, false);
      _gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, false);   // texImage2D from a canvas puts row 0 at v=0
      _tex = _gl.createTexture();
      _gl.bindTexture(_gl.TEXTURE_2D, _tex);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
      // NEAREST, deliberately: the CPU loop truncates the mapped coordinate and reads that one texel.
      // Bilinear here would be a *better* picture and a DIFFERENT one, and "the GPU path looks softer
      // than the export" is not a trade to make silently.
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.NEAREST);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.NEAREST);
      _quad = _gl.createBuffer();
      _gl.bindBuffer(_gl.ARRAY_BUFFER, _quad);
      // One oversized triangle rather than two triangles: same covered area, no shared edge to seam.
      _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), _gl.STATIC_DRAW);
      return _gl;
    } catch (e) { _dead = true; _stats.reason = String(e && e.message || e); return null; }
  }

  function reset() {
    _gl = null; _cv = null; _tex = null; _quad = null; _progs.clear();
    _fbo = null; _ping[0] = null; _ping[1] = null; _ppW = 0; _ppH = 0;
  }

  function shader(g, type, src) {
    const s = g.createShader(type);
    g.shaderSource(s, src);
    g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
      const log = g.getShaderInfoLog(s);
      g.deleteShader(s);
      throw new Error('warp shader: ' + log);
    }
    return s;
  }

  /* The wrapper every kernel body is dropped into. `uNames` become float uniforms, so a kernel's `prep`
     object needs no schema — its own keys ARE the interface.
     ⚠️ THE CLAMP REPRODUCES THE CPU LOOP EXACTLY, and it is not the obvious clamp. compositor.js does
     `sx = m[0] | 0` (truncate) and then pins to [0, W-1], so the shader floors, pins to the same range
     and samples the TEXEL CENTRE. Sampling at `s / res` instead would land on a texel boundary, where
     NEAREST's tie-break is undefined and half the frame can shift by one pixel. */
  /* SHARED HELPERS, and each is a MATCHED PAIR with a function in compositor.js. Two expressions of
     one rule is the shape that has cost this project the most — queue 630 paid for it three times
     inside a single item — so they are transcribed line for line and named identically at both ends. */
  const PRELUDE = [
    // compositor.js reflectInto — bounce a coordinate back inside [0, n-1] instead of clamping, so a
    // kaleidoscope's mirrors reflect rather than smearing the edge pixel outward.
    'float reflectInto(float v, float n){',
    '  if (!(n > 1.0)) return 0.0;',
    '  float last = n - 1.0, m = 2.0 * last;',
    '  float q = mod(mod(v, m) + m, m);',
    '  return q > last ? m - q : q;',
    '}'
  ].join('\n');

  function program(g, body, uNames) {
    /* \u001f (unit separator), NOT a NUL. A NUL makes grep treat the WHOLE FILE as binary and go
       silent — `grep -n "function program" js/gl-warp.js` printed nothing on a file that plainly
       contains it, which reads as "the code is not there". This repo works by grep. \u001f cannot
       occur in a GLSL identifier or body either, so it separates just as unambiguously. */
    const key = uNames.join(',') + '\u001f' + body;
    let p = _progs.get(key);
    if (p) return p;
    /* EVERY UNIFORM IS PREFIXED `u_`, AND THAT IS NOT TIDINESS. A kernel's `prep` keys become the
       uniform names, and those keys were chosen for JavaScript: `kaleidoscope.prep` returns one
       called **half**, which is a RESERVED WORD in GLSL ES — the shader would not compile at all.
       The quieter danger is a key that compiles and is WRONG: `mix`, `step`, `length` and `filter`
       are built-in FUNCTIONS, and a uniform of that name shadows one. Prefixing removes the entire
       class, rather than keeping a list of words no kernel author may use. */
    const decls = uNames.map(n => 'uniform float u_' + n + ';').join('\n');
    const fs = [
      'precision highp float;',
      'varying vec2 uv;',
      'uniform sampler2D src;',
      'uniform vec2 res;',
      'uniform float u_fmChainFlip;',
      decls,
      PRELUDE,
      /* Two kernels read drawWarpEffect's RAW cx/cy/maxR arguments rather than their own prep, and
         those are always W/2, H/2 and hypot(cx,cy) — derivable from res, so they need no uniform and
         cannot drift from what the CPU path was handed. */
      'vec2 fmC = res * 0.5;',
      'float fmCx = fmC.x, fmCy = fmC.y, fmMaxR = length(fmC);',
      'vec2 fmWarp(vec2 xy){',
      body,
      '}',
      'void main(){',
      /* ⚠️ floor() — THE KERNEL MUST BE ASKED THE SAME QUESTION THE CPU LOOP ASKS. That loop walks
         INTEGER x and y; a fragment shader is evaluated at the PIXEL CENTRE, so this was handing
         every kernel 90.5 where JavaScript passed 90. Half a pixel, on every kernel, in both axes.
         It hid as "resample noise" (0.1-0.9% of pixels) and it was not noise, it was a constant
         offset — and at a slider extreme it was the difference between a frame with one pixel in
         it and a frame with none, which is how the suite finally caught it: bulge at amount=-1
         maps everything to a ring except the exact centre pixel, and the shader never visited the
         exact centre. MEASURED after this line: bulge's disagreement 0.125% -> 0.000%. */
      '  vec2 xy = floor(vec2(uv.x * res.x, (1.0 - uv.y) * res.y));',
      '  vec2 s = floor(fmWarp(xy));',
      '  s = clamp(s, vec2(0.0), res - vec2(1.0));',
      /* ⚠️ WHERE ROW 0 OF THE SOURCE TEXTURE LIVES DEPENDS ON HOW IT GOT THERE, and getting this
         wrong flips the picture rather than breaking it — the failure looks like a wrong effect, not
         like a bug. A texture uploaded from a CANVAS (UNPACK_FLIP_Y false) stores canvas row 0 at
         v=0, top-down, which is what every kernel assumes. A texture RENDERED INTO through a
         framebuffer stores its first row at the GL bottom, so image row 0 sits at v=1 — upside down.
         `run` uploads a canvas and passes 0; `runChain` passes 1 for every pass after the first,
         because those read the previous pass's framebuffer texture. One uniform, set at the only two
         places that can know the answer. */
      '  vec2 st = (s + vec2(0.5)) / res;',
      '  gl_FragColor = texture2D(src, vec2(st.x, abs(u_fmChainFlip - st.y)));',
      '}'
    ].join('\n');
    const prog = g.createProgram();
    g.attachShader(prog, shader(g, g.VERTEX_SHADER, VS));
    g.attachShader(prog, shader(g, g.FRAGMENT_SHADER, fs));
    g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) {
      const log = g.getProgramInfoLog(prog);
      g.deleteProgram(prog);
      throw new Error('warp link: ' + log);
    }
    const u = { res: g.getUniformLocation(prog, 'res'), src: g.getUniformLocation(prog, 'src'),
                _flip: g.getUniformLocation(prog, 'u_fmChainFlip') };
    uNames.forEach(n => { u[n] = g.getUniformLocation(prog, 'u_' + n); });
    p = { prog: prog, u: u };
    _progs.set(key, p);
    _stats.compiled++;
    return p;
  }

  /* Below this many pixels the CPU loop wins: a program bind, a texture upload and a draw all cost
     something fixed, and a 120x120 effect thumbnail is mostly that fixed cost. 200x200 is where the
     two crossed when measured; it is a floor, not a tuning knob. */
  const MIN_PX = 40000;

  /* ═══ THE PING-PONG PAIR, for runChain ═══════════════════════════════════════════════════════════
   * Two textures and one framebuffer, reused for the life of the page. A chain of N warps renders
   * N-1 passes into these and the LAST pass onto the canvas, so the picture never leaves the GPU
   * between effects and never becomes a canvas the next effect has to upload again. */
  let _fbo = null, _ping = [null, null], _ppW = 0, _ppH = 0;

  function ppTex(g, W, H) {
    if (_ping[0] && _ppW === W && _ppH === H) return true;
    for (let i = 0; i < 2; i++) {
      if (_ping[i]) g.deleteTexture(_ping[i]);
      const tx = g.createTexture();
      g.bindTexture(g.TEXTURE_2D, tx);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      // NEAREST for the same reason the source texture uses it: the CPU loop truncates, so any
      // smoothing here would be the GPU inventing pixels the twin never had.
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, W, H, 0, g.RGBA, g.UNSIGNED_BYTE, null);
      _ping[i] = tx;
    }
    if (!_fbo) _fbo = g.createFramebuffer();
    _ppW = W; _ppH = H;
    g.bindFramebuffer(g.FRAMEBUFFER, _fbo);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, _ping[0], 0);
    const ok = g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE;
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    if (!ok) { _stats.reason = 'framebuffer incomplete'; _ppW = 0; }
    return ok;
  }

  FM.glWarp = {
    /* srcCanvas → the warped picture, as a CANVAS ready for drawImage. Never an ImageData: the readback
       is the thing that turns 11x into 2.5x, and no caller here needs pixels.
       Returns null for every "cannot", and null means "use the loop you already have". */
    run: function (srcCanvas, W, H, body, uniforms) {
      if (FM._noGL) { _stats.cpu++; _stats.reason = 'disabled by FM._noGL'; return null; }
      if (!body || !srcCanvas || !(W > 0) || !(H > 0)) { _stats.cpu++; return null; }
      if (W * H < MIN_PX) { _stats.cpu++; _stats.reason = 'below the size floor'; return null; }
      const g = gl();
      if (!g) { _stats.cpu++; return null; }
      try {
        if (g.isContextLost && g.isContextLost()) { reset(); _stats.cpu++; _stats.reason = 'context lost'; return null; }
        const names = [];
        /* A BOOLEAN IS A VALUE TOO. `radialrepeat.prep` returns `mir: true`, and taking numbers only
           left that uniform undeclared while the kernel body still referenced it — a compile error,
           i.e. a silent permanent fallback for that one effect, which is the hardest kind of miss to
           notice because everything still draws correctly. Arrays and objects are still skipped:
           `wave.prep` returns two Float64Arrays for the CPU path and the shader recomputes those
           sines directly, because on a GPU a sine is one instruction and a lookup table is not. */
        for (const k in uniforms) {
          const v = uniforms[k];
          if (typeof v === 'boolean' || (typeof v === 'number' && isFinite(v))) names.push(k);
        }
        names.sort();   // stable, so the same kernel always hits the same cached program
        const p = program(g, body, names);
        if (_cv.width !== W || _cv.height !== H) { _cv.width = W; _cv.height = H; }
        g.useProgram(p.prog);
        g.bindBuffer(g.ARRAY_BUFFER, _quad);
        const loc = g.getAttribLocation(p.prog, 'p');
        g.enableVertexAttribArray(loc);
        g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, _tex);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, srcCanvas);
        g.uniform1i(p.u.src, 0);
        g.uniform2f(p.u.res, W, H);
        /* EXPLICIT 0, not "it defaults to 0". Programs are CACHED and shared with runChain, which
           leaves this at 1 on the passes that read a framebuffer texture. Relying on the default
           would give a correct picture until the first chained render and an upside-down one after
           — the worst kind of order-dependent bug. */
        g.uniform1f(p.u._flip, 0);
        for (let i = 0; i < names.length; i++) { const v = uniforms[names[i]]; g.uniform1f(p.u[names[i]], v === true ? 1 : v === false ? 0 : v); }
        g.viewport(0, 0, W, H);
        g.drawArrays(g.TRIANGLES, 0, 3);
        _stats.gpu++;
        return _cv;
      } catch (e) {
        // One failure disables nothing permanently except a genuinely absent context — a bad kernel
        // body should cost that kernel the GPU path, not the whole app.
        _stats.cpu++; _stats.reason = String(e && e.message || e);
        return null;
      }
    },
    /* ═══ A WHOLE RUN OF WARPS, WITHOUT COMING BACK DOWN ════════════════════════════════════════
       The oldest entry on his list said this in as many words: *"A CHAIN OF WARPS DOES NOT YET STAY
       ON THE GPU… worth roughly another 3x on a stacked layer — it is written here as the plan, not
       as a result."* This is that.
       Two warps on one layer used to cost two of everything: the inner one rendered into a 2D plate,
       was uploaded, warped, and drawn BACK onto a 2D canvas, which the outer one then uploaded
       again. The pixels crossed the bus twice for no reason — the second effect wants exactly the
       picture the first one just produced, and that picture was already sitting in GPU memory.
       Now: ONE upload, N shader passes ping-ponging between two framebuffer textures, ONE blit.
       `passes` is [{body, uniforms}, …] in APPLICATION order — passes[0] runs first.
       Returns the canvas, or null for every "cannot", and null means the caller's existing path. */
    runChain: function (srcCanvas, W, H, passes) {
      if (FM._noGL) { _stats.cpu++; _stats.reason = 'disabled by FM._noGL'; return null; }
      if (!passes || passes.length < 2 || !srcCanvas || !(W > 0) || !(H > 0)) return null;
      if (W * H < MIN_PX) { _stats.reason = 'below the size floor'; return null; }
      const g = gl();
      if (!g) return null;
      try {
        if (g.isContextLost && g.isContextLost()) { reset(); _stats.reason = 'context lost'; return null; }
        if (!ppTex(g, W, H)) return null;
        if (_cv.width !== W || _cv.height !== H) { _cv.width = W; _cv.height = H; }
        g.bindBuffer(g.ARRAY_BUFFER, _quad);
        g.activeTexture(g.TEXTURE0);
        // pass 0 reads the uploaded canvas; every later pass reads the texture the one before wrote
        g.bindTexture(g.TEXTURE_2D, _tex);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, srcCanvas);
        let srcTex = _tex;
        for (let i = 0; i < passes.length; i++) {
          const uni = passes[i].uniforms || {}, names = [];
          for (const k in uni) {
            const v = uni[k];
            if (typeof v === 'boolean' || (typeof v === 'number' && isFinite(v))) names.push(k);
          }
          names.sort();
          const p = program(g, passes[i].body, names);
          const last = (i === passes.length - 1);
          /* The LAST pass draws onto the canvas, so the result is a canvas ready for drawImage and
             nothing is ever read back — the whole reason this family is 11x and not 2.5x. */
          g.bindFramebuffer(g.FRAMEBUFFER, last ? null : _fbo);
          if (!last) g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, _ping[i % 2], 0);
          g.useProgram(p.prog);
          const loc = g.getAttribLocation(p.prog, 'p');
          g.enableVertexAttribArray(loc);
          g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
          g.bindTexture(g.TEXTURE_2D, srcTex);
          g.uniform1i(p.u.src, 0);
          g.uniform2f(p.u.res, W, H);
          g.uniform1f(p.u._flip, i === 0 ? 0 : 1);   // see the shader — a framebuffer texture is upside down
          for (let n = 0; n < names.length; n++) {
            const v = uni[names[n]];
            g.uniform1f(p.u[names[n]], v === true ? 1 : v === false ? 0 : v);
          }
          g.viewport(0, 0, W, H);
          g.drawArrays(g.TRIANGLES, 0, 3);
          if (!last) srcTex = _ping[i % 2];
        }
        g.bindFramebuffer(g.FRAMEBUFFER, null);
        _stats.gpu += passes.length;
        _stats.chained += passes.length;
        _stats.chains++;
        return _cv;
      } catch (e) {
        try { g.bindFramebuffer(g.FRAMEBUFFER, null); } catch (_) {}
        _stats.reason = String(e && e.message || e);
        return null;
      }
    },
    /* For the suite, and it is load-bearing: every assertion about the GPU path needs a control proving
       the GPU path RAN. A test that passes because the code fell back to the CPU loop has measured the
       CPU loop and said nothing at all about this file. */
    stats: function () { return Object.assign({}, _stats); },
    available: function () { return !FM._noGL && !!gl(); },
    _reset: function () { reset(); _dead = false; _stats.gpu = 0; _stats.cpu = 0; _stats.compiled = 0; _stats.chained = 0; _stats.chains = 0; _stats.reason = ''; }
  };
})();
