# Brief: play the System's recorded voice and signature sound effects in the game

Everything you need is in this repo. Do not read or write anything outside it. Read only the functions named below (file and line given); do not browse the rest of the code.

## Background
`Arise` is a canvas action game. Scripts in `js/` are classic `<script>` files sharing one global scope (no modules, no build step). All sound today is synthesized in `js/02-audio.js` (`playSfx(type)`). Recorded mp3 clips now exist and must be played:

- `assets/voice/<id>.mp3`, 35 spoken lines.
- `assets/sfx/<id>.mp3`, 8 sound effects.

Do not open, move, rename or regenerate any file in `assets/`. The game must still work when a clip is missing or not loaded yet (fall back to the synthesized sound, or stay silent for a voice line).

Globals that already exist and may be used: `AC` (the AudioContext), `sfxGain`, `settings.sfx`, `clamp(v,mn,mx)`, `after(sec, fn, real)`, `playSfx(type)`, `toast(...)`.

## Change 1: clip player in `js/02-audio.js`

1a. In `initAudio()` (line 10), the last line of the function is `setInterval(musicTick, 25);` (line 28). Add `loadClips();` right after it.

1b. Add this block directly above the line `const sfxLast = {};` (line 64):

```js
// --- RECORDED CLIPS: the System's voice and the signature effects (mp3 files in assets/) ---
const VOICE_IDS = ['chosen','welcome_back','gate_enter','wave_clear','reward','elite','boss_detected','boss_enraged','boss_defeated','gate_cleared','level_up','rank_d','rank_c','rank_b','rank_a','rank_s','skill_unlocked','awakening_ready','extract_prompt','extract_start','extract_success','extract_fail','extract_lost','army_grows','legion','low_hp','keep_moving','death','quest_complete','quests_all','new_gate','new_weapon','no_potions','floor_cleared','castle_shifts'];
const SFX_IDS = ['extract_charge','extract_success','extract_fail','boss_appear','level_up','awakening','legion','death'];
// Recorded replacements for synthesized effects: playSfx type -> [clip id, gain]. Two of the clips peak over full level, hence 0.6
const SFX_CLIP = { levelup:['level_up',0.7], boss:['boss_appear',0.6], ult:['awakening',0.6], legion:['legion',0.7], death:['death',0.7] };
// Seconds before the same voice line may repeat (default 10)
const VOICE_GAP = { low_hp:25, keep_moving:25, army_grows:30, elite:20 };
const clips = {}, voiceLast = {};
let voiceNode = null, voiceUntil = 0;

function loadClips() {
  // fetch() is blocked when the game is opened straight from disk (file://); an <audio> element still works there
  const add = (key, url) => fetch(url).then(r => r.arrayBuffer()).then(b => AC.decodeAudioData(b)).then(buf => { clips[key] = buf; })
    .catch(() => { const a = new Audio(url); a.preload = 'auto'; clips[key] = a; });
  VOICE_IDS.forEach(id => add('v_'+id, `assets/voice/${id}.mp3`));
  SFX_IDS.forEach(id => add('s_'+id, `assets/sfx/${id}.mp3`));
}
// Returns the playing node (truthy) or null when the clip is not loaded, so callers can fall back
function playClip(key, vol = 1, delay = 0) {
  const c = clips[key];
  if (!c || !AC || AC.state !== 'running') return null;
  if (c instanceof AudioBuffer) {
    const src = AC.createBufferSource(), g = AC.createGain();
    src.buffer = c; g.gain.value = vol; src.connect(g); g.connect(sfxGain); src.start(AC.currentTime + delay);
    return src;
  }
  c.volume = clamp(vol*settings.sfx, 0, 1);
  setTimeout(() => { c.currentTime = 0; c.play().catch(() => {}); }, delay*1000);
  return c;
}
// One voice line at a time. A new line is dropped while another is speaking, unless force (which cuts the old one off).
function say(id, force = false, delay = 0, retried = false) {
  if (!AC) return;
  if (!clips['v_'+id]) { if (!retried) setTimeout(() => say(id, force, 0, true), 1200); return; } // clips load after the first click
  const now = AC.currentTime;
  if (!force && (now + delay < voiceUntil || (voiceLast[id] && now - voiceLast[id] < (VOICE_GAP[id] ?? 10)))) return;
  if (force && voiceNode) { try { if (voiceNode.stop) voiceNode.stop(); else voiceNode.pause(); } catch (e) {} }
  const n = playClip('v_'+id, 1, delay);
  if (!n) return;
  voiceNode = n; voiceLast[id] = now; voiceUntil = now + delay + ((n.buffer || n).duration || 1.5);
}
```

1c. In `playSfx(type, p = 1)` (line 65), right after the line `sfxLast[type] = t;` add:

```js
  const rec = SFX_CLIP[type];
  if (rec && playClip('s_'+rec[0], rec[1])) return;
```

## Change 2: the extraction moment, `js/08-dungeon.js`

The line must be heard as an announcement with a nervous wait: "Shadow extraction." … then "Successful." or "Failed." landing together with the result on screen.

2a. In `showExtraction()` (line 124) add `extractBusy = false; say('extract_prompt', false, 0.3);` as the first statement.

2b. Replace the whole of `doExtract()` (lines 129 to 145) with:

```js
let extractBusy = false;
function doExtract() {
  if (!pendingExtraction || extractBusy) return;
  const p = pendingExtraction;
  extractBusy = true; extractTries--; updateExtractInfo();
  arisePillar(p.x, p.y, true); shake(6);
  // The System announces the attempt, then the wait: the result word lands with the result on screen
  playClip('s_extract_charge', 0.5); say('extract_start', true);
  after(clips.v_extract_start ? 2.0 : 0.05, () => {
    extractBusy = false;
    if (pendingExtraction !== p) return;
    shake(10);
    if (Math.random() < extractChance()) {
      if (!playClip('s_extract_success', 0.7)) playSfx('extract');
      say('extract_success', true, 0.1); flash('#8844ff', 0.6);
      addShadow({ name:p.def.name, kind:'boss', damage:Math.floor(p.def.damage*0.4), level:player.level, color:p.def.color, size:Math.min(p.def.size*0.4, 18), grade:'Marshal', x:p.x, y:p.y });
      toast(`SHADOW EXTRACTED: ${p.def.name}`, 'purple', 3000);
      // second beat, timed to the second hit in the sound
      after(1.1, () => { arisePillar(p.x, p.y, true); ring(p.x, p.y, '#ffffff', 20, 420, 0.7, 10); flash('#bb66ff', 0.55); shake(18); }, true);
      endExtraction(2600);
    } else {
      if (!playClip('s_extract_fail', 0.8)) playSfx('fail');
      say('extract_fail', true, 0.1); flash('#330000', 0.3);
      if (extractTries <= 0) { toast('EXTRACTION FAILED — THE SHADOW IS LOST', 'red', 2500); say('extract_lost', false, 1.3); endExtraction(900); }
      else { toast('EXTRACTION FAILED', 'red', 1500); updateExtractInfo(); }
    }
  }, true);
}
```

Keep `endExtraction` and everything else in the file as it is, apart from the one-line additions in Change 3.

## Change 3: one `say(...)` call at each moment

Add exactly the call shown, on the same line as (right after) the statement quoted. Do not change the quoted statements.

| File | Line | Existing statement (starts with) | Add |
|---|---|---|---|
| `js/10-actions.js` | 119 | `if (loadGame()) { enterHub(); saveGame(); }` | inside the braces, after `saveGame();`: `say('welcome_back');` |
| `js/10-actions.js` | 127 | `toast('[SYSTEM] YOU HAVE BEEN CHOSEN AS A PLAYER.'` | `say('chosen');` |
| `js/10-actions.js` | 43 | `toast(\`ACQUIRED: ${w.name.toUpperCase()}\`` | `say('new_weapon');` (before `saveGame();` is fine) |
| `js/10-actions.js` | 206 | `toast(\`QUEST COMPLETE: ${q.name}` | `say('quest_complete');` |
| `js/10-actions.js` | 213 | `toast('ALL DAILY QUESTS COMPLETE'` | `say('quests_all', true);` |
| `js/08-dungeon.js` | 27 | `toast(endless ? 'ENTERING THE DEMON CASTLE'` | `say('gate_enter');` |
| `js/08-dungeon.js` | 58 | `toast(\`THE CASTLE SHIFTS` | `say('castle_shifts', true);` (inside the same braces) |
| `js/08-dungeon.js` | 61 | `if ((dungeon.wave-1) % 2 === 0 \|\| isBossWave()) showBoons(); else dungeon.wait = 1.2;` | change the `else` part to `else { dungeon.wait = 1.2; say('wave_clear'); }` |
| `js/08-dungeon.js` | 85 | `toast('⚠ BOSS DETECTED — HUNT IT DOWN ⚠'` | `say('boss_detected', true);` |
| `js/08-dungeon.js` | 90 | `dungeon.bossRef = null; dungeon.state = 'dying';` (in `onBossDeath`) | `say('boss_defeated', true, 0.6);` |
| `js/08-dungeon.js` | 104 | `toast(\`FLOOR ${dungeon.wave} CONQUERED\`` | `say('floor_cleared');` |
| `js/08-dungeon.js` | 151 | first line inside `showVictory()` | add as a new first statement: `say('gate_cleared');` |
| `js/08-dungeon.js` | 169 | `setMusic('off'); playSfx('death');` | `say('death', true, 0.8);` |
| `js/08-dungeon.js` | 198 | `show('boon-overlay', 'flex'); playSfx('boon');` | `say('reward');` |
| `js/05-enemies.js` | 11 | `if (e.elite) { e.hp *= 3; ...  e.name = 'Elite ' + e.name; }` (in `makeEnemy`) | inside the braces, at the end: `say('elite');` |
| `js/05-enemies.js` | 74 | `toast(\`${e.name.toUpperCase()} IS ENRAGED\`` | `say('boss_enraged', true);` |
| `js/04-player-fx.js` | 37 | `if (player.ult >= 100) { toast(isMobile ? 'AWAKENING READY'` | inside the braces: `say('awakening_ready');` |
| `js/04-player-fx.js` | 52 | `toast(\`RANK UP: ${player.rank} → ${r}\`` | `say('rank_'+r.toLowerCase(), true);` |
| `js/04-player-fx.js` | 55 | `SKILL_DEFS.forEach(s => { if (player.level === s.unlockLevel && s.unlockLevel > 1) toast(\`NEW SKILL` | change the `if` body to `{ toast(...the same toast call...); say('skill_unlocked'); }` |
| `js/04-player-fx.js` | 56 | `if (player.level === ENDLESS.reqLevel) toast('NEW GATE: DEMON CASTLE — ENDLESS'` | change the `if` body to `{ toast(...the same toast call...); say('new_gate'); }` |
| `js/04-player-fx.js` | 60 | `toast(\`LEVEL UP — LV.${player.level}` … `playSfx('levelup');` | `say('level_up');` after `playSfx('levelup');` |
| `js/06-combat.js` | 79 | `player.hp -= fd; player.hitFlash = 0.2; player.inv = 0.4;` (in `hurtPlayer`) | on a new line after it: `if (player.hp > 0 && player.hp < player.maxHp*0.25) say('low_hp'); else if (st > 3) say('keep_moving');` |
| `js/06-combat.js` | 154 | `toast('NO POTIONS — BUY MORE IN THE ARMORY'` | `say('no_potions');` (before `return;`) |
| `js/07-skills-shadows.js` | 105 | `playSfx('legion'); toast('ARISE — SHADOW LEGION UNLEASHED'` | `say('legion', true, 0.4);` |
| `js/07-skills-shadows.js` | 171 | `toast(\`ARISE — ${r.name.toUpperCase()} JOINS YOUR ARMY\`` | `say('army_grows');` |

Line numbers are for the branch as it is now and shift by a few as you edit; find each statement by its text.

## Constraints
- Change only `js/02-audio.js`, `js/04-player-fx.js`, `js/05-enemies.js`, `js/06-combat.js`, `js/07-skills-shadows.js`, `js/08-dungeon.js`, `js/10-actions.js`.
- Do not edit `index.html`. Do not create files. Do not touch `assets/`, `docs/`, `tools/` or `3d/`.
- Use the code blocks above as written. Match the surrounding style: 2-space indent, compact lines, a comment only where it explains why.
- No new dependencies, no modules, no `import`/`export`.
- Commit nothing but those seven files.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "say(" js/02-audio.js js/04-player-fx.js js/05-enemies.js js/06-combat.js js/07-skills-shadows.js js/08-dungeon.js js/10-actions.js
# expect: 02-audio at least 2; 04-player-fx 5; 05-enemies 2; 06-combat 2 (two calls share one line); 07-skills-shadows 2; 08-dungeon 14; 10-actions 5
grep -c "playClip(" js/02-audio.js js/08-dungeon.js   # expect at least 3 in each
grep -c "extractBusy" js/08-dungeon.js                # expect 5
grep -c "loadClips" js/02-audio.js                    # expect 2
git status --short                                    # expect only the seven js files
```

## Done looks like
No `FAIL` lines, the counts match, seven files changed, under 110 lines added.
