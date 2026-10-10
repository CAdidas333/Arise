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
