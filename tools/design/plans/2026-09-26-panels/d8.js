// D8: at the default band, what box did HEAD plan in, how many pages, and what is the WHOLE box below the tabs?
await leaveHome();
await setState({ mode: 'add' });
await sleep(300);
const panel = PANEL(), am = panel.querySelector('.addmenu'), body = am.querySelector('.addmenu-body');
const container = document.getElementById('inspector');
const pr = panel.getBoundingClientRect(), br = body.getBoundingClientRect();
const top = br.top - pr.top - panel.clientTop + panel.scrollTop;
const padB = parseFloat(getComputedStyle(container).paddingBottom) || 0;
const whole = { w: body.clientWidth, h: panel.clientHeight - top - padB - 2 };
// HEAD's solver, re-run on the whole box with FIT_CFG.lbl numbers (the same arithmetic as js/addmenu.js planGrid)
eval(P.tf);
const p = FM.tileFit.planRung('stack', am.querySelectorAll('.addmenu-body .addmenu-card').length, whole.w, whole.h);
return { band: ROOT.style.getPropertyValue('--tl-h') || 'css default', panel: panel.clientWidth + 'x' + panel.clientHeight, headPlan: am.dataset.amFit, pages: am.querySelectorAll('.addmenu-page').length, cards: am.querySelectorAll('.addmenu-body .addmenu-card').length, bodyTop: Math.round(top), padB, wholeBox: Math.round(whole.w) + 'x' + Math.round(whole.h), stackPlanInWholeBox: p && (p.cols + 'x' + p.rows + ' ' + p.w.toFixed(1) + 'x' + p.h.toFixed(1) + ' ico ' + p.ico.toFixed(1) + ' pages ' + p.pages) };
