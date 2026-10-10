"""ElevenLabs voice lines for the System: one mp3 per line of tools/system_lines.tsv.

  el_voice.py --list                         list the voices on the account (name, id, labels)
  el_voice.py VOICE_ID OUT_DIR [--only=id,id] [--suffix=_a] [--speed=0.96] [--stability=0.62] [--style=0.08] [--lines=other.tsv] [--model=eleven_multilingual_v2]

Lines file: one line per clip, `id<TAB>text`; lines starting with # are ignored.
Existing files are skipped, so a re-run only fills gaps. New takes get a new --suffix, never an overwrite.

Run through the key broker, never with a pasted key:
  keyguard run ELEVENLABS_API_KEY -- python3 tools/el_voice.py ...
"""
import json, os, sys, urllib.error, urllib.request
from pathlib import Path

API = "https://api.elevenlabs.io/v1"
KEY = os.environ["ELEVENLABS_API_KEY"]
# Calm and even: the System does not get excited
SETTINGS = {"stability": 0.62, "similarity_boost": 0.8, "style": 0.08, "use_speaker_boost": True, "speed": 0.96}


def call(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise SystemExit(f"HTTP {e.code}: {e.read()[:400].decode(errors='replace')}")


if "--list" in sys.argv:
    for v in json.loads(call(f"{API}/voices"))["voices"]:
        labels = v.get("labels") or {}
        print(f"{v['voice_id']}  {v['name']:<28} {labels.get('gender', '')} {labels.get('age', '')} {labels.get('accent', '')} {labels.get('description', '')}")
    raise SystemExit

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opt = {a[2:].split("=")[0]: a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--") and "=" in a}
voice, out_dir = args[0], Path(args[1])
only = set(opt["only"].split(",")) if "only" in opt else None
suffix, model = opt.get("suffix", ""), opt.get("model", "eleven_multilingual_v2")
for k in ("speed", "stability", "style"):
    if k in opt:
        SETTINGS[k] = float(opt[k])
out_dir.mkdir(parents=True, exist_ok=True)

lines = [l.split("\t", 1) for l in Path(opt.get("lines", Path(__file__).parent / "system_lines.tsv")).read_text().splitlines()
         if l.strip() and not l.startswith("#")]
for lid, text in lines:
    dst = out_dir / f"{lid}{suffix}.mp3"
    if (only and lid not in only) or dst.exists():
        continue
    audio = call(f"{API}/text-to-speech/{voice}?output_format=mp3_44100_128",
                 {"text": text.strip(), "model_id": model, "voice_settings": SETTINGS})
    dst.write_bytes(audio)
    print(dst, len(audio), "bytes")
