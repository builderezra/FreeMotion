import os, re, sys
# Build options/pc.js: take 13 (layers-stack) three ways for a wide screen. The phone mode must stay byte-for-byte the
# same drawing as layers.js, so the source is SPLICED from layers.js with checked one-off replacements, never retyped.
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'options', 'layers.js'), encoding='utf-8').read()
lines = src.split('\n')

def find(pred, start=0):
    for i in range(start, len(lines)):
        if pred(lines[i]):
            return i
    sys.exit('STOP: marker not found')

i_iife = find(lambda l: l.startswith('(function () {'))
i_stack_head = find(lambda l: "id: 'layers-stack'" in l)
i_make = find(lambda l: l.strip() == 'make(stage, kit) {', i_stack_head)
i_seek = find(lambda l: 'return function seek(t) {' in l, i_make)
i_seek_end = find(lambda l: l == '      };', i_seek)          # end of `return function seek(t) {`
i_take_end = find(lambda l: l == '  });', i_seek_end)
if i_take_end != i_seek_end + 2:
    sys.exit('STOP: the stack take does not end where expected')
i_wave_end = find(lambda l: l.startswith('  function wave('))
i_wave_end = find(lambda l: l == '  }', i_wave_end)

helpers = '\n'.join(lines[i_iife + 1:i_wave_end + 1])
body = '\n'.join(lines[i_make + 1:i_seek_end + 1])

def once(text, old, new, what):
    n = text.count(old)
    if n != 1:
        sys.exit('STOP: %s found %d times' % (what, n))
    return text.replace(old, new)

# 1. The logo's place, by mode.
old_layout = helpers[helpers.index('  function logoLayout(kit) {'):helpers.index('  // ---- The camera')]
new_layout = r'''  function logoLayout(kit, mode) {
    const F = kit.F, W = kit.w, H = kit.h;
    const m = document.createElement('canvas').getContext('2d');
    m.font = '600 100px ' + kit.SYS;
    const mw = m.measureText('FreeMotion').width;
    let s, fh, fw, wordPx, cx, cy, left, wordX, wordY;
    if (mode === 'lockup') {
      // The F on the left and the name beside it, centred as one block.
      s = (H * 0.3) / F.box.h;
      fh = F.box.h * s; fw = F.box.w * s; wordPx = fh * 0.46;
      let gapX = fh * 0.24, total = fw + gapX + (mw * wordPx) / 100;
      const fit = Math.min(1, (W * 0.84) / total);
      s *= fit; fh *= fit; fw *= fit; wordPx *= fit; gapX *= fit; total *= fit;
      left = (W - total) / 2; cx = left + fw / 2; cy = H / 2;
      wordX = left + fw + gapX; wordY = cy + wordPx * 0.36;
    } else {
      s = (mode === 'wide' ? Math.min(W * 0.5, H * 0.34) : Math.min(W * 0.6, H * 0.31)) / F.box.w;
      fh = F.box.h * s; fw = F.box.w * s;
      wordPx = (fw / mw) * 100;
      const gap = fh * 0.13, block = fh + gap + wordPx;
      const top = mode === 'wide' ? (H - block) * 0.46 : 60 + Math.max(0, (H - 110 - 60 - block) / 2);
      cx = W / 2; cy = top + fh / 2; left = cx - fw / 2; wordX = left;
      wordY = top + fh + gap + wordPx * 0.8;
    }
    return {
      s, fw, fh, cx, cy, wordPx, left, wordX, wordY,
      X: (lx) => cx + (lx - (F.box.x + F.box.w / 2)) * s,
      Y: (ly) => cy + (ly - (F.box.y + F.box.h / 2)) * s,
    };
  }

'''
helpers = helpers.replace(old_layout, new_layout)

# 2. The take's body, by mode.
body = once(body, 'const L = logoLayout(kit), F = kit.F;', 'const L = logoLayout(kit, mode), F = kit.F;', 'logoLayout call')
body = once(body, 'fs = W / 390;', "fs = mode === 'phone' ? W / 390 : H / 680;", 'fs')
body = body.replace('kit.wordmark(x, L.left, L.wordY', 'kit.wordmark(x, L.wordX, L.wordY')
body = body.replace('kit.wordmark(g, L.left, L.wordY', 'kit.wordmark(g, L.wordX, L.wordY')
if 'L.left, L.wordY' in body:
    sys.exit('STOP: a wordmark call was not moved to wordX')
a = body.index('      const clip = tex((x) => {')
b = body.index('      });', a) + len('      });')
new_clip = r'''      const clip = tex((x) => {
        // Phone: one column of frames (exactly as layers.js). Wide: three across.
        const cols = mode === 'phone' ? 1 : 3, gx = W * 0.02;
        const fw0 = (W * 0.94 - (cols - 1) * gx) / cols, fh = (fw0 * 9) / 16, gapY = 7 * fs;
        const fxOf = (c) => W * 0.03 + c * (fw0 + gx);
        const bottom = R[2].y - 5 * fs;
        let y = bottom - fh;
        const rows = Math.ceil(bottom / (fh + gapY)) + 1, total = rows * cols;
        for (let i = rows - 1; i >= 0; i--) {
          for (let c = 0; c < cols; c++) {
            const k = i * cols + (cols - 1 - c), ph = 1 - k / total, fx = fxOf(c);
            scene(x, fx, y, fw0, fh, 0, 1 - ph);
            x.fillStyle = INK; x.fillRect(fx, y + fh - 17 * fs, 90 * fs, 17 * fs);
            x.fillStyle = BONE; x.font = '700 ' + 12 * fs + 'px "Courier Prime", monospace'; x.textBaseline = 'middle'; x.textAlign = 'left';
            x.fillText('00:04:' + String(11 + k) + ':' + String(3 + k * 7), fx + 5 * fs, y + fh - 8 * fs);
          }
          y -= fh + gapY;
        }
        for (let c = 0; c < cols; c++) { x.save(); x.translate(fxOf(c), H * 0.77); scene(x, 0, 0, fw0, fh * 0.9, cols === 1 ? 1 : [1, 2, 6][c], 0); x.restore(); }
        tab(x, 'CLIP 01', '#f6c544', INK);
      });'''
body = body[:a] + new_clip + body[b:]

out = '''// Take 13, Exploded Stack, three ways for a PC screen. GENERATED by build_pc.py from layers.js: edit that, not this.
(function () {
''' + helpers + '''

  function makeStack(stage, kit, mode) {
''' + body + '''
  }

  const PC_LANE = 'Your pick, 13, on a PC', BONE = '#e7e2d5', COAL = '#0c0c0d';
  FMI.add({
    id: 'pc-centred', lane: PC_LANE, full: true, name: 'Centred', dur: 2.92, ground: BONE,
    blurb: 'The phone version in the middle of the screen, with cream either side that turns black when the matte lands. This is what the next release ships.',
    make(stage, kit) {
      const W = kit.w, H = kit.h;
      const h = Math.min(H, 900, W / 0.4617), w = Math.round(h * 0.4617);
      const inner = kit.el('div', 'left:' + Math.round((W - w) / 2) + 'px;top:' + Math.round((H - h) / 2) + 'px;width:' + w + 'px;height:' + Math.round(h) + 'px;overflow:hidden');
      const seek = makeStack(inner, FMI.makeKit(inner, w, Math.round(h), kit.dpr), 'phone');
      return (t) => { stage.style.background = t < 2.14 ? BONE : COAL; seek(t); };
    },
  });
  FMI.add({
    id: 'pc-wide', lane: PC_LANE, full: true, name: 'Wide', dur: 2.92, ground: BONE,
    blurb: 'The same take redrawn for a wide screen: wide sheets, three frames of footage across, and the F with the name under it in the middle.',
    make(stage, kit) { return makeStack(stage, kit, 'wide'); },
  });
  FMI.add({
    id: 'pc-lockup', lane: PC_LANE, full: true, name: 'Side by side', dur: 2.92, ground: BONE,
    blurb: 'Wide as well, but it lands with the F on the left and FreeMotion beside it, the way a logo sits on a wide screen.',
    make(stage, kit) { return makeStack(stage, kit, 'lockup'); },
  });
})();
'''
open(os.path.join(here, 'options', 'pc.js'), 'w', encoding='utf-8', newline='\n').write(out)
print('wrote options/pc.js', len(out) // 1024, 'KB')

