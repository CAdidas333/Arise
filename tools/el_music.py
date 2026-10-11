"""ElevenLabs Music: one instrumental track from a prompt, or from a sectioned composition plan.

  el_music.py OUT.mp3 SECONDS 'prompt' [--model=music_v1]
  el_music.py OUT.mp3 --plan=PLAN.json [--model=music_v2_5]

Endpoint checked against the ElevenLabs API reference on 2026-10-11: POST /v1/music, 3 to 600 seconds per call.
A new take gets a new file name, never an overwrite (the script refuses to replace a file).
Run through the key broker, never with a pasted key:
  keyguard run ELEVENLABS_API_KEY -- python3 tools/el_music.py ...
Copied from CaringForYou/videos/already-in-their-hands/tools/music.py.
"""
import json
import os
import sys
import urllib.error
import urllib.request

KEY = os.environ["ELEVENLABS_API_KEY"]
opts = {a.split("=", 1)[0]: a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--")}
args = [a for a in sys.argv[1:] if not a.startswith("--")]
out = args[0]
if os.path.exists(out):
    raise SystemExit(f"{out} exists; give the new take a new name")
model = opts.get("--model", "music_v2_5")

if "--plan" in opts:
    body = {"composition_plan": json.load(open(opts["--plan"])), "model_id": model}
else:
    body = {"prompt": args[2], "music_length_ms": int(float(args[1]) * 1000), "model_id": model,
            "force_instrumental": True}

req = urllib.request.Request(
    "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192",
    data=json.dumps(body).encode(), headers={"xi-api-key": KEY, "Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=900) as r, open(out, "wb") as f:
        f.write(r.read())
except urllib.error.HTTPError as e:
    raise SystemExit(f"HTTP {e.code}: {e.read()[:500].decode(errors='replace')}")
print(out, os.path.getsize(out), "bytes")
