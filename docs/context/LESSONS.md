# Arise — Lessons

## 2026-04-09 — Web Audio API eliminates the audio asset problem for single-file games

**Tried**: The single-file constraint made external audio files impossible to bundle without a build step.

**Outcome**: Web Audio API synthesizes all music and SFX at runtime — drums, kick, snare, hi-hats, a power riff lead, and 10+ event SFX — with zero external files. The game remains a drag-and-drop index.html. Music quality improved significantly over four iterations (V5, V6, V15 were all audio rewrites based on feel).

**Next time**: For any zero-dependency browser project needing audio, go straight to Web Audio API synthesis. Skip the "let's use audio files" idea entirely.

---

## 2026-04-09 — Live collaborator feedback with rapid iteration cycles beats upfront design

**Tried**: We had a rough design in mind but no detailed spec. Kevin joined as a live design critic across 16 build cycles in one session.

**Outcome**: Shadow AI behavior, the boss hunt format, Legion skill, and dev mode all emerged from Kevin's real-time reactions — none were planned upfront. The game is significantly more interesting than the original spec would have produced.

**Next time**: For game projects with a willing collaborator, prioritize a fast playable loop early and schedule dedicated feedback time over long spec sessions. The feedback loop IS the design process.

---

## 2026-04-09 — PWA manifest + GitHub Pages = instant mobile deployment with zero infrastructure

**Tried**: Needed a way to get the game onto mobile devices without an app store.

**Outcome**: `manifest.json` + GitHub Pages deploy action = publicly accessible URL that mobile browsers can install to the home screen as a pseudo-native app. Total setup time was under 15 minutes. URL was live at https://cadidas333.github.io/Arise/ same session it was conceived.

**Next time**: For any showcase/demo browser project, add the PWA manifest and GitHub Pages workflow on day one. It's low-effort and dramatically improves the "show someone" experience.

---

## 2026-10-09 — Rewriting a 2,500-line file in one output hits the output limit; build it in parts

**Tried**: Rewrote the whole game script (about 2,500 lines) as a single output for V17.

**Outcome**: The output limit was hit and 39 minutes were lost. Building it as a dozen parts of a few hundred lines each and assembling them worked. (The same shape is now permanent: the script lives as 13 files in `js/`.)

**Next time**: For any file past a few hundred lines, plan it as parts from the start and assemble them. Never attempt one giant write.

---

## 2026-10-09 — A scripted bot playing every gate finds balance problems before a human does

**Tried**: A bot that plays each gate through the `#debug` hook (the test door into the running game) at entry level with no dodging.

**Outcome**: It found three balance problems before any human played: enemies that died in one hit, enemies that were harmless, and runaway levelling. The numbers in `GATE_DEFS` were set from these runs. Caveat: the bot lives only in the session transcript, not in the repo, so it cannot be re-run (see OPEN_THREADS).

**Next time**: Keep a `#debug` hook in any game and run a bot through every level before asking a person to play. Save the bot in `tools/` so it is repeatable.

---

## 2026-10-09 — Look at generated art for what it shows before using it

**Tried**: Generated painted floors and a portal with the image model and checked them on screen.

**Outcome**: Two images were rejected: the model drew a lava floor as a framed "sample" instead of a full floor, and drew a portal shaped like a question mark. Both were redone. A passing file size or format check would have let them through.

**Next time**: Open every generated image and look at what it actually shows before it goes in the game. Write the prompt to ask for a full edge-to-edge floor, and re-roll anything that reads as the wrong object.

---

## 2026-10-09 — Decorative "magic circle" geometry reads as occult imagery

**Tried**: Put a star inside a circle at the arena centre, plus rune tiles on the floor, as pure decoration.

**Outcome**: Chris objected right away ("pentagram"). It was replaced with a star-free circle (nested rings, tick dial, orbiting circles, turning hexagon or octagon) and plain diamond floor tiles. The standing rule is now in `CLAUDE.md` and `assets/CREDITS.md`.

**Next time**: Avoid star shapes, runes and occult-looking symbols in any art, including generated images. If a design might read that way, ask first.

---

## 2026-10-09 — A version stamp with one-minute precision can collide, and a test then runs old code

**Tried**: Stamped the script tags (`?v=`) with the date to the minute, then stamped twice inside one minute while testing a merge.

**Outcome**: The two stamps were identical, so the browser kept the old scripts and a browser test passed or failed against stale code with no error. `tools/stamp.sh` now stamps to the second.

**Next time**: Stamp to the second. Before trusting a browser test of new code, check that the new code is actually loaded (for example, that a function you just added exists in the page).

---

## 2026-10-09 — Text-to-speech tone follows punctuation more than settings

**Tried**: Asked for an urgent, anxious boss warning from ElevenLabs by adding exclamation marks and adjusting voice settings.

**Outcome**: Exclamation marks gave a cheerful, giggly, cheerleader read. Plain full stops, plus an unspoken lead-in sentence and follow-on sentence describing fear (cut away afterwards), gave the anxious, clipped read Chris wanted. A model cannot hear, so he chose by ear between labelled takes, and a local transcriber confirmed the words were right.

**Next time**: Steer tone with plain punctuation and unspoken mood sentences, not exclamation marks. Offer two or three labelled takes and let the person choose, and confirm the spoken words with a local transcriber.

---

## 2026-10-09 — Record a line with its pause, then cut it at the pause into separate clips

**Tried**: Needed "Shadow extraction. ... Successful." to land with an on-screen result, which can succeed or fail.

**Outcome**: Recording the line once with the nervous pause and cutting it at the pause gave separate clips (the announcement, then "Successful." or "Failed."). The game now controls the wait (2 seconds) between them, so the voice and the screen stay in step.

**Next time**: For any spoken line that has to land with an on-screen result, record it with the natural pause, cut at the pause, and let the game time the gap.

---

## 2026-10-09 — A hidden browser pane returns stale screenshots without any error

**Tried**: Took screenshots of the game in the browser pane while the pane was hidden.

**Outcome**: The screenshots came back stale (an old frame) and no error was raised, so a change looked like it had not worked. Capturing the canvas itself with `toDataURL` and saving it through a small local receiver gave true frames to look at.

**Next time**: If a screenshot looks unchanged, do not trust it. Capture the canvas (`toDataURL`), save it through a small local receiver, and look at the saved image.

---

## 2026-10-09 — A second page kept as a hand-made copy of the first drifts at once

**Tried**: The 3D experiment page began as a copy of `index.html`.

**Outcome**: The copy drifted straight away: stale script stamps and wrong relative paths for the sounds and images. The fix was to generate `3d/index.html` from `index.html` with a small script (`tools/sync3d.py`, run by `tools/stamp.sh`) and to add `<base href="../">` so every relative path resolves from the repo root.

**Next time**: When two pages must share most of their content, make one the source and generate the other. Use `<base href>` so relative paths resolve from one root.

---

## 2026-10-09 — To ship one finished step from a work branch that also holds an unapproved step, move the public branch to the last good commit

**Tried**: The V18 work branch held the finished System voice (step 2) and the hunter body (step 4a) that Chris had not approved yet.

**Outcome**: Moving the public branch to the tip would have shipped both. Moving it to the last commit before the unapproved work shipped only the voice (commit 18b896a). The hunter body shipped later, once pass 2 of it was accepted.

**Next time**: Keep each step as its own commits and ship by moving the public branch to the last commit before anything unapproved, not to the branch tip.

---

## 2026-10-09 — Judge a free worker's output by comparing with the brief and by looking at the result

**Tried**: Reviewed worker output (voice wiring, hunter body pass 1) only against the brief.

**Outcome**: When a brief contains the exact code, a script that compares the result with the brief character for character (and checks the rest of the file is untouched) is the reliable review. But visual work cannot be judged from the diff: pass 1 of the hunter matched the brief exactly and still read as a glowing outline doll, because the numbers in the brief were wrong. Looking at a captured frame caught it.

**Next time**: Diff against the brief with a script for exact-code briefs, and always judge visual work from a captured frame. When the result matches the brief but looks wrong, fix the brief, not the worker.

---

## 2026-10-09 — worker redo does not accept --timeout, and fails quietly

**Tried**: Ran `worker redo` with a `--timeout` option, as `worker run` accepts.

**Outcome**: Only `worker run` takes `--timeout`. The redo exited without doing anything and still returned 0, so it looked as if it had worked.

**Next time**: Do not pass `--timeout` to `worker redo`. After any redo, check that a new commit was made on the worker branch before reviewing.

## 2026-10-10 — A brief that says "both calls are in the same function" must be checked before it is sent

**Tried**: The old-hunter switch brief told the worker to add one `const` above the first `drawHunter` call and use it in both calls, stating that both calls were in one function. The review compared the diff with the brief by script, and the browser test ran a fight without dodging.

**Outcome**: The two calls are in different functions (`drawPlayer` and `drawWorld`). The second call only runs while dodge afterimages exist, so every dodge threw an error. It was on the public site for about nine minutes (01:11 to 01:20) before a later test that happened to dodge caught it.

**Next time**: Before writing "same function" or "same scope" in a brief, look at the enclosing function of every line named. A browser test of anything that touches the hunter must include a dodge, an attack, the Awakening and a hit, not only a plain fight. A diff that matches the brief exactly proves the worker followed it, not that the brief was right.

## 2026-10-10 — Getting a frame out of the public page: carry it in window.name

**Tried**: Posting a captured canvas from the public https page to the local receiver on `127.0.0.1`.

**Outcome**: The browser pane blocks requests from a public page to a local address ("Failed to fetch"), whatever headers the receiver sends.

**Next time**: On the public page, draw the frames into one canvas and store the data URL in `window.name`. Navigate the same tab to the local preview page, read `window.name` there, and post it to the receiver. It survives the navigation.

## 2026-10-11 — Two agents declared the same top-level name and the whole 3D renderer stopped loading

**Tried**: Two sub-agents built in parallel and each added a top-level constant called `GEAR_COLORS` (one in `js/01-data.js`, one in `3d/render3d.js`).

**Outcome**: All the scripts share one global scope, so the second declaration is an error and the whole 3D renderer failed to load. The orchestrator's browser test before shipping caught it; it never reached the public page. `tools/check_names.sh` now lists any top-level name declared twice.

**Next time**: Run `tools/check_names.sh` after every merge, and tell parallel agents which names the others own. (Open thread G8: run it from `tools/stamp.sh`.)

## 2026-10-11 — `git add -A` staged the sub-agents' worktrees as embedded repositories

**Tried**: Committed with `git add -A` while sub-agent worktrees sat under `.claude/worktrees/`.

**Outcome**: They were staged as embedded repositories. Caught before any push and removed; `.claude/worktrees/` is now in `.gitignore` (and `assets/music/takes/`).

**Next time**: Ignore a worktree folder before the first agent uses it, and read `git status` before committing in a repo that has worktrees.

## 2026-10-11 — Another project's server answered for `localhost`, so a test loaded the wrong site

**Tried**: Tested Arise at `http://localhost:8765/` while another project's session had started a server on `*:8765`.

**Outcome**: `localhost` resolved to the other server and the test loaded the wrong site; the page title gave it away. Arise now has its own port, 8767 (`tools/serve.py`, a threaded server), and tests use `127.0.0.1`.

**Next time**: Check the page title (or a known function) before trusting a test, use a project-specific port and `127.0.0.1`.

## 2026-10-11 — A cached page after a re-stamp made a test run old code and "pass"

**Tried**: Re-ran a browser test after `tools/stamp.sh` changed the script stamps.

**Outcome**: The browser pane served the cached page, so the test ran old code and passed. Screenshots of the hidden browser pane are also stale (see 2026-10-09). A headless Chrome screenshot (`--headless=new --screenshot`) of a temporary copy of the page is reliable; disable CSS animations when using virtual time.

**Next time**: Add a fresh query string, then check the stamp and that a function you just added exists before trusting any result. On a heavily loaded Mac one long browser script times out at 45 seconds, so split tests into short calls.

## 2026-10-11 — Sub-agents that render and LOOK at their own work needed no second pass

**Tried**: Briefed sub-agents on visual work (room dressing, 3D figures, the result card) to render their output with headless Chrome from a temporary page with a small setup script, look at the picture, and fix what they saw before returning.

**Outcome**: The visual work came back needing no second pass, where earlier visual jobs (hunter pass 1, boss looks) were sent back after a diff that matched the brief looked wrong on screen.

**Next time**: Put the render-and-look recipe in every visual brief.

## 2026-10-11 — A read-only reader agent ran out of turns before writing anything

**Tried**: Sent a read-only "reader" agent to sweep the code with no limit on how many tool calls it could make.

**Outcome**: It spent its turns reading and returned nothing.

**Next time**: Give readers a hard tool-call budget and say a partial report beats none.

## 2026-10-11 — A cost lookup changed the question: API music is billed in dollars, not credits

**Tried**: Planned the ElevenLabs music job on the assumption that it spends plan credits, as the voice and effects did.

**Outcome**: A cost lookup before the first call showed music through the API is billed in dollars ($0.15 a minute), so the question became one of money. Money is Chris's call, so the orchestrator held the first call and asked (decision cards D-0097 and D-0099). He approved in chat; six takes cost about $1.35. His later "approved. do it." was read as "put it in, you pick", and that reading was stated aloud, so the picks (made from a classifier's labels, not by ear) are marked as his to swap.

**Next time**: Look up the billing basis before any paid generation, hold the first call when it turns out to be money, and state out loud how an ambiguous "approved" was read.

## 2026-10-11 — When a sub-agent adds a script tag while the orchestrator re-stamps, the merge conflicts on the script-tag block

**Tried**: Merged a sub-agent's branch after the orchestrator had run `tools/stamp.sh` on the main line.

**Outcome**: Both sides changed the `<script>` block in `index.html` (a new tag on one side, new `?v=` stamps on the other), so git reported a conflict.

**Next time**: Keep the block that has the new tag, then run `tools/stamp.sh` to refresh every stamp.

## 2026-10-15 — Headless captures: an iframe page hung, a page copy with the setup injected worked

**Tried**: Captured game frames with headless Chrome from a small page that loaded the game in an iframe and set it up from outside; then the same with `--timeout` instead of `--virtual-time-budget`.

**Outcome**: The iframe page never finished under virtual time (killed after 50 seconds), and `--timeout` returned plain black frames. What worked, in about 8 seconds a frame: a throwaway copy of `index.html` (or of `3d/index.html` with its `<base>` removed) at the repo root with the setup script injected before `</body>` (run on `load` plus 800 ms, CSS animations off), captured with `--headless=new --user-data-dir=<own folder> --virtual-time-budget=1000 --run-all-compositor-stages-before-draw --screenshot=...`. The setup must call `hide('title-screen')`, or the title overlay covers the frame. A budget just above the setup delay catches a moment (a dodge's afterimages, a beam mid-sweep).

**Next time**: Use that recipe; keep the copies out of git (delete them after) and give Chrome its own profile folder so it never collides with the user's Chrome.

## 2026-10-15 — A boss test that starts during the 3.2-second boss intro sees nothing happen

**Tried**: Forced a boss's attack or phase change right after `enterBossArena()` in a browser test.

**Outcome**: The first cast never fired and phase changes showed late, because `startBoss` sets `dungeon.state = 'intro'` for 3.2 seconds and the boss does not act until it ends. It looked like a fault in the boss code and was not.

**Next time**: In a boss test, step the game until `dungeon.state === 'fight'` before forcing anything.

## 2026-10-18 — A worker said every check passed; the merged overlay script would not load

**Tried**: Merged a free-worker job (OpenCode, after Gemini ran out of quota) whose report said all checks passed.

**Outcome**: `node -e "require('./tools/lib/headless.js').createGame()"` failed after the merge: `drawMinimap` now declared `const b` twice (the new minimap box and the old boss marker), so `js/12b-overlay.js` would not load in either view. `tools/check_names.sh` cannot see it: it lists only top-level names. Caught before the stamp; fixed by hand in one line (068378e). The worker had hit its 30-minute limit, so its last check may never have run.

**Next time**: Run the headless load yourself after every merge and before `tools/stamp.sh`, and do not trust a "checks passed" from a worker that ran out of time. Start the next job only after that check is green, or it inherits the fault.

## 2026-10-20 — Work logged under an old entry's header, or not logged, makes the log look stale to Houston

**Tried**: Logged the work of 10-16 to 10-18 as bullets at the bottom of the 10-15 entry (three small doc commits), and earlier let Session 7 (10-12) end with no entry at all.

**Outcome**: Houston's context-drift check reads the date of the newest entry, so it saw the log as stale both times: it read 10-15 on 10-20, and it flagged the missing Session 7 entry on 10-15. Each entry had to be rebuilt later from the handoff and the commits (893bad2 on 10-15, 4582c8c on 10-20).

**Next time**: Give each wake its own dated entry header in `SESSION_LOG.md` as soon as it ships something, and put its bullets under that header, not under an older one.

## 2026-10-27 — An iPad is not caught by a user-agent check, and the pane's tablet size does not emulate touch

**Tried**: The phone and iPad check in the browser pane at its tablet size (768 by 1024).

**Outcome**: The game said it was not a touch device and showed no touch controls. The pane only emulates touch below 768 wide, so that alone proved nothing, but the code showed the real fault: `isMobile` tested the user agent for iPad and a width under 1024, and an iPad on iPadOS reports a Mac user agent and is 1180 to 1366 wide held sideways. Every iPad held sideways would have had no joystick or buttons.

**Next time**: Detect touch by the device (`navigator.maxTouchPoints > 1` with `(pointer: coarse)`), never by the user agent alone. Test wide touch layouts with `?touch=1` at the real iPad sizes (820 by 1180, 1180 by 820, 1366 by 1024).
