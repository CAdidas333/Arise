# Asset provenance

Every image here was generated for this project and then processed with `tools/process_art.py`.

| Files | Model | Licence | Date | How |
|---|---|---|---|---|
| `floors/*.webp`, `bg/hub.webp` | Z-Image-Turbo (Tongyi-MAI), via its Hugging Face Space | Apache-2.0 | 2026-10-09 | `~/LocalModels/zimage_gen.py`, seed 11, 8 steps |

## Prompts

Floors share a frame: "Seamless tileable texture, straight top-down orthographic view of **X**, hand-painted anime game background style, flat even lighting, no shadows, no perspective, no objects, no symbols, no runes, no text, uniform detail edge to edge".

- `e_gate`: a damp mossy cave rock floor, dark grey stone with patches of deep green moss and small pebbles
- `d_gate`: a fortress courtyard floor of large rough-cut sandstone slabs with packed dirt and bits of straw in the gaps, warm brown and ochre
- `c_gate`: an ancient crypt floor of cracked dark slate flagstones with pale dust and thin grey-violet lichen in the cracks, cold muted violet-grey
- `b_gate`: cracked black volcanic basalt ground with thin glowing red-orange lava veins running through the cracks (prompt also says "full-frame ... no border, no frame, no background"; the first try drew a framed sample and was rejected)
- `a_gate`: a scorched cavern floor of dark burnt rock with scattered gold flecks and glowing amber embers in the cracks
- `s_gate_v2`: an ancient temple floor of large square white marble slabs with rich blue and grey veining, thin joints inlaid with glowing pale blue stone, a few hairline cracks (processed with LEVEL 46, SATURATION 1.25; the first version came out a flat grey and was replaced before release)
- `bg/hub`: an empty city street at night after rain, a huge upright oval gate of swirling blue and violet energy in the middle of the street, dark skyscrapers, wet asphalt reflections (first try came out shaped like a question mark and was rejected)

Rule for anything added here: no star symbols, runes or occult imagery. Check each image by eye before it goes in.

## Third-party code

| File | What | Licence | Source | Date |
|---|---|---|---|---|
| `3d/vendor/three.min.js` | three.js r149 (3D rendering library), 608,081 bytes, unmodified | MIT | https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js | 2026-10-09 |

## The System's voice (`assets/voice/`)

35 clips, made 2026-10-09 with ElevenLabs text-to-speech through `tools/el_voice.py` (paid account; the plan's commercial-use terms apply). Voice: River, a stock ElevenLabs voice (id `SAz9YHcvj6GT2YYXdXww`), model `eleven_multilingual_v2`. Chris chose the voice and the reads. The words are in `tools/system_lines.tsv` and are original to this game. Every clip was transcribed locally and matches its line.

| Clips | Settings |
|---|---|
| Calm announcements (all lines not listed below) | `--speed=0.82`, default stability 0.62 and style 0.08 |
| Anxious warnings: `boss_detected`, `boss_enraged`, `low_hp`, `elite` | `--speed=0.96 --stability=0.28 --style=0.0`, with an unspoken lead-in (`--prev="There was no time left. The readings spiked and her breath caught. Quick, clipped and afraid, she said:"`) and follow-on (`--next="Her voice shook as the ground began to tremble."`). Low stability means a re-record will not sound the same; `boss_detected` is the take Chris approved |
| Extraction: `extract_start`, `extract_success`, `extract_fail` | Recorded at `--speed=0.82` as "Shadow extraction. <break time="0.45s" /> Successful." and the same with "Failed.", then cut at the pause: `extract_start` is the shared "Shadow extraction.", the other two are the result word alone, so the game sets the length of the wait |

## Signature sound effects (`assets/sfx/`)

Eight clips, made 2026-10-09 with ElevenLabs sound generation through `tools/el_sfx.py` (paid account; `prompt_influence` 0.5). The prompt and length for each are in `assets/sfx/prompts.tsv`. Two takes of each were made and Chris chose by ear: the second take for the three extraction effects (`extract_charge`, `extract_success`, `extract_fail`) and the first take for the other five. `extract_success` was turned down 3.5 dB with a 4 ms fade-in because its first hit ran over full level and clipped. `awakening` and `boss_appear` also peak just over full level, so the game must play them at 0.7 gain or lower.

## Music (`assets/music/`)

| Files | Model | Date | How |
|---|---|---|---|
| `hub.mp3`, `fight.mp3`, `boss.mp3` | ElevenLabs Music, `music_v2_5`, through the API (`POST /v1/music`), 90 seconds each, MP3 192 kbps | 2026-10-11 | `keyguard run ELEVENLABS_API_KEY -- python3 tools/el_music.py OUT.mp3 90 'prompt'` |

Two takes of each were made (nine minutes in all, about $1.35 at the listed $0.15 a minute; approved by Chris). In the game: hub take 2, fight take 1, boss take 1. The picks were made from a local audio classifier's labels (`~/LocalModels/ast_classify.py`: all six read as music with no speech or singing; hub take 1 was labelled partly "singing bowl" and "gong", so take 2 was used), not by ear; Chris can swap any of them. ElevenLabs' music terms apply (elevenlabs.io/music-terms); they have not been read in full for this project, which is a non-commercial fan game.

Prompts (each ends "Instrumental only, no vocals, no choir. Even energy from start to finish so it can loop."):
- `hub`: Dark ambient electronic underscore for a hunter resting at base between battles. Slow, about 72 BPM. Warm analog synth pads, a low sub drone, a sparse felt piano motif, a soft pulsing arpeggio, distant metallic shimmer. Mysterious, calm, a little lonely, with quiet resolve. A soft heartbeat kick enters in the second half.
- `fight`: High-energy dungeon battle music, 135 BPM, hybrid orchestral and electronic. Pounding war drums and a tight kick, driving distorted synth bass, fast staccato strings, punchy brass stabs, and a bold lead synth power riff. Dark, urgent, heroic. Constant momentum from the first bar, no long intro, no breakdown.
- `boss`: Epic dark boss battle music, 150 BPM, massive hybrid orchestral. Thunderous taiko drums, low brass and horns in menacing rising figures, heavy chugging distorted guitars, a relentless string ostinato, deep sub hits, and a soaring lead melody in the second half. Enormous, threatening, climactic. Starts at full intensity.

How it plays: `js/02-audio.js` fetches the three files at start, decodes one when its mode is first needed (two kept at once, one on phones), loops each with a 2.5 second crossfade, and falls back to the synthesised music for any file that is missing.
