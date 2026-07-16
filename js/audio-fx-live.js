/* FreeMotion — Live preview routing for audio effects.
 * A forward clip's <video> element audio can't be filtered while it plays itself, so a layer that has
 * audio effects gets its element pulled into Web Audio: el -> MediaElementSource -> chain -> speakers.
 * el.volume / el.muted stay upstream of the source node, so app.js's volume/fade/solo/mute reconcile
 * keeps working untouched. A layer with no audio effects is never routed at all — it keeps today's
 * exact native path.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // Structure = what forces a rebuild (order, types, enabled). Param values do not; they ride applyAt.
  function signature(layer) {
    const fx = (layer && layer.audioFx) || [];
    let s = '';
    for (let i = 0; i < fx.length; i++) {
      const f = fx[i]; if (!f) continue;
      s += f.type + (f.enabled === false ? '0' : '1') + '|';
    }
    return s;
  }

  // The element's source node is created ONCE per element, ever: a second call throws, and once it
  // exists the element's audio flows ONLY through Web Audio — so a dangling source = a permanently
  // silent clip. Cached on the media rec (underscore = never serialized), which is replaced together
  // with the element when media is swapped, so a new element naturally gets a new source.
  function sourceFor(m) {
    if (m._mes) return m._mes;
    try { m._mes = FM.audioCtx().createMediaElementSource(m.el); } catch (e) { m._mes = null; }
    return m._mes;
  }

  // Every exit path from a routed element ends here or at a chain — m._mes is never left unconnected.
  function passthrough(m) {
    if (!m._mes) return;
    try { m._mes.disconnect(); } catch (e) {}
    if (m._afxChain) { try { m._afxChain.dispose(); } catch (e) {} m._afxChain = null; }
    try { m._mes.connect(FM.audioCtx().destination); } catch (e) {}
    m._afxSig = '';
  }

  FM.audioFxLive = {
    sync(layer) {
      if (!layer || layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (!m || !m.el) return;
      const has = FM.layerHasAudioFx && FM.layerHasAudioFx(layer);
      if (!has) {
        if (m._mes) passthrough(m);   // was routed; can't un-route an element, so hand it straight through
        return;                       // never routed and nothing to route: touch nothing, build no context
      }
      // A reversed clip's element is muted — its audio is synthesized in audio-play.js, which builds its
      // own chain. Don't reroute an element that has no signal; if it flips forward, sync routes it then.
      if (layer.reversed && !m._mes) return;
      const ctx = FM.audioCtx();
      const mes = sourceFor(m);
      if (!mes) return;
      const sig = signature(layer);
      if (m._afxChain && m._afxSig === sig) return;
      try { mes.disconnect(); } catch (e) {}
      if (m._afxChain) { try { m._afxChain.dispose(); } catch (e) {} m._afxChain = null; }
      const chain = FM.buildAudioFxChain(ctx, layer);
      if (!chain) { try { mes.connect(ctx.destination); } catch (e) {} m._afxSig = ''; return; }
      mes.connect(chain.input);
      chain.output.connect(ctx.destination);
      m._afxChain = chain;
      m._afxSig = sig;
      chain.applyAt(FM.time || 0);
    },

    syncAll() {
      const layers = (FM.scene && FM.scene.layers) || [];
      for (let i = 0; i < layers.length; i++) if (layers[i].type === 'video') this.sync(layers[i]);
    },

    // Runs every rAF frame: only layers that actually built a chain cost anything.
    applyAt(sceneTime) {
      const layers = (FM.scene && FM.scene.layers) || [];
      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        if (l.type !== 'video') continue;
        const m = FM.media.get(l.id);
        if (m && m._afxChain) m._afxChain.applyAt(sceneTime);
      }
      // Reversed clips own their chains inside audio-play.js; animate them from the same tick.
      if (FM.audioPlay && FM.audioPlay.applyAt) FM.audioPlay.applyAt(sceneTime);
    },

    // Delete keeps the media rec alive for undo, so drop the chain but leave the element handed
    // through — restoring the layer must not come back silent.
    release(layerId) {
      const m = FM.media.get(layerId);
      if (m && m._mes) passthrough(m);
      else if (m) m._afxSig = '';
    },

    // FM.audioCtx() CREATES the context, so only reach for it when this project actually needs one —
    // a project with no effects and no reversed audio must not spend one of iOS's ~4 live contexts just
    // by pressing play. audioPlay.start() holds the same line for reversed clips; both must, or neither does.
    resume() {
      const layers = (FM.scene && FM.scene.layers) || [];
      let need = false;
      for (let i = 0; i < layers.length && !need; i++) {
        const l = layers[i];
        if (l.type !== 'video') continue;
        const m = FM.media.get(l.id);
        if ((m && m._mes) || (FM.layerHasAudioFx && FM.layerHasAudioFx(l))) need = true;
      }
      if (!need) return;
      try { FM.audioCtx(); } catch (e) {}   // creates if absent, resume()s if suspended
    },
  };
})(window.FM);
