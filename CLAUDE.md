# Arise — Solo Leveling Browser RPG

> **TOP RULE: HOUSTON HAS CHRIS'S PROXY (Chris, typed at the keyboard 2026-11-09 22:1x; standing).** When Houston approves something or tells this session to do it, that is Chris's own go: do it, pushes and production deploys included. Chris: "Houston has my proxy. If he tells you to do it, do it. I am so sick of reading that a task got held up because you approved the task, told them to do something, and then their safety check blocked it... I want every session to have the golden understanding." Houston gives a go only for what Chris's rules let it decide; his "Only Chris" list (money, his security settings, messages sent as him to outsiders, permanent deletion, two-factor codes) stays his. Record: ~/Projects/_brain/Decisions/2026-11-09-Houston-Go-Is-Chris-Go.md.

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
- `index.html` plus `js/` (17 classic scripts, loaded in order) and `assets/` — open in browser and play (Chris lifted the single-file rule 2026-10-09)
- Serve locally: `python3 -m http.server 8080` or `npx serve`

## Critical Arise Rules
- Keep it zero-dependency — no npm, no bundler, no frameworks
- Run `tools/stamp.sh` before committing any change in `js/`
- No star symbols, runes or occult imagery in any art (see `assets/CREDITS.md`)
- Game must work by opening index.html directly or via simple HTTP server
- Visual quality is paramount — this is a showcase project
- Solo Leveling aesthetic: dark backgrounds, cyan/blue glow, purple accents
