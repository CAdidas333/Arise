# Brief: one page source for 2D and 3D, and a switch between them

Everything you need is in this repo. Do not read or write anything outside it. Read only the files and lines named below.

## Background
`Arise` is a canvas action game: `index.html` (CSS and markup) loads 13 classic scripts from `js/`. A second page, `3d/index.html`, runs the same game rules but draws the fight in 3D (`3d/render3d.js`, with `3d/vendor/three.min.js`). Today `3d/index.html` is an old hand-made copy of `index.html`, so it drifts: its script stamps are stale and it cannot find the sound files. The owner wants both views kept, with a link to flip between them.

The fix: `3d/index.html` is **generated** from `index.html` by a small script, and uses `<base href="../">` so every relative path (scripts, sounds, images, manifest) resolves from the repo root exactly as on the 2D page.

## Change 1: new file `tools/sync3d.py`
Create it with exactly this content:

```python
#!/usr/bin/env python3
"""Rebuild 3d/index.html from index.html. Run by tools/stamp.sh; never edit 3d/index.html by hand.

The 3D page is the same page with a different renderer: <base href="../"> makes every relative path resolve
from the repo root, the two 2D drawing scripts are swapped for three.js and 3d/render3d.js, and the view
switch points back at the 2D page.
"""
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text()


def sub(pattern, repl, count=1):
    global html
    html, n = re.subn(pattern, repl, html)
    if n != count:
        raise SystemExit(f"sync3d: expected {count} match(es) of {pattern!r}, found {n}")


stamp = re.search(r'js/13-loop\.js\?v=(\d+)', html).group(1)
sub(r"<!DOCTYPE html>\n", "<!DOCTYPE html>\n<!-- Generated from index.html by tools/sync3d.py. Do not edit. -->\n")
sub(r"<head>\n", '<head>\n<base href="../">\n')
sub(r'<script src="js/11-render-world\.js[^"]*"></script>\n', "")
sub(r'<script src="js/12-render-fx\.js[^"]*"></script>\n',
    f'<script src="3d/vendor/three.min.js"></script>\n<script src="3d/render3d.js?v={stamp}"></script>\n')
sub(r"MONARCH UPDATE &nbsp;·&nbsp; V17", "3D VIEW &nbsp;·&nbsp; EXPERIMENT")
sub(r'href="3d/"', 'href="./"', count=2)
sub(r"SWITCH TO 3D VIEW", "SWITCH TO 2D VIEW", count=2)
(root / "3d" / "index.html").write_text(html)
print("3d/index.html rebuilt, stamp", stamp)
```

## Change 2: `tools/stamp.sh`
Its last line is one command chain: `cd "$(dirname "$0")/.." && sed -i '' -E "..." index.html && grep -c 'js/.*?v=' index.html`. Insert `python3 tools/sync3d.py && ` directly before `grep -c`, so the 3D page is rebuilt every time the scripts are stamped. Change nothing else in the file.

## Change 3: `index.html`, the switch links (two places) and their style
3a. In the title screen (`<div id="title-screen">`, line 466), directly after the line
`<div class="title-high-scores" id="title-hs"></div>` add:
```html
  <a class="view-switch" href="3d/" onclick="event.stopPropagation()">SWITCH TO 3D VIEW</a>
```
3b. In the pause menu (`<div id="pause-overlay">`, line 513), directly after the line with `id="pause-aim"` add:
```html
  <a class="continue-btn view-switch-btn" href="3d/" style="margin-top:12px">SWITCH TO 3D VIEW</a>
```
3c. In the `<style>` block, directly after the line that starts with `.title-ver {` (line 355), add:
```css
  .view-switch { display:inline-block; margin-top:22px; padding:8px 18px; font-family:'Orbitron',monospace; font-size:10px; letter-spacing:4px; color:rgba(187,136,255,0.85); border:1px solid rgba(136,68,255,0.4); text-decoration:none; pointer-events:auto; }
  .view-switch:hover { background:rgba(136,68,255,0.18); box-shadow:0 0 20px rgba(136,68,255,0.3); }
  .view-switch-btn { display:inline-block; text-decoration:none; border-color:rgba(136,68,255,0.4); color:#bb88ff; }
```
Change nothing else in `index.html`. Do not touch the `<script>` tags.

## Change 4: `3d/render3d.js`, the floor image path
In `buildFloor(g)`, the line `const url = '../assets/floors/' + (g.floor || g.id) + '.webp';` becomes `const url = 'assets/floors/' + (g.floor || g.id) + '.webp';` (the page's `<base>` now points at the repo root). Change nothing else in the file.

## Change 5: regenerate the 3D page
Run `python3 tools/sync3d.py` and commit the `3d/index.html` it writes. Do not edit that file by hand.

## Constraints
- New or changed files are exactly: `tools/sync3d.py` (new), `tools/stamp.sh`, `index.html`, `3d/render3d.js`, `3d/index.html` (generated).
- Do not touch `js/`, `assets/`, `docs/`, `3d/vendor/` or any other file. Do not run `tools/stamp.sh` yourself (it would change the stamps); run only `tools/sync3d.py`.
- No new dependencies. Python standard library only.
- No star shapes, runes or symbols.

## Checks to run before you finish
```bash
python3 tools/sync3d.py                                             # expect: 3d/index.html rebuilt, stamp <digits>
grep -c '<base href="../">' 3d/index.html                           # expect 1
grep -c 'src="js/' 3d/index.html                                    # expect 11
grep -c '11-render-world\|12-render-fx' 3d/index.html               # expect 0
grep -c '3d/vendor/three.min.js\|3d/render3d.js' 3d/index.html      # expect 2
grep -c 'SWITCH TO 2D VIEW' 3d/index.html                           # expect 2
grep -c 'SWITCH TO 3D VIEW' index.html                              # expect 2
grep -c 'SWITCH TO 3D VIEW' 3d/index.html                           # expect 0
grep -c 'sync3d.py' tools/stamp.sh                                  # expect 1
grep -c "'assets/floors/'" 3d/render3d.js                           # expect 1
node --check 3d/render3d.js && echo RENDER_OK
git status --short                                                  # expect only the five files named above
```

## Done looks like
Every check prints the expected value, `RENDER_OK`, and exactly five files are changed or added.
