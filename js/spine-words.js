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
      captionsAdded: 'Captions added · type the first line', noSpeechSource: 'There is no sound to listen to yet', speechSilent: 'None of these clips has any sound to listen to',
      speechFound: n => n + (n === 1 ? ' caption found' : ' captions found') + ' · tap one to type', speechNone: 'No speech found',
      lookSet: (name, n) => name + ' on all ' + n + (n === 1 ? ' clip' : ' clips'), lookNone: 'No look on the clips', lookNoClips: 'Add a clip first, then give them all a look',
      animSet: 'Animation set · it plays when the text appears', animNone: 'No animation',
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
      replaced: name => name + ' replaced'
    },
    tools: {   // Phase 2 (D10): the tray row and the project tools; one name each, never "Edit" (§8.4)
      animate: 'Animate', anim: { none: 'None', fade: 'Fade in', 'fade-up': 'Fade up', typewriter: 'Typewriter', pop: 'Pop', slide: 'Slide in', drop: 'Drop in', spin: 'Spin in', 'zoom-out': 'Zoom in', stretch: 'Stretch', wave: 'Wave', jitter: 'Jitter' },
      clips: 'Clips', text: 'Text', captions: 'Captions', sound: 'Sound', overlay: 'Overlay', lookAll: 'Look for all', editLines: 'Edit lines', findSpeech: 'Find speech', style: 'Style', capStay: 'Stays with the sound',
      length: 'Length', earlier: 'Move earlier', later: 'Move later', lift: 'Lift off', liftTitle: 'Lift off the clip row (make it an overlay)',
      into: 'Into row', intoTitle: 'Put in the clip row', duplicate: 'Duplicate', crop: 'Crop', more: 'More', moreTitle: 'More settings for this',
      delete: 'Delete', stay: 'Stay put', editWords: 'Edit words', forward: 'Forward', backward: 'Back', openFull: 'Open in Full',
      closeGap: 'Close gap', fix: 'Fix', done: 'Done', lenEnd: 'End', lenStart: 'Start', shorter: 'One frame shorter', longer: 'One frame longer', minusFrame: '−1 frame', plusFrame: '+1 frame',
      lengthLabel: 'Length in seconds', addWhere: 'Add clips', atEnd: 'At the end', afterClip: 'After ', afterCard: 'After the card', beforeFirst: 'Before Clip 1',
      music: 'Music from your files', sfx: 'Sound effects', voice: 'Record voice', closeAll: 'Close all gaps', moreOpts: 'Loop and preview speed…',
      selected: n => n + ' selected', bandHint: 'Tap a clip to see its tools', bandHintSel: 'Its tools are below · More opens the rest',
      bandHintSelPc: 'Its tools are below',   // PC (his pick B): every tool is on show there, More with them
      /* release 2.3 */
      audio: 'Audio', audioTitle: 'Speed, volume, reverse and the clip’s sound', speed: 'Speed', volume: 'Volume', replace: 'Replace', reverse: 'Reverse', forwards: 'Play forwards', takeSound: 'Take sound out', putSound: 'Put sound back',
      fade: 'Fade', fadeIn: 'In', fadeOut: 'Out', useOneSpeed: 'Use one speed', speedRamped: 'Speed changes over the clip',
      speedLabel: 'Speed', volumeLabel: 'Volume in percent', muteClips: 'Clip sound', muteOn: 'Mute clip sound', muteOff: 'Clip sound is off, tap to turn it on'
    },
    a11y: {
      timeline: 'Timeline',
      split: 'Split at the line',
      add: 'Add clips to the end',
      clip: function (i, n, len, follow) {
        return 'Clip ' + i + ' of ' + n + ', ' + len.toFixed(1) + ' s' + (follow ? ', ' + follow + (follow === 1 ? ' thing follows it' : ' things follow it') : '');
      },
      gap: function (s) { return s.toFixed(1) + ' second gap, Close gap'; },
      overlap: function (s) { return 'Overlap ' + s.toFixed(1) + ' s, Fix'; }
    },
    items: {   // FM.spine.itemWord: never layer.name (§8.9 "Naming items in lines")
      clip: 'Clip', sticker: 'the sticker', image: 'the image', videoTop: 'the video on top', song: 'the song',
      sound: 'the sound', effect: 'the effect', captions: 'the captions', block: 'the group', shape: 'the shape', text: 'the text'
    },
    summary: function (clips, secs) {   // the total is rounded FIRST, then split: 59.6 s is 1:00, never 0:60 (review finding 31)
      const t = Math.max(0, Math.round(+secs || 0)), m = Math.floor(t / 60), s = t % 60;
      return clips + (clips === 1 ? ' clip' : ' clips') + ' · ' + m + ':' + (s < 10 ? '0' : '') + s;
    }
  };
})(window.FM);
