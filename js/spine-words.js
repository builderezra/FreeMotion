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
  /* #1243 R release 10 (S27 A): a place in the footage as m:ss.t (Slide's readout and its line), rounded once so 9.96 s reads 0:10.0 */
  function smClock(s) {
    const t = Math.max(0, Math.round((+s || 0) * 10) / 10), m = Math.floor(t / 60), r = Math.round((t - m * 60) * 10) / 10;
    return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1);
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
      /* (firstSimple, the first arrival's toast, went with #1255's 20:53 follow-up: no explanations that show by themselves) */
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
      /* NOT 'still being tested': #967's rule keeps that phrase on Work with friends alone (test 967 B4 1). Phase 2: 'Edit clip after clip — an early look.' */
      hint: 'See any project as clips — an early look.',
      /* 2.7 (#1122, #545): Simple's own group in Settings, shown only while Simple is on screen in a project (js/settings.js) */
      group: 'Simple editor',
      trExtras: 'More transition controls',
      trExtrasHint: d => 'Length and On every cut in the Transition row, and Turn into a transition where one clip already fades into the next. Off: a new transition is ' + d + ' s.'
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
      fadeWent: 'the fade went with it', lookWent: 'the look went with it',
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
      runsPast: (name, s) => name + ' runs ' + (s < 0.05 ? 'under 0.1' : s.toFixed(1)) + ' s past the end',
      songRuns: (name, s) => name + ' runs ' + (s < 0.05 ? 'under 0.1' : s.toFixed(1)) + ' s past the last clip',
      /* #1243 S37: the line under a tap on something that runs past the end, and Cut at the end's own (Simple's export stops at the last clip) */
      cutOnExport: 'it’s cut there when you export', cutEnd: name => name + ' now ends with the video',
      endWith: 'End with the video', keptEnd: 'kept as an end card',
      newer: 'Made with a newer FreeMotion. Update to edit clips here',
      pro: 'Has moves and effects',
      moreInFull: 'More in Full ›',
      noFootage: 'No footage',
      /* release 2.3: speed, sound, replacing */
      sped: (name, sp) => name + ' now plays at ' + sp + '×',
      speedShort: 'Too short to speed up that much', speedRamp: 'This clip’s speed changes over time · Use one speed first',
      speedBlock: 'Open in Full to change this speed', replaceBlock: 'Open in Full to replace this',
      /* Phase 3 · template Replace (queue 980): Insert your Media over Simple, a slot inside a masking frame or another block (§9.1) */
      replaceInGroup: 'That clip is shorter than its place in the group',
      nothingChanged: 'Nothing changed', oneSpeed: 'One speed now, the same length',
      volumeSet: pct => 'Volume ' + pct + '%', fadeSet: (which, s) => 'Fade ' + which + ' ' + s.toFixed(1) + ' s',
      noReverse: 'Only a video can play backwards', reversed: 'Playing backwards', forwards: 'Playing forwards',
      /* #1243 R release 8: the tray's Opacity, Transform and Volume › Mute (his S33 "opacity… transform, which has like mirror, rotate") */
      opacitySet: pct => 'Opacity ' + pct + '%', sizeSet: pct => 'Size ' + pct + '%', turned: deg => 'Turned to ' + deg + '°',
      mirrored: 'Mirrored', mirrorOff: 'Not mirrored', flippedV: 'Flipped upside down', flipVOff: 'The right way up',
      centred: 'Centred', tfReset: 'Back to its first size, centred, no turn or flip',
      noTransform: 'Only a picture, a video or a text can change here',
      noCentre: 'It moves with a layer squashed flat, so it can’t be centred',   /* review R8-2: a parent with no inverse */
      mutedOne: 'Muted', unmutedOne: 'Sound on',
      /* #1243 R release 8b: the rest of S33's first wave (his "motion blur… retouch… reduce noise, audio effects, enhance voice") */
      motionBlurOn: 'Motion blur on', motionBlurOff: 'Motion blur off', smoothSkinOn: 'Smooth skin on', smoothSkinOff: 'Smooth skin off',
      clearVoiceOn: 'Clear voice on', clearVoiceOff: 'Clear voice off',
      soundStyleSet: name => name + ' on the sound', soundStyleOff: 'No sound style',
      quieterOn: 'Background noise turned down · press Quieter background again for the original', quieterOff: 'Original sound back',
      quieterBlocked: 'Remove vocals is on this sound · turn it off in Full first', quieterBusy: 'Still turning the noise down on another sound',
      quieterBusyHere: 'Still turning the noise down on this sound',
      quieterNoVoice: 'No voice found, so all of it was treated as noise · press Quieter background again if that took too much',
      quieterNoPauses: 'No clear pauses between words, so the noise was learned from the quietest moments · press Quieter background again for the original',
      noSoundFx: 'This has no sound to change', soundFxFull: 'This sound holds 16 effects already · take some off in Full first',
      reverseSlow: 'Couldn’t prepare the reversed clip, it will play slowly',
      soundTaken: 'Sound taken out · it sits on the clip as its own track', alreadyOut: 'Its sound is already out · Put sound back first',
      noSound: 'This clip has no sound to take out', noTwin: 'No sound was taken out of this clip', soundBack: 'Sound back in the clip',
      clipsMuted: 'Clip sound is off', clipsHeard: 'Clip sound is back on',
      /* #1243 S34 A: the play row's Link, one switch for the whole project */
      linksOff: 'Links off · text and sounds stay where they are', linksOn: 'Links on · things on a clip move with it',
      /* #1243 S8: Captions › Caption looks */
      captionLookSet: name => name + ' on the captions', captionGone: 'That caption track was just deleted',
      /* #1243 S17: Text › Draw */
      drawingAdded: 'Drawing added', drawingGone: 'That drawing was just deleted',
      replaced: name => name + ' replaced',
      /* #1243 R release 10 (S27 A): Slide — his "slide it along… for the clip to like start a second earlier" */
      slid: s => 'Now plays the video from ' + smClock(s), slideCaptions: 'its captions may no longer match',
      noSlide: 'Only a video can slide', slideUnknown: 'Can’t slide yet · the video is still loading',
      slideMissing: 'Can’t slide · this clip’s video isn’t on this device',   /* review R10-4/5: no footage here, and none on its way */
      slideWhole: 'Nothing to slide · this clip already shows all of its video. Make it shorter first, then slide it',
      slideEnd: 'Can’t slide further · that’s as far as the video goes',   /* review R10-6: both ends say it (a press at the START said "the end") */
      /* release 2.7: transitions (#1122, his pick A) */
      trNone: 'No transition', noTransition: 'A transition needs two clips that meet, with nothing between them',
      trSet: (type, d) => ({ crossfade: 'Crossfade', dipblack: 'Dip to black', dipwhite: 'Dip to white' }[type] || 'Transition') + ' ' + d.toFixed(1) + ' s',
      trAll: n => 'Same transition on all ' + n + ' cuts', trDropped: n => n === 1 ? 'removed a transition' : 'removed ' + n + ' transitions',
      trTurned: 'Now a crossfade transition',
      /* Phase 3 · Look (queue 980, DESIGN §8.5): a filter and Adjust for one clip; said in #sm-live (§3.12 1a: no button, the tray stays) */
      lookSet: (name, clip) => name + ' on ' + clip, lookOff: clip => 'No filter on ' + clip,
      lookStrengthSet: pct => 'Strength ' + pct + '%', adjustSet: (what, v) => what + ' ' + (v > 0 ? '+' : '') + v,
      adjustReset: 'Adjust is back to zero', lookUnsuited: 'That filter doesn’t work on this clip',
      /* #1243 S12: Look is the whole video's now (the project row's Look, one Look layer); said in #sm-live, the refusal in #sm-say */
      lookSetAll: name => name + ' over the whole video', lookOffAll: 'No filter on the video', lookNoClip: 'Add a clip first, then a look over it',
      lookUnsuitedAll: 'That filter can’t go over this video',
      clipLooksOff: n => 'Took the look off ' + n + (n === 1 ? ' clip' : ' clips'), lookFitted: 'The look covers the whole video again',
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
      effectAddedWhole: name => name + ' over the whole video',   // #1243 S10: the project row's Effects covers the whole video
      effectGone: 'That effect was just deleted', segmentNoClip: 'Add a clip first, then an effect over it',
      segmentOnClip: 'This one goes on a clip — tap a clip first', effectMany: 'This holds several effects · Open in Full to change them',   /* #1243 S4: More went */
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
      cutEnd: 'Cut at the end', cutEndTitle: 'Cut this where the video ends',   /* #1243 S37: on an item that runs past the end of the video */
      lift: 'Lift off',   /* #1243 S24, S25: Length, Move earlier and Move later left the tray (his "you just grab the end and drag it") */ liftTitle: 'Lift off the clip row (make it an overlay)',
      /* #1243 S4 (his words: "get rid of more, because that's just a lazy way of having like all the other features"): More, its spoken
         name and its PC "Done" face went; what it opened is the text's Style, a clip's Opacity and Transform (release 8) */
      into: 'Into row', intoTitle: 'Put in the clip row', duplicate: 'Duplicate', crop: 'Crop',
      delete: 'Delete', stay: 'Stay put', editWords: 'Edit words', forward: 'Forward', backward: 'Back', openFull: 'Open in Full',
      closeGap: 'Close gap', fix: 'Fix', done: 'Done', shorter: 'shorter', longer: 'longer',   // Fade's − and + (Length's frame words went with it)
      /* #1243 R release 8: the text's Style (Full's panel for it until S36), Opacity, Transform's row (R decision 5: Mirror · Flip · Turn ·
         Size · Centre · Reset — Mirror and Flip are his own S33 words, "mirror, rotate") and Volume's Mute; Speed's new length */
      style: 'Style', styleTitle: 'Font, colour, outline and the rest of how it looks',
      opacity: 'Opacity', opacityLabel: 'Opacity in percent', transform: 'Transform', transformTitle: 'Mirror, flip, turn, size and place',
      mirror: 'Mirror', mirrorTitle: 'Mirror side to side', flipV: 'Flip', flipVTitle: 'Flip upside down', turn: 'Turn', turnTitle: 'Turn a quarter clockwise',
      size: 'Size', sizeLabel: 'Size in percent', centre: 'Centre', centreTitle: 'Put it in the middle of the picture',
      reset: 'Reset', resetTitle: 'Back to its first size, centred, no turn or flip', mute: 'Mute',
      /* #1243 R release 8b: S33's look and sound doors (our own names, 1243-F S33's table: not another editor's) */
      motionBlur: 'Motion blur', motionBlurTitle: 'Blur what moves, as a camera does',
      smoothSkin: 'Smooth skin', smoothSkinTitle: 'Soften skin and small marks, keep the edges sharp',
      quieter: 'Quieter background', quieterTitle: 'Turn down the hiss, hum and room noise behind a voice',
      soundStyles: 'Sound styles', soundStylesTitle: 'Robot, deep, radio, cave and more', soundStylesNone: 'None',
      clearVoice: 'Clear voice', clearVoiceTitle: 'A cleaner voice: less rumble, more presence, even level, softer s sounds',
      newLength: s => s.toFixed(1) + ' s', transitionTitle: 'The transition at this clip’s cut',
      /* #1243 R release 10 (S27 A): Slide, its row's filmstrip and the two frame steps (his words: "slide it along") */
      slide: 'Slide', slideTitle: 'Show another part of the video, same place and length', slideLabel: 'Slide the video inside the clip',
      slideFrom: s => 'from ' + smClock(s), slidePrev: '−1 frame', slideNext: '+1 frame',
      slidePrevTitle: 'Start one frame earlier in the video', slideNextTitle: 'Start one frame later in the video',
      /* #1243 S3 · S9: the ‹s' spoken names (a sub-row's and a panel's go back one level; an item's lets the selection go) and the tray's own */
      back: 'Back', backItem: 'Back · nothing selected', clipTools: 'Clip tools',
      /* #1243 S26: a grip whose footage has run out (its spoken name's tail) and the drag tip when he pulls it past the end */
      footageEnds: 'the footage ends here', footageEndTip: 'End of the footage',
      addWhere: 'Add clips', atEnd: 'At the end', afterClip: 'After ', afterCard: 'After the card', beforeFirst: 'Before Clip 1',
      /* #1243 S6 A: Simple's Export panel (his words: "Just make an export menu, but make it simple and easy to read"): the panel's name, its
         two rows and their choices, the size and the one button. No explanations (his H3). */
      exportTitle: 'Export video', exportHead: 'Export', exportQuality: 'Quality', exportSmooth: 'Smoothness',
      exportRung: p => p >= 2160 ? '4K' : p + 'p', exportFps: f => (Math.round(f * 100) / 100) + ' fps',
      exportSize: s => 'About ' + s, exportGo: 'Save video', exportEmpty: 'Add a clip first, then export it',
      /* #1261 (his words: "you only have two choices for frames. That's not enough… it should stay simple like that"): Smoothness offers
         every rate Full's Export does, as bare numbers, the unit once under the row's name, the project's own rate marked and named */
      exportFpsUnit: 'fps', exportFpsOwn: 'the project’s own',
      /* #1261 (his words, 24 Nov: "Just do 30, 60, 120 or custom"): the fourth button and its question */
      exportCustom: 'Custom', exportCustomTitle: 'Custom: type a rate', exportCustomSaid: 'your own rate',
      exportFpsAsk: 'Frames a second', exportFpsHint: 'From 1 to 120', exportFpsSet: 'Set', exportFpsBad: 'Type a number from 1 to 120',
      exportLen: s => { s = Math.max(0, +s || 0); if (s > 0 && s < 1) return (Math.round(s * 10) / 10) + ' s'; s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
      music: 'Music from your files', sfx: 'Sound effects', voice: 'Record voice', closeAll: 'Close all gaps',   // (moreOpts went with Simple's ⋯, #1243 S5; review L3-10)
      /* #1255's 20:53 follow-up, his words: "I'm also noticing a pop-up that says tap a clip to split or change its speed. There shouldn't
         be any explanations like that. We have tutorials for a reason". The PC band's "Tap a clip to see its tools" and "Its tools are
         below", and the first-run hint ("Tap a clip to split it or change its speed", "Click a clip… · S splits at the line"), went. */
      selected: n => n + ' selected',
      /* #1243 S5: Split, first on every item's tools (his "put the split button on the row that pops up when you have a layer selected") */
      split: 'Split', splitTitle: 'Split at the line (S)',
      /* #1243 S34 A: the play row's Link, and why Stay put rests while it is off */
      link: 'Link', linkTitle: 'Link: things on a clip move with it', linkOffTitle: 'Links off: everything stays where it is · tap to link',
      stayUnlinked: 'Links are off, so everything stays put already · turn Link on to use this',
      /* #1243 S8: Captions › Caption looks — one face per look, our own names */
      capLooksRow: 'Caption looks', capLooksTitle: 'A look for the captions, in one tap', capLooksNone: 'Add captions first: Type captions or Find speech',
      capLooks: { clean: 'Clean', bold: 'Bold', spoken: 'Spoken', wordbox: 'Word box', plate: 'Plate', underline: 'Underline', pop: 'Pop', serif: 'Serif' },
      capLookSample: 'Every word',
      /* #1243 S8: Text's row — Add text and Title looks */
      addText: 'Add text', textTitle: 'Add text, a title that is already styled, or draw', titleLooksRow: 'Title looks', titleLooksTitle: 'A new title, already styled and moving',
      titleLooks: { headline: 'Headline', loud: 'Loud', editorial: 'Editorial', typed: 'Typed', cinema: 'Cinema', slidein: 'Slide in' },
      titleLookSample: 'Title',
      /* #1243 S8: Overlay's row — Photo or video (the picker) and Your media (what this device has imported) */
      photoVideo: 'Photo or video', yourMedia: 'Your media', yourMediaTitle: 'Photos and videos you have added before, no picker',
      yourMediaNone: 'Nothing here yet: add a photo or video once and it is kept here', aPhoto: 'Photo', aVideo: 'Video',
      /* #1243 S17: Text › Draw */
      draw: 'Draw', drawTitle: 'Draw on the video with your finger',
      /* release 2.3 */
      /* (#1243 S28: Audio and its row went; Speed, Volume, Reverse and Take sound out are the clip's own tools) */
      speed: 'Speed', volume: 'Volume', replace: 'Replace', reverse: 'Reverse', forwards: 'Play forwards', takeSound: 'Take sound out', putSound: 'Put sound back',
      fade: 'Fade', fadeIn: 'In', fadeOut: 'Out', useOneSpeed: 'Use one speed', speedRamped: 'Speed changes over the clip',
      speedLabel: 'Speed', volumeLabel: 'Volume in percent', muteClips: 'Clip sound', muteOn: 'Mute clip sound', muteOff: 'Clip sound is off, tap to turn it on',
      /* release 2.7: the ◇'s Transition row, and Turn into a transition on a crossfade (#1122, his pick A) */
      transition: 'Transition', turnTr: 'Turn into a transition', trNone: 'None', trCrossfade: 'Crossfade', trDipBlack: 'Dip to black', trDipWhite: 'Dip to white',
      trLength: 'Length', trEvery: 'On every cut', trShorter: 'Shorter by 0.1 s', trLonger: 'Longer by 0.1 s',
      /* Phase 3 · Look (queue 980, DESIGN §8.5, §8.7): Look and its panel, Filters and Adjust. #1243 S12: on the project row, for the whole
         video (his words: "you shouldn't have the look menu on each layer… it goes over your entire project immediately") */
      /* #1243 S14 (his words: "a button in that bottom row at the start that has like the AI option"): the assistant, under the name
         #1243 F2 gave it everywhere ("think of a better name for it to describe what it actually does") */
      ai: 'Ask & edit', aiTitle: 'Ask & edit: say what to change, in your own words',
      look: 'Look', lookTitle: 'Filters and Adjust over the whole video', lookFilters: 'Filters', lookAdjust: 'Adjust', lookNone: 'None',
      lookStrength: 'Strength', lookReset: 'Reset',
      adjBright: 'Brightness', adjContrast: 'Contrast', adjSat: 'Saturation', adjExposure: 'Exposure', adjWarmth: 'Warmth', adjVignette: 'Vignette',
      /* §8.5's line under a keyed numeric row; its Open in Full is the button beside it (openFull) */
      lookKeyed: 'This changes over time. Your change applies to the whole video',
      /* #1243 S12: the chips over the Filters strip (his favourites, his own, then the library's sections by their own names, js/filters.js),
         and the panel's two lines: clips that still carry a look of their own (Remove them, one step), a look that ends early (Fix) */
      lookFaves: 'Favourites', lookYours: 'Yours', lookChips: 'Filter sections',
      lookClipsOwn: n => n === 1 ? '1 clip has its own look' : n + ' clips have their own look', lookClipsOff: n => n === 1 ? 'Remove it' : 'Remove them',
      lookEndsEarly: 'The look doesn’t cover the whole video',   /* (lookLetGo, "Let go to see it", went: #1255's 20:53 follow-up) */
      /* Phase 3 · Captions (queue 980, DESIGN §8.5 the Captions tool and the caption-track tray, §8.9 the caption-track switch) */
      captions: 'Captions', captionsTitle: 'Type captions, find speech, pick a style', typeCaptions: 'Type captions',
      findSpeech: 'Find speech', findSpeechTitle: 'Finds when people talk · you type the words',
      editLines: 'Edit lines', editLinesTitle: 'Every caption line, to type or remove', capStyle: 'Style', capStyleTitle: 'How every caption looks',
      capFollow: 'Follows the clips', capFollowTitle: 'The captions move with the clips',
      capStay: 'Stays with the sound', capStayTitle: 'The captions stay with the sound they were timed from',
      /* on a phone the pair's faces are one word each (sheet 1 question 3, pick B, 6 Nov): the whole tray is on show with no swipe */
      capFollowShort: 'Follows', capStayShort: 'Stays',
      capAddLine: 'Add a line here', capEmpty: 'Empty',   /* was 'Empty · tap to type' (#1255 20:53: no how-to words that stand on screen) */ capRemove: 'Remove this line', capNone: 'No lines yet',
      /* Phase 3 · Effect segments (queue 980, DESIGN §8.5: the project row's Effects, the Effect segment tray "Change effect · Strength ·
         Stay put · 🗑"; §8.5c): the picker in the tray row and the segment's own tools */
      effects: 'Effects', effectsTitle: 'An effect over the whole video', change: 'Change effect', strength: 'Strength', strengthLabel: 'Strength in percent',
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
      overlap: function (s) { return 'Overlap ' + s.toFixed(1) + ' s, Fix'; },
      /* 2.7: the ◇ above a cut, and the ◇ on a crossfade */
      transition: function (type, d) { const k = { crossfade: 'crossfade', dipblack: 'dip to black', dipwhite: 'dip to white' }[type]; return 'Transition: ' + (k ? k + ' ' + (+d || 0).toFixed(1) + ' s' : 'none'); },
      transitionBlend: 'Crossfade: turn into a transition'
    },
    items: {   // FM.spine.itemWord: never layer.name (§8.9 "Naming items in lines")
      clip: 'Clip', sticker: 'the sticker', image: 'the image', videoTop: 'the video on top', song: 'the song',
      sound: 'the sound', effect: 'the effect', captions: 'the captions', block: 'the group', shape: 'the shape', text: 'the text',
      effects: n => n + ' effects',   // #1243 S10: a segment holding several (FM.spine.effectWord); one is named by its own label
      textLabel: 'Text'   // #1243 S38: an empty text's label on the timeline (FM.spine.itemLabel)
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
