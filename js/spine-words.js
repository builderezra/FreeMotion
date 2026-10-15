/* FreeMotion — every word the Simple editor shows, in one object (Simple mode, DESIGN.md §8.9).
 *
 * One table, read by every renderer, so "one name everywhere" (his #454 / #967 rule) is a property of the code and not of
 * remembering. The command names in DESIGN.md §3.6 / §14 are code names and never appear here. The editor names are D1
 * (recommended A: Simple / Full); change them HERE and nowhere else.
 * Plain script, no build: loaded before js/spine.js, which reads it lazily (FM.spineWords) so the order is not load-bearing.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  /* SU1 (first-user audit, unconfirmed: an MP4 that would not load said only "Nothing could be added"): a file Simple could not add, by its
     name and why. `f` is one of S.readPicked's `failed` ({ name, why }, js/spine-edit.js); `low` starts it lower-case, after a " · ". Several:
     the count, then the first. */
  function cantAddOne(f, low) {
    const n = (f && f.name) || 'that file', w = f && f.why;
    const s = w === 'type' ? n + ' isn’t a video, photo or sound file'
      : w === 'read' ? 'Couldn’t read ' + n + ' (it never said how long it is)'
      : 'This browser can’t ' + (w === 'picture' ? 'open ' : 'play ') + n + ' (its ' + (w === 'picture' ? 'picture' : w === 'sound' ? 'sound' : 'video') + ' format isn’t supported here)';
    return low && w !== 'type' ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  }
  function cantAddAll(list, low) {
    list = list || [];
    return list.length > 1 ? list.length + ' files couldn’t be added · ' + cantAddOne(list[0], true) : cantAddOne(list[0], low);
  }
  FM.spineWords = {
    editor: {   // the ⚙ cog's third block (DESIGN.md §6; 1 Oct: no ⇄ in any play bar, no ⋯ item, no back button)
      simple: 'Simple', full: 'Full', title: 'Editor',
      toSimple: 'Switch to Simple editor', toFull: 'Switch to Full editor',   // the switch names its ACTION (§8.10 item 1)
      liveSimple: 'Simple editor', liveFull: 'Full editor',                   // the polite live region after a switch
      what: 'What should you use?', youreIn: 'You’re in ', here: 'You’re here',
      simpleText: 'Clips one after another, with text, captions and music. Gaps close up by themselves. Best for a quick video, or if you’ve never edited.',
      fullText: 'Everything FreeMotion does: layers anywhere, keyframes, masks, 3D and every effect. For animation, and anything Simple can’t do.',
      note: 'Same project in both. Nothing is converted, and you can switch back any time.',
      firstSimple: 'Simple editor. Switch back any time from the ⚙ cog.',     // Simple only; arriving in Full shows nothing (§0.4 V4)
      refuse: { export: 'Wait for the export to finish', recording: 'Close the recorder first', busy: 'One moment…', drag: '', unsettled: 'Finish or close the open tool first' },
      warn: {   // DESIGN §6.4: a switch that would lose un-undoable work asks first
        title: 'Switch to ',
        crop: 'Your crop isn’t applied yet. Switching closes the crop tool, and Undo can’t bring the box back.',
        touchup: 'Your touch-up isn’t applied yet. Switching closes it, and Undo can’t bring the box back.',
        pen: 'Your drawing isn’t finished. Switching closes the pen, and Undo can’t bring the points back.',
        penShort: function (n) { return 'Your drawing has only ' + (n === 1 ? '1 point' : n + ' points') + ', so it can’t be kept. Switching throws it away.'; },
        redo: function (n) { return 'Switching saves what you just did as a step, so Redo can’t bring back the ' + (n === 1 ? 'step' : n + ' steps') + ' you undid.'; },
        ok: { crop: 'Apply crop and switch', touchup: 'Apply touch-up and switch', pen: 'Finish drawing and switch', redo: 'Switch anyway' },
        okAnyway: 'Switch anyway', okSeveral: 'Apply them and switch', stay: 'Stay'
      }
    },
    settings: {   // only under D22 B (a Settings row gating the cog block)
      label: 'Simple editor',
      hint: 'See any project as clips — an early look.'   // NOT 'still being tested': #967's rule keeps that phrase on Work with friends alone (test 967 B4 1). Phase 2: 'Edit clip after clip — an early look.'
    },
    sections: {
      captions: 'Captions', text: 'Text', overlay: 'Overlay', effect: 'Effects', behind: 'Behind',
      main: 'Clip row', audio: 'Sound'
    },
    lines: {   // Phase 2 (BUILD-PLAN-PHASE2.md): the Phase 1 "comes next" lines are gone with the commands they stood in for
      openFull: 'Open in Full', undo: 'Undo', doAnyway: 'Do it anyway', someone: 'Someone else',
      deleted: 'Deleted clip',
      deletedWith: n => 'Deleted clip and ' + n + (n === 1 ? ' thing on it' : ' things on it'),
      keptRunsOn: n => 'kept ' + n + (n === 1 ? ' item that runs on' : ' items that run on') + ', trimmed to match',
      fadeWent: 'the fade went with it',
      trimmed: name => 'Trimmed ' + name, split: 'Split', duplicated: 'Duplicated clip',
      gapClosed: 'Gap closed', overlapFixed: 'Overlap fixed',
      keepsLength: name => name + ' keeps the length you gave it',
      wait: 'One moment — still finishing the last edit.',
      skipped: 'Undo skipped — something else changed first',
      lockedClip: 'That clip is locked', lockedMusic: 'The music is locked', lockedSound: 'That sound is locked',
      lockedText: 'That text is locked', lockedBlock: 'That block is locked',
      lockedClips: n => n + ' clips are locked', lockedItems: n => n + ' items are locked',
      liveOwner1: name => name + ' can edit · clips stay put', liveOwnerN: n => n + ' others edit · clips stay put',
      liveGuest: 'Clips stay put while you both edit',
      undid: 'Undid', adoptStays: 'the main track stays as set up',
      undidExcept: who => 'Undid, except what ' + who + ' changed', undidExceptSome: 'Undid, except what someone else changed', closeGaps: 'Close gaps',
      undidTitle: (label, who) => 'Undid' + (label ? ': ' + label : '') + ' · part left alone' + (who ? ' — ' + who + ' changed it since' : ' — changed since'),
      awayOwner1: name => name + ' is offline · clips stay put', awayOwnerN: n => n + ' others offline · clips stay put',
      arrangeAnyway: 'Arrange anyway', optionsMore: 'Options ›',
      makeViewer: name => name ? 'Make ' + name + ' a Viewer' : 'Make it a Viewer', whoCanEdit: 'Who can edit ›',
      makeMine: 'Make it my own', makeMineShort: 'Mine',
      madeViewer: name => name + ' is a Viewer now · clips can move',
      waivedSaid: 'Clips can move · what they changed offline may land in the wrong place',
      offlineOwner: 'You’re offline · text, captions and looks still work', offlineCopy: 'Offline · text and looks still work',
      view: 'View only', comment: 'You can comment here', outbox: 'Too many offline changes',
      waiting: 'Waiting for clips to arrive',
      busy: (name, item) => name + ' is editing ' + (item || 'that clip') + ' · try again soon',
      attached: (a, b) => a + ' is attached to ' + b,
      slip: via => '1 ' + ({ parent: 'parent', follow: 'follow', matte: 'matte', twin: 'sound', audio: 'sound drive', camera: 'camera move' }[via] || 'link') + ' will slip',
      slipWhy: via => 'This puts 1 ' + ({ parent: 'parent link', follow: 'Follow', matte: 'matte', twin: 'sound link', audio: 'Audio Drive', camera: 'camera move' }[via] || 'link') + ' out of step with its clip.',
      whyMore: 'Why? ›',
      keepOnMusic: 'Keep on the music', movedTexts: n => 'Moved ' + n + (n === 1 ? ' text' : ' texts') + ' with their clips', moved0: 'Done',
      crossfadeRemoved: 'removed 1 crossfade',
      cuesShort: n => 'and ' + n + (n === 1 ? ' caption' : ' captions') + ' too short to keep',
      cameraMoves: 'and the camera moves', loopCleared: 'loop cleared',
      ridersNext: 'Captions here move with clips in the next update',
      cameraNext: 'The camera move here comes along in the next update',
      sorted: n => 'Sorted ' + n + ' clips by date taken', inOrder: 'Already in date order', sortByDate: 'Sort by date taken',
      rideVolOn: 'Volume changes now move with the clips', rideVolOff: 'Volume changes stay where they are', rideVol: 'Follow clips', rideVolTitle: 'Keep volume changes with the clips',
      cameraRest: 'Open in Full to move this with its camera',
      cutKeysNext: name => name + ' has moves · trims around it come next',
      fadeOwned: (a, b) => a + ' and ' + b + ' fade into each other',
      cutShort: name => name + ' would be too short',
      splitBlock: 'Open in Full to split this', trimBlock: 'Open in Full to trim this', liftBlock: 'Open in Full to lift this off', slotIntoRow: 'Open in Full to put this card in the clip row', splitOff: 'Move the playhead onto the clip to split',
      splitEdge: 'Too close to the edge of the clip. Trim instead?', splitFade: 'Move the playhead out of the crossfade to split it',
      trimEdge: 'Too close to the edge of the clip',
      nothingMore: 'Nothing more to trim', videoStart: 'That’s the start of the video', shortSource: 'Not enough footage',
      fadesNext: 'That clip fades into the next one', fadesBefore: 'That clip fades into the one before',
      alreadyShort: 'This clip is already as short as it can go',
      noClipHere: 'No clip at the playhead', gone: 'That clip was just deleted', noSeam: 'Nothing to close here',
      deleteOne: 'Delete one clip at a time', failed: 'That didn’t work, so nothing changed',
      added1: 'Added clip', addedN: n => 'Added ' + n + ' clips', nothingAdded: 'Nothing could be added',
      cantAdd: list => cantAddAll(list, false), cantAddAlso: list => cantAddAll(list, true),   // SU1: the refusal, and the tail of a line that added the rest
      moved: (name, i, n) => name + ' moved to ' + i + ' of ' + n, noMove: 'That clip is already there',
      itemMoved: (name, t) => name + ' now starts at ' + (t < 60 ? t.toFixed(1) + ' s' : Math.floor(t / 60) + ':' + String(Math.round(t % 60)).padStart(2, '0')),
      atStart: 'That’s the first clip', atEnd: 'That’s the last clip',
      lifted: 'Lifted off the clip row', intoRow: 'Put in the clip row', cannotMain: 'That can’t go in the clip row',
      stays: 'Stays put', follows: 'Follows its clip', forward: 'Moved forward', backward: 'Moved back',
      atTop: 'Already in front', atBottom: 'Already as far back as it goes',
      insertFade: (a, b) => 'Clips ' + a + ' and ' + b + ' fade into each other · pick another cut',
      sortFade: 'Some clips fade into each other · move them by hand',
      gapsClosed: n => 'Closed ' + n + (n === 1 ? ' gap' : ' gaps'), noGaps: 'No gaps to close',
      fitted: n => n === 1 ? 'Now ends with the video' : n + ' things now end with the video', nothingToFit: 'Nothing to fit',
      textAdded: 'Text added', overlayAdded: 'Overlay added', musicAdded: 'Music added · it stays where it is',
      blackBand: (s, n) => 'Black ' + s.toFixed(1) + 's' + (n > 1 ? ' · ' + n + ' things run past' : ''),
      runsPast: (name, s) => name + ' runs ' + s.toFixed(1) + ' s past the end',
      songRuns: (name, s) => name + ' runs ' + s.toFixed(1) + ' s past the last clip',
      morePast: n => n + ' things run past the end', endWith: 'End with the video', keptEnd: 'kept as an end card',
      newer: 'Made with a newer FreeMotion. Update to edit clips here',
      pro: 'Has moves and effects',
      moreInFull: 'More in Full ›',
      noFootage: 'No footage',
      /* release 2.3: speed, sound, replacing */
      sped: (name, sp) => name + ' now plays at ' + sp + '×',
      speedShort: 'Too short to speed up that much', speedRamp: 'This clip’s speed changes over time · Use one speed first',
      speedBlock: 'Open in Full to change this speed', replaceBlock: 'Open in Full to replace this',
      nothingChanged: 'Nothing changed', oneSpeed: 'One speed now, the same length',
      volumeSet: pct => 'Volume ' + pct + '%', fadeSet: (which, s) => 'Fade ' + which + ' ' + s.toFixed(1) + ' s',
      noReverse: 'Only a video can play backwards', reversed: 'Playing backwards', forwards: 'Playing forwards',
      reverseSlow: 'Couldn’t prepare the reversed clip, it will play slowly',
      soundTaken: 'Sound taken out · it sits on the clip as its own track', alreadyOut: 'Its sound is already out · Put sound back first',
      noSound: 'This clip has no sound to take out', noTwin: 'No sound was taken out of this clip', soundBack: 'Sound back in the clip',
      clipsMuted: 'Clip sound is off', clipsHeard: 'Clip sound is back on',
      replaced: name => name + ' replaced',
      /* Phase 3 · Look (queue 980, DESIGN §8.5): a filter and Adjust for one clip; said in #sm-live (§3.12 1a: no button, the tray stays) */
      lookSet: (name, clip) => name + ' on ' + clip, lookOff: clip => 'No filter on ' + clip,
      lookStrengthSet: pct => 'Strength ' + pct + '%', adjustSet: (what, v) => what + ' ' + (v > 0 ? '+' : '') + v,
      adjustReset: 'Adjust is back to zero', lookUnsuited: 'That filter doesn’t work on this clip',
      /* Phase 3 · Captions (queue 980, DESIGN §8.5, §3.5, §12.3; §8.7 the honest label: it finds WHEN people speak, he types the words) */
      captionAdded: 'Caption added · type its words', captionRemoved: 'Caption removed',
      capStays: 'The captions stay with the sound now', capFollows: 'The captions follow the clips again',
      speechFound: (n, from) => n + (n === 1 ? ' caption' : ' captions') + ' from ' + from + ' · type their words',
      speechStays: (n, from) => n + (n === 1 ? ' caption' : ' captions') + ' from ' + from + ' · they stay with it',
      noSpeech: from => 'No speech found in ' + from, noSpeechMusic: from => 'No talking in ' + from + ' · it sounds like music',
      noSoundHere: 'Nothing here has sound to listen to', speechFailed: from => 'Couldn’t listen to ' + from + ' · its sound didn’t open',
      listening: (pct, k, n) => 'Listening' + (n > 1 ? ' to ' + k + ' of ' + n : '') + '… ' + pct + '%', listeningBusy: 'Still listening…',
      theClips: 'the clips', speechMoved: 'The sound moved while it listened · try again', speechNotHere: 'No speech inside these captions',
      /* Phase 3 · Effect segments (queue 980, DESIGN §8.5c, §4.3): said in #sm-live; the refusals in #sm-say. Strength says lookStrengthSet's words */
      effectAdded: (name, clip) => name + ' over ' + clip, effectChanged: name => 'Changed to ' + name, effectDeleted: 'Deleted the effect',
      effectGone: 'That effect was just deleted', segmentNoClip: 'Add a clip first, then an effect over it',
      segmentOnClip: 'This one goes on a clip — tap a clip first', effectMany: 'This holds several effects · More opens them',
      /* Phase 3 · Effects on an item (queue 980, DESIGN §8.5c item 3 "Added Shake to Clip 2"; §4.3 / Q5 the hint on a segment's timeline item) */
      itemFxAdded: (name, item) => 'Added ' + name + ' to ' + item, itemFxGone: 'That was just deleted',
      itemFxUnsuited: 'That effect doesn’t work on this', segmentOver: 'runs over the next clip',
      /* Phase 3 · Clips › Extras (queue 980, DESIGN §8.5 the Clips row, §12.2, D21 A). A name is his own words, put in as text */
      shapeAdded: 'Shape added',
      elementAdded: name => (name ? '“' + name + '”' : 'The element') + ' added',
      templateAdded: (name, n) => (name ? '“' + name + '”' : 'The template') + ' added' + (n ? ' · ' + n + (n === 1 ? ' clip' : ' clips') + ' in the row' : ''),
      packCamera: 'its camera move was left out (Open in Full to use it)',
      packMissing: 'That one’s data is missing · save it again from a project', packEmpty: 'There’s nothing in that one to add',
      shapeGone: 'That shape isn’t available',
      /* a layer of an element or template that moves with the rest of it (§8.5 Block row: "Moves with ‘Hello’") */
      movesWith: name => 'Moves with ' + name
    },
    tools: {   // Phase 2 (D10): the tray row and the project tools; one name each, never "Edit" (§8.4)
      clips: 'Clips', text: 'Text', sound: 'Sound', overlay: 'Overlay',
      length: 'Length', earlier: 'Move earlier', later: 'Move later', lift: 'Lift off', liftTitle: 'Lift off the clip row (make it an overlay)',
      into: 'Into row', intoTitle: 'Put in the clip row', duplicate: 'Duplicate', crop: 'Crop', more: 'More', moreTitle: 'More settings for this',
      delete: 'Delete', stay: 'Stay put', editWords: 'Edit words', forward: 'Forward', backward: 'Back', openFull: 'Open in Full',
      closeGap: 'Close gap', fix: 'Fix', done: 'Done', lenEnd: 'End', lenStart: 'Start', shorter: 'One frame shorter', longer: 'One frame longer', minusFrame: '−1 frame', plusFrame: '+1 frame',
      lengthLabel: 'Length in seconds', addWhere: 'Add clips', atEnd: 'At the end', afterClip: 'After ', afterCard: 'After the card', beforeFirst: 'Before Clip 1',
      exportAt: p => p + 'p · Export', exportTitle: 'Export video',   // 2.7 (SU1 #20): Simple's Export list
      music: 'Music from your files', sfx: 'Sound effects', voice: 'Record voice', closeAll: 'Close all gaps', moreOpts: 'Loop and preview speed…',
      selected: n => n + ' selected', bandHint: 'Tap a clip to see its tools', bandHintSel: 'Its tools are below · More opens the rest',
      bandHintSelPc: 'Its tools are below',   // PC (his pick B): every tool is on show there, More with them
      /* 2.7 (SU1 #13): the first-run hint in the tray row (§7.3 step 4, §8.9): one verb for ✂ everywhere, split, never "cut" */
      firstHint: 'Tap a clip to change its speed or look · ✂ splits it at the line',
      firstHintPc: 'Click a clip to change its speed or look · ✂ or S splits it at the line',
      /* release 2.3 */
      audio: 'Audio', audioTitle: 'Speed, volume, reverse and the clip’s sound', speed: 'Speed', volume: 'Volume', replace: 'Replace', reverse: 'Reverse', forwards: 'Play forwards', takeSound: 'Take sound out', putSound: 'Put sound back',
      fade: 'Fade', fadeIn: 'In', fadeOut: 'Out', useOneSpeed: 'Use one speed', speedRamped: 'Speed changes over the clip',
      speedLabel: 'Speed', volumeLabel: 'Volume in percent', muteClips: 'Clip sound', muteOn: 'Mute clip sound', muteOff: 'Clip sound is off, tap to turn it on',
      /* Phase 3 · Look (queue 980, DESIGN §8.5, §8.7): the tray's Look and its panel, Filters and Adjust */
      look: 'Look', lookTitle: 'Filters and Adjust for this clip', lookFilters: 'Filters', lookAdjust: 'Adjust', lookNone: 'None',
      lookStrength: 'Strength', lookReset: 'Reset',
      adjBright: 'Brightness', adjContrast: 'Contrast', adjSat: 'Saturation', adjExposure: 'Exposure', adjWarmth: 'Warmth', adjVignette: 'Vignette',
      /* §8.5's line under a keyed numeric row; its Open in Full is the button beside it (openFull) */
      lookKeyed: 'This changes over time. Your change applies to the whole clip',
      /* Phase 3 · Captions (queue 980, DESIGN §8.5 the Captions tool and the caption-track tray, §8.9 the caption-track switch) */
      captions: 'Captions', captionsTitle: 'Type captions, find speech, pick a style', typeCaptions: 'Type captions',
      findSpeech: 'Find speech', findSpeechTitle: 'Finds when people talk · you type the words',
      editLines: 'Edit lines', editLinesTitle: 'Every caption line, to type or remove', capStyle: 'Style', capStyleTitle: 'How every caption looks',
      capFollow: 'Follows the clips', capFollowTitle: 'The captions move with the clips',
      capStay: 'Stays with the sound', capStayTitle: 'The captions stay with the sound they were timed from',
      capAddLine: 'Add a line here', capEmpty: 'Empty · tap to type', capRemove: 'Remove this line', capNone: 'No lines yet',
      /* Phase 3 · Effect segments (queue 980, DESIGN §8.5: the project row's Effects, the Effect segment tray "Change effect · Strength ·
         Stay put · 🗑"; §8.5c): the picker in the tray row and the segment's own tools */
      effects: 'Effects', effectsTitle: 'An effect over the clip at the line', change: 'Change effect', strength: 'Strength', strengthLabel: 'Strength in percent',
      /* Phase 3 · Effects on an item (queue 980, DESIGN §8.5c item 3): the tray's own face, not "Effects" — the project row's Effects is on
         screen at the same time (his #310: one face per control on screen) */
      addEffect: 'Add effect', addEffectTitle: 'Add effect to the selected item',
      /* Phase 3 · Clips › Extras (queue 980, DESIGN §8.5 "Clips: Add clips · … · Extras", D21 A): Clips opens a short list; Extras shows
         his saved elements, the shapes and his templates (the Add menu's own tabs) */
      clipsTitle: 'Add clips, or shapes, elements and templates', addClips: 'Add clips', extras: 'Extras', extrasTitle: 'Shapes, saved elements and templates',
      extrasNoElements: 'No elements yet', extrasElement: 'Element',
      extrasElementsHow: 'An element is a piece you build once and drop into any video — a title, a logo, a lower third. To make one, open Full, select its layers and choose ⋯ › Save selection as element.'
    },
    a11y: {
      timeline: 'Timeline',
      split: 'Split at the line',
      add: 'Add clips to the end',
      clip: function (i, n, len, follow, own) {   // `own`: a split piece's name (2.7: "Clip 2b"), said first, then its place
        return (own ? own + ', ' + i : 'Clip ' + i) + ' of ' + n + ', ' + len.toFixed(1) + ' s' + (follow ? ', ' + follow + (follow === 1 ? ' thing follows it' : ' things follow it') : '');
      },
      gap: function (s) { return s.toFixed(1) + ' second gap, Close gap'; },
      overlap: function (s) { return 'Overlap ' + s.toFixed(1) + ' s, Fix'; }
    },
    items: {   // FM.spine.itemWord: never layer.name (§8.9 "Naming items in lines")
      clip: 'Clip', sticker: 'the sticker', image: 'the image', videoTop: 'the video on top', song: 'the song',
      sound: 'the sound', effect: 'the effect', captions: 'the captions', block: 'the group', shape: 'the shape', text: 'the text'
    },
    /* 2.7 (SU1 #14): Simple's time pill, "0:03 / 0:12": the whole seconds already played over the length, rounded as the summary is */
    clock: function (t, total) {
      const ms = s => Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
      return ms(Math.max(0, Math.floor((+t || 0) + 1e-6))) + ' / ' + ms(Math.max(0, Math.round(+total || 0)));
    },
    summary: function (clips, secs) {   // the total is rounded FIRST, then split: 59.6 s is 1:00, never 0:60 (review finding 31)
      const t = Math.max(0, Math.round(+secs || 0)), m = Math.floor(t / 60), s = t % 60;
      return clips + (clips === 1 ? ' clip' : ' clips') + ' · ' + m + ':' + (s < 10 ? '0' : '') + s;
    }
  };
})(window.FM);
