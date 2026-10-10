# Next Session Handoff
_Updated: 2026-10-09 21:50 (Session 4, in progress)_

## Session 4 so far
- Shadow fighting styles reviewed, tested in the browser and merged; V18 step 3 is live on main (f465a46).
- `tools/stamp.sh` now stamps to the second (two stamps in one minute used to collide and the browser kept old scripts).
- The System voice is recorded: 35 clips in `assets/voice/` (River; recipe and settings in `assets/CREDITS.md`; the trial folder is gone). Sound effects: 8 with two takes each in `assets/sfx/` (prompts in `assets/sfx/prompts.tsv`); Chris is choosing takes from the demos in `docs/previews/`. Next: brief a worker to play them in the game (`js/02-audio.js` and the places that toast those moments), with "Shadow extraction." at the attempt, the charge effect during the wait, and the result word plus result effect landing with the on-screen result. Delete the unused takes and `docs/previews/` before shipping.
- The ElevenLabs key cannot list voices; get ids from the ElevenLabs connector (`creative_list_voices`), never from memory.
- Voice and effects are wired into the game on `v18-world` (worker job `v18-voice-wiring`, merge 0b236b4; brief `docs/briefs/v18-step2-voice-wiring.md`). `say(id, force, delay)` and `playClip(key, vol, delay)` are in `js/02-audio.js`. Tested in the browser; NOT shipped: Chris plays it first.
- 3D experiment: pass 1 reviewed and tested from its own worktree with the preview entry `arise-3d` in `.claude/launch.json` (port 8766; an uncommitted local edit, remove it when the experiment is settled). Do not merge it into `v18-world`. When the browser pane is hidden, screenshots come back stale: capture the WebGL canvas with `toDataURL` and POST it to a small local receiver instead.
- Houston (22:25): the app restart is done. While Chris is away, report to Houston, and keep to the battery limits in ACTIVE_PROJECTS.
- V18 step 2 (the System voice) shipped 2026-10-09 on Chris's word: `main` is at 18b896a, the last commit before the hunter body. Do NOT fast-forward `main` to `v18-world` until Chris approves the hunter body (step 4); ship anything else by cherry-pick or by building from `main`.
- Chris picked hunter look C (`docs/art-direction/hunter-style/hunter_style_c_v1.png`). Pass 1 of the body (drawn with canvas shapes in `drawHunter`, `js/11-render-world.js`) is merged on `v18-world` but read as an outline doll; pass 2 is with the worker (`docs/briefs/v18-step4a-hunter-body-redo1.md`). Still waiting on Chris: 3D continue or stop (D-0085).

---
_Below: the Session 3 handoff. Items 1 and the voice-trial part of 3 are done._

_Written: 2026-10-09 20:55 by Chris Whitney_

## Where we left off
The public game (main) is V17 plus the first V18 step: painted floors and a painted title backdrop. The V18 work branch `v18-world` is clean and pushed. Two worker jobs finished and are committed on their own branches but have NOT been reviewed, tested or merged: the shadow fighting styles (`worker/v18-shadow-roles`, 6bbab81) and the 3D experiment (`worker/v18-3d-spike`, 915ea83). Houston parked every session for a Claude app restart; nothing may start until Houston says resume.

## Ranked next actions (author's ranking at wrap time)
1. **Shadow fighting styles: review, test, merge, ship.** `worker diff Arise v18-shadow-roles`, check it line by line against `docs/briefs/v18-step3b-shadow-roles.md`, re-run its checks, merge, run `tools/stamp.sh`, play a gate in the browser with an army of mixed shadow types, then merge `v18-world` to main. Chris said to ship step 3 whole, and this is the second half.
2. **3D experiment: review and show Chris.** `worker diff Arise v18-3d-spike` against `docs/briefs/v18-3d-spike.md`, merge to `v18-world`, open http://localhost:8765/3d/ in the browser pane, play a gate, send Chris a screenshot. Do not deploy it without his word.
3. **ElevenLabs voice trial.** `keyguard run ELEVENLABS_API_KEY -- python3 tools/el_voice.py --list`, pick two or three candidate voices, record three lines in each (`--only=boss_detected,level_up,extract_success --suffix=_<voice>`), send them to Chris to choose. Then all 34 lines in `tools/system_lines.tsv`, then the 8 signature sound effects with two takes each (`tools/el_sfx.py`). Then a worker brief to play them in the game.
4. **V18 step 4:** a hunter with a real body (jointed parts on the existing skeleton in `drawHunter`) and a look for each boss. Make one approved style reference image first, then derive the parts from it.

## Watch-outs / state of mind
- **You orchestrate; you do not build.** Briefs, review, testing and decisions only. Code goes to `worker run Arise <slug> <brief.md> --engine auto --timeout 25m` (run it in the background and end the turn); images go through `keyguard run HF_TOKEN -- ~/LocalModels/hfspace/bin/python ~/LocalModels/zimage_gen.py ...`. Briefs must name exact files, functions and line numbers and say what not to commit. Weekly Claude usage was 74 percent at 8:04 PM on 2026-10-09; it resets Sunday 10 PM.
- **Music is not approved.** `tools/el_music.py` is blocked by the key broker until Chris has heard the voice and sound effects and says so. Do not write around it.
- **No star symbols, runes or occult imagery** in any art or drawn shape. Look at every generated image at full size before using it. A regenerated asset gets a new file name.
- Run `tools/stamp.sh` before committing any change in `js/`, or browsers will mix old and new script files.
- Chris plays on a laptop with arrow keys and `X` to attack. Test keyboard-only play, not just mouse.
- Fixes Chris asks for while playing go straight to main. New V18 steps are shown to him first and shipped when he says.
- Say things to Chris in plain words first; codes only in brackets. Keep `docs/context/GLOSSARY.md` current.
- The local preview server once dropped a connection while loading the 13 scripts; if `window.__arise` is missing on a `#debug` load, just reload.

## What DID NOT get done
- The shadow fighting styles and the 3D experiment were not reviewed or merged (parked before I could).
- No ElevenLabs audio has been generated yet.
- No printable status report was made at this wrap (skipped to save usage while parked).
- Not tested by anyone: the game on a real phone.
