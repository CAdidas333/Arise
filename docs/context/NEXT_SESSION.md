# Next Session Handoff
_Written: 2026-10-09 23:15 by Chris Whitney_

## Where we left off
The public game is V17 plus V18 steps 1, 2 and 3 (painted world, the System's voice, shadows that fight like their enemy), the hunter's new body from step 4, and a 3D view at `/3d/` with a switch link on both pages. `main` and the work branch `v18-world` were level at the wrap apart from docs. No worker job is running and no worker branch is waiting for review. Chris gave free rein on Arise and asked for both lanes, 2D and 3D, to be developed side by side.

## From Houston, received just after the wrap (2026-10-09, about 23:15)
Houston sent three rulings and three asks. Two rulings were out of date, because Chris had already answered those cards himself:
- Houston said "do not ship the voice". Chris answered that card himself (D-0084): "Done. Ship it." The voice is live on his word.
- Houston said "3D parked until the nine steps are done". Chris answered that card himself (D-0085): keep both lanes, free rein. The 3D view is live on his word. Houston has been told.
Houston's asks that still stand, in this order:
- **Check the gate floors for anything that reads as a magic circle.** The faint circle with lines in the middle of each arena (drawn in `drawArena`, `js/11-render-world.js`, about lines 53 to 86; visible in `docs/previews/hunter_body_on_floors_v2.jpg`) must not look occult. Look at a captured frame on every gate; if it can be read that way, change it to plain rings and ship. This is the art rule, so it comes first.
- **Keep the old stick-figure hunter one switch away** so Chris can go back with a word (for example an option in the Controls tab, default the new body). The old drawing is in git at `drawHunter` before commit 471328d.
- **Verify the live game with a captured frame of the public page**, not the work copy. The Session 4 checks of the live site were by `curl` only.
- **One more pass on the hunter** to bring it closer to the picture Chris picked (it is much plainer: flat shapes, mitten boots, small on the floor). Free workers; send Houston a before and after.
- Do not file cards for small look-and-feel choices. File one with Houston only for something that cannot be undone, costs money, or changes what the public sees in a way you are unsure about, and attach the picture path.

## Ranked next actions (author's ranking at wrap time)
1. **3D lane: free camera, movement relative to the camera** (open thread F2). The camera is fixed in `draw()` of `3d/render3d.js`. Read how the game turns keys into a movement direction (start at `js/13-loop.js` near line 20 and the input code in `js/03-state.js`) before writing the brief, because moving relative to the camera needs one small hook in the game rules.
2. **3D lane: what the 3D view does not draw yet** (open thread F4): hit sparks, damage numbers, rings, afterimages, the light pillars, and the hub backdrop. Pick the few that make a fight readable first.
3. **2D lane: boss looks** (the rest of V18 step 4), and the hunter touch-ups (open thread U1: blobby boots, the far blade's angle while running).
4. **V18 step 5: generated dungeons** (rooms and corridors; the arena stays for boss fights and endless mode).
5. Printable status report (open thread C1) when weekly usage allows; a real-phone test (E3).

## Watch-outs / state of mind
- **Free rein (Chris, decision card D-0085, 2026-10-09):** decide and ship Arise work without waiting for him, then tell him in plain words what changed. Still his: no star symbols, runes or occult imagery in art; a yes before any ElevenLabs music; anything that costs money.
- **You orchestrate; workers build.** From `~/Projects`: `worker run Arise <slug> <absolute path to brief> --engine auto --timeout 15m` in the background, then `worker merge Arise <slug>` and `worker clean Arise <slug>`. `worker redo` takes no `--timeout`. Free workers follow exact code in a brief exactly, so compare their output with the brief by script, and judge anything visual from a captured frame, not from the diff.
- **Run `tools/stamp.sh` before committing any change in `js/` or `index.html`.** It also rebuilds `3d/index.html` (through `tools/sync3d.py`). Never edit `3d/index.html` by hand.
- **Shipping:** `git branch -f main v18-world && git push origin main`, then wait for the deploy (`gh run list -L 1`) and check the live site with `curl`. If the work branch holds something unfinished, move `main` to the last good commit instead of the tip.
- **The browser pane is usually hidden, so screenshots come back stale with no error.** Capture the canvas with `toDataURL` and POST it to a tiny local receiver (a dozen lines of Python `http.server` that writes the body to a file), then look at the saved image. Drive the game with `step(1/60)` in a loop from `#debug`; the frame loop does not run while the pane is hidden.
- The local preview server sometimes resets connections (scripts, or the 43 sound files). If `window.__arise` is missing, reload. The public site does not show it.
- **Voice:** `say(id, force, delay)` and `playClip(key, vol, delay)` are in `js/02-audio.js`. New lines go in `tools/system_lines.tsv` and are recorded with `tools/el_voice.py` using the recipe in `assets/CREDITS.md` (voice River, id `SAz9YHcvj6GT2YYXdXww`; calm lines `--speed=0.82`; warnings use the anxious settings). The ElevenLabs key cannot list voices; get ids from the ElevenLabs connector. Music is NOT approved.
- `docs/previews/` holds review frames and audio demos and is on the public site; harmless, tidy when convenient (open thread G4).
- Weekly Claude usage was 76 percent at 22:25 on 2026-10-09 and resets Sunday 10 PM. The battery and hotspot limits from Houston were for that evening only.

## What DID NOT get done
- No printable status report (skipped again to save usage).
- Boss looks, and the hunter touch-ups.
- 3D: free camera; hit effects, damage numbers and the hub backdrop.
- Nothing has been tested on a real phone.
- ElevenLabs music (needs Chris's yes).
