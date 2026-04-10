---
tags: [project]
---

# Arise — Master Context

## Who This Is For
Chris Whitney and Kevin (friend/collaborator). This project started as a live demo of Claude Code's capabilities — building a playable browser game from a conversation in real time.

## The Person
- **Chris Whitney** — vibe coder, AI-augmented developer. Personal IP under CWImagineering.
- **Kevin** — friend, game design collaborator. Brought the Solo Leveling concept and vision for an immersive RPG experience.

## What This Project Does
Arise is a browser-based action RPG inspired by the manga/anime **Solo Leveling**. The game captures the core fantasy of the series: starting as the weakest hunter and ascending through increasingly dangerous dungeons via a mysterious "System" that grants power.

The game features:
- **The System UI** — holographic blue interface for stats, skills, quests, and gate selection (faithful to the manga aesthetic)
- **Hybrid combat** — real-time WASD movement + mouse aiming with ability cooldowns (ARPG style)
- **Dungeon/Gate system** — arena-style encounters with enemy waves and boss fights, ranked E through A
- **Stat allocation** — STR/AGI/INT/VIT/PER with 5 points per level
- **Shadow extraction** — defeat bosses to extract shadows that fight alongside you (the series' signature mechanic)
- **Hunter rank progression** — E through S rank based on level milestones
- **Daily quests** — "100 push-ups, 100 sit-ups, 10km run" nod to the source material

### Origin
Kevin proposed building an MMO RPG that simulates the Solo Leveling experience. For V1, we scoped it to a single-player browser game that captures the core loop: enter gates, fight enemies, level up, extract shadows, repeat with harder content.

## Architecture
- **Stack**: Pure HTML5 Canvas + vanilla JavaScript
- **Structure**: Single self-contained `index.html` file
- **No dependencies**: No npm, no build tools, no frameworks
- **Rendering**: Canvas 2D with particle effects, screen shake, glow effects
- **State management**: Simple JavaScript objects, game loop via requestAnimationFrame

### Game States
1. **TITLE** — Animated "ARISE" title screen
2. **CREATE** — Hunter name input
3. **HUB** — System menu (stats, gates, shadows, quests)
4. **DUNGEON** — Active gameplay (combat, waves, bosses)

## Key Decisions
- **Single file over modules**: Maximizes portability — just open and play. Can refactor to ES modules later if needed.
- **Zero dependencies**: Keeps it simple, fast to load, no build step to break.
- **Arena combat over procedural dungeons**: Simpler to implement, still fun. Multi-room dungeons are a future enhancement.
- **Canvas rendering over DOM**: Better performance for particle effects and real-time combat.
- **Solo Leveling IP**: This is a fan game / personal project, not for commercial distribution.

## Related Projects
- This is a standalone project, no dependencies on [[AVL]], [[ICC-SaaS]], [[ABR]], or [[Armory]].
- Part of the [[Jim-Coleman-Auto-Group]] workspace for convenience but unrelated to dealership operations.
