# Brief: a better backpack (four ideas from Kevin, approved by Chris 2026-10-16)

## Goal
The gear bag (ARMORY tab of the System menu) gets four improvements:
1. **Bigger:** the bag holds 24 items instead of 12.
2. **Sell what is weaker:** one button sells every bag item that is weaker than the item equipped in its slot.
3. **Upgrade hint:** a bag item that beats what is equipped in its slot (or whose slot is empty) is marked UPGRADE, and the
   ARMORY tab shows how many upgrades wait in the bag.
4. **Full-bag check before a gate:** entering a gate (or endless mode) with a full bag first asks "your bag is full, enter anyway?".

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice stops a
whole script loading; `bash tools/check_names.sh` lists clashes. Use exactly the new names below.

## How "weaker" and "better" are measured
Add to the GEAR section of `js/01-data.js`, after `gearValue` (about line 213):
- `const gearScore = it => it ? Object.keys(it.mods).reduce((a, k) => a + it.mods[k]/GEAR_CAPS[k], 0) : 0;`
  with the comment: an item's strength, each mod as a share of its cap, summed (so more mods and bigger mods both count).
- `function gearBetter(it, p = player)`: true when `p.gear[it.slot]` is empty, or `gearScore(it) > gearScore(p.gear[it.slot]) + 1e-9`.
- `function gearWeaker(it, p = player)`: true only when `p.gear[it.slot]` is NOT empty and `gearScore(it) < gearScore(p.gear[it.slot]) - 1e-9`.
  (An item equal to what is worn is neither; an item for an empty slot is never weaker.)

## Exact changes
1. `js/01-data.js` line 175: `const BAG_MAX = 24;` (saves already trim the bag to `BAG_MAX` on load, `js/03-state.js` line 93; nothing else to change there).
2. `js/10-actions.js`: next to `sellCommonGear` (about line 71) add `function sellWeakerGear()`, written like `sellCommonGear`:
   sells every bag item where `gearWeaker(it)`, adds the gold, toast `SOLD 3 WEAKER ITEMS FOR ◈ 123` (singular "ITEM" for one),
   `playSfx('buy')`, `saveGame()`; with nothing to sell, `playSfx('deny')` and return. Delete `sellCommonGear` and its
   dispatcher case: the new button replaces "SELL ALL COMMON". Add the dispatcher case `case 'gear-sell-weaker': sellWeakerGear(); break;`.
3. `js/09-ui.js` `gearSection()` (about line 198):
   - Replace the SELL ALL COMMON button with: when any bag item is `gearWeaker`, a button
     `SELL ALL WEAKER THAN EQUIPPED &nbsp; ◈ <total>` with `data-act="gear-sell-weaker"` (same classes and style as the old button).
   - Bag rows: when `gearBetter(it)`, add after the rarity tag in the name line
     `<span class="grade" style="color:#44ff66;border-color:#44ff66">UPGRADE</span>` (check how `.grade` is styled in `index.html`
     and keep the look consistent), and put the EQUIP button first as now.
   - The empty-bag text stays. Under the bag heading, when the bag is full, add one line in the same `g-total` style:
     `The bag is full. New finds in a gate are sold on the spot.`
4. `js/09-ui.js` `renderSystemMenu()` (about line 60): the ARMORY tab's pip shows the number of bag items where `gearBetter(it)`
   (0 shows nothing, as for the other tabs): `id === 'armory' ? player.bag.filter(it => gearBetter(it)).length`.
5. Full-bag check (`js/10-actions.js` and `js/09-ui.js`):
   - New top-level `let gateAsk = null;` in `js/09-ui.js` next to `storyRun` (about line 219): the gate waiting for the
     player's answer, `{ id }` for a gate or `{ endless:true }`.
   - `enterGate(id)` (about line 78): after its existing checks, if `player.bag.length >= BAG_MAX` and
     `!(gateAsk && gateAsk.ok)`, set `gateAsk = { id }`, set `menuTab = 'gates'`, `playSfx('deny')`, call `renderSystemMenu()` and
     return. Otherwise clear `gateAsk = null` and go on as now. Do the same for the `case 'endless':` line in the dispatcher (move
     its body into a small `function enterEndless()` that does the level check, the bag check with `gateAsk = { endless:true }`,
     and `startDungeon(ENDLESS, true)`).
   - `tabGates()` (about line 112): when `gateAsk` is set, return instead of the gate list:
     `<h3>Bag full</h3>` and a `g-total` line `Your bag is full (24 / 24). Gear found in this gate will be sold on the spot for gold.`
     (use the real numbers), then three buttons in a row with the existing `sys-btn` classes:
     `ENTER ANYWAY` (`data-act="gate-go"`), `OPEN ARMORY` (`data-act="tab" data-v="armory"`), `BACK` (`data-act="gate-back"`).
   - Dispatcher cases: `'gate-go'`: `const a = gateAsk; gateAsk = { ...a, ok:true }; if (a.endless) enterEndless(); else enterGate(a.id); gateAsk = null; return;`
     `'gate-back'`: `gateAsk = null; break;`. When the player switches tab (`case 'tab'`), also clear `gateAsk = null`.
   - The keyboard path: check how keys 1 to 6 and Enter work in the HUB (`js/10-actions.js` about line 187); if a key can start
     a gate directly, it must go through `enterGate`/`enterEndless` so the check applies.
6. `tools/test_gear.js`: add checks (keep the file's PASS counting style): `gearScore` of an item with one mod at its cap is 1;
   a Legendary from `rollGear(100, 3)` scores higher than a Common from `rollGear(1)` (check over 200 rolls); `gearBetter` is true
   for an empty slot and false for an equal item; `gearWeaker` is false for an empty slot and for an equal item and true for a
   strictly weaker one; and selling with `sellWeakerGear` logic keeps upgrades and equal items (test the filter, not the DOM).

## Constraints
- Touch only `js/01-data.js`, `js/09-ui.js`, `js/10-actions.js`, `tools/test_gear.js` (and `index.html` ONLY if a style is
  truly missing; prefer inline styles). Do not edit `3d/index.html` and do NOT run `tools/stamp.sh`.
- No new overlays or files. Plain text and existing button styles. No star symbols, runes or occult imagery anywhere (the
  UPGRADE tag is a word, not a symbol).
- Match the surrounding style: compact statements, short names, a short comment only where the reason is not obvious.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`.
- `node tools/test_gear.js` passes with your new checks; `node tools/test_layout.js` ends with `PASS 8000`; `node tools/test_army.js` passes.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All six changes are in and every check passes. Commit nothing yourself.
