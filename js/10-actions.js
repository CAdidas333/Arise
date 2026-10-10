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
function enterGate(id) {
  const g = GATE_DEFS.find(x => x.id === id);
  if (g && player.level >= g.reqLevel) startDungeon(g);
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
  const v = el.dataset.v;
  switch (el.dataset.act) {
    case 'tab': menuTab = v; playSfx('ui'); break;
    case 'stat': allocateStat(v); break;
    case 'auto': autoAssign(); break;
    case 'node': buyNode(v); break;
    case 'respec': respec(); break;
    case 'weapon': buyWeapon(); break;
    case 'potion': buyPotion(); break;
    case 'aim': cycleAim(); break;
    case 'look': cycleLook(); break;
    case 'gate': enterGate(v); return;
    case 'endless': if (player.level >= ENDLESS.reqLevel) startDungeon(ENDLESS, true); return;
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
function enterHub() { gameState = 'HUB'; show('system-menu'); applySettings(); setMusic('hub'); renderSystemMenu(); }
function beginFromTitle() {
  if (gameState !== 'TITLE') return;
  initAudio(); hide('title-screen');
  if (loadGame()) { enterHub(); saveGame(); say('welcome_back'); } // saving here locks in a V16 → V17 upgrade
  else { show('name-screen', 'flex'); $('name-input').focus(); gameState = 'CREATE'; }
}
function confirmName() {
  const name = $('name-input').value.trim();
  if (!name || gameState !== 'CREATE') return;
  player = createPlayer(name); questDate = today();
  hide('name-screen'); enterHub(); saveGame();
  toast('[SYSTEM] YOU HAVE BEEN CHOSEN AS A PLAYER.', 'blue', 3500); say('chosen');
}

function onKey(key, e) {
  initAudio(); // Browser requires a user gesture to start audio
  if (gameState === 'TITLE') { if (key === 'enter' || key === ' ') { e.preventDefault(); beginFromTitle(); } return; }
  if (gameState === 'CREATE') { if (key === 'enter') { e.preventDefault(); confirmName(); } return; }
  if (key === '`') { window.devBoost(); return; }
  if (key === '~') { window.devDown(); return; }
  if (key === 'm' && !isMobile) { cycleAim(); if (gameState === 'HUB') renderSystemMenu(); return; }
  if (gameState === 'HUB') { const i = key.length === 1 ? '123456'.indexOf(key) : -1; if (i >= 0) { menuTab = TABS[i][0]; playSfx('ui'); renderSystemMenu(); } return; }
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

$('title-screen').addEventListener('click', beginFromTitle);
$('name-btn').addEventListener('click', confirmName);
$('extract-btn').addEventListener('click', doExtract);
$('extract-skip').addEventListener('click', () => { if (pendingExtraction) endExtraction(200); });
$('victory-btn').addEventListener('click', returnToHub);
$('death-btn').addEventListener('click', returnToHub);
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
