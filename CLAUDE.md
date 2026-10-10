# Arise — Solo Leveling Browser RPG

Read `docs/context/MASTER_CONTEXT.md` for full project context.
Read `docs/context/ACTIVE_PROJECTS.md` for current tasks and priorities.

## Cross-Project Context
For how Arise relates to other projects:
- Read `../_brain/Dashboard.md` for all project statuses at a glance.
- Read `../_brain/Cross-Project-Architecture.md` for data dependencies.
- Read `../_brain/Feedback/Working-Style.md` for global working rules.
- Read `../_brain/Feedback/Code-Standards.md` for coding standards.

## Stack
- Pure HTML5 Canvas + vanilla JavaScript
- Zero dependencies, zero build step
- `index.html` plus `js/` (13 classic scripts, loaded in order) and `assets/` — open in browser and play (Chris lifted the single-file rule 2026-10-09)
- Serve locally: `python3 -m http.server 8080` or `npx serve`

## Critical Arise Rules
- Keep it zero-dependency — no npm, no bundler, no frameworks
- Run `tools/stamp.sh` before committing any change in `js/`
- No star symbols, runes or occult imagery in any art (see `assets/CREDITS.md`)
- Game must work by opening index.html directly or via simple HTTP server
- Visual quality is paramount — this is a showcase project
- Solo Leveling aesthetic: dark backgrounds, cyan/blue glow, purple accents
