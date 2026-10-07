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
        penShort: 'Your drawing has only 2 points, so it can’t be kept. Switching throws it away.',
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
    lines: {
      openFull: 'Open in Full',
      deleteNext: 'Deleting clips comes next',
      gapNext: 'Closing gaps comes in the next update',
      splitNext: 'Splitting comes in the next update',
      dupNext: 'Duplicating clips comes next',
      newer: 'Made with a newer FreeMotion. Update to edit clips here',
      pro: 'Has moves and effects',
      moreInFull: 'More in Full ›',
      noFootage: 'No footage'
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
    summary: function (clips, secs) {
      const m = Math.floor(secs / 60), s = Math.round(secs - m * 60);
      return clips + (clips === 1 ? ' clip' : ' clips') + ' · ' + m + ':' + (s < 10 ? '0' : '') + s;
    }
  };
})(window.FM);
