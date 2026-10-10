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
