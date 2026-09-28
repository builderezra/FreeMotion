# How other editors split "simple" from "pro": precedents for FreeMotion's simple mode

Research note for step 1 of `tools/design/plans/simple-mode/STATUS.md`. Written 28 Sep 2026. **Nothing here is built;
this is research for the design.** Every web fact has a URL; every FreeMotion fact has a `file:line`. Where a claim rests
on a third-party page, a user forum or my own inference, it says so. "Unverified" means I could not confirm it from the
vendor's own documentation in this pass.

Source quality key: **[vendor]** is the maker's own docs or manual. **[3rd]** is a third-party article or tutorial site.
**[forum]** is a user forum. **[inference]** is my reading, not stated by any source.

---

## The short version

1. **The CapCut / Premiere-on-iPhone / Rush / LumaFusion / Final Cut / iMovie family all share one idea.** There is one
   main track where clips sit end to end with no gaps, and everything else (B-roll, text, stickers, audio) is *attached*
   to a clip on it and moves or is deleted with that clip. The vendors name it differently: main track, V1, primary
   storyline, Main Track, connected clips, linked clips. Structurally it is the same idea every time.
2. **DaVinci Resolve is the one clear precedent for "one project, two editors".** Its Cut page (simple, fast) and Edit
   page (full) show *the exact same timeline*. Switching has no conversion step and there is one undo history. The Cut
   page makes Track 1 magnetic and makes the tracks above it follow Track 1. That magnetism is a behaviour of the Cut
   page's edit commands. It is not a different document.
3. **Every precedent that uses two file formats converts ONE WAY, as a lossy COPY:** Rush → Premiere Pro, Premiere on
   iPhone → Premiere desktop, Final Cut for iPad → Mac, iMovie → Final Cut, and iMovie trailer → movie. Adobe has
   now retired Rush. Technical support ends **30 Sep 2026**, two days after this note. The Premiere mobile app that
   replaced it still sends to desktop as a one-way copy, with a list of features that don't survive the trip.
4. **Final Cut's file format shows the cleanest data model for "attached".** An attached item is stored as a *child* of
   the main-track clip, with an `offset` in that clip's own time and a `lane` number (above is positive, below is
   negative). Its absolute time is derived. LumaFusion stores the same link "to the clip (and the specific frame on
   that clip)".
5. **LumaFusion shows that free tracks and a magnetic main track can live in one app and one data model.** Linking is a
   per-clip property, and each track has its own default for it. An unlinked clip keeps an absolute time.
6. **No mainstream video editor lets two people freely edit the same timeline at the same moment.** CapCut locks the
   whole project to one editor. Premiere Team Projects locks a whole sequence until you publish. Resolve locks the
   timeline for editors but lets colorists grade clips at the same time, because grading is per clip. The real-time
   tools (Canva, Descript, Kapwing) are scene- or element-based. FreeMotion already has per-layer leases through a host
   sequencer, which is finer-grained than any of these.
7. **Two naming traps inside FreeMotion today:**
   - FreeMotion's existing "magnet" is **snapping** (`js/timeline.js:351`). CapCut's "main track magnet" means
     **ripple / no gaps**.
   - FreeMotion's `parent` field is **transform parenting** (`js/scene.js:707`). Final Cut's "connected clip" link is a
     **time attachment**.

   If the simple editor reuses either word, the two meanings will collide.

---

## 1. CapCut desktop: the main track, the "main track magnet", overlays

CapCut publishes almost no vendor documentation of its timeline, so most of this section rests on third-party pages. It
matches the other precedents, but I could not verify the details against CapCut's own help.

**What it does**
- CapCut's PC page names "Track Magnet" and "Auto Snapping" as the two features that "make sure your clips stay exactly
  lined up on the timeline, so there are no gaps in your final result". **[vendor]**
  <https://www.capcut.com/resource/pc-professional-video-editor>
- **Main track magnet.** Its toggle on the desktop timeline toolbar only affects the main video track:
  - **On:** clips stick end to end.
  - **Off:** you can leave a gap, and a gap renders as black in the export.
  - Techpp describes this, though its wording swaps on and off in places. **[3rd]**
    <https://techpp.com/2025/05/27/capcut-desktop-icons-symbols-meaning/>
  - Filmora's guide adds that with the magnet on, "deleting or shortening a clip causes subsequent clips to 'ripple'
    forward to close the gap". **[3rd]** <https://filmora.wondershare.com/advanced-video-editing/capcut-timeline.html>
- **Auto snapping** is the separate toggle for everything that is *not* the main track (audio, effects, subtitles,
  overlay video). **[3rd]** (techpp, above)
- **Linkage** is a third toggle. Techpp says it lets you "stick multiple items and delete them all at once", and that
  with it on, moving the video moves "the music associated with it". **[3rd]** I could not find CapCut's own rule for
  which items get linked to which main-track clip. **Unverified.**
- **Overlay tracks:**
  - On PC you drag a clip onto a track above the main one. "A visual clip on a higher video track appears over a clip
    on a lower video track when their time ranges overlap." Mobile has a dedicated Overlay button instead. **[3rd]**
    <https://www.itechguides.com/how-do-i-add-an-overlay-on-capcut-pc-desktop-guide/>
  - Overlay tracks have no magnet. Users who want free placement put clips there on purpose. **[forum]**
    <https://steamcommunity.com/discussions/forum/1/4406291470270278556/>
- **Phone vs PC.** Users report that the main-track magnet **cannot be turned off on CapCut mobile**. The phone keeps
  the main track magnetic all the time, and freedom lives on the overlay tracks. **[forum]** (Steam thread above).
  **Unverified** against CapCut docs.
- **Collaboration.** "CapCut prioritizes project stability, so it uses a 'lock and key' system rather than simultaneous
  editing." One person holds "editing permission" and everyone else is "View only". **[vendor]**
  <https://www.capcut.com/resource/collaborate-on-capcut-online>
  - Since 25 Mar 2026, a free team space allows 2 people. **[vendor]** <https://www.capcut.com/help/team-collaboration-feature>

**An implementation precedent in a web editor.**

HeyGen's open-source `hyperframes` studio merged a "Ripple" toggle on 18 Sep 2026, explicitly to "match CapCut's
main-track magnet behavior instead of leaving a hole". **[3rd, code]** <https://github.com/heygen-com/hyperframes/pull/4069>
- The toggle is one boolean in player state, and it defaults to on.
- Ripple only affects main-track elements. "Linked overlays … are separate follow-ups."
- A reviewer caught a real bug: the first version re-closed *every* gap on the track. The fix shifts "each survivor
  left by exactly the duration of the deleted clips before it", so gaps the user left on purpose elsewhere are not
  collapsed.

**Lesson for FreeMotion.** In CapCut the "simple" part is one designated track whose *edit commands* ripple, plus a
free zone (the overlay tracks) for everything else. On the phone that track is always magnetic. The PC version adds a
toggle for people who know what they are doing. That is the CapCut ceiling he named: on the phone, always magnetic; on
PC, an option to turn it off. The HeyGen bug is worth writing into the design as a rule:

> A ripple moves only the items after the edit, by exactly the length removed.

It should not "re-pack" the track.

---

## 2. Premiere Rush vs Premiere Pro, and Rush's replacement (Premiere on iPhone)

### Rush's simplified timeline [vendor]
Source: <https://helpx.adobe.com/premiere-rush/desktop/edit-video/edit-timeline.html>

- "A maximum of seven tracks in the timeline: four video tracks and three audio-only tracks."
- "The main track is the video (V1) track." Imported video and stills land on V1. Audio and titles go "in separate
  tracks".
- "The main V1 track is gapless." Clips are assembled "next to one another with no gaps". Removing footage makes the
  rest "automatically align themselves leaving no gaps".
- "Clips placed on tracks V2-V4 and A1-A3 are associated with clips in the main V1 track, keeping your clips in sync."
  When you select a V1 clip, its associated clips get "a yellow line along their bottom edge", and "a vertical yellow
  line shows the connection point".
- Duplicate follows the same split. A V1 clip is duplicated *after* itself (the sequence grows). An audio clip or
  title is duplicated "at the exact spot as the original but in a new track".

### What Rush left out
- Beyond the 4 video + 3 audio cap, Adobe's own tutorial lists these as reasons to move to Pro: "more complex edits like
  time remapping and adjustment layer color grading". **[vendor]**
  <https://www.adobe.com/uk/learn/premiere-rush/web/edit-rush-videos-in-premiere-pro>
- Rush's FAQ sells the timeline as "four video tracks, and three audio tracks without gaps in the timeline", with
  titles as Motion Graphics templates. **[vendor]** <https://helpx.adobe.com/premiere-rush/desktop/introduction/faq.html>

### The conversion is one-way. What happens, exactly
- **Starting it.** In Premiere Pro 2019 or later, click "Open Premiere Rush Project" on the Start Screen. **[vendor]**
  (Adobe Learn tutorial, above)
  - The Rush project must have **Project Sync** on (it is on by default), or it will not be offered.
  - "Your new Premiere Pro project will automatically save in your documents folder." The result is a *new* Pro
    project, not the Rush project opened in place.
- **The way back is closed.** Rush FAQ: "Premiere projects cannot be opened in Premiere Rush." **[vendor]** (FAQ above)
  - Adobe staff on the forum: "At this time you can only go from Rush to Premiere Pro." **[vendor staff, forum]**
    <https://community.adobe.com/t5/premiere-rush-discussions/rush-project-to-premiere-pro-and-back/m-p/11017156>
  - The community manager on the same thread: "once you started working in Premiere Pro it will not allow you to
    import your project back in Rush".
- **The removed help page.** Adobe's own Pro help page for this used to say "Once you open a Rush project in Premiere
  Pro, you cannot open it again in Premiere Rush". It said you should finish and publish from Pro, and that the
  converted file lands in a "Converted Rush projects" folder. That page now redirects to a generic "Open projects"
  page, so I only have search-engine snippets of it. **Unverified directly.** Old URL:
  <https://helpx.adobe.com/fi/premiere-pro/using/edit-premiere-rush-projects-in-premiere-pro.html>
- A third-party write-up adds that the Rush project's media is not copied into the Pro project and stays where it was.
  **[3rd, unverified]**

### Rush has been retired [vendor]
Source: <https://helpx.adobe.com/premiere-rush/desktop/kb/end-of-life.html>

- Rush left the stores on 30 Sep 2025.
- "Technical support will end on September 30, 2026", and after that date "the Premiere Rush apps may no longer
  function".
- It is "replaced by Premiere on iPhone and Premiere on desktop". Adobe says it took "key learnings from Premiere Rush"
  into both.

### Premiere on iPhone / Android (2025–26): the same model again, and again one-way [vendor]
- **Timeline.** The feature table lists "Multitrack timeline (main + overlay tracks)".
  <https://helpx.adobe.com/premiere/mobile/get-started/common-questions.html>
- **Overlays are linked to the main track.** Source:
  <https://helpx.adobe.com/premiere/mobile/manage-clips/move-clips-from-main-track-to-overlay-track.html>
  - "Overlay timelines link to the main timeline, so clips stay in sync when editing."
  - "Clips on overlay timelines can be moved independently, but they remain linked to the main timeline clip. If you
    move or delete the main clip, the overlay clip will move or be deleted as well."
  - "Text and graphic elements sit on overlay tracks above the main track."
- **Send to desktop.** Source: <https://helpx.adobe.com/premiere/mobile/export-files/send-projects-to-premiere-on-desktop.html>
  - The menu item is "Send a copy to desktop". A copy of the media and the project goes to Adobe cloud storage, and
    you open it with File > Import Premiere Mobile Project.
  - **"This process only transfers data from mobile to desktop, so your subsequent changes on either device won't sync
    between them."**
  - The page lists features that are **not supported** in the transfer:
    - text and text animations
    - captions and caption animations
    - Enhance Speech
    - Lightroom Looks and colour adjustments
    - remove background
    - text and clip animations
    - flip
    - photo motion
    - noir background
  - On Android, sending to desktop "isn't currently supported" (FAQ above).

**Lesson for FreeMotion.** Adobe has built the separate simple app twice (Rush, then Premiere mobile), and both times
it made two formats and one-way lossy copies. Their own list of what fails to transfer is almost exactly the "simple
editor" feature set: text, captions, animations and colour. Once the copy exists, the two projects fork. FreeMotion is
one app with one storage format, so it can avoid this whole class of problem. **Do not introduce a second project
format.** The other half of the lesson is that Adobe's newest simple editor adopted CapCut's model outright: a main
track, overlays linked to main clips, and move or delete that cascades. That is strong evidence the model is right for
a non-editor.

---

## 3. Final Cut Pro's magnetic timeline: the most relevant model for "main track plus attached things"

### Behaviour [vendor]
- **Primary storyline.** Source: <https://support.apple.com/guide/final-cut-pro/intro-to-the-magnetic-timeline-verb8fcfc133/mac>
  - The Magnetic Timeline "replaces traditional track-based editing with an intuitive trackless design".
  - The primary storyline holds the main video and audio. Around an edit, "surrounding clips automatically move out
    of the way or snap together to avoid unwanted gaps and collisions".
- **Connected clips.** Source: <https://support.apple.com/guide/final-cut-pro/connect-clips-ver7a77ef9e/mac>
  - Titles and B-roll connect *above*, audio connects *below*.
  - "Connected clips remain attached and synced until you explicitly move or remove them."
  - "When you rearrange, move, ripple, or delete clips in the primary storyline, any clips connected to them are moved
    or deleted along with the primary storyline clips."
- **Connection point.** The anchor is at the connected clip's first frame by default. Command-Option-click moves it.
  - Holding the **Grave Accent (`)** key while editing "preserve[s] the timing and position of connected clips". This
    is the one-key "don't drag my attachments along" override. (Same page.)
- **Storylines** (secondary storylines). Source: <https://support.apple.com/guide/final-cut-pro/add-storylines-ver8e3f1748/mac>
  - "Sequences of clips connected to the primary storyline."
  - Magnetic inside, just like the primary.
  - Attached as one unit at a single connection point.
- **Position tool.** It opts out of magnetism: the clip "overwrites any clips at the new location and leaves a gap clip
  at the old location". So gaps are explicit *items*. (Magnetic timeline intro, above)
- **Roles and lanes.**
  - Roles are labels: Video, Titles, Dialogue, Music, Effects, plus subroles. You can turn a role off, or export by
    role. <https://support.apple.com/guide/final-cut-pro/intro-to-roles-ver1a0c8ad7b/mac>
  - "Show Audio Lanes" regroups audio by role into labelled lanes, and it "does not affect the content of your
    project or how it plays back … it simply adjusts the timeline appearance".
    <https://support.apple.com/guide/final-cut-pro/organize-the-timeline-with-audio-lanes-verb71cb913/mac>

### How it is stored (FCPXML) [vendor]
Source: <https://developer.apple.com/library/archive/documentation/Miscellaneous/Conceptual/LegacyDTDsFinalCutPro/FCPXMLDTDv1.7/FCPXMLDTDv1.7.html>

- "A 'spine' is a container for elements ordered serially in time." The primary storyline is a spine. A storyline is a
  spine that is itself anchored.
- Anchored (connected) items are **children** of the story element they hang from. That element is a clip or a `gap`.
- `lane`: "0 = contained inside its parent … >0 = anchored above its parent, <0 = anchored below its parent."
- `offset`: "the location of the object in the **parent** timeline". So an attached item's time is stored *relative to
  its parent clip*, and its absolute time is derived.

### iPad vs Mac, which is also one-way
- Final Cut for iPad has the same primary storyline and connected clips.
  <https://support.apple.com/en-vn/guide/final-cut-pro-ipad/devd9b6a5715/ipados> **[vendor]**
- **iPad → Mac.** The iPad project is imported into a new Mac library that "contains copies of all the media". One
  thing is flattened on the way: the soundtrack "is imported as a simple AAC audio file that no longer dynamically
  adjusts to fit the length of your project". **[vendor]**
  <https://support.apple.com/guide/final-cut-pro/import-from-final-cut-pro-for-ipad-ver2d96ac83f/mac>
- **Mac → iPad.** ProVideo Coalition (May 2023): "a one-way trip as you can't go from FCP on the Mac to FCP on the iPad".
  The same article says the iPad version then had no compound clips and no connected storylines. **[3rd]**
  <https://www.provideocoalition.com/final-cut-pro-for-ipad-vs-mac-whats-the-difference/>
  AppleInsider later described a partial workaround. **Unverified** for current versions.

**Lesson for FreeMotion.** This is the model to copy for the *data*:
- Store an attached item as `{attachedTo: <main clip id>, offset: <seconds into that clip>, lane: <n>}` and derive its
  absolute `start`.
- The derivation is what makes "move the main clip, the text comes with it" automatic. Nothing has to chase the
  children.
- Deleting a main clip deletes its attachments (FCP, LumaFusion and Premiere mobile all agree). Or it offers to detach
  them.
- A "hold to detach" override (FCP's ` key) is the power-user escape.
- Gaps on the main track are explicit items (FCP gap clip, LumaFusion blank clip), so something can still be attached
  across a gap.
- Roles and lanes show how to present the "Overlays / Text / Captions / Audio" *sections* he described without storing
  them. A section is a filter over what kind of item something is, so the grouping costs nothing in the data.

---

## 4. DaVinci Resolve's Cut page vs Edit page: two UIs over the SAME timeline

This is the key precedent for "one project, two editors". Primary source: the DaVinci Resolve 17 Reference Manual,
Part 4 "The Cut Page", chapter 26, pp. 420–430, read from a public mirror of Blackmagic's PDF. **[vendor]**
<https://ltbits.github.io/davinci-resolve-manuals/DR17/DR17-RM-04%E2%80%93TheCutPage.pdf>

### Same data
- "DaVinci Resolve now has two editing environments, intended for two different audiences." The Cut and Edit pages
  "share many of the same panels such as the Media Pool, the Timeline, and the Viewer". (p. 420)
- "While the interface of the Timeline Editor changes from page to page, the actual contents of the Timeline are
  identical, because each page's Timeline Editor is in fact showing the exact same Timeline that is currently open."
  (p. 426)
- Blackmagic's product page: "You can always switch to the edit page if you want traditional editing features, as the
  edit and cut pages work seamlessly together." <https://www.blackmagicdesign.com/products/davinciresolve/cut>
- **One undo history across the editing pages.** "The Media, Edit and Fairlight pages share the same multiple-undo
  stack". Fusion and Color keep per-clip stacks. (p. 430)

### What the Cut page shows differently
- **Two timelines.**
  - The Upper Timeline "always shows the entire program".
  - The Lower Timeline is a close-up round the playhead, and "the zoom level is fixed; you cannot change it".
  - You can drag clips between the two for fast reordering. (p. 426)
- **Video and audio are merged into one item.** "The main tracks … combine a clip's video and audio into a single item
  in the Timeline, for simplicity." The Edit page shows the *same* clip as separate video and audio items. Fairlight
  shows audio channels in lanes. "In this way, each page gives you different sets of controls over the contents of the
  Timeline that are appropriate for each page." (p. 427)
- **Track 1 is magnetic, but only on this page.** (p. 428)
  - Editing Track 1 "results in the rest of the edited timeline being automatically rippled".
  - Tracks 2 and above are for B-roll. Moving them "only moves or resizes that one clip … the Timeline is not rippled".
- **Overlays follow Track 1.** "The Timeline automatically rearranges itself to close gaps … when you move or rearrange
  clips in Track 1, and superimposed clips in Tracks 2 and above move to keep in sync with the clips they're
  superimposed over." You can still leave gaps between B-roll clips on the upper tracks. (p. 429)
- **Smart edit commands** replace precise three-point editing: smart insert, append at end, place on top (onto the
  next track up), ripple overwrite, source overwrite, and close up.
  <https://www.blackmagicdesign.com/products/davinciresolve/cut>
- **The Edit page makes you choose.** Delete there leaves a gap, and ripple delete is a separate command. Which key does
  which is configurable. **[3rd]** <https://beginnersapproach.com/davinci-resolve-delete-gaps-clips/>
- A third-party comparison (July 2026) says the Cut page hides track management, the full Inspector, the full effects
  library and deep keyframe editing, and loses no data. **[3rd, unofficial site]**
  <https://davinciresolve21.com/blog/davinci-resolve-cut-page-vs-edit-page-differences>
- **iPad.** Resolve for iPad launched with only the Cut and Color pages, and Fusion effects from desktop projects are
  limited there. **[3rd, unverified]**

### Collaboration across pages [vendor]
Source: <https://www.blackmagicdesign.com/products/davinciresolve/collaboration>

- "Multiple people can work on the same timeline! When changes are made, you can see and accept them in the viewer,
  changes are only applied when you accept updates."
- "Automatic bin and timeline locking let multiple people work without overwriting each others work."
- "Individual clips are auto locked while they are being graded … and each colorist knows who is grading which shot."
  Colorists "can select any clip and start grading simultaneously" while editors build the timeline.

**[inference] How the Cut page knows what is "superimposed over" what.** The manual never mentions a stored link. The
Edit page is an ordinary track editor that can put anything anywhere, and the Cut page opens whatever the Edit page
made. So the Cut page appears to *work out* each B-roll clip's Track-1 partner from time overlap at the moment of the
edit. It does not read a stored attachment.

**Lesson for FreeMotion.** This is the pattern for "one project, two editors":
- **The simple editor must be able to open *any* project the full editor makes.** Resolve can promise this because the
  Cut page is a *lens plus a command set*, not a format. Whatever the Cut page can't simplify, it still shows as tracks.
- **Switching needs no conversion and there is one undo stack.**
- **Simplify the presentation, not the data.** Merging video and audio into one item is a display decision.
- **Magnetism can be a property of the simple editor's commands.** The full editor's commands can stay free, so a free
  edit made in the full editor is never "wrong", only unattached.
- **Collaboration can be split by the kind of edit, not by the person.** Resolve's editor/colorist split works because
  structure and per-clip properties are locked at different granularities.

---

## 5. iMovie (iPhone and Mac), Clipchamp, LumaFusion, Alight Motion

### iMovie on Mac [vendor]
- **Attaching overlays.** Drag a clip above a timeline clip. "A line appears connecting the clip you're dragging to the
  clip in the timeline". You then choose Cutaway, Picture in Picture, and so on.
  <https://support.apple.com/guide/imovie/create-a-cutaway-effect-movf525350f0/mac>
- **Attached vs unattached audio.** Source: <https://support.apple.com/guide/imovie/add-music-and-sound-clips-mov91a895a64/mac>
  - A sound clip "is now attached to a clip in the timeline. If you move the clip the audio clip is attached to, the
    audio clip moves as well."
  - Background music is "edited separately in its own area of the timeline and is unaffected by edits made to other
    clips in your movie".
- **Three one-way conversions:**
  - **Trailer → movie:** "After you convert a trailer to a movie, you can't convert it back to a trailer." Apple advises
    duplicating the trailer first. Unfilled placeholders become grey stand-ins.
    <https://support.apple.com/guide/imovie/convert-a-trailer-to-a-movie-mov07b796e65/mac>
  - **iMovie → Final Cut Pro:** File > Send Movie To Final Cut Pro makes a *new* Final Cut library with copies of the
    media. <https://support.apple.com/guide/imovie/send-projects-to-final-cut-pro-movcbf7e2a3f/mac>
    One setting is translated on the way: "Lower volume of other clips" arrives in Final Cut as a Gain filter.
    <https://support.apple.com/guide/final-cut-pro/import-from-imovie-for-macos-ver41812c7c/mac>
  - **iMovie iOS → Mac:** you can export an iOS project to iMovie on Mac or Final Cut. A newer iOS iMovie can produce a
    project an older Mac iMovie cannot open. **[vendor, via search summary of Apple's export page]**
    <https://support.apple.com/guide/imovie-iphone/export-projects-knaf0c276dc0/ios>

### iMovie on iPhone [vendor]
- **Timeline.** "Video clips and photos appear as thumbnails in sequence below the viewer".
  <https://support.apple.com/guide/imovie-iphone/intro-to-movie-projects-knaee5c7141b/ios>
- **Overlays** (cutaway, picture in picture, split screen, green/blue screen) sit on top of a main clip.
  <https://support.apple.com/guide/imovie-iphone/add-video-overlay-effects-kna831efee4d/ios>
- **Three project types:**
  - Magic Movie: built automatically.
  - Storyboard: from a template.
  - Movie: manual.

  Magic Movies are edited as a *clip list*: rearrange clips, change the style, music, text and filter.
  <https://support.apple.com/guide/imovie-iphone/intro-to-magic-movies-kna6202e30ca/ios>
- I found no documented way to turn a Magic Movie into a Movie. User threads suggest there isn't one. **Unverified.**

### Clipchamp
- **Timeline.** A free layered timeline: "You can layer assets on the timeline by placing them above one another …
  the video that is on the top of the stack will play." **[vendor]**
  <https://support.microsoft.com/en-us/topic/how-to-work-with-the-timeline-in-clipchamp-80ad81aa-d81e-45e9-bf9b-538c0f7202a4>
- **No magnet. Clipchamp adds gap tools instead:**
  - a "delete this gap" button;
  - "remove all gaps";
  - a "mind the gap" warning at export.

  Source: <https://support.microsoft.com/en-us/clipchamp/how-to-remove-gaps-on-the-timeline> **[vendor]**
- **Sharing.** Work and school accounts can share a project with Edit or View permission through OneDrive/SharePoint.
  **[vendor]** <https://support.microsoft.com/en-us/clipchamp/sharing-a-clipchamp-video-or-project>
  - Microsoft does not say whether two people can edit at once.
  - A school's how-to page says only one member can edit at a time. **Unverified.**

### LumaFusion: the closest *single-app hybrid* [vendor]
Source: LumaFusion Reference Guide v2.2 (2020), ch. 10–11, pp. 41–47:
<https://luma-touch.com/wp-content/uploads/2018/07/LumaFusion-Reference-Guide.pdf>
The guide is from 2020, and current versions have more tracks.
Current marketing: "Whether you prefer … locking, viewing and mixing specific tracks … or you prefer your clips to
magnetize around your main track, LumaFusion's … timeline model seamlessly and gracefully blends both worlds."
<https://luma-touch.com/timeline/>

- **The Main Track.** "The first video track … has special control over the other tracks." Insert/Overwrite mode
  "only applies to clips on the Main Track". Other tracks follow it "only when the clips are linked to clips on the
  Main Track". (p. 41)
- **Clip linking.** Source: pp. 46–47.
  - "Clips added to overlay and audio tracks are linked to clips on the Main Track."
  - A small line from the linked clip's first frame shows the link.
  - Linked clips "shift to stay linked to the clip (and the specific frame on that clip) where you positioned the clips
    originally".
- **Unlinking** works at three levels:
  - one clip;
  - all clips linked to one Main Track clip;
  - a whole track, through the track header.

  With track linking off, "new clips added to a track … will not be automatically linked". The guide's example is
  music or voiceover that should stay at an absolute time so you can "edit visuals to the music".
- **Delete cascades.** "When you remove a clip on the Main Track that has other clips linked to it, those linked clips
  will be removed also." (p. 47)
- "If a Main Track clip has linked clips, it can only be dropped into the Main Track again." (p. 44)
- **Overwrite mode** leaves gaps. Back in Insert mode, "these gaps will exist as blank clips". (p. 45)

### Alight Motion (what FreeMotion is modelled on)
- **Official site.** "Multiple layers of graphics, video, and audio", "Keyframe animation available for all settings",
  and project packages that move projects "between devices … in an editable format". There is no simple or beginner
  mode. **[vendor]** <https://alightmotion.com/>
- Other write-ups describe one layer per row, with groups that collapse layers into a unit. Those are fan sites.
  **[3rd, low quality]**
- **FreeMotion's model is the same shape:**
  - The document is `{project, layers: []}` (`js/scene.js:655-661`).
  - Each layer has an absolute `start`, a `duration`, `trimStart` and `speed` (`js/scene.js:691-700`).
  - A layer may have a transform `parent` (`js/scene.js:707`).
  - Groups are a pre-order in the flat array (`js/scene.js:893-897`).

**Lessons for FreeMotion**
- **LumaFusion shows that one data model can hold both worlds.** "Linked" is a per-clip property with a per-track
  default, and an unlinked clip simply keeps an absolute time, which is FreeMotion's model today. So FreeMotion does
  not need a second document type. It needs an optional attachment on a layer, plus a way to mark which layers make
  up the main sequence.
- **iMovie's background-music section is the named home for "things that should not move when I re-cut".** That is the
  same as LumaFusion's unlinked track, and it fits the "Audio" section he described.
- **Clipchamp shows the cheap alternative.** Keep free layers and add gap-cleaning tools. It is simpler to build, but it
  does not give a non-editor the "text moves with its clip" behaviour.
- **iMovie's Magic Movie** (a clip list with a style picker, no timeline) is a possible *even simpler* level. It is not
  what he asked for, but it is worth one line in the design as a later option.

---

## 6. Live collaboration in editors, and how they avoid people interfering

| Product | Can two people edit at once? | How interference is prevented | Source |
|---|---|---|---|
| **CapCut** | No | One "editing permission", which can be transferred; everyone else is View only | [vendor] <https://www.capcut.com/resource/collaborate-on-capcut-online> |
| **Premiere Pro Team Projects** | Yes, but not the same sequence | **Sequence locking** (details below) | [vendor] <https://helpx.adobe.com/premiere/desktop/collaborate-with-others/collaborate-using-team-projects/sequence-locking.html> |
| Premiere, offline | – | **Offline editing** (details below) | [vendor] <https://helpx.adobe.com/ca/premiere/desktop/collaborate-with-others/collaborate-using-team-projects/sequence-locking-for-offline-editing.html> |
| **DaVinci Resolve** | Yes, with different granularity per role | Automatic bin and timeline locks for editors; per-clip auto-lock while grading; others' changes apply only when you "accept updates"; a timeline comparison tool | [vendor] <https://www.blackmagicdesign.com/products/davinciresolve/collaboration> |
| **Clipchamp** | Not documented | Share with Edit or View permission (work/school only) | [vendor] <https://support.microsoft.com/en-us/clipchamp/sharing-a-clipchamp-video-or-project> |
| **Canva video** | Yes: "work on the same scenes simultaneously" (2021) | **Element and page locks** (details below) | [vendor] <https://www.canva.com/newsroom/news/canva-launches-video-suite-empower-everyone-create-edit-record-stunning-videos/>, <https://www.canva.com/help/lock-and-unlock-elements/> |
| **Descript** | Yes | **Cursor Presence** (details below) | [vendor] <https://help.descript.com/collaboration/cursor-presence.md> |
| **Kapwing** | Yes: "edit simultaneously with anyone in your shared workspace" | Not documented | [vendor, marketing] <https://www.kapwing.com/video-editor/collaboration> |
| **Figma** (not video, but the canonical multiplayer editor) | Yes | **Server-authoritative last-writer-wins** (details below) | [vendor] <https://www.figma.com/blog/how-figmas-multiplayer-technology-works/> |

**The details behind the table**
- **Premiere Pro Team Projects, sequence locking:**
  - Editing a sequence locks it to you.
  - Everyone else has "view-only access to earlier versions … until you publish".
  - Indicators in the timeline, the project panel and the program monitor show who is editing.
  - Collaborators can still play, scrub, duplicate and copy clips from the sequence.
- **Premiere, offline editing:**
  - The lock is disabled while you are offline, and your edits are saved into a duplicate sequence.
  - After a double offline edit, "only the first user to reconnect" can publish. The others' work "will be
    automatically saved to a new sequence".
- **Canva, element and page locks:**
  - A full lock covers position, style and content. A "position-only" lock still allows content edits.
  - "Anyone with edit access … can lock or unlock."
- **Descript, Cursor Presence:**
  - It shows teammates' cursors (Business and Enterprise plans, Labs).
  - "The composition selector shows who's currently working where."
  - Edits show only "when you're in the same scene … at the same playhead position".
  - Layers are attached to a scene by default. <https://help.descript.com/visuals/scenes-layers.md>
- **Figma, server-authoritative last-writer-wins:**
  - "Keep track of the latest value that any client has sent for a given property on a given object."
  - Client-ID-prefixed object IDs.
  - The parent is stored "as a property on the child". The server "reject[s] parent property updates that would cause
    a cycle".

**FreeMotion today** already has most of the machinery these products use:
- **A host sequencer.** "One device owns the truth. Every change … goes through this pipeline in one fixed order …
  validate → rate-limit → dedupe → role → lease → CAS → resolve+apply" (`js/collab-host.js:1-9`).
- **Path-level ops** (`js/collab-diff.js:1-13`).
- **Per-layer leases.**
  - The leases are held in `js/collab-host.js:270` and granted at `:333`.
  - An op on a layer someone else holds is refused at `:834` and `:872`.
  - Only an editor's open tool asks for a lease (`js/collab-presence.js:229-231`).
- **Roles:** owner, editor, commenter and viewer (`js/collab-host.js:31`).

**Lesson for FreeMotion.** Among video editors, free simultaneous editing of *one timeline* is rare. The two that
manage it without whole-project locks do it by granularity. Resolve locks structure (the timeline) separately from
per-clip properties (a grade). Canva and Descript lock per element or scene, and show presence per scene.

FreeMotion's per-layer lease is already finer than any of them. The new problem that simple mode brings is
**structural**. A ripple on the main track moves every later clip, and every item attached to them. To a complex-mode
user those layers seem to jump under their hands, which is exactly the interference he wants to avoid.

The precedents suggest four remedies:
- **Attachments preserve relationships.** FCP, LumaFusion and Premiere mobile all move attached items with their main
  clip, so what the complex user built stays glued to the right picture.
- **Unattached items do not ripple.** This is LumaFusion's unlinked track and iMovie's background music.
- **A ripple is one atomic, host-sequenced op, with presence.** Descript's "who's working where", applied here: "Sam
  is rearranging clips".
- **A structural edit should respect leases.** A ripple that would move a layer another person holds should either wait
  or move it while keeping their lease. That is a design decision for step 2, not a research finding.

---

## Design patterns extracted

### (a) One data model with two views
- **Precedents.**
  - Resolve's Cut and Edit pages: the same timeline, one undo stack, a one-click page bar, no conversion.
  - FCP's audio lanes and roles: regrouping that "does not affect the content of your project".
  - Descript: the script and the timeline over one composition.
- **Anti-precedents.** Rush/Pro, Premiere mobile/desktop, FCP iPad/Mac and iMovie/FCP each have two formats, so every
  move is a one-way copy, the projects fork, and features drop on the way.
- **What makes it work:**
  1. The full view is complete: it can show and edit everything in the document.
  2. The simple view is complete in a weaker sense: it can *open* any document. What it can't simplify it shows in a
     plain fallback form, the way Resolve shows extra tracks. It does not refuse or convert.
  3. Simplification is presentation (merging video and audio, fixed zoom, "sections") plus a smaller command set.
  4. One undo history covers both views.
- **For FreeMotion:** one `{project, layers}` document. The simple editor is a lens over it.
  - It needs a small number of *new stored fields* that both editors keep valid: which layers make up the main
    sequence, and each attached layer's parent clip and offset.
  - Everything else in the simple timeline (sections, gapless order, merged audio) is derived at draw time.

### (b) A magnetic primary track with attached items
There are three storage choices in the precedents:
1. **Derived at edit time, nothing stored** (Resolve Cut page **[inference]**). This is the most tolerant of free edits
   made in the other view. But "attached to" can change silently when something is nudged so it overlaps a different
   clip.
2. **A stored link with a frame offset** (LumaFusion: "the specific frame on that clip"; Premiere mobile; Rush's
   "associated"). The link can be switched off per clip or per track, and an unlinked clip keeps an absolute time.
3. **A stored hierarchy** (FCPXML): the child sits under the parent clip, with `offset` in parent time, a `lane`, and
   storylines that are themselves anchored.

Rules the magnetic editors all agree on:
- moving the main clip moves its attachments;
- deleting the main clip deletes its attachments, or offers to detach them;
- the connection point defaults to the attachment's first frame;
- there is an explicit override (FCP's `, LumaFusion's Unlink);
- audio that should stay put exists as an *unattached* category (iMovie background music, LumaFusion's unlinked
  track);
- gaps are real items, and the phone never has them unless asked (CapCut mobile's magnet can't be turned off).

A HeyGen bug to design against: ripple by exactly the length removed, and never "re-pack" the track.

**For FreeMotion:** option 2 or 3 fits best with an existing document that has absolute starts. Keep `start` as the
stored truth for *unattached* layers, which is today's model, so nothing old breaks. Add an optional attachment and a
main-sequence order for the simple editor. The complex editor can keep writing absolute times and recompute the offset
whenever it moves an attached layer.

Naming: CapCut's "magnet" means ripple, but FreeMotion's existing magnet is snapping (`js/timeline.js:351`).
FreeMotion's `parent` means transform parenting (`js/scene.js:707`). So the new link needs its own word, such as
"attached to" or "stuck to".

### (c) One-way vs two-way conversion
- **Every two-format precedent is one-way, a copy, and lossy.**
  - Rush → Pro: Pro projects cannot be opened in Rush.
  - Premiere mobile → desktop: "won't sync", with a list of unsupported features.
  - FCP iPad → Mac: the soundtrack is flattened to a plain AAC.
  - iMovie → FCP.
  - iMovie trailer → movie: "can't convert it back". Apple's advice is to duplicate first.
- **The only two-way "conversion" in the precedents is none at all:** Resolve's pages share one timeline.
- **For FreeMotion:**
  - Switching editors should be a *view switch* on the same project, never a conversion. One tap, like Resolve's page
    bar.
  - "Turning a complex project into a simple one" is then not a conversion. It is the simple editor opening it and
    showing what it can.
  - If a step that genuinely changes data is wanted, for example "tidy this into a main track", make it an explicit
    action that can be undone. Following iMovie, offer a duplicate first. It must never be a mode change that
    silently rewrites the project.

### (d) Collaboration without interference
- **The granularity ladder** in the precedents, from coarsest to finest:
  1. the whole project (CapCut);
  2. a sequence (Premiere Team Projects, with publish/update and conflicts saved as new sequences);
  3. the timeline for editors plus a clip for colorists (Resolve, with accept-updates);
  4. an element or page lock that users toggle (Canva);
  5. per-property last-writer-wins, with no locks (Figma).
- **Presence** is how the real-time ones avoid surprise: Descript's "who's working where", Premiere's lock indicators,
  and Resolve's "who is grading which shot".
- **For FreeMotion:** the existing host sequencer and per-layer leases sit between rungs 4 and 5 already. The new risk
  is the simple user's *structural* edit (a ripple) moving the complex user's layers. The precedents point to:
  - attachments that keep relationships intact;
  - unattached items that ignore ripples;
  - a ripple treated as one sequenced op, with presence text;
  - a lease rule for structural ops. Whether a ripple waits for, or moves, a layer another person holds is a step-2
    decision.

---

## Open questions this research raises for the design step
1. **Should "attached" be stored or derived?** Stored is FCP, LumaFusion and Premiere mobile. Derived is how Resolve's
   Cut page appears to work, which is my inference. Stored is predictable for a non-editor. Derived is the most
   tolerant of free edits made in the complex view.
2. **When the complex user drags a main-track clip freely** (off the sequence, or overlapping another clip), what does
   the simple view show? Resolve's answer is that it is still a track. FCP's answer is that the Position tool leaves a
   gap clip.
3. **Does a ripple from the simple user move a layer the complex user currently leases?**
4. **Phone:** is the magnet always on, as on CapCut mobile, with a toggle only on PC? He asked for phone and PC to work
   the same, and CapCut's phone and PC do *not* behave the same here.
5. **Should old projects open in the simple editor** with an empty main track and everything shown as overlays (the
   Resolve way)? Or should the simple editor offer "make a main track from these clips" as an undoable action (the
   iMovie duplicate-first way)?
