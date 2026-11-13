# Brief: a one-line fight tip for every enemy and boss in the RECORD tab

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Both pages load the same `js/*.js`.

## What the player sees
In the RECORD tab (`tabRecord()` in `js/09-ui.js`), each enemy or boss the hunter has met (the row is "known": slain at least
once, or a boss whose shadow is owned) shows one more small line under its name: a fight tip saying what it does and how to answer
it. A never-met row (`???`) shows no tip. The tip line uses the style of the row's existing small `KIND` line (10 px,
letter-spacing 1 px), dimmed (`opacity:.55`), and wraps on a phone instead of widening the row. Nothing else changes.

## Build
1. `js/01-data.js`: add a `lore` string to each of the 29 definitions in `GATE_DEFS` (each gate's `enemies` entries and its
   `boss`), with exactly these texts (match by `name`):

| name | lore |
|---|---|
| Goblin | Rushes in close and swings fast. Keep moving and cut it down. |
| Goblin Archer | Hangs back and fires arrows. Close the gap or dodge the shot. |
| Goblin Sapper | Runs at you with a lit charge. Step away before it bursts. |
| Spider Queen | Spits webs that slow you, then lays a clutch of eggs. |
| Orc Warrior | Heavy blade, steady swings. Dodge the big one and strike back. |
| Orc Shaman | Marks the ground where a blast will land. Leave the circle. |
| Orc Raider | Lowers its head and charges in a straight line. Sidestep it. |
| Orc Brute | Slow, tough and hits hard. Never stand in front of the slam. |
| Orc Chieftain | Calls elite orcs to its side, then leaps five times in a row. |
| Skeleton | Fragile but never alone. Clear them before they surround you. |
| Bone Archer | Volleys from range. Use walls and corners to break its line. |
| Lich | Fills the floor with marked circles. Keep moving between them. |
| Death Hound | A fast runner that lunges in a line. Wait for it, then dodge. |
| Death Knight | Raises elite soldiers, then cuts the room into sword lanes. |
| Demon | Strong up close. Dodge its swing and punish the opening. |
| Succubus | Fires from range and keeps its distance. Chase it down. |
| Imp Bomber | Small and quick, with a charge that bursts. Keep your distance. |
| Hellguard | A wall of armour. Circle behind it while it winds up. |
| Demon Lord | Rings the arena with fire in its last stand. Stay off the flames. |
| Drake | Charges low and fast through the room. Sidestep, then strike. |
| Wyvern | Spits fire from above. Keep moving and the shots miss. |
| Flame Cultist | Marks fire on the floor below you. Leave the circle early. |
| Dragonkin | Big, armoured and slow. Wait out the slam, then hit hard. |
| Ancient Dragon | Rains fire over the lair. Burning floor hurts while you stand on it. |
| Stone Knight | Hard stone and a heavy sword. Patience wins this fight. |
| Seraph Statue | Marks the ground for heavy blows. Read the circle and move. |
| Stone Hound | A stone runner that lunges in a line. Dodge sideways. |
| Temple Sentinel | Slow and huge. Its slam cracks the floor, so never stand close. |
| Statue of God | Sweeps a cold eye-beam over the room. Move with it, not into it. |

   If a definition in the file has a name that is not in this table, or a table name has no definition, stop and list the
   mismatch in your report instead of inventing a text.
2. `js/09-ui.js` `tabRecord()`: for a known row with `def.lore`, add the tip line under the existing `KIND` tag line, passed
   through `esc()`.

## Test (add to `tools/test_record.js`, keep every existing case)
- Every enemy and boss in `GATE_DEFS` has a `lore` string of 20 to 80 characters, ending with a full stop, with no `<`, `>` or
  `&`, and none of these words (case ignored): STAR, RUNE, GOD, HOLY, SAINT, ANGEL, CROSS, PRAY, CHURCH, TEMPLE, DIVINE, SACRED,
  CURSE, OCCULT, SPELL, DEVIL, SOUL, HELL (the same art-rule list `tools/test_titles.js` uses, plus SOUL and HELL). Note: the names
  themselves are not checked, only the `lore` text.
- `tabRecord()` for a hunter who has slain one Goblin contains the Goblin's tip and does not contain the Goblin Archer's tip.
Print the PASS line as now.

## Constraints
- Touch only `js/01-data.js`, `js/09-ui.js` and `tools/test_record.js`. Do not edit `index.html`, `3d/index.html` or
  `3d/render3d.js`; do NOT run `tools/stamp.sh`.
- No change to any enemy number (health, damage, speed, size, XP) or anything in a fight.
- Match the surrounding style: compact statements, short names, one short comment saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check js/01-data.js js/09-ui.js tools/test_record.js` prints nothing.
- `node tools/test_record.js` prints `PASS <n>` with n above 166; `node tools/test_titles.js` (PASS 71), `node tools/test_army.js`
  (PASS 570), `node tools/test_recent_runs.js` print PASS.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
Both items are in and every check passes. Commit nothing yourself unless the instructions you were given say to.
