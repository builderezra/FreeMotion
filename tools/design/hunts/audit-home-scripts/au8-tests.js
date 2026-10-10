  /* ════════ AU8: audit of js/home.js (and the storage calls it makes). Append before `async function run()`; `?only=AU8` runs them. ════════ */
  test('AU8-1 a project name is cut to 200 characters when it is given (Rename, Duplicate; New project already is), so the card does not change under him later', { item: 'AU8', budgetMs: 60000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const orig = FM.projects.currentId(), made = [];
    const nameOf = id => (FM.projects.list().find(p => p.id === id) || {}).name;
    try {
      // CONTROL: an ordinary name is kept exactly
      const a = await FM.projects.create({ name: 'AU8 plain name', width: 320, height: 240 }); made.push(a);
      if (nameOf(a) !== 'AU8 plain name') throw new Error('CONTROL: an ordinary name came back as "' + nameOf(a) + '"');
      const long = 'n'.repeat(300);
      const b = await FM.projects.create({ name: long, width: 320, height: 240 }); made.push(b);
      if (nameOf(b).length !== 200) throw new Error('CONTROL, New project: a 300-character name is ' + nameOf(b).length + ' characters on its card');
      FM.projects.rename(a, 'r'.repeat(300));
      if (nameOf(a).length !== 200) throw new Error('Rename: a 300-character name is ' + nameOf(a).length + ' characters on its card');
      const had = new Set(FM.projects.list().map(p => p.id));
      if (!(await FM.projects.duplicate(a))) throw new Error('setup: duplicate failed');
      const d = FM.projects.list().find(p => !had.has(p.id)); made.push(d.id);
      if (d.name.length > 200) throw new Error('Duplicate: the copy of a 200-character name is ' + d.name.length + ' characters on its card');
      // …and the card and the project agree after it is opened (that is the whole point: nothing changes later)
      await FM.projects.open(a); await sleep(150);
      if (FM.scene.project.name !== nameOf(a)) throw new Error('the open project is called ' + FM.scene.project.name.length + ' characters but its card ' + nameOf(a).length);
    } finally {
      try { if (orig && FM.projects.list().some(p => p.id === orig)) await FM.projects.open(orig); } catch (e) {}
      for (const id of made) { try { await FM.projects.remove(id); } catch (e) {} }
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });
