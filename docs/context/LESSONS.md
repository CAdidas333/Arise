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
