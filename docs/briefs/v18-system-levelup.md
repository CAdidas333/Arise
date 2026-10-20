# Brief: the System announces a level-up (and a rank-up) in its own window

## Goal
In Solo Leveling the System tells the hunter he levelled up in a glowing blue window that appears in front of him. In Arise a
level-up today is one line in the pop-up list (`toast`) plus sparks. Make it the System's moment: a short-lived blue holographic
window, upper middle of the screen, saying LEVEL UP with the new level and what was gained; a RANK UP gets the same window in
violet. It is drawn in the page's HTML (the HUD layer both views share), so it appears in the 2D and the 3D view alike. It never
blocks input and never covers the hunter (who stands in the middle of the screen). No change to any game number.

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice stops a
whole script loading; `bash tools/check_names.sh` lists clashes. Use exactly the new names below.

## Exact changes
1. **Markup** (`index.html`): right after the `#toast-container` element add
   `<div id="sys-pop" aria-live="polite"><div class="sp-head"></div><div class="sp-big"></div><div class="sp-sub"></div></div>`.
2. **Style** (`index.html`, in the main `<style>` next to the `#toast-container` rules, about line 167). Match the System menu's
   look (cyan `#00d4ff` on near-black, Orbitron, letter-spaced capitals; see `.sys-header h2`):
   - `#sys-pop`: `position:fixed; left:50%; top:24%; transform:translate(-50%,0); z-index:31; pointer-events:none; display:none;`
     `min-width:260px; max-width:min(86vw, 380px); padding:14px 26px 12px; text-align:center;`
     `background:rgba(4,12,24,0.86); border:1px solid rgba(0,212,255,0.75); box-shadow:0 0 24px rgba(0,212,255,0.35), inset 0 0 18px rgba(0,212,255,0.12);`
   - `#sys-pop.on { display:block; animation: sysPopIn 0.28s ease-out, sysPopOut 0.35s ease-in 1.55s forwards; }`
   - `@keyframes sysPopIn { from { opacity:0; transform:translate(-50%,8px) scale(0.92); } to { opacity:1; transform:translate(-50%,0) scale(1); } }`
   - `@keyframes sysPopOut { to { opacity:0; transform:translate(-50%,-6px); } }`
   - `.sp-head`: Orbitron, 12px, letter-spacing 6px, colour `rgba(0,212,255,0.8)`; text is wrapped in square brackets by the JS.
   - `.sp-big`: Orbitron 900, 34px, letter-spacing 3px, colour `#e8fbff`, `text-shadow:0 0 16px rgba(0,212,255,0.9)`.
   - `.sp-sub`: 12px, letter-spacing 2px, colour `rgba(200,240,255,0.75)`, margin-top 4px.
   - Violet tone `#sys-pop.violet`: border `rgba(187,102,255,0.8)`, glow `rgba(136,68,255,0.45)`, `.sp-head` colour `#cc99ff`,
     `.sp-big` text-shadow in violet.
   - On upright phones (the existing `@media (orientation: portrait) and (max-width: 520px)` block, about line 491):
     `#sys-pop { top:18%; min-width:0; padding:10px 18px 9px; } #sys-pop .sp-big { font-size:26px; }`.
3. **The call** (`js/09-ui.js`, next to the other small UI helpers): `function systemPop(head, big, sub, tone)`: fills the three
   parts (`head` shown as `[ ${head} ]`), sets the class to `violet` when `tone === 'violet'`, then restarts the animation so a
   second pop during the first plays again from the start (remove the `on` class, force a reflow with `void el.offsetWidth`, add
   `on`), and hides it again after 1.95 seconds with a timer kept in a top-level `let sysPopTimer = null;` (clear the old timer
   first). If the element is missing (the Node test harness), return quietly.
4. **Use it** (`js/04-player-fx.js`, `playerGainXp`, about line 51):
   - Remember inside the `while` loop whether the rank changed (`let rankUp = null;`, set to the new rank where the RANK UP toast is).
     Remove that RANK UP toast line's `toast(...)` call (keep its voice line, flash and burst).
   - After the loop, in `if (leveled)`, replace the LEVEL UP `toast(...)` with:
     `const sub = '+5 STAT POINTS' + (gotSp ? ' · +' + gotSp + ' SKILL POINT' + (gotSp > 1 ? 'S' : '') : '');`
     `if (rankUp) systemPop('RANK UP', rankUp + '-RANK HUNTER', 'LV. ' + player.level + ' · ' + sub, 'violet'); else systemPop('LEVEL UP', 'LV. ' + player.level, sub);`
     Keep `playSfx('levelup')`, `say('level_up')`, the bursts, ring, flash and shake exactly as they are.
   - The NEW SKILL and NEW GATE toasts stay toasts.

## Constraints
- Touch only `index.html`, `js/09-ui.js`, `js/04-player-fx.js`. Do not edit `3d/index.html` (the orchestrator regenerates it) and
  do NOT run `tools/stamp.sh`.
- No images, no icons, no symbols: brackets, words and numbers only. Art rule: no star shapes, runes, glyph-like marks, crosses,
  halos, occult or religious imagery.
- The window must never take clicks or touches (`pointer-events:none`) and must sit above the middle of the screen, not on it.
- Match the surrounding style: compact statements, short names, a short comment only where the reason is not obvious.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error (paste its output in your report).
- `node tools/test_layout.js` ends with `PASS 8000`; `node tools/test_gear.js` and `node tools/test_army.js` pass.
- `node tools/balance_bot.js` runs to the end with no error (it levels hunters up many times, so it exercises `systemPop`).

## Done when
All four changes are in and every check passes. Commit nothing yourself.
