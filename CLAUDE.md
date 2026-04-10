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
- Single `index.html` — open in browser and play
- Serve locally: `python3 -m http.server 8080` or `npx serve`

## Critical Arise Rules
- Keep it zero-dependency — no npm, no bundler, no frameworks
- Game must work by opening index.html directly or via simple HTTP server
- Visual quality is paramount — this is a showcase project
- Solo Leveling aesthetic: dark backgrounds, cyan/blue glow, purple accents
