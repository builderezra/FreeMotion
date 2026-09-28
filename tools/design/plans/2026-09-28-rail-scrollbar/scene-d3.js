// D pixel diff: three editor states, each shot without and with `body:not(.home-open){color-scheme:dark}`.
// Frames: 400/1100 filters tab · 2300/3000 text layer card grid · 4200/4900 Add menu. Diffed in python afterwards.
const RULE = 'body:not(.home-open) { color-scheme: dark; }';
await openFilters();
const at = (ms, fn) => setTimeout(() => { try { fn(); } catch (e) { console.error(e); } }, ms);
at(700, () => PROTO.style('proto-d', RULE));
at(1500, () => { PROTO.unstyle('proto-d'); const T = FM.makeLayer('text', { name: 'T', text: 'Hello', x: 100, y: 100, start: 0, duration: 5 });
  FM.scene.layers.push(T); FM.selectLayer(T.id); FM.refreshAll(); });
at(2600, () => PROTO.style('proto-d', RULE));
at(3400, () => { PROTO.unstyle('proto-d'); FM.selectLayer(null); FM.refreshAll(); });
at(4500, () => PROTO.style('proto-d', RULE));
return 'scheduled';
