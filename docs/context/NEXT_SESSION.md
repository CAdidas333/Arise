# Next Session Handoff
_Written: 2026-10-10 01:25 by Chris Whitney_

## Where we left off
Session 5 ran overnight while Chris slept, under free rein with Houston on the con. Everything it built is on the public game: the floor mark is plain rings, the old stick-figure hunter is one switch away (System menu, Controls tab, "Hunter look"), the hunter is pass 3 of the body, and the 3D view at `/3d/` has a camera you can turn with movement relative to the camera. `main` and `v18-world` are level. No worker job is running and no worker branch waits for review. The public page runs stamp 20261010011757.

## Tell Chris when he is up (plain words)
- The circle on the gate floors is now just rings. Before, it had a shape and lines inside that could be taken for a magic circle.
- The hunter looks closer to the picture he picked, and is a little bigger. If he prefers the stick figure: System menu, Controls, Hunter look.
- In the 3D view, hold Z or C to swing the camera, V to reset, scroll to zoom, or hold the right mouse button and drag.
- One mistake reached the public page for about nine minutes (01:11 to 01:20): dodging in the 2D game threw an error. Fixed and checked.
- Pictures: `docs/previews/hunter_pass3_before_after_v1.jpg`, `docs/previews/floor_mark_plain_rings_v1.jpg`, `docs/previews/3d_free_camera_v1.jpg`.

## Ranked next actions (author's ranking at wrap time)
1. **3D lane: make a 3D fight readable** (open thread F4): hit sparks, damage numbers and rings first. Read `3d/render3d.js` `draw()` and how the 2D view draws them in `js/12-render-fx.js` before writing the brief.
2. **2D lane: a look for each boss** (rest of V18 step 4). Bosses are drawn by `enemyPath`, case `boss`, in `js/11-render-world.js` as a spiky many-pointed shape. Each new look must not read as a star symbol (open thread U2). Make candidate pictures with the free image model first, as was done for the hunter.
3. **V18 step 5: generated dungeons** (rooms and corridors; the arena stays for boss fights and endless mode). This is the big one; plan it as several small worker jobs.
4. **ElevenLabs music** (open thread F3). Houston says Chris's condition is met. Write `tools/el_music.py`, then file one card with Houston for the key rule before running it.
5. Touch control for the 3D camera (F5); the late floor image in 3D (G5); the printable status report (C1); a real-phone test (E3, needs Chris).

## Watch-outs / state of mind
- **Free rein (Chris, decision card D-0085):** decide and ship, then tell him in plain words. Still his: no star symbols, runes or occult imagery in art; anything that costs money.
- **You orchestrate; workers build.** From `~/Projects`: `worker run Arise <slug> <absolute path to brief> --engine auto --timeout 15m` in the background, then `worker merge Arise <slug>` and `worker clean Arise <slug>`. `worker redo` takes no `--timeout`. For a job that needs an eye for shape, `--model gemini-3.1-pro-high` (without `--engine auto`) did hunter pass 3 well from a part-by-part description and the two reference pictures.
- **A diff that matches the brief proves the worker followed it, not that the brief was right.** Before writing "same function" in a brief, look. Any test of the hunter must include a dodge, an attack, the Awakening and a hit.
- **Run `tools/stamp.sh` before committing any change in `js/`, `3d/render3d.js` or `index.html`.** It also rebuilds `3d/index.html`. Never edit that file by hand. The 3D page does not load `js/11-render-world.js` or `js/12-render-fx.js`.
- **Shipping:** `git branch -f main v18-world && git push origin main`, wait for the deploy (`gh run list -L 1`), check the stamp with `curl`. Ship only after looking at a captured frame.
- **Capturing frames:** the browser pane is usually hidden, so screenshots are stale. Draw into a canvas, `toDataURL`, and POST to a small local receiver (a threaded Python `http.server` on 127.0.0.1:8766 that writes the body to a file and answers CORS). Drive the game with `step(1/60)` and `draw()` from `#debug`. For the 3D page, capture the WebGL canvas (`#gl`) straight after `draw()`. From the public page, carry the picture across in `window.name` (see `docs/context/LESSONS.md`).
- **Pose sheet for the hunter:** call `drawHunter(x, y, {...})` directly on the game canvas at a large `scale` for standing, running, attacking, dashing, the purple and red states and the one-colour afterimage, plus game size on three floors. That sheet is what `hunter_pass3_before_after_v1.jpg` shows.
- **The local preview drops a script now and then** (open thread G2). If `window.__arise`, `saveGame` or `hunterLook` is missing, reload before believing an error.
- Weekly Claude usage was 78 percent at 01:05 on 2026-10-10 and resets Sunday 10 PM.

## What DID NOT get done
- Boss looks; 3D hit effects and damage numbers; generated dungeons.
- ElevenLabs music (script not written, key rule not requested).
- No printable status report (skipped a third time to save usage).
- Nothing has been tested on a real phone, and the 3D camera has not been tried by a human hand.
