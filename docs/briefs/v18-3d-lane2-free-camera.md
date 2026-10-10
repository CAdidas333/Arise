# 3D lane, job 2: a camera the player can turn, with movement relative to the camera

## Goal
The 3D view (`3d/render3d.js`) has a fixed camera: in `draw()` it does
`camera3D.position.set(camX + sx, 20 + 300 + sy, camY + 400); camera3D.lookAt(camX, 20, camY);`.
Make it an orbit camera the player can turn and zoom, and make "up" on the keys or stick always mean "away from the camera".
The 2D game must behave exactly as before.

## Not in this job
No touch controls for turning the camera (a later job). No saving of the camera angle. No changes to `index.html`, `3d/index.html`, `tools/`, `assets/`, `docs/`, or to `js/11-render-world.js` and `js/12-render-fx.js`. Do not run `tools/stamp.sh`. No new files.

## How the pieces fit (read these before you start)
- World x is 3D x; world y is 3D z. The ground is the plane y = 0.
- `js/13-loop.js`, `updatePlayer(dt)`, lines 8 to 18: keys and the touch stick become a direction `dx, dy` in world space, then the player moves.
- `js/03-state.js`, about line 143: the `mousedown` handler. Right button (`e.button === 2`) calls `dodge()`.
- `js/07-skills-shadows.js` line 7: `mouseWorld()` already calls `window.mouseWorld3D()` when it exists, and `mouseWorld3D` in `3d/render3d.js` ray-casts through `camera3D`, so pointer aim keeps working at any camera angle. Do not change either.
- Keys already used by the game: W A S D, arrows, X, J, Space, Shift, 1 to 5, R, E, F, Esc, P, M, Tab, backtick. Do not reuse them.

## Changes

### 1. `js/03-state.js`: one shared number
Next to the line `let player = null, paused = false;` add:
`let viewYaw = 0; // camera turn in radians, set by the 3D view; 0 in the 2D game`

### 2. `js/13-loop.js`, `updatePlayer`: turn the input by the camera
Directly after the line `if (touchJoystick.active) { dx += touchJoystick.dx; dy += touchJoystick.dy; }` add:
```js
  if (viewYaw) { const c = Math.cos(viewYaw), s = Math.sin(viewYaw), rx = dx*c + dy*s; dy = -dx*s + dy*c; dx = rx; } // 3D view: "up" means away from the camera
```
Nothing else in this function changes.

### 3. `js/03-state.js`, `mousedown` handler: leave the right button to the 3D view
Change `if (e.button === 2) { dodge(); return; }` to
`if (e.button === 2) { if (!window.view3D) dodge(); return; }`

### 4. `3d/render3d.js`: the orbit camera
Add near the top (after `camera3D` is created):
```js
// Orbit camera. The defaults reproduce the old fixed view exactly: 500 units away, 36.87 degrees up, looking along -z.
const view3D = window.view3D = { yaw: 0, pitch: Math.atan2(300, 400), dist: 500, drag: null };
const VIEW_DEFAULT = { yaw: 0, pitch: Math.atan2(300, 400), dist: 500 };
```
Controls (all only while `gameState === 'DUNGEON'` and not `paused`; guard with `typeof` checks like the rest of this file):
- **Keys:** hold `Z` to turn the camera left, hold `C` to turn it right, at 1.8 radians per second; `V` puts the camera back to `VIEW_DEFAULT`. Read the shared `keys` object (`keys['z']`, `keys['c']`) inside `draw()` and use the real time since the last `draw()` call (cap it at 0.05 s). For `V` add a `keydown` listener.
- **Mouse:** press and hold the right button and drag: horizontal movement changes `yaw` (0.006 radians per pixel), vertical movement changes `pitch` (0.004 radians per pixel). Listen for `mousedown`, `mousemove`, `mouseup` on `window`. A right click that moved less than 6 pixels in total is a dodge: on `mouseup`, call `dodge()` in that case, so the old right-click dodge still works.
- **Wheel:** `wheel` on `window` changes `dist` (`dist *= Math.exp(e.deltaY * 0.0012)`); call `e.preventDefault()` only when the event target is the 3D canvas or the game canvas, and register the listener with `{ passive: false }`.
- **Limits:** clamp `pitch` to 0.35 to 1.25 radians and `dist` to 260 to 900. `yaw` is unlimited.

In `draw()`, replace the two fixed camera lines with:
```js
  const cp = Math.cos(view3D.pitch), hd = view3D.dist * cp;
  camera3D.position.set(camX + Math.sin(view3D.yaw)*hd + sx, 20 + Math.sin(view3D.pitch)*view3D.dist + sy, camY + Math.cos(view3D.yaw)*hd);
  camera3D.lookAt(camX, 20, camY);
  viewYaw = view3D.yaw;
```
(`viewYaw` is the shared variable from step 1; it is a plain top-level `let`, so assigning it from this file works. With `yaw = 0` the position is exactly the old one: `hd = 400`, height `300`.)

When the game is not in a dungeon (the early `return` branch at the top of `draw()`), reset: `view3D.yaw = 0; viewYaw = 0;` so menus and the next gate start from the default direction (keep pitch and dist).

### 5. `3d/render3d.js`: anything that assumed the camera never turns
Read the rest of `draw()` and fix whatever assumed a camera looking along -z: flat labels or bars that face +z must face the camera (copy `camera3D.quaternion`), a near wall that is hidden or faded must be chosen from the camera's side, and so on. If nothing assumes it, change nothing and say so in your final message.

### 6. Tell the player (3D page only)
The line of key hints on screen comes from `index.html`, which you must not edit. Instead, in `3d/render3d.js`, once at load, find the element with class `hud-hint` and append ` &nbsp;·&nbsp; Z / C TURN CAMERA &nbsp;·&nbsp; V RESET` to its `innerHTML` (guard for the element being missing).

## Checks to run before you finish
```bash
for f in js/*.js 3d/render3d.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "let viewYaw = 0" js/03-state.js            # expect 1
grep -c "if (viewYaw)" js/13-loop.js                # expect 1
grep -c "window.view3D" js/03-state.js              # expect 1
grep -c "camY + 400" 3d/render3d.js                 # expect 0
grep -c "viewYaw = " 3d/render3d.js                 # expect 2 or more
git status --short                                  # expect exactly: js/03-state.js, js/13-loop.js, 3d/render3d.js
```

## Done looks like
No `FAIL` lines, the greps match, three files changed. In the 2D game nothing changes (`viewYaw` stays 0 and `window.view3D` is undefined). In the 3D view: with the camera untouched the picture is identical to before; holding C swings the view around the hunter; pressing W always walks away from the camera; right-drag orbits; a plain right click still dodges; the wheel zooms; V resets.
