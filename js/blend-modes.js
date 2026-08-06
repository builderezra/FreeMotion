/* FreeMotion — Manual (per-pixel) blend modes.
 * The Alight-Motion blend modes Canvas has NO globalCompositeOperation for. Everything canvas can
 * do natively stays native (see the BLEND map at js/compositor.js:11) — that path runs on the GPU
 * and is an order of magnitude faster than anything here. These nine only exist because there is
 * no gCO that produces them, so the compositor has to read the destination back, blend in JS and
 * write it out again.
 *
 * WHAT THE CALLER MUST HAND US
 *   bd — backdrop ImageData.data for a rect (Uint8ClampedArray RGBA), mutated IN PLACE.
 *   sd — the source layer's ImageData.data for the SAME rect and the same W/H.
 * Both come straight from getImageData: NON-premultiplied (straight) alpha, 8-bit, sRGB-ENCODED.
 * Do NOT linearise before calling — Photoshop and every browser blend in gamma space, and matching
 * canvas' own modes sitting next to these in the picker is the whole point.
 * getImageData throws on a tainted canvas, so the caller still needs the try/catch guard used at
 * js/compositor.js:363.
 *
 * ALPHA — W3C Compositing and Blending Level 1, applied identically by every mode below:
 *   Co = (1-ab)*as*Cs + ab*as*B(Cb,Cs) + (1-as)*ab*Cb      (premultiplied result)
 *   ao = as + ab*(1-as)
 * and we write back STRAIGHT alpha, i.e. Co/ao, because that is what ImageData holds.
 * Opacity is NOT our business: keep the layer opacity out of sd and let the caller apply it, or
 * bake it into sd's alpha before calling — never fold it into B.
 *
 * PROTOTYPE-LESS MAP: a bare TABLE[userStr] walks the prototype chain, so a saved/imported
 * blendMode of 'constructor' would resolve to a function and get called. Object.create(null)
 * makes the obvious `if (FM.BLEND_MANUAL[mode])` integration safe by construction. (Same bug
 * class flagged at the top of js/masks.js.)
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const INV255 = 1 / 255;

  // ---- the loop skeleton, written once here and then repeated verbatim in every mode ----------
  // Yes, the alpha preamble is copy-pasted nine times instead of living in a helper. That is
  // deliberate: this runs per layer, per frame, over W*H pixels, and a per-pixel call plus the
  // array indirection costs more than the duplication saves. Read one loop and you have read all.
  //
  //   n = min(W*H*4, bd.length, sd.length)
  //       A short buffer would index past the end -> undefined -> NaN -> putImageData writes 0,
  //       i.e. black holes. Cheaper to clamp the span once than to trust the caller.
  //
  //   sa === 0  -> continue.
  //       A fully transparent source MUST leave the backdrop byte-for-byte identical. The maths
  //       already says so (Co = ab*Cb, ao = ab), but round-tripping through floats and back into
  //       a Uint8ClampedArray can still shift a byte by 1. Skipping is exact AND faster.
  //
  //   ba === 0  -> copy the source pixel.
  //       With ab = 0 the formula collapses to exactly Cs at alpha as, whatever B says. Copying
  //       dodges a divide by a very small ao and is the common case over empty canvas.
  //
  //   otherwise -> k1 = (1-ab)*as, k2 = ab*as, k3 = (1-as)*ab, and k1+k2+k3 === ao exactly.
  //       So Co/ao is a convex mix of Cs, B and Cb: if B is in 0..1 the result is too, and no
  //       extra clamp is needed on top of whatever clamping B already does.

  FM.BLEND_MANUAL = Object.assign(Object.create(null), {

    // ---- DARKEN family --------------------------------------------------------------------
    // Linear Burn — B = max(0, Cb + Cs - 1). Exact dual of Add/Linear Dodge (invert both, add,
    // invert), written in the cheap algebraic form. The low clamp is mandatory: the sum is below
    // white for most of any real image. No high clamp — Cb + Cs - 1 <= 1 for inputs in 0..1.
    // Crushes shadows far harder than Multiply; that clipping IS the mode, not a bug.
    // NOT 'color-burn' — that is a different, non-linear curve. Do not substitute it.
    'linear-burn': function (bd, sd, W, H) {
      const n = Math.min(W * H * 4, bd.length, sd.length);
      for (let i = 0; i < n; i += 4) {
        const sa = sd[i + 3];
        if (sa === 0) continue;
        const ba = bd[i + 3];
        if (ba === 0) { bd[i] = sd[i]; bd[i + 1] = sd[i + 1]; bd[i + 2] = sd[i + 2]; bd[i + 3] = sa; continue; }
        const as = sa * INV255, ab = ba * INV255;
        const k2 = as * ab, k1 = as - k2, k3 = ab - k2, ao = as + k3, f = 255 / ao;
        let cb = bd[i] * INV255, cs = sd[i] * INV255, b = Math.max(0, cb + cs - 1);
        bd[i] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 1] * INV255; cs = sd[i + 1] * INV255; b = Math.max(0, cb + cs - 1);
        bd[i + 1] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 2] * INV255; cs = sd[i + 2] * INV255; b = Math.max(0, cb + cs - 1);
        bd[i + 2] = (k1 * cs + k2 * b + k3 * cb) * f;
        bd[i + 3] = ao * 255;
      }
    },

    // Darker Color — NON-SEPARABLE: the three channels are NOT blended independently. One
    // comparison decides the whole pixel and all three channels come from the winner, so the
    // output is always a colour that actually existed in one of the layers (unlike Darken, which
    // can invent one). Not in the W3C spec at all — Photoshop is the only reference, and it
    // compares "the total of all channel values", i.e. the UNWEIGHTED sum R+G+B.
    // Compared on the raw bytes: scaling both sides by 255 cannot change the sign of a comparison,
    // so this is the same decision the 0..1 form makes, minus six divides.
    // TIE-BREAK: '<=' hands equal totals to the BACKDROP. Ties are real (pure blue vs pure green
    // both total 1.0) and an undefined tie-break makes gradients flicker frame to frame.
    // Compared on straight, un-premultiplied colour — premultiplied values would make transparent
    // source pixels look "darker" and win every time.
    'darker-color': function (bd, sd, W, H) {
      const n = Math.min(W * H * 4, bd.length, sd.length);
      for (let i = 0; i < n; i += 4) {
        const sa = sd[i + 3];
        if (sa === 0) continue;
        const ba = bd[i + 3];
        if (ba === 0) { bd[i] = sd[i]; bd[i + 1] = sd[i + 1]; bd[i + 2] = sd[i + 2]; bd[i + 3] = sa; continue; }
        const as = sa * INV255, ab = ba * INV255;
        const k2 = as * ab, k1 = as - k2, k3 = ab - k2, ao = as + k3;
        const keepBackdrop = (bd[i] + bd[i + 1] + bd[i + 2]) <= (sd[i] + sd[i + 1] + sd[i + 2]);
        // B is a whole pixel, so the three weights collapse to one pair — the winner carries the
        // k2 (blend) term with it. Bytes in, bytes out: the two 255s cancel, hence f = 1/ao.
        const kS = keepBackdrop ? k1 : k1 + k2, kB = keepBackdrop ? k2 + k3 : k3, f = 1 / ao;
        bd[i] = (kS * sd[i] + kB * bd[i]) * f;
        bd[i + 1] = (kS * sd[i + 1] + kB * bd[i + 1]) * f;
        bd[i + 2] = (kS * sd[i + 2] + kB * bd[i + 2]) * f;
        bd[i + 3] = ao * 255;
      }
    },

    // ---- LIGHTEN family -------------------------------------------------------------------
    // Lighter Color — NON-SEPARABLE counterpart of Lighten. Implemented channel-wise it would just
    // BE Lighten, which is why it needs this path at all.
    // Lum = 0.3/0.59/0.11 (the W3C/Photoshop weights), NOT Rec.709: the spec's non-separable Lum()
    // — the one canvas already uses for our native hue/saturation/color/luminosity — is defined
    // with these, and disagreeing with the Luminosity mode two rows down in the same menu would be
    // indefensible. Weights applied to the raw bytes; a positive scale cannot flip the comparison.
    // TIE-BREAK: '>=' hands equal luminosity to the SOURCE (Photoshop leaves this undefined; two
    // different colours can share a luminosity, e.g. pure red vs 30% grey, so it must be stated).
    // NOTE this is a different comparator from Darker Color's R+G+B above — that asymmetry comes
    // from the agreed spec (Photoshop's own docs for one, W3C Lum for the other) and is kept
    // on purpose. The two modes are therefore NOT exact mirrors on saturated hues.
    'lighter-color': function (bd, sd, W, H) {
      const n = Math.min(W * H * 4, bd.length, sd.length);
      for (let i = 0; i < n; i += 4) {
        const sa = sd[i + 3];
        if (sa === 0) continue;
        const ba = bd[i + 3];
        if (ba === 0) { bd[i] = sd[i]; bd[i + 1] = sd[i + 1]; bd[i + 2] = sd[i + 2]; bd[i + 3] = sa; continue; }
        const as = sa * INV255, ab = ba * INV255;
        const k2 = as * ab, k1 = as - k2, k3 = ab - k2, ao = as + k3;
        // UNWEIGHTED channel sum, matching darker-color eight lines up. Lighter Color is not a W3C
        // mode — Photoshop is the only reference and it compares "the total of all channel values".
        // Using the W3C Lum() weights here picked a different winner on 17% of colour pairs AND
        // disagreed with darker-color about which of a pair is lighter vs darker on saturated hues.
        const ls = sd[i] + sd[i + 1] + sd[i + 2];
        const lb = bd[i] + bd[i + 1] + bd[i + 2];
        const keepSource = ls >= lb;
        const kS = keepSource ? k1 + k2 : k1, kB = keepSource ? k3 : k2 + k3, f = 1 / ao;
        bd[i] = (kS * sd[i] + kB * bd[i]) * f;
        bd[i + 1] = (kS * sd[i + 1] + kB * bd[i + 1]) * f;
        bd[i + 2] = (kS * sd[i + 2] + kB * bd[i + 2]) * f;
        bd[i + 3] = ao * 255;
      }
    },

    // ---- CONTRAST family ------------------------------------------------------------------
    // Soft Overlay — an Alight Motion name with no cross-vendor definition. CHOSEN: SoftLight with
    // the operands swapped, exactly as Overlay is HardLight swapped — so the BACKDROP is the
    // control in both "Overlay"-named modes and Overlay:HardLight / SoftOverlay:SoftLight stay a
    // matched pair. It is also precisely why canvas cannot do it: there is no way to swap a
    // blend's operands in one draw.
    // The inner D() curve is the W3C one (NOT Pegtop, NOT illusions.hu — those shift the midtones
    // visibly and would make this disagree with our native soft-light). Continuous everywhere; no
    // clamp needed. Consequence worth knowing: a 50% grey SOURCE is NOT neutral here (a grey
    // backdrop is), which is the exact mirror of how Overlay treats the backdrop.
    'soft-overlay': function (bd, sd, W, H) {
      const n = Math.min(W * H * 4, bd.length, sd.length);
      for (let i = 0; i < n; i += 4) {
        const sa = sd[i + 3];
        if (sa === 0) continue;
        const ba = bd[i + 3];
        if (ba === 0) { bd[i] = sd[i]; bd[i + 1] = sd[i + 1]; bd[i + 2] = sd[i + 2]; bd[i + 3] = sa; continue; }
        const as = sa * INV255, ab = ba * INV255;
        const k2 = as * ab, k1 = as - k2, k3 = ab - k2, ao = as + k3, f = 255 / ao;
        let cb = bd[i] * INV255, cs = sd[i] * INV255;
        let b = cb <= 0.5 ? cs - (1 - 2 * cb) * cs * (1 - cs)
                          : cs + (2 * cb - 1) * ((cs <= 0.25 ? ((16 * cs - 12) * cs + 4) * cs : Math.sqrt(cs)) - cs);
        bd[i] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 1] * INV255; cs = sd[i + 1] * INV255;
        b = cb <= 0.5 ? cs - (1 - 2 * cb) * cs * (1 - cs)
                      : cs + (2 * cb - 1) * ((cs <= 0.25 ? ((16 * cs - 12) * cs + 4) * cs : Math.sqrt(cs)) - cs);
        bd[i + 1] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 2] * INV255; cs = sd[i + 2] * INV255;
        b = cb <= 0.5 ? cs - (1 - 2 * cb) * cs * (1 - cs)
                      : cs + (2 * cb - 1) * ((cs <= 0.25 ? ((16 * cs - 12) * cs + 4) * cs : Math.sqrt(cs)) - cs);
        bd[i + 2] = (k1 * cs + k2 * b + k3 * cb) * f;
        bd[i + 3] = ao * 255;
      }
    },

    // Vivid Light — ColorBurn(Cb, 2*Cs) below 0.5, ColorDodge(Cb, 2*Cs-1) above.
    // THE GUARD ORDER IS LOAD-BEARING and follows W3C exactly: in the burn half test cb >= 1 BEFORE
    // cs <= 0; in the dodge half test cb <= 0 BEFORE cs >= 1. Get it wrong and (1,0) / (0,1) are a
    // literal 0/0 — NaN, which Uint8ClampedArray stores as 0, punching black holes through
    // highlights. With them, a white backdrop survives a black layer and vice versa, as in
    // Photoshop. Continuous at cs = 0.5 (both halves give cb). Saturates over large areas by
    // design — that is the mode's character, not clipping damage.
    'vivid-light': function (bd, sd, W, H) {
      const n = Math.min(W * H * 4, bd.length, sd.length);
      for (let i = 0; i < n; i += 4) {
        const sa = sd[i + 3];
        if (sa === 0) continue;
        const ba = bd[i + 3];
        if (ba === 0) { bd[i] = sd[i]; bd[i + 1] = sd[i + 1]; bd[i + 2] = sd[i + 2]; bd[i + 3] = sa; continue; }
        const as = sa * INV255, ab = ba * INV255;
        const k2 = as * ab, k1 = as - k2, k3 = ab - k2, ao = as + k3, f = 255 / ao;
        let cb = bd[i] * INV255, cs = sd[i] * INV255;
        let b = cs <= 0.5 ? (cb >= 1 ? 1 : (cs <= 0 ? 0 : 1 - Math.min(1, (1 - cb) / (2 * cs))))
                          : (cb <= 0 ? 0 : (cs >= 1 ? 1 : Math.min(1, cb / (2 * (1 - cs)))));
        bd[i] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 1] * INV255; cs = sd[i + 1] * INV255;
        b = cs <= 0.5 ? (cb >= 1 ? 1 : (cs <= 0 ? 0 : 1 - Math.min(1, (1 - cb) / (2 * cs))))
                      : (cb <= 0 ? 0 : (cs >= 1 ? 1 : Math.min(1, cb / (2 * (1 - cs)))));
        bd[i + 1] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 2] * INV255; cs = sd[i + 2] * INV255;
        b = cs <= 0.5 ? (cb >= 1 ? 1 : (cs <= 0 ? 0 : 1 - Math.min(1, (1 - cb) / (2 * cs))))
                      : (cb <= 0 ? 0 : (cs >= 1 ? 1 : Math.min(1, cb / (2 * (1 - cs)))));
        bd[i + 2] = (k1 * cs + k2 * b + k3 * cb) * f;
        bd[i + 3] = ao * 255;
      }
    },

    // Linear Light — LinearBurn(Cb, 2*Cs) below 0.5 and Add(Cb, 2*Cs-1) above, except both halves
    // reduce to the SAME expression, so there is no branch and no seam: the source just contributes
    // a signed offset (2*Cs - 1) in -1..1. THE ONLY MODE HERE WHOSE RAW RESULT LEAVES 0..1 (range
    // -1..2), so this clamp is mandatory, not cosmetic. Neutral at cs = 0.5; roughly half the
    // parameter space saturates.
    // Linear Dodge (Add) — B = min(1, Cb + Cs), fed through the normal W3C alpha formula.
    // This is NOT the same as canvas' 'lighter': that op is Porter-Duff PLUS (Co = as*Cs + ab*Cb,
    // ao = min(1, as+ab)), which only agrees with Add when the layer AND the backdrop under it are
    // fully opaque. With the opacity slider at 50% 'lighter' is off by up to 63 code values, and it
    // inflates output alpha wherever the backdrop is partly transparent. The legacy 'add' id still
    // maps to 'lighter' so existing projects render exactly as they always did; the picker offers
    // this one.
    'linear-dodge': function (bd, sd, W, H) {
      const n = Math.min(W * H * 4, bd.length, sd.length);
      for (let i = 0; i < n; i += 4) {
        const sa = sd[i + 3];
        if (sa === 0) continue;
        const ba = bd[i + 3];
        if (ba === 0) { bd[i] = sd[i]; bd[i + 1] = sd[i + 1]; bd[i + 2] = sd[i + 2]; bd[i + 3] = sa; continue; }
        const as = sa * INV255, ab = ba * INV255;
        const k2 = as * ab, k1 = as - k2, k3 = ab - k2, ao = as + k3, f = 255 / ao;
        let cb = bd[i] * INV255, cs = sd[i] * INV255, b = cb + cs; if (b > 1) b = 1;
        bd[i] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 1] * INV255; cs = sd[i + 1] * INV255; b = cb + cs; if (b > 1) b = 1;
        bd[i + 1] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 2] * INV255; cs = sd[i + 2] * INV255; b = cb + cs; if (b > 1) b = 1;
        bd[i + 2] = (k1 * cs + k2 * b + k3 * cb) * f;
        bd[i + 3] = ao * 255;
      }
    },

    'linear-light': function (bd, sd, W, H) {
      const n = Math.min(W * H * 4, bd.length, sd.length);
      for (let i = 0; i < n; i += 4) {
        const sa = sd[i + 3];
        if (sa === 0) continue;
        const ba = bd[i + 3];
        if (ba === 0) { bd[i] = sd[i]; bd[i + 1] = sd[i + 1]; bd[i + 2] = sd[i + 2]; bd[i + 3] = sa; continue; }
        const as = sa * INV255, ab = ba * INV255;
        const k2 = as * ab, k1 = as - k2, k3 = ab - k2, ao = as + k3, f = 255 / ao;
        let cb = bd[i] * INV255, cs = sd[i] * INV255, b = Math.min(1, Math.max(0, cb + 2 * cs - 1));
        bd[i] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 1] * INV255; cs = sd[i + 1] * INV255; b = Math.min(1, Math.max(0, cb + 2 * cs - 1));
        bd[i + 1] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 2] * INV255; cs = sd[i + 2] * INV255; b = Math.min(1, Math.max(0, cb + 2 * cs - 1));
        bd[i + 2] = (k1 * cs + k2 * b + k3 * cb) * f;
        bd[i + 3] = ao * 255;
      }
    },

    // Pin Light — Darken(Cb, 2*Cs) below 0.5, Lighten(Cb, 2*Cs-1) above. Continuous at cs = 0.5
    // (min(cb,1) and max(cb,0) both give cb). No clamp needed: min/max keep the result inside the
    // inputs' own range. It REPLACES rather than mixes, so gradients come out posterised into hard
    // bands and long flat plateaus. Users will report that as a bug; it is the entire mode.
    'pin-light': function (bd, sd, W, H) {
      const n = Math.min(W * H * 4, bd.length, sd.length);
      for (let i = 0; i < n; i += 4) {
        const sa = sd[i + 3];
        if (sa === 0) continue;
        const ba = bd[i + 3];
        if (ba === 0) { bd[i] = sd[i]; bd[i + 1] = sd[i + 1]; bd[i + 2] = sd[i + 2]; bd[i + 3] = sa; continue; }
        const as = sa * INV255, ab = ba * INV255;
        const k2 = as * ab, k1 = as - k2, k3 = ab - k2, ao = as + k3, f = 255 / ao;
        let cb = bd[i] * INV255, cs = sd[i] * INV255;
        let b = cs <= 0.5 ? Math.min(cb, 2 * cs) : Math.max(cb, 2 * cs - 1);
        bd[i] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 1] * INV255; cs = sd[i + 1] * INV255;
        b = cs <= 0.5 ? Math.min(cb, 2 * cs) : Math.max(cb, 2 * cs - 1);
        bd[i + 1] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 2] * INV255; cs = sd[i + 2] * INV255;
        b = cs <= 0.5 ? Math.min(cb, 2 * cs) : Math.max(cb, 2 * cs - 1);
        bd[i + 2] = (k1 * cs + k2 * b + k3 * cb) * f;
        bd[i + 3] = ao * 255;
      }
    },

    // ---- DIFFERENCE family ----------------------------------------------------------------
    // Subtract — B = max(0, Cb - Cs). Not commutative. White source => black, black source => no-op.
    // NOT Linear Burn: Subtract(Cb,Cs) === LinearBurn(Cb, 1-Cs), i.e. the same shape with an
    // inverted source. Keep the two distinct in the picker; other tools mislabel one as the other.
    // A native 3-pass emulation exists (invert, 'lighter', invert) but costs two extra full-frame
    // passes AND only agrees with this over an opaque backdrop, for the same reason spelled out
    // under 'divide' below. One loop here stays identical between preview and export.
    'subtract': function (bd, sd, W, H) {
      const n = Math.min(W * H * 4, bd.length, sd.length);
      for (let i = 0; i < n; i += 4) {
        const sa = sd[i + 3];
        if (sa === 0) continue;
        const ba = bd[i + 3];
        if (ba === 0) { bd[i] = sd[i]; bd[i + 1] = sd[i + 1]; bd[i + 2] = sd[i + 2]; bd[i + 3] = sa; continue; }
        const as = sa * INV255, ab = ba * INV255;
        const k2 = as * ab, k1 = as - k2, k3 = ab - k2, ao = as + k3, f = 255 / ao;
        let cb = bd[i] * INV255, cs = sd[i] * INV255, b = Math.max(0, cb - cs);
        bd[i] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 1] * INV255; cs = sd[i + 1] * INV255; b = Math.max(0, cb - cs);
        bd[i + 1] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 2] * INV255; cs = sd[i + 2] * INV255; b = Math.max(0, cb - cs);
        bd[i + 2] = (k1 * cs + k2 * b + k3 * cb) * f;
        bd[i + 3] = ao * 255;
      }
    },

    // Divide — B = Cb / Cs, clamped. AMBIGUOUS: vendors disagree on divide-by-zero. CHOSEN: the
    // W3C color-dodge edge-case ladder with the source inverted, because Divide(Cb,Cs) is exactly
    // ColorDodge(Cb, 1-Cs). So cb === 0 is tested FIRST (black backdrop stays black, 0/0 resolves
    // to 0 rather than NaN), then cs === 0 blows out to white. That ordering is the only
    // self-consistency we can actually verify — it guarantees Divide and our native color-dodge
    // agree pixel for pixel. Photoshop appears to return white even over black; GIMP's legacy
    // divide is base*256/(blend+1). Both differ from this only on pure black.
    // Blowout is aggressive: any cs < cb clamps straight to 1.
    // The tempting native fast path (draw the source inverted, then gCO 'color-dodge') is only
    // valid over an OPAQUE backdrop — MEASURED, not assumed. The identity holds for B, but the
    // W3C (1-ab)*as*Cs term feeds on the RAW source colour, so handing canvas an inverted source
    // silently changes that term wherever ab < 1: a sweep against this loop came out a mean 41-83
    // code values apart at ab = 192/128, and exact at ab = 255. Don't ship it as a general path.
    'divide': function (bd, sd, W, H) {
      const n = Math.min(W * H * 4, bd.length, sd.length);
      for (let i = 0; i < n; i += 4) {
        const sa = sd[i + 3];
        if (sa === 0) continue;   // matters more here than anywhere else: B(Cb,0) is WHITE, so a
        const ba = bd[i + 3];     // transparent source would flash white if the alpha maths slipped
        if (ba === 0) { bd[i] = sd[i]; bd[i + 1] = sd[i + 1]; bd[i + 2] = sd[i + 2]; bd[i + 3] = sa; continue; }
        const as = sa * INV255, ab = ba * INV255;
        const k2 = as * ab, k1 = as - k2, k3 = ab - k2, ao = as + k3, f = 255 / ao;
        let cb = bd[i] * INV255, cs = sd[i] * INV255;
        let b = cb === 0 ? 0 : (cs === 0 ? 1 : Math.min(1, cb / cs));
        bd[i] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 1] * INV255; cs = sd[i + 1] * INV255;
        b = cb === 0 ? 0 : (cs === 0 ? 1 : Math.min(1, cb / cs));
        bd[i + 1] = (k1 * cs + k2 * b + k3 * cb) * f;
        cb = bd[i + 2] * INV255; cs = sd[i + 2] * INV255;
        b = cb === 0 ? 0 : (cs === 0 ? 1 : Math.min(1, cb / cs));
        bd[i + 2] = (k1 * cs + k2 * b + k3 * cb) * f;
        bd[i + 3] = ao * 255;
      }
    },

  });

})(window.FM);

/* IMPLEMENTED HERE (canvas has no globalCompositeOperation for these — per-pixel only):
 *   darken family    : linear-burn, darker-color*
 *   lighten family   : lighter-color*
 *   contrast family  : soft-overlay, vivid-light, linear-light, pin-light
 *   difference family: subtract, divide
 *   (* = non-separable: one comparison decides the whole pixel, all three channels come from the
 *      winner. Never implement these channel-wise — that is just Darken / Lighten.)
 *
 * NATIVE — stay on globalCompositeOperation in js/compositor.js, do NOT reimplement:
 *   normal (source-over), add ('lighter'), screen, multiply, overlay, darken, lighten,
 *   color-dodge, color-burn, hard-light, soft-light, difference, exclusion,
 *   hue, saturation, color, luminosity, mask-include (destination-in), mask-exclude (destination-out).
 *
 * The native ops run on the GPU and never need a getImageData round trip, so anything that CAN be
 * native must stay native. This file is the exception list, not an alternative implementation.
 */
