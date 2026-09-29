/* FreeMotion — EVERY OPTION, ONE AT RANDOM (queue 974).
 *
 * Ezra, 28 Sep: "Honestly for all of the different button animations - make them all happen in the app but it's just
 * random which one so I can decide which is best over use time".
 *
 * So an animation that had competing options no longer ships one of them: it asks this helper which one to play, EACH
 * TIME it plays (not once per session — he asked for "just random which one", and per play lets him compare them in
 * one sitting). Today that is two animations (REQUESTS.md #974):
 *   'emptytap.colour'  #964 — the empty project's tap colour: A Aurora · B Rings and sparks · C Key ripple
 *   'emptytap.start'   #964 — where the outline's two lights start: bottom-middle · the edge nearest the finger
 *   'clapper.timing'   #957 — the empty project's clapper: A open + every 6 s · B once · C non-stop, every 3.6 s (#988) (per empty-project open)
 *   'clapper.lines'    #957 — its impact lines: cyan · grey (per clap)
 * #947, the New project +, was the third: he picked C, the ripple, on 29 Sep, so it plays only that and no longer
 * asks here (js/home.js npEntrance); A and B are deleted.
 *
 * WHEN HE PICKS ONE, the winner becomes the only code and the losers are DELETED — not left behind a flag. Nothing here
 * is meant to outlive his decision.
 *
 * THE LOG. Every pick is appended as {name, pick, t} to localStorage 'fm.variantLog', so when he says "the one with the
 * rings" it can be confirmed which one he saw and when. It keeps the newest 50 PER NAME rather than 50 in all: the
 * clapper logs its line colour on every clap (every 3.6 s on timing C since queue 988; it was 1.6 s), and one shared ring of 50 would push the tap
 * colour he is asking about out of the log within a minute and a half. `FM.variant.log()` reads it back.
 *
 * THE SEAM. `FM.variant.force(name, pick)` makes the next plays of `name` come out as `pick` (null clears it) — the
 * suite forces each member in turn to prove every one of them really plays. It lives in memory only, so nothing a test
 * does can pin his phone to one option. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const KEY = 'fm.variantLog';
  const PER_NAME = 50;
  const forced = Object.create(null);
  function readLog() {
    try {
      const l = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(l) ? l.filter(function (e) { return e && typeof e.name === 'string'; }) : [];
    } catch (e) { return []; }
  }
  function writeLog(entry) {
    try {
      const log = readLog();
      log.push(entry);
      let same = 0;
      for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].name !== entry.name) continue;
        if (++same > PER_NAME) log.splice(i, 1);
      }
      localStorage.setItem(KEY, JSON.stringify(log));
    } catch (e) { /* private mode / full storage: the pick still plays, it just is not remembered */ }
  }
  function variant(name, list) {
    if (!list || !list.length) return undefined;
    let pick;
    if (Object.prototype.hasOwnProperty.call(forced, name) && list.indexOf(forced[name]) >= 0) pick = forced[name];
    else pick = list[Math.min(list.length - 1, Math.floor(Math.random() * list.length))];
    variant.last[name] = pick;
    writeLog({ name: String(name), pick: pick, t: Date.now() });
    return pick;
  }
  variant.last = {};
  variant.force = function (name, pick) {
    if (pick === null || pick === undefined) delete forced[name];
    else forced[name] = pick;
  };
  variant.log = readLog;
  variant.KEY = KEY;
  variant.PER_NAME = PER_NAME;
  FM.variant = variant;
})(window.FM);
