await leaveHome();
if (P.css) injectCss(P.css);
const out = [];
for (const st of P.states) { await setState(st); out.push('[' + (st.tlh || st.amh || 'def') + '] ' + measureNow()); }
if (P.final) await setState(P.final);
return out.join('\n');
