// The element card's Shape dropdown for a Rectangle, with its list held open (size=9) at the cars so the names show.
// Used for dropdown-{before,after}-{380,1280}.png (973 review). Returns the layout numbers that matter on a phone.
// shot.py wraps a file that says "return" in an async function body, hence the leading return.
return (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
  await sleep(200);
  const L = FM.makeLayer('shape', { shape: 'rect', name: 'Rectangle', x: 540, y: 960, shapeW: 400, shapeH: 300, fill: '#44aaff' });
  FM.scene.layers.push(L);
  FM.selectLayer(L.id); FM.refreshAll();
  FM.inspector.openCategory('element'); FM.inspector.refresh();
  await sleep(500);
  const lab = [...document.querySelectorAll('#inspector .prop-row label')].find(e => e.textContent.trim() === 'Shape');
  const sel = lab && lab.parentNode.querySelector('select');
  if (!sel) return 'no Shape select';
  const closedW = Math.round(sel.getBoundingClientRect().width);
  const ins = document.querySelector('#inspector');
  const over = { doc: document.documentElement.scrollWidth - innerWidth, inspector: ins ? ins.scrollWidth - ins.clientWidth : null };
  sel.size = 9;
  const idx = [...sel.options].findIndex(o => o.value === 'woman');
  await sleep(50);
  const oh = sel.options[0].getBoundingClientRect().height || 18;
  sel.scrollTop = Math.max(0, idx * oh);
  lab.parentNode.scrollIntoView({ block: 'center' });
  return { closedSelectWidth: closedW, overflow: over, viewport: innerWidth,
    names: [...sel.options].filter(o => /^(car|carfront|thumbsup|pointhand|paperplane|ribbon|pin|note)$/.test(o.value)).map(o => o.value + '=' + o.textContent) };
})()
