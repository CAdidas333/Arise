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
