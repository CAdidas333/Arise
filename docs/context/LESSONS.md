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
