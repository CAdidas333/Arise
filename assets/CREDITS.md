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
- `s_gate`: an ancient temple floor of large polished pale grey marble tiles with thin blue inlay lines along the joints and fine veins, cool blue-grey
- `bg/hub`: an empty city street at night after rain, a huge upright oval gate of swirling blue and violet energy in the middle of the street, dark skyscrapers, wet asphalt reflections (first try came out shaped like a question mark and was rejected)

Rule for anything added here: no star symbols, runes or occult imagery. Check each image by eye before it goes in.
