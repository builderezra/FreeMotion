# Simple mode (the "CapCut / Premiere" version): design project status

Owner: the LOGGING chat. **Planning only. Nothing gets built until Ezra says so** ("don't build it until I say to do it").
Everything for this project lives in `tools/design/plans/simple-mode/`. The loop in the logging chat reads this file every
tick and works the first unchecked step. A step that is running shows its workflow run id; while it runs, a tick does nothing.

## His brief (28 Sep), condensed. The verbatim message is in REQUESTS.md / INBOX.md
- Two editors in one app: today's FreeMotion is the "After Effects / Alight Motion" one (free layers anywhere). Add a
  "Premiere Pro / CapCut" one: very simple, where someone who can't edit figures it out, and someone who can edit puts
  something nice together fast. Clips one after another, make them look nice, text, captions. No advanced 3D effects.
- CapCut's level of complexity is the ceiling for the simple one, especially on the phone. Phone and PC work the same.
- A QUICK way to switch between them. Decide how a project starts in one or the other. Whether an existing project can be
  turned from the complex version into the simple one, and back, and how switching around works.
- Live collaboration between a simple-mode user and a complex-mode user on the SAME project at the same time, without
  interfering.
- The timeline difference is the heart of it: CapCut is one main track, clip after clip, with overlays/effects/text in their
  own sections; FreeMotion is layers anywhere on top of anything.
- Deliverables: think out every little bit; visualizers; a description of how it works and how the code implements it, so if
  he agrees it is easy to go. Use lots of agents. Keep the loop ticking every minute until it is all done.

## Steps
- [x] 1. DONE 29 Sep — Research (workflow wf_01593d27-00f; notes in research/, 3,167 lines): CapCut mobile+desktop feature inventory and timeline model; Premiere Pro / Premiere Rush /
        Final Cut (magnetic timeline, connected clips) / iMovie; FreeMotion's scene model, timeline, UI and collab internals.
- [x] 2. DONE 29 Sep — Design (judge panel; DESIGN.md 1,230 lines, design-*.md, judge-*.md): 3 independent designs (model-first, UX-first, collab-first), judged, synthesised into one.
- [x] 3. DONE 29 Sep — Hole-poking, 3 rounds (max), 352 confirmed holes patched into DESIGN.md (§20 log); NOT dry: round 3 still found 101, all build-level detail. Another pass comes at step 7 and before each phase. Originally: edge cases (keyframes across splits, speed, groups/parents, masks, adjustment layers,
        templates, captions, audio, undo across modes, switching mid-collab, export parity, old projects).
- [x] 4. DONE 29 Sep — Visualizers V1–V12 built, QA'd (86 defects fixed), PUBLISHED: https://claude.ai/artifact/9TWddZCGHH1aNyJDiXZbZB (source vis/index.html; republish the same file path to keep the URL). Originally: interactive prototypes (simple editor on phone and PC, mode switch, conversion, two-mode collab,
        architecture). Published as artifact page(s).
- [x] 5. DONE 29 Sep — BUILD-PLAN.md (3,545 lines, Phase 1 as steps 1.1–1.3 (+1.4 anchors), rehearsed on a scratch copy: 24 new tests fail-before/pass-after at 1280 and 380; reviewed: ready-after-fixes) — Implementation plan for the builder (files, phases, tests), adversarially reviewed.
- [x] 6. DONE 29 Sep — Present to Ezra: link(s), the decisions he needs to make, recommendations.
- [ ] 7. WAITING ON HIM — Rethink pass after his first reactions (repeat as needed).

## Log
- 28 Sep ~23:40 — project set up; request logged to INBOX (planning only); loop armed in the logging chat (cron 680cacf6, every minute, 7-day expiry); step 1 launched (6 researchers → research/*.md).
- 29 Sep — step 1 done: six notes. Headline: every editor that splits simple/pro as two FILE FORMATS converts one way and loses things (Rush→Premiere, now retired); Resolve's Cut/Edit pages are two UIs over ONE timeline. So: one project, two views, magnetism as a behaviour of the simple view. Step 2 launched (3 designers → 3 judges → DESIGN.md).
- 29 Sep — step 2 done. All three judges picked the same core: one document; `start` stays the only stored time; optional per-layer flags (sm.main / sm.stay); magnetism lives in the Quick editor's commands (FM.spine), each one undo step and one collab tx; Full editor unchanged. Names working-titled Quick / Full. 8 phases, D1–D15 decisions, 12 visualizers listed (§18), 22 open questions (§19). Step 3 launched (6 finder lenses → verifiers → patcher, up to 3 rounds).
- 29 Sep — step 3 done: 352 holes (2 blockers: the z pass lifting layers meant to sit behind a main clip, and A-roll/B-roll picking the cutaways as the main track), all patched. DESIGN.md is now 4,218 lines. Lesson saved to memory: the verifier fan-out was keyed on a model-written string and ran 302 agents. Step 4 next: a coherence pass on DESIGN.md, a shared mock kit, V1–V11 in parallel, QA at 380/1280, then publish one hub artifact.
- 29 Sep — step 4 launched: coherence pass + SUMMARY.md, the kit (vis/kit.css, kit.js with VIS.engine and tests, hub index.html), V1–V12 builders, QA at 380/1280, and fixers grouped by the script's own file key. About 28 agents planned.
- 29 Sep — step 4 done and published (V1–V12 in one hub; engine tests 459,798 assertions pass). DESIGN.md coherence pass: final decisions D1–D21 in §17; SUMMARY.md written. QA screenshots moved out of the repo to scratch. Step 5 launched together with the handoff polish (kit / pages / design groups). After it: republish, then step 6 (present).
- 29 Sep — steps 5 and 6 done. The handoff polish was applied (kit, pages, design) and the page republished as Version 2 at the same URL. Six leftover dev servers from this chat's agents (8793–8798) were stopped; the builder's Chrome was left alone. Everything that doesn't need him is done, so the every-minute loop was stopped (cron 680cacf6 deleted). Restart it when his decisions or reactions arrive.
