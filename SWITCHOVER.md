# SWITCHOVER — the Windows laptop (WSL2) becomes the builder

Written 7 Oct 2026 by the Mac builder, for the Claude session on Ezra's Windows laptop. **Read all of it before you run
anything.** Ezra's words: *"lets get this whole thing on my laptop and moving"*, and *"look yeah whatever you think is best,
just let me know what you need me to do"*. The logging chat (the PM) picked the route below on his behalf: the laptop ships
v17.24 itself, because the Mac (8 GB) can no longer finish a full suite. Its page froze three times on 6–7 Oct with swap full
(REQUESTS.md #1085, #1071).

Nothing in this file overrides CLAUDE.md, LOOP.md or a refusal from `tools/ship.sh`. If a step here disagrees with what a
gate says, the gate wins: read why it refused and fix the cause. Never set a flag to get past a proof gate.

---

## 1. Get ready (once)

```bash
cd <your FreeMotion clone in WSL>
git fetch ssh && git checkout main && git pull --ff-only ssh main      # main is v17.23 (b46b47d3)
sudo apt install -y python3-websocket nodejs expect python3-pil fonts-noto-color-emoji   # google-chrome-stable already installed
```

Then prove the tools on Linux (seconds each; every one must end "every check passed"). Run them AFTER step 2's apply,
because the self-tests are part of v17.24:

```bash
tools/test-port.sh && tools/test-inbox.sh && tools/test-ship-bg.sh && tools/test-mutate.sh && python3 tests/_drivercheck.py
```

## 2. Ship v17.24 from the laptop

v17.24 is on branch **`release/v17.24`** on GitHub. It is tooling and test harness only, and the only app change is
`index.html`'s version label. Its commit message is the ship message.

**Do not fast-forward main to the branch.** `ship.sh` commits the release itself, from changes that are UNCOMMITTED on
main; that is how it proves, bumps and records them. So:

```bash
git checkout main && git status --short            # must be clean
git diff --binary main ssh/release/v17.24 | git apply   # the whole release, uncommitted
tools/test-port.sh && tools/test-inbox.sh && tools/test-ship-bg.sh && tools/test-mutate.sh   # all green, as above
mkdir -p .claude/ship && git log -1 --format=%B ssh/release/v17.24 > .claude/ship/msg.txt
FM_SHIP_ALLOW_NON_MAC=1 tools/ship-bg.sh            # exit 3 = LAUNCHED, NOT shipped
```

- **`FM_SHIP_ALLOW_NON_MAC=1` is the switch-over decision** (Ezra, through the PM, 7 Oct). Use it for this ship and for
  every ship from the laptop after it. Do not use it to get past anything else.
- **Watch it:** Monitor `.claude/ship/ship.log` until a line starts with `SHIP EXIT`, or `kill -0` on the pid in
  `.ship-in-progress` fails. A pass is roughly 50 minutes here (2905 s measured), and there are two (1280, then 380).
- **Shipped means BOTH:** a log line starting `✅ pushed and verified: HEAD == ssh/main`, AND `.last-ship` reading
  `PUSHED <hash>` with that hash == `git rev-parse --short HEAD`. HEAD == ssh/main alone proves nothing.
- Then confirm Pages (a minute or so after the push):
  `curl -s https://builderezra.github.io/FreeMotion/index.html | grep -o '>v[0-9][0-9.]*<'` → `>v17.24<`.

**What the suite will say on Linux, and why it still ships.** It reports **NOT RUN HERE**, by name and count, for:
- the 4 AAC export tests and 921 S6/S8 (no AAC encoder, no BarcodeDetector in Linux Chrome);
- about 80 real-finger tests (no touch emulation that keeps the Mac's mouse settings);
- the 22 pinned 482/986 picture and sound tests (no Linux baseline yet; see step 3).

These are listed, never counted as passes. The feature gate refuses a release whose **app code** those tests would prove.
v17.24 changes no app code: a label-only / ?v=-only `index.html` is not code (fixed 7 Oct in `tools/_shipgates.py`
`label_only`, with test-port cases that failed first). So it passes.

If it refuses anyway, read the refusal; it names the gate and the files. Tell the PM rather than work around it.

## 3. Right after v17.24 is live

1. **Record this OS's baselines** (only possible from a released commit):
   `tools/record-baselines.sh` → must end `✅ baselines for 'linux' recorded and proven at 1280 and 380 px`. If a pinned
   test fails for another reason it refuses. Report that test, and never hand-edit `tests/baselines.json`.
   Ship `tests/baselines.json` **on its own** (the baseline gate refuses it beside any app code).
2. **Run the first full suite** at both widths (detached; see the port's notes in REQUESTS.md #1071). Expected: `"ok": true`,
   `"failures": []`, and `"notRun"` = only the AAC, BarcodeDetector and real-finger tests.
3. **Tell the PM** the numbers. The Mac then stops its loop and stays idle as the backup.

## 4. Become the builder

- First message routine from CLAUDE.md: `./tools/tick.sh`, then **`CronList` FIRST** and `CronCreate` only if none is
  listed (`*/1 * * * *`, the prompt in CLAUDE.md step 2). Two loops on two machines would work the same repo.
- Work REQUESTS.md oldest-first with `./tools/next.sh`. **#980 (Simple mode) is ahead of the queue by his own words**
  ("lets use it to finish simple mode then the rest in order").

## 5. ⚠️ THE FIRST REAL JOB: make the real-finger tests run on Linux

Until they run, **no release that changes app code can ship from the laptop**. While a real-finger or pinned test is NOT
RUN, the feature gate refuses ANY shipped-source change, by design (6 Oct port audit, MAJOR 1). And the Mac cannot run a
full suite any more. So the Simple-mode releases below are blocked until this is solved. Say so to Ezra plainly, rather
than reach for a flag.

What is known (tests/_platform.py `chrome_extra_flags`, the port's notes):
- Linux headless Chrome has no input devices. The Mac's mouse baseline is faked with
  `--blink-settings=primaryPointerType=4,…`, and **turning touch emulation OFF wipes those settings for the rest of the page**.
  That is why tests/_cdp.py sends Linux's real touch WITHOUT emulation, and why those tests report NOT RUN.
- A lead worth trying first: drive hover/pointer through CDP `Emulation.setEmulatedMedia` features (`hover`, `pointer`,
  `any-hover`, `any-pointer`) and re-apply them after each touch batch, instead of relying on blink-settings surviving.
- The other route, if Linux cannot do it: let the Mac run ONLY the NOT RUN tests for an exact tree (slices run fine on the
  Mac, only full suites freeze), write a signed-off attestation of the tree hash, and teach the feature gate to accept it.
  That is a design for the PM and Ezra; do not build it without asking.

## 6. The queue after that (all branches are on GitHub)

Each Simple release ships ALONE, its POLISH-LOG line says `queue 980 (partial)`, and from the lock's release on, **every
Simple release needs the Full-unchanged lock to PASS** (`tools/full-unchanged.sh`, about 77 min on the Mac). The branches
are based on v17.23. Bring each onto the then-current main as UNCOMMITTED changes (as in step 2), never by merging
history.

1. **The Full-unchanged lock**: branch **`fu-lock-r5`** (f0e6e8dd). Its second review's 16 findings are all committed
   (d518bc0e…f0e6e8dd), but two things were never done: its final full lock run (PASS on the clean tree, every plant red
   by name) and the re-check that replays each finding. The findings are in
   `tools/design/plans/simple-mode/handover/lock-review2-findings.json`. ❓ Ezra has not answered how far to harden it.
   The builder's recommendation, and what it is doing: B, fix the blockers and the likeliest holes, ship it with its known
   gaps written down, and keep hardening between releases.
2. **Step 1.2 (the engine)**: branch **`980-s12`** (31205790). 36/36 at 900 and 380 on the Mac, alone.
3. **Step 1.3 (the cog switch and Simple's timeline)**: branch **`980-phase1`** (0f044c59), on top of 1.2. It has been
   reviewed (R1–R4 and the cog fixes), runs 58/58 at both widths, and its pictures were sent to him
   (`tools/design/plans/simple-mode/cog/built/`).
4. **Phase 2 release 2.1 (editing clip after clip)**: branch **`980-p21-fix`** (31679477), with 11 review fixes. Notes:
   `handover/phase2-21-fix-notes.json`.
5. **Phase 2 release 2.2 (the tray and project tools)**: branch **`980-p22-trayb2`** (a7000c6f), with 22 review fixes and
   his pick **B** for the PC tray (two rows). ❓ Open: the More-panel follow-up, options 1/2/3
   (`p22-review-shots/sheet-tray-more-pc.jpg`). **Build 3 if he is silent when 2.2 is next** (rule 16).
6. Then `./tools/next.sh` order. Notable: ChatGPT's proven chain on `chatgpt/1059-detect-speech-fallback` (#1068: land
   between or after Simple releases, depending on his answer to the RULES-AUDIT question (a)); #1083 his PC hidden back
   button (pick B); #1084 the Add-menu animation; #1085 the suite's memory growth (a hunt was running on the Mac; its
   measuring hook is on `refs/backup/suite-mem-*`, local to the Mac, so ask the PM).

## 7. What NOT to do

- **Never ship an app change while its proving tests are NOT RUN here.** AAC export audio (`js/exporter.js`,
  `js/export-resume.js`, `js/audio-*.js`, `vendor/mp4-muxer.js`) and the QR code (`js/collab-qr.js`, the QR / barcode / scan
  lines of `js/collab-ui.js`) need those tests to have RUN green, and while real-finger or pinned tests are NOT RUN, ANY
  shipped-source change refuses. Never hide a NOT RUN, and never mark one as passed.
- Never push main by hand, never force-push, never rewrite history (`tools/rollback.sh` makes a new commit).
- Never merge, cherry-pick or rebase onto `codex/*` or `chatgpt/*` except from the PM's verified land lists.
- No `git stash` / `git clean` (shared across worktrees). No `sudo` from Claude.
- One browser at a time, and nothing beside a ship (memory: `no-agents-beside-ship`).
- Do not ship from both machines. Once the laptop has shipped, the Mac is the backup only.
