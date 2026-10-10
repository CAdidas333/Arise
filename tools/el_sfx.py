"""ElevenLabs sound effects: one clip from a text prompt.

  el_sfx.py OUT.mp3 SECONDS 'prompt'

A new take gets a new file name, never an overwrite (the script refuses to replace a file).
Run through the key broker, never with a pasted key:
  keyguard run ELEVENLABS_API_KEY -- python3 tools/el_sfx.py ...
"""
import json, os, sys, urllib.error, urllib.request

out, secs, prompt = sys.argv[1], float(sys.argv[2]), sys.argv[3]
if os.path.exists(out):
    raise SystemExit(f"{out} exists; give the new take a new name")
req = urllib.request.Request(
    "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
    data=json.dumps({"text": prompt, "duration_seconds": secs, "prompt_influence": 0.5}).encode(),
    headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=300) as r, open(out, "wb") as f:
        f.write(r.read())
except urllib.error.HTTPError as e:
    raise SystemExit(f"HTTP {e.code}: {e.read()[:400].decode(errors='replace')}")
print(out, os.path.getsize(out), "bytes")
