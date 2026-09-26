const sleep = ms => new Promise(r => setTimeout(r, ms));
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(500);
try { const sp = document.getElementById("splash"); if (sp) sp.remove(); } catch (e) {}
FM.scene.layers.length = 0;
FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
await sleep(400);
