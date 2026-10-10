// FZ2 side finding, as a throwaway test body (drop into tests.js beside the FZ1 tests to reproduce): a starting document whose comment list holds two comments with one id.
// Measured: host ends ['cdup','cnew','cdup'], the guest ['cnew','cdup','cdup'] and nothing more is sent, so the two lists stay in different orders until a hash heals them.
const C = need921('dup comments'); const P = C.path; let clock = 0;
const start = kitchen921(77); start.project.comments = [{ id: 'cdup', by: { mid: 'o', name: 'o', color: '#fff' }, at: 1, text: 'a', replies: [] }, { id: 'cdup', by: { mid: 'o', name: 'o', color: '#fff' }, at: 2, text: 'b', replies: [] }];
FM.storage._sanitizeLayers(start.layers); P.stampIds(start);
const host = C.Host({ base: jclone921(start), invariants: invariants921(), epoch: 'e1', now: function () { return clock; }, live: function () {} });
host.join('g1', { role: 'editor', name: 'g1', color: '#ff8800' });
const g = guest921('g1', jclone921(start), host);
g.live.project.comments.push({ id: 'cnew', by: { mid: 'g1', name: 'g1', color: '#fff' }, at: 3, text: 'n', replies: [] });
for (let k = 0; k < 8; k++) { clock += 500; const tx = g.step(); if (!tx) continue; const r = host.receive('g1', tx); if (r.ack) g.onAck(r.ack); }
return { host: host.base.project.comments.map(function (c) { return c.id; }), guest: g.live.project.comments.map(function (c) { return c.id; }) };
