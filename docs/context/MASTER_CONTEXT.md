---
tags: [project]
---

# Arise — Master Context

**Last updated**: 2026-04-09
**Live URL**: https://cadidas333.github.io/Arise/
**Repo**: CAdidas333/Arise (public)

## Who This Is For
Chris Whitney and Kevin (friend/collaborator). This project started as a live demo of Claude Code's capabilities — building a playable browser game from a conversation in real time.

## The People
- **Chris Whitney** — vibe coder, AI-augmented developer. Personal IP under CWImagineering.
- **Kevin** — friend, game design collaborator. Brought the Solo Leveling concept and vision for an immersive RPG experience. Provided live design feedback across Session 1 as we iterated through 16 versions.

## What This Project Does
Arise is a browser-based action RPG inspired by the manga/anime **Solo Leveling**. The game captures the core fantasy of the series: starting as the weakest hunter and ascending through increasingly dangerous dungeons via a mysterious "System" that grants power.

### Features (as of Session 1 / V16)
- **The System UI** — holographic blue interface for stats, skills, quests, and gate selection (faithful to the manga aesthetic)
- **Hybrid combat** — real-time WASD movement + mouse aiming with ability cooldowns (ARPG style)
- **Dungeon/Gate system** — arena-style encounters with enemy waves and a boss hunt finale, ranked E through A
- **Boss hunt mechanic** — arena expands, boss spawns at far edge, creating a hunt feel
- **Stat allocation** — STR/AGI/INT/VIT/PER with 5 points per level; auto-assign button available
- **Shadow extraction** — defeat bosses to extract shadows that fight alongside you (series' signature mechanic)
- **Shadow army AI** — shadows only engage when player is actively fighting; "Arise: Legion" skill sends all shadows berserk simultaneously
- **Hunter rank progression** — E through S rank based on level milestones
- **Daily quests** — "100 push-ups, 100 sit-ups, 10km run" nod to the source material
- **Procedural audio** — Web Audio API synthesizes battle music (135 BPM war drums + power riff) and 10+ SFX at runtime
- **Mobile touch controls** — virtual joystick + attack/skill buttons; fullscreen + safe-area support
- **PWA manifest** — installable to mobile home screen
- **Save/load** — localStorage persistence across sessions
- **High scores + combos** — tracked per session
- **Minimap** — real-time enemy + shadow positions
- **Pause menu** — volume slider, fullscreen toggle
- **Dev mode** — backtick = +5 levels, shift+backtick = -5 levels (hidden, not in UI)

### Origin
Kevin proposed building an MMO RPG that simulates the Solo Leveling experience. For V1, we scoped it to a single-player browser game capturing the core loop: enter gates, fight enemies, level up, extract shadows, repeat with harder content. By Session 1's end, the game was publicly deployed and mobile-ready.

## Architecture
- **Stack**: Pure HTML5 Canvas + vanilla JavaScript
- **Structure**: Single self-contained `index.html` file (~2000+ lines)
- **No dependencies**: No npm, no build tools, no frameworks
- **Audio**: Web Audio API — all music and SFX synthesized at runtime (no external audio files)
- **Rendering**: Canvas 2D with particles, screen shake, glow effects, floating damage numbers
- **State management**: Simple JavaScript objects, game loop via requestAnimationFrame
- **Persistence**: localStorage for save/load and high scores
- **Deployment**: GitHub Pages via `.github/workflows/deploy.yml`

### File Structure
```
Arise/
  index.html          — Entire game (~2000+ lines)
  manifest.json       — PWA manifest for mobile home screen install
  CLAUDE.md           — Project instructions for Claude
  .github/
    workflows/
      deploy.yml      — GitHub Pages auto-deploy on push to main
  docs/
    context/
      MASTER_CONTEXT.md
      ACTIVE_PROJECTS.md
      SESSION_LOG.md
```

### Game States
1. **TITLE** — Animated "ARISE" title screen
2. **CREATE** — Hunter name input
3. **HUB** — System menu (stats, gates, shadows, quests)
4. **DUNGEON** — Active gameplay (combat, waves, boss hunt)

## Key Decisions
- **Single file over modules**: Maximizes portability — just open and play. Can refactor to ES modules later if needed.
- **Zero dependencies**: Keeps it simple, fast to load, no build step to break. Non-negotiable constraint.
- **Arena combat over procedural dungeons**: Simpler to implement, still engaging. Multi-room dungeons are a future phase.
- **Canvas rendering over DOM**: Better performance for particle effects and real-time combat.
- **Procedural audio via Web Audio API**: Eliminates all external asset files; game remains a single HTML file.
- **Shadow AI engagement rule**: Shadows only fight when player is in combat — prevents trivial room-clearing and keeps player as the protagonist.
- **Boss hunt format**: Boss spawns far away on arena expansion, not mid-wave — creates intentional hunt tension.
- **PWA over native app**: Fast path to mobile home screen install without an app store submission.
- **GitHub Pages deployment**: Instant public URL, auto-deploy on push, free hosting.
- **Repo made public**: CAdidas333/Arise — showcase/fan project, not commercial.
- **Solo Leveling IP**: This is a fan game / personal project, not for commercial distribution.

## Related Projects
- Standalone project, no dependencies on AVL, ICC-SaaS, ABR, or Armory.
- Part of the Jim Coleman Auto Group workspace for convenience but unrelated to dealership operations.
