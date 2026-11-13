'use strict';

// ================================================================
//  MENU ACTIONS
// ================================================================
const BONUS_STAT = { kills:'totalKills', bestCombo:'bestCombo', gatesCleared:'gatesCleared', damageTaken:'damageTaken' };

function allocateStat(stat) {
  if (player.statPoints <= 0 || !(stat in player.stats)) return;
  player.stats[stat]++; player.statPoints--; recalcPlayer(player); player.hp = player.maxHp; player.mp = player.maxMp;
  playSfx('ui'); saveGame();
}
function autoAssign() {
  if (player.statPoints <= 0) return;
  // Smart distribution: balanced with slight STR/VIT bias for survivability
  const priority = ['STR','VIT','AGI','PER','INT'];
  while (player.statPoints > 0) {
    let lowest = priority[0], lowestVal = Infinity;
    priority.forEach(s => { if (player.stats[s] < lowestVal) { lowestVal = player.stats[s]; lowest = s; } });
    player.stats[lowest]++; player.statPoints--;
  }
  recalcPlayer(player); player.hp = player.maxHp; player.mp = player.maxMp;
  saveGame(); playSfx('buy'); toast('STAT POINTS AUTO-ASSIGNED', 'blue', 2000);
}
function buyNode(id) {
  const n = NODE[id]; if (!n) return;
  const r = player.tree[id] || 0;
  if (r >= n.max || player.skillPoints <= 0 || (n.prev && !(player.tree[n.prev] > 0))) { playSfx('deny'); return; }
  player.tree[id] = r+1; player.skillPoints--;
  recalcPlayer(player); player.hp = player.maxHp;
  playSfx('buy'); saveGame();
}
function respec() {
  const spent = Object.values(player.tree).reduce((a,b) => a+b, 0);
  if (!spent) return;
  player.tree = {}; player.skillPoints += spent; recalcPlayer(player); player.hp = player.maxHp;
  playSfx('ui'); toast(`SKILL TREE RESET — ${spent} POINTS REFUNDED`, 'blue', 2000); saveGame();
}
// A shadow's name: OK keeps what is typed, CLEAR drops it — the enemy name underneath never changes
function saveNick(i) {
  const s = player.shadows[i], e = $('nick-input');
  if (s && e) s.nick = cleanNick(e.value);
  nickEdit = -1; saveGame(); playSfx('ui');
}
function buyWeapon() {
  const w = WEAPONS[player.weapon+1];
  if (!w || player.gold < w.cost) { playSfx('deny'); return; }
  player.gold -= w.cost; player.weapon++;
  playSfx('buy'); flash(w.color, 0.25); toast(`ACQUIRED: ${w.name.toUpperCase()}`, 'gold', 2500); say('new_weapon'); saveGame();
}
function buyPotion() {
  const c = potionCost();
  if (player.potions >= 5 || player.gold < c) { playSfx('deny'); return; }
  player.gold -= c; player.potions++; playSfx('buy'); saveGame();
}
// --- GEAR --- i is a place in the bag
function wearGear(i) {
  const it = player.bag[i], old = player.gear[it.slot];
  if (old) player.bag[i] = old; else player.bag.splice(i, 1); // what was worn takes the item's place in the bag
  player.gear[it.slot] = it;
}
function equipGear(i) {
  if (!player.bag[i]) { playSfx('deny'); return; }
  wearGear(i); gearChanged();
  playSfx('buy'); saveGame();
}
// EQUIP BEST: in each slot the strongest bag item goes on if it beats what is worn; the old piece takes its place in the bag
function equipBestGear() {
  let n = 0;
  for (const s of GEAR_SLOTS) {
    let best = -1;
    player.bag.forEach((it, i) => { if (it.slot === s && gearBetter(it) && (best < 0 || gearScore(it) > gearScore(player.bag[best]))) best = i; });
    if (best >= 0) { wearGear(best); n++; }
  }
  if (!n) { playSfx('deny'); return; }
  gearChanged(); toast(`EQUIPPED ${n} UPGRADE${n > 1 ? 'S' : ''}`);
  playSfx('buy'); saveGame();
}
function unequipGear(slot) {
  const it = GEAR_SLOTS.includes(slot) && player.gear[slot];
  if (!it || player.bag.length >= BAG_MAX) { playSfx('deny'); return; }
  player.gear[slot] = null; player.bag.push(it); gearChanged();
  playSfx('ui'); saveGame();
}
function sellGear(i) {
  const it = player.bag[i];
  if (!it) { playSfx('deny'); return; }
  player.bag.splice(i, 1); player.gold += gearValue(it);
  playSfx('pickup'); saveGame();
}
function sellWeakerGear() {
  const sold = player.bag.filter(it => gearWeaker(it));
  if (!sold.length) { playSfx('deny'); return; }
  const total = sold.reduce((a, it) => a + gearValue(it), 0);
  player.bag = player.bag.filter(it => !gearWeaker(it)); player.gold += total;
  playSfx('buy'); toast(`SOLD ${sold.length} WEAKER ITEM${sold.length > 1 ? 'S' : ''} FOR ◈ ${fmtNum(total)}`, 'gold', 2000); saveGame();
}
function enterGate(id) {
  const g = GATE_DEFS.find(x => x.id === id);
  if (!g || player.level < g.reqLevel || storyRun) return;
  if (player.bag.length >= BAG_MAX && !(gateAsk && gateAsk.ok)) { gateAsk = { id }; menuTab = 'gates'; playSfx('deny'); askGate(); return; }
  gateAsk = null;
  if (chapterDue(g)) showChapter(g, () => startDungeon(g)); // the first visit opens with a chapter card; any other visit starts at once
  else startDungeon(g);
}
function askGate() { renderSystemMenu(); const b = document.querySelector('[data-act="gate-go"]'); if (b) b.scrollIntoView({ block:'center' }); } // on a phone the question can sit below the fold
function enterEndless() {
  if (player.level < ENDLESS.reqLevel || storyRun) return;
  if (player.bag.length >= BAG_MAX && !(gateAsk && gateAsk.ok)) { gateAsk = { endless:true }; menuTab = 'gates'; playSfx('deny'); askGate(); return; }
  gateAsk = null;
  startDungeon(ENDLESS, true);
}
// The Gilded Rift is used up the moment the run starts, so a hunter who quits it has still spent it
function enterRift() {
  if (!player.rift || storyRun) return;
  if (player.bag.length >= BAG_MAX && !(gateAsk && gateAsk.ok)) { gateAsk = { rift:true }; menuTab = 'gates'; playSfx('deny'); askGate(); return; }
  gateAsk = null;
  player.rift = false; player.rifts++; saveGame(); startRift();
}

// Dev mode: ` = +5 levels, ~ (Shift+`) = -5 levels
function devBoost() {
  for (let i = 0; i < 5; i++) playerGainXp(player.xpToNext - player.xp);
  toast('DEV: +5 LEVELS → LV.' + player.level, 'gold', 1500); saveGame();
}
function devDown() {
  if (player.level <= 1) return;
  const newLevel = Math.max(1, player.level - 5);
  let remove = (player.level - newLevel) * 5;
  player.level = newLevel; player.xp = 0; player.xpToNext = xpNeed(newLevel);
  const fromPool = Math.min(remove, player.statPoints); player.statPoints -= fromPool; remove -= fromPool;
  const ks = Object.keys(player.stats);
  for (let i = 0; i < remove; i++) { let mk = ks[0]; ks.forEach(k => { if (player.stats[k] > player.stats[mk]) mk = k; }); if (player.stats[mk] > 5) player.stats[mk]--; }
  player.tree = {}; player.skillPoints = Math.floor(newLevel/2); // skill points follow level — tree resets
  player.rank = rankFor(newLevel);
  recalcPlayer(player); player.hp = player.maxHp; player.mp = player.maxMp;
  toast('DEV: -5 LEVELS → LV.' + player.level, 'red', 1500); saveGame();
}
window.devBoost = () => { if (player) { devBoost(); if (gameState === 'HUB') renderSystemMenu(); } };
window.devDown = () => { if (player) { devDown(); if (gameState === 'HUB') renderSystemMenu(); } };

$('system-menu').addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || gameState !== 'HUB') return;
  if (e.detail > 1 && el.dataset.act.startsWith('gear-')) return; // the list re-renders under the pointer: a double click must not sell or equip the next item too
  const v = el.dataset.v;
  switch (el.dataset.act) {
    case 'tab': menuTab = v; gateAsk = null; nickEdit = -1; playSfx('ui'); break;
    case 'nick': nickEdit = +v; break;
    case 'nick-ok': saveNick(+v); break;
    case 'nick-clear': { const s = player.shadows[+v]; if (s) s.nick = ''; nickEdit = -1; saveGame(); break; }
    case 'stat': allocateStat(v); break;
    case 'auto': autoAssign(); break;
    case 'node': buyNode(v); break;
    case 'respec': respec(); break;
    case 'weapon': buyWeapon(); break;
    case 'potion': buyPotion(); break;
    case 'gear-equip': equipGear(+v); break;
    case 'gear-unequip': unequipGear(v); break;
    case 'gear-sell': sellGear(+v); break;
    case 'gear-best': equipBestGear(); break;
    case 'gear-sell-weaker': sellWeakerGear(); break;
    case 'aim': cycleAim(); break;
    case 'look': cycleLook(); break;
    case 'shake': cycleShake(); break;
    case 'flashes': cycleFlashes(); break;
    case 'numbers': toggleNumbers(); break;
    case 'title': player.title = player.title === v ? '' : (player.titles.includes(v) ? v : player.title); saveGame(); playSfx('ui'); break;
    case 'hue': player.hue = player.hue === v ? '' : (player.titles.includes(v) ? v : player.hue); saveGame(); playSfx('ui'); break; // wear or take off a title's glow colour
    case 'gate': enterGate(v); return;
    case 'endless': enterEndless(); return;
    case 'rift': enterRift(); return;
    case 'gate-go': { const a = gateAsk; gateAsk = { ...a, ok:true }; if (a.rift) enterRift(); else if (a.endless) enterEndless(); else enterGate(a.id); gateAsk = null; return; }
    case 'gate-back': gateAsk = null; break;
  }
  renderSystemMenu();
});

// Sliders on the Controls tab
$('system-menu').addEventListener('input', e => {
  const id = e.target.dataset && e.target.dataset.set;
  if (id !== 'music' && id !== 'sfx') return;
  settings[id] = e.target.value/100; applySettings();
});
$('system-menu').addEventListener('change', e => { if (e.target.dataset && e.target.dataset.set) { saveGame(); playSfx('ui'); } });

// ================================================================
//  FLOW + INPUT HANDLERS
// ================================================================
function applySettings() {
  $('vol-music-pause').value = Math.round(settings.music*100); $('vol-sfx-pause').value = Math.round(settings.sfx*100);
  if (musicGain) { musicGain.gain.value = settings.music; sfxGain.gain.value = settings.sfx; }
  $('pause-aim').textContent = 'AIM: ' + settings.aim.toUpperCase(); $('pause-aim').style.display = isMobile ? 'none' : ''; $('pause-controls').style.display = isMobile ? 'none' : '';
}
function cycleAim() {
  settings.aim = AIM_MODES[(AIM_MODES.indexOf(settings.aim)+1) % AIM_MODES.length];
  applySettings(); saveGame(); playSfx('ui');
  toast({ auto:'AIM: AUTO — KEYS, UNTIL YOU MOVE THE MOUSE', keys:'AIM: KEYS — FACE WHERE YOU MOVE', mouse:'AIM: MOUSE — FACE THE POINTER' }[settings.aim], 'blue', 2400);
}
function cycleLook() {
  settings.hunter = settings.hunter === 'classic' ? 'new' : 'classic';
  saveGame(); playSfx('ui');
  toast(settings.hunter === 'classic' ? 'HUNTER LOOK: CLASSIC' : 'HUNTER LOOK: NEW', 'blue', 2000);
}
// Screen shake cycles full, low, off with a toast
function cycleShake() {
  const modes = ['full', 'low', 'off'];
  settings.shake = modes[(modes.indexOf(settings.shake)+1) % modes.length];
  saveGame(); playSfx('ui');
  toast('SCREEN SHAKE: ' + settings.shake.toUpperCase(), 'blue', 2000);
}
// Screen flashes cycle full, low, off with a toast
function cycleFlashes() {
  const modes = ['full', 'low', 'off'];
  settings.flashes = modes[(modes.indexOf(settings.flashes)+1) % modes.length];
  saveGame(); playSfx('ui');
  toast('SCREEN FLASHES: ' + settings.flashes.toUpperCase(), 'blue', 2000);
}
// Damage numbers toggle on and off with a toast
function toggleNumbers() {
  settings.numbers = settings.numbers === 'off' ? 'on' : 'off';
  saveGame(); playSfx('ui');
  toast('DAMAGE NUMBERS: ' + settings.numbers.toUpperCase(), 'blue', 2000);
}
function enterHub() { gameState = 'HUB'; show('system-menu'); applySettings(); setMusic('hub'); renderSystemMenu(); }
function beginFromTitle() {
  if (gameState !== 'TITLE') return;
  initAudio(); hide('title-screen');
  if (loadGame()) {
    if (player.story.opening) { enterHub(); saveGame(); say('welcome_back'); } // saving here locks in a V16 → V17 upgrade
    else { saveGame(); showOpening(); } // a new hunter who left before the opening ended
  } else { show('name-screen', 'flex'); $('name-input').focus(); gameState = 'CREATE'; }
}
function confirmName() {
  const name = $('name-input').value.trim();
  if (!name || gameState !== 'CREATE') return;
  player = createPlayer(name); questDate = today();
  hide('name-screen'); saveGame();
  showOpening();
}
// The opening plays once, between creating the hunter and the hub. Finishing it or skipping it both count as seen.
function showOpening() {
  gameState = 'STORY'; setMusic('hub');
  runStory(STORY.opening, null, () => { player.story.opening = true; enterHub(); saveGame(); });
  if (VOICE_IDS.includes('chosen')) say('chosen');
}

function onKey(key, e) {
  if (e && e.target && e.target.id === 'nick-input') { // the shadow name box confirms on Enter and fires no game key
    if (key === 'enter') { saveNick(nickEdit); renderSystemMenu(); }
    return;
  }
  initAudio(); // Browser requires a user gesture to start audio
  if (storyRun) { storyKey(key, e); return; } // a story card is up: it alone takes the keys
  if (gameState === 'TITLE') { if (key === 'enter' || key === ' ') { e.preventDefault(); beginFromTitle(); } return; }
  if (gameState === 'CREATE') { if (key === 'enter') { e.preventDefault(); confirmName(); } return; }
  if (key === '`') { window.devBoost(); return; }
  if (key === '~') { window.devDown(); return; }
  if (key === 'm' && !isMobile) { cycleAim(); if (gameState === 'HUB') renderSystemMenu(); return; }
  if (gameState === 'HUB') { const i = key.length === 1 ? '1234567'.indexOf(key) : -1; if (i >= 0) { menuTab = TABS[i][0]; gateAsk = null; playSfx('ui'); renderSystemMenu(); } return; }
  if (gameState !== 'DUNGEON') return;
  if (key === 'tab') { e.preventDefault(); return; }
  if (key === 'escape' || key === 'p') { e.preventDefault(); togglePause(); return; }
  if (paused) return; // block all input while paused
  if (dungeon.state === 'boon') { const i = ['1','2','3'].indexOf(key); if (i >= 0) chooseBoon(i); return; }
  if (key === ' ' || key === 'shift') { e.preventDefault(); dodge(); return; }
  if (key === 'x' || key === 'j') { useSkill(SKILL.slash); return; }
  if (key === 'e') { tryArise(); return; }
  if (key === 'f') { usePotion(); return; }
  if (key === 'r' || key === 'q') { useSkill(SKILL.ult); return; }
  const si = ['1','2','3','4','5'].indexOf(key);
  if (si >= 0) useSkill(SKILL_DEFS[si]);
}

// ================================================================
//  GAMEPAD — a standard pad drives the same keys the keyboard does
// ================================================================
// The connected pads as a plain array: null entries dropped, and [] when the browser has no usable list
function readPads() {
  const get = navigator.getGamepads;
  if (typeof get !== 'function') return [];
  let list;
  try { list = get.call(navigator); } catch (e) { return []; }
  if (!list || typeof list.length !== 'number') return [];
  const out = [];
  for (let i = 0; i < list.length; i++) if (list[i]) out.push(list[i]);
  return out;
}
const PAD_PREV = []; // last frame's pressed state, per button: only the frame a button goes down fires
const padDown = (pad, i) => { const b = pad.buttons && pad.buttons[i]; return !!(b && (b.pressed || ((i === 6 || i === 7) && b.value > 0.5))); }; // triggers can be analogue: value counts as a press
// Menus: the container the pad drives (hub System menu or pause overlay), else null
function padMenu() {
  if (gameState === 'HUB' && !storyRun) return $('system-menu');
  if (gameState === 'DUNGEON' && paused) return $('pause-overlay');
  return null;
}
// Its visible, enabled buttons, in page order
function padButtons(box) {
  if (!box || typeof box.querySelectorAll !== 'function') return [];
  return Array.from(box.querySelectorAll('button')).filter(b => b.offsetParent !== null && !b.disabled);
}
let padFocus = -1;
// The cyan outline moves to the next or previous menu button (wrapping) and the page scrolls to it
function padMoveFocus(step) {
  const bs = padButtons(padMenu()); if (!bs.length) return;
  if (bs[padFocus]) bs[padFocus].style.outline = '';
  padFocus = step > 0 ? (padFocus < 0 ? 0 : (padFocus + 1) % bs.length) : (padFocus < 0 ? bs.length - 1 : (padFocus + bs.length - 1) % bs.length);
  padShowFocus(bs);
}
function padShowFocus(bs) {
  if (padFocus >= bs.length) padFocus = bs.length - 1; // a rebuilt menu may have fewer buttons
  const el = bs[padFocus]; if (!el) return;
  el.style.outline = '2px solid #00d4ff'; el.style.outlineOffset = '2px';
  if (el.scrollIntoView) el.scrollIntoView({ block:'nearest' });
}
// The player's pad: stick to move, the face buttons and shoulders to act, Start to pause
function pollPad(pads = readPads()) {
  const pad = pads && (pads.find(p => p && p.mapping === 'standard') || pads.find(p => p));
  if (!pad) { padMove.active = false; padAttack = false; return; }
  const ax = pad.axes || [], len = Math.hypot(ax[0] || 0, ax[1] || 0);
  if (len > 0.2) { padMove.active = true; padMove.dx = ax[0] || 0; padMove.dy = ax[1] || 0; } // raw values: updatePlayer caps the length at 1, so a light push walks slower
  else padMove.active = false;
  const inRun = gameState === 'DUNGEON' && !storyRun;
  padAttack = !!inRun && !!dungeon && dungeon.state === 'fight' && padDown(pad, 0); // A held keeps the attack going
  const boon = !!(inRun && dungeon && dungeon.state === 'boon'); // a reward is up: the shoulders pick one
  const keyFor = i => i === 0 ? (inRun ? 'x' : 'enter') : i === 1 ? ' ' : i === 2 ? 'e' : i === 3 ? 'r'
    : i === 4 ? (boon ? '1' : '2') : i === 5 ? (boon ? '2' : '3') : i === 6 ? (boon ? '3' : '4')
    : i === 7 ? '5' : i === 9 ? 'escape' : i === 13 ? 'f' : null;
  const box = padMenu();
  if (!box) padFocus = -1; // the highlight starts fresh each time a menu opens
  for (let i = 0; i < 17; i++) {
    const down = padDown(pad, i), was = PAD_PREV[i];
    if (down && !was && box && (i === 0 || i === 4 || i === 5 || (i >= 12 && i <= 15))) { // in a menu: D-pad moves the highlight, A presses, LB/RB flip hub tabs
      if (i === 12 || i === 14) padMoveFocus(-1);
      else if (i === 13 || i === 15) padMoveFocus(1);
      else if (i === 0) { const b = padButtons(box)[padFocus]; if (b) b.click(); padShowFocus(padButtons(padMenu())); }
      else if (gameState === 'HUB') { const n = TABS.length, c = TABS.findIndex(t => t[0] === menuTab); menuTab = TABS[(Math.max(c, 0) + (i === 4 ? n - 1 : 1)) % n][0]; gateAsk = null; playSfx('ui'); renderSystemMenu(); padShowFocus(padButtons(padMenu())); }
    }
    else if (down && !was) { const k = keyFor(i); if (k) onKey(k, { preventDefault(){}, target:null }); }
    PAD_PREV[i] = down;
  }
}

$('title-screen').addEventListener('click', beginFromTitle);
$('name-btn').addEventListener('click', confirmName);
$('extract-btn').addEventListener('click', doExtract);
$('extract-skip').addEventListener('click', () => { if (pendingExtraction) endExtraction(200); });
$('victory-btn').addEventListener('click', returnToHub);
$('death-btn').addEventListener('click', returnToHub);
$('victory-share').addEventListener('click', () => { if (typeof shareResultCard === 'function') shareResultCard('victory'); });
$('death-share').addEventListener('click', () => { if (typeof shareResultCard === 'function') shareResultCard('death'); });
$('boon-cards').addEventListener('click', e => { const c = e.target.closest('[data-boon]'); if (c) chooseBoon(+c.dataset.boon); });
$('pause-resume').addEventListener('click', () => { if (paused) togglePause(); });
$('pause-quit').addEventListener('click', () => { if (dungeon && dungeon.endless) highScores.bestFloor = Math.max(highScores.bestFloor, dungeon.wave-1); returnToHub(); });
$('hud-pause-btn').addEventListener('click', togglePause);
$('pause-aim').addEventListener('click', cycleAim);
$('pause-fullscreen').addEventListener('click', () => {
  const el = document.documentElement;
  if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  setTimeout(resize, 300);
});
$('vol-music-pause').addEventListener('input', e => { settings.music = e.target.value/100; if (musicGain) musicGain.gain.value = settings.music; });
$('vol-sfx-pause').addEventListener('input', e => { settings.sfx = e.target.value/100; if (sfxGain) sfxGain.gain.value = settings.sfx; });
['vol-music-pause','vol-sfx-pause'].forEach(id => $(id).addEventListener('change', saveGame));

function setupTitle() {
  const d = readSave();
  if (!d || !d.name) return;
  show('title-continue'); $('title-prompt').style.display = 'none';
  $('title-continue').textContent = isMobile ? 'SAVED HUNTER DETECTED — TAP TO CONTINUE' : 'SAVED HUNTER DETECTED — PRESS ENTER TO CONTINUE';
  const hs = d.highScores;
  if (hs) {
    const el = $('title-hs'); el.style.display = 'block';
    el.innerHTML = `<h3>HIGH SCORES</h3>
      <div class="hs-row">Best Level <span>${hs.bestLevel|0}</span></div>
      <div class="hs-row">Best Combo <span>${hs.bestCombo|0}x</span></div>
      <div class="hs-row">Total Kills <span>${hs.totalKills|0}</span></div>
      <div class="hs-row">Gates Cleared <span>${hs.gatesCleared|0}</span></div>
      <div class="hs-row">Best Gate <span>${RANKS.includes(hs.bestGate) ? hs.bestGate : '-'}-RANK</span></div>`;
  }
}
setupTitle();

// ================================================================
//  QUESTS
// ================================================================
function confetti(colors, n) {
  if (gameState !== 'DUNGEON') return;
  for (let i = 0; i < n; i++) spawnParticle(player.x+rand(-120,120), player.y+rand(-120,120), colors[i % colors.length], { vx:rand(-240,240), vy:rand(-420,-80), size:rand(3,7), life:rand(0.8,1.6), grav:500, drag:0.6 });
}
setInterval(() => {
  if (!player || gameState === 'TITLE' || gameState === 'CREATE') return;
  let allDailyDone = true;
  DAILY_QUESTS.forEach(q => {
    if (questProgress[q.stat] >= q.target && !q.completed) {
      q.completed = true;
      const xp = q.reward*player.level;
      playerGainXp(xp); toast(`QUEST COMPLETE: ${q.name} (+${fmtNum(xp)} XP)`, 'green', 3000); say('quest_complete');
    }
    if (!q.completed) allDailyDone = false;
  });
  // Unlock bonus quests when all dailies are done
  if (allDailyDone && !bonusQuestsUnlocked) {
    bonusQuestsUnlocked = true;
    toast('ALL DAILY QUESTS COMPLETE', 'green', 2500, true); say('quests_all', true);
    toast('BONUS QUESTS UNLOCKED — STAT POINT REWARDS', 'purple', 3500, true);
    confetti(['#ffcc00','#ff4444','#44ff66','#4488ff','#ff44ff','#00d4ff'], 60); flash('#44ff66', 0.3); saveGame();
  }
  if (bonusQuestsUnlocked) {
    BONUS_QUESTS.forEach(q => {
      if ((highScores[BONUS_STAT[q.stat]] || 0) >= q.target && !q.completed) {
        q.completed = true; player.statPoints += q.reward;
        toast(`BONUS QUEST: ${q.name} (+${q.reward} STAT POINTS)`, 'purple', 3500); saveGame();
      }
    });
    if (!allQuestsJustCompleted && BONUS_QUESTS.every(q => q.completed) && allDailyDone) {
      allQuestsJustCompleted = true;
      if (gameState === 'DUNGEON') { toast('⚡ ALL QUESTS MASTERED ⚡', 'purple', 4000, true); confetti(['#8844ff','#bb88ff','#ffcc00','#00d4ff'], 80); }
    }
  }
}, 1000);
