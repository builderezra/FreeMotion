/* FreeMotion — Home screen (AM-style project browser).
 * Full-screen overlay above the editor: all projects at a glance (thumbnail cards), plus a
 * Templates tab. Backed by FM.projects / FM.templates (storage.js). The editor stays mounted
 * underneath — opening a project just swaps the scene and hides this overlay.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let root = null, grid = null, tab = 'projects';

  function el(tag, cls, text) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }
  function ago(ts) {
    if (!ts) return '';
    const s = Math.max(1, (Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }
  function aspectLabel(w, h) {
    if (!w || !h) return '';
    const r = w / h;
    if (Math.abs(r - 9 / 16) < 0.02) return '9:16';
    if (Math.abs(r - 16 / 9) < 0.02) return '16:9';
    if (Math.abs(r - 1) < 0.02) return '1:1';
    return w + '×' + h;
  }

  function projectCard(p) {
    const card = el('button', 'hm-card');
    const th = el('div', 'hm-thumb');
    if (p.thumb) { const img = document.createElement('img'); img.src = p.thumb; img.alt = ''; th.appendChild(img); }
    else th.appendChild(el('span', 'hm-thumb-empty', '▶'));
    if (p.id === FM.projects.currentId()) th.appendChild(el('span', 'hm-open-badge', 'OPEN'));
    const name = el('div', 'hm-name', p.name || 'Untitled');
    const meta = el('div', 'hm-meta', [aspectLabel(p.width, p.height), (p.duration || 0) + 's', (p.layers != null ? p.layers + (p.layers === 1 ? ' layer' : ' layers') : null), ago(p.modified)].filter(Boolean).join(' · '));
    const more = el('button', 'hm-card-more', '⋯');
    more.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = more.getBoundingClientRect();
      FM.contextMenu.show(Math.min(r.left, window.innerWidth - 210), r.bottom + 4, [
        { label: 'Open', action: () => openProject(p.id) },
        { label: 'Rename…', action: () => { const n = prompt('Project name:', p.name); if (n && n.trim()) { FM.projects.rename(p.id, n.trim()); render(); } } },
        { label: 'Duplicate', action: async () => { await FM.projects.duplicate(p.id); render(); } },
        { label: 'Save as template…', action: async () => {
          const n = prompt('Template name:', p.name || 'My template'); if (!n || !n.trim()) return;
          const ok = await FM.templates.save(n.trim(), p.id);
          if (FM.toast) FM.toast(ok ? 'Template saved' : 'Could not save template');
        } },
        { label: 'Export project file', action: async () => { await openProject(p.id, true); FM.storage.exportFile(); } },
        { sep: true },
        { label: 'Delete…', danger: true, action: async () => {
          if (!confirm('Delete "' + (p.name || 'Untitled') + '"? This cannot be undone.')) return;
          await FM.projects.remove(p.id); render();
        } },
      ]);
    });
    card.appendChild(th); card.appendChild(name); card.appendChild(meta); card.appendChild(more);
    card.addEventListener('click', () => openProject(p.id));
    return card;
  }

  function templateCard(t) {
    const card = el('button', 'hm-card');
    const th = el('div', 'hm-thumb');
    if (t.thumb) { const img = document.createElement('img'); img.src = t.thumb; img.alt = ''; th.appendChild(img); }
    else th.appendChild(el('span', 'hm-thumb-empty', '❖'));
    card.appendChild(th);
    card.appendChild(el('div', 'hm-name', t.name || 'Template'));
    card.appendChild(el('div', 'hm-meta', [aspectLabel(t.width, t.height), (t.duration || 0) + 's'].filter(Boolean).join(' · ')));
    const more = el('button', 'hm-card-more', '⋯');
    more.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = more.getBoundingClientRect();
      FM.contextMenu.show(Math.min(r.left, window.innerWidth - 210), r.bottom + 4, [
        { label: 'New project from template', action: use },
        { sep: true },
        { label: 'Delete template…', danger: true, action: async () => { if (!confirm('Delete template "' + t.name + '"?')) return; await FM.templates.remove(t.id); render(); } },
      ]);
    });
    card.appendChild(more);
    async function use() {
      if (FM.toast) FM.toast('Creating project…');
      const ok = await FM.templates.useAsNew(t.id);
      if (ok) FM.home.close(); else if (FM.toast) FM.toast('Could not load that template');
    }
    card.addEventListener('click', use);
    return card;
  }

  async function openProject(id, keepOpen) {
    if (id !== FM.projects.currentId()) await FM.projects.open(id);
    if (!keepOpen) FM.home.close();
  }

  function render() {
    if (!grid) return;
    grid.innerHTML = '';
    root.querySelectorAll('.hm-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'projects') {
      // most recently EDITED first — the project you just worked on is always the front card
      const list = FM.projects.list().slice().sort((a, b) => (b.modified || 0) - (a.modified || 0));
      if (!list.length) grid.appendChild(el('div', 'hm-empty', 'No projects yet — tap + to create one.'));
      list.forEach(p => grid.appendChild(projectCard(p)));
    } else {
      const list = FM.templates.list();
      if (!list.length) grid.appendChild(el('div', 'hm-empty', 'No templates yet. On a project card, tap ⋯ → “Save as template…”.'));
      list.forEach(t => grid.appendChild(templateCard(t)));
    }
  }

  function newProjectDialog() {
    const dlg = document.getElementById('hm-dialog');
    dlg.classList.remove('hidden');
    const input = dlg.querySelector('#hm-new-name');
    input.value = 'Project ' + (FM.projects.list().length + 1);
    dlg.querySelectorAll('.hm-aspect').forEach((b, i) => b.classList.toggle('active', i === 0));
    setTimeout(() => { input.focus(); input.select(); }, 30);
  }

  FM.home = {
    init() {
      root = document.getElementById('home-screen');
      if (!root) return;
      grid = root.querySelector('.hm-grid');
      root.querySelectorAll('.hm-tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
      document.getElementById('hm-new').addEventListener('click', newProjectDialog);
      // top-right ⋯: file-level actions that used to live behind the editor's back arrow
      root.querySelector('.hm-more').addEventListener('click', (ev) => {
        const r = ev.currentTarget.getBoundingClientRect();
        FM.contextMenu.show(Math.min(r.left, window.innerWidth - 220), r.bottom + 4, [
          { label: 'Import project file…', action: () => { FM.storage.importFile(); setTimeout(() => FM.home.close(), 400); } },
          { label: 'Save frame (PNG)', action: () => FM.snapshotPNG() },
          { label: 'Shortcuts', action: () => { FM.home.close(); FM.shortcuts.toggle(); } },
        ]);
      });
      // new-project dialog wiring
      const dlg = document.getElementById('hm-dialog');
      dlg.querySelectorAll('.hm-aspect').forEach(b => b.addEventListener('click', () => {
        dlg.querySelectorAll('.hm-aspect').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      }));
      dlg.querySelector('#hm-create').addEventListener('click', async () => {
        const name = (dlg.querySelector('#hm-new-name').value || '').trim() || 'Untitled';
        const a = dlg.querySelector('.hm-aspect.active');
        const dims = a ? a.dataset.size.split('x') : ['1080', '1920'];
        dlg.classList.add('hidden');
        await FM.projects.create({ name: name, width: +dims[0], height: +dims[1] });
        FM.home.close();
      });
      dlg.querySelector('#hm-cancel').addEventListener('click', () => dlg.classList.add('hidden'));
    },
    open() {
      if (!root) return;
      if (FM.pause) FM.pause(); else FM.playing = false;   // silence playback under the overlay (#r4)
      if (FM.groupContext && FM.exitGroup) FM.exitGroup(true);   // home always shows the top-level project
      FM.projects.touchCurrent(true);   // fresh thumbnail for the card
      tab = 'projects';
      render();
      root.classList.remove('hidden');
      document.body.classList.add('home-open');
    },
    close() {
      if (!root) return;
      root.classList.add('hidden');
      document.getElementById('hm-dialog').classList.add('hidden');
      document.body.classList.remove('home-open');
      if (FM.requestRender) FM.requestRender();
    },
    isOpen() { return root && !root.classList.contains('hidden'); },
  };
})(window.FM);
