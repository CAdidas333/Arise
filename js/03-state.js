'use strict';

// ================================================================
//  CANVAS + GAME STATE
// ================================================================
const canvas = $('gameCanvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  W = innerWidth; H = window.visualViewport ? Math.round(window.visualViewport.height) : innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  if (W*H*DPR*DPR > 3.6e6) DPR = Math.sqrt(3.6e6/(W*H)); // keep fill-rate sane on huge displays
  canvas.width = Math.round(W*DPR); canvas.height = Math.round(H*DPR);
}
addEventListener('resize', resize); resize();

let gameState = 'TITLE'; // TITLE | CREATE | STORY (the opening) | HUB | DUNGEON
let player = null, paused = false;
let viewYaw = 0; // camera turn in radians, set by the 3D view; 0 in the 2D game
let enemies = [], projectiles = [], particles = [], texts = [], rings = [], arcs = [], ghosts = [], bolts = [];
let telegraphs = [], orbs = [], remnants = [], spawnQueue = [], timers = [];
let camera = { x:0, y:0, shake:0, zoom:1, targetZoom:1, focus:null };
let dungeon = null, run = null;
let questProgress = { kills:0, damageTaken:0, gatesCleared:0 }, questDate = '';
let highScores = { bestLevel:0, bestCombo:0, totalKills:0, gatesCleared:0, bestGate:'-', bestFloor:0, damageTaken:0 };
let bonusQuestsUnlocked = false, allQuestsJustCompleted = false;
let comboCount = 0, comboTimer = 0;
let lastPlayerAttackTime = -99; // tracks when player last attacked (shadows only fight alongside you)
let legionTimer = 0;
const SHADOW_IDLE_TIMEOUT = 3, LEGION_DURATION = 12, STATIONARY_TIMEOUT = 10;
let lastMovePos = { x:0, y:0 }, lastMoveTime = 0;
let arenaW = 1400, arenaH = 1000; // expands during boss hunt
let gameTime = 0, clock = 0, hitStop = 0, timeScale = 1, slowT = 0;
let screenFlash = { alpha:0, color:'#fff' }, vignetteIntensity = 0.15;
let pendingExtraction = null, extractTries = 0;
let menuTab = 'status';
const moveDir = { x:0, y:0 };

const today = () => new Date().toDateString();
const tr = id => (player && player.tree[id]) || 0;   // skill-tree rank
const bn = id => (run && run.boons[id]) || 0;         // run-boon stacks
// run fn after `sec` — game time by default, wall-clock when real=true
const after = (sec, fn, real = false) => timers.push({ t:sec, fn, real });

// ================================================================
//  SAVE / LOAD
// ================================================================
function saveGame() {
  if (!player) return;
  const d = {
    v:VERSION, spv:2, name:player.name, level:player.level, xp:player.xp, rank:player.rank,
    stats:{...player.stats}, statPoints:player.statPoints, skillPoints:player.skillPoints, tree:{...player.tree},
    weapon:player.weapon, gold:player.gold, potions:player.potions, cleared:{...player.cleared},
    gear:{...player.gear}, bag:[...player.bag], story:{ opening:!!player.story.opening, gates:{...player.story.gates}, arose:!!player.story.arose },
    shadows:player.shadows.map(s => ({ name:s.name, kind:s.kind, damage:s.damage, level:s.level, color:s.color, size:s.size, grade:s.grade })),
    questProgress:{...questProgress}, questDate, highScores:{...highScores},
    questsCompleted:DAILY_QUESTS.filter(q => q.completed).map(q => q.id),
    bonusCompleted:BONUS_QUESTS.filter(q => q.completed).map(q => q.id), bonusQuestsUnlocked,
    settings:{...settings},
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch (e) {}
}

function readSave() { try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
function hasSave() { return !!readSave(); }

function loadGame() {
  const d = readSave();
  if (!d || !d.name) return false;
  player = createPlayer(d.name);
  player.level = Math.max(1, d.level|0); player.rank = rankFor(player.level);
  const okColor = c => /^#[0-9a-f]{3,8}$/i.test(c) ? c : COLORS.accent; // saved strings end up in markup — keep them inert
  Object.assign(player.stats, d.stats || {});
  player.statPoints = d.statPoints|0; player.gold = Math.floor(d.gold || 0);
  player.xpToNext = xpNeed(player.level);
  const bossNames = GATE_DEFS.map(g => g.boss.name);
  player.shadows = (d.shadows || []).map(s => ({ name:String(s.name).slice(0, 40),
    kind:['melee','ranged','charger','bomber','brute','caster','boss'].includes(s.kind) ? s.kind : shadowKindFor(s.name),
    damage:+s.damage || 5, level:s.level|0 || 1, color:okColor(s.color), size:+s.size || 14,
    grade:GRADE_COLOR[s.grade] ? s.grade : (bossNames.includes(s.name) ? 'Marshal' : 'Soldier'), x:0, y:0, active:false, attackCd:0, animT:rand(0,9), facing:{ x:1, y:0 } }));
  if (d.v >= 17) {
    player.xp = d.xp|0; player.skillPoints = d.skillPoints|0;
    for (const id in (d.tree || {})) if (NODE[id]) player.tree[id] = clamp(d.tree[id]|0, 0, NODE[id].max);
    // Saves from before skill points were slowed to one per 2 levels: refund everything at the new rate
    const allowed = Math.floor(player.level/2), spent = Object.values(player.tree).reduce((a, b) => a + b, 0);
    if ((d.spv|0) < 2 && spent + player.skillPoints > allowed) {
      player.tree = {}; player.skillPoints = allowed;
      toast('SKILL TREE REBALANCED — 1 POINT PER 2 LEVELS. YOUR POINTS WERE REFUNDED.', 'purple', 6000);
    }
    player.weapon = clamp(d.weapon|0, 0, WEAPONS.length-1); player.potions = d.potions|0; player.cleared = d.cleared || {};
    // Gear: a save from before gear has none, and anything that is not a clean item is dropped
    for (const s of GEAR_SLOTS) { const it = cleanGear(d.gear && d.gear[s]); player.gear[s] = it && it.slot === s ? it : null; }
    player.bag = (Array.isArray(d.bag) ? d.bag.slice(0, 4*BAG_MAX) : []).map(cleanGear).filter(Boolean).slice(0, BAG_MAX);
  } else {
    // V16 save: the old XP curve was exponential, so re-seat XP on the new one and grant the skill points those levels would have earned
    player.xp = 0; player.skillPoints = Math.floor(player.level/2); player.potions = 2;
    toast(`SAVE UPGRADED TO V17 — ${player.skillPoints} SKILL POINTS GRANTED`, 'purple', 5000);
  }
  // Story: what has been shown. No field (a save from before the story) means nothing seen, but a hunter who has already played is not given the opening
  const sd = d.story && typeof d.story === 'object' ? d.story : {};
  player.story.opening = sd.opening === true || player.level > 1 || GATE_DEFS.some(g => player.cleared[g.id]);
  for (const g of GATE_DEFS) if (sd.gates && sd.gates[g.id] === true) player.story.gates[g.id] = true;
  player.story.arose = sd.arose === true;
  if (d.settings) Object.assign(settings, d.settings);
  if (!AIM_MODES.includes(settings.aim)) settings.aim = 'auto';
  if (settings.hunter !== 'classic') settings.hunter = 'new';
  highScores = Object.assign(highScores, d.highScores || {});
  questProgress = Object.assign({ kills:0, damageTaken:0, gatesCleared:0 }, d.questProgress || {});
  questDate = d.questDate || '';
  (d.questsCompleted || []).forEach(id => { const q = DAILY_QUESTS.find(x => x.id === id); if (q) q.completed = true; });
  (d.bonusCompleted || []).forEach(id => { const q = BONUS_QUESTS.find(x => x.id === id); if (q) q.completed = true; });
  bonusQuestsUnlocked = !!d.bonusQuestsUnlocked;
  allQuestsJustCompleted = BONUS_QUESTS.every(q => q.completed);
  checkDailyReset();
  recalcPlayer(player); player.hp = player.maxHp; player.mp = player.maxMp;
  return true;
}

// Daily quests really are daily now
function checkDailyReset() {
  if (questDate === today()) return;
  questDate = today();
  questProgress = { kills:0, damageTaken:0, gatesCleared:0 };
  DAILY_QUESTS.forEach(q => { q.completed = false; });
}

// ================================================================
//  TOAST NOTIFICATIONS
// ================================================================
function toast(text, style = 'blue', duration = 2000, isStreak = false) {
  const box = $('toast-container');
  const cap = isMobile ? 2 : 4; // on a phone a tall stack of pop-ups covers the fight
  while (box.children.length >= cap) box.firstChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${style}` + (isStreak ? ' streak' : '');
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity 0.5s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, duration);
}

// ================================================================
//  INPUT
// ================================================================
const keys = {};
const mouse = { x:W/2, y:H/2, down:false, moved:false, lastMove:-99, ax:0, ay:0 };
let touchAttack = false;
addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (e.repeat && k !== 'tab') { if (k === ' ') e.preventDefault(); return; } keys[k] = true; onKey(k, e); });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
addEventListener('mousemove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = true;
  // only a deliberate move counts as aiming — a trackpad click that jitters a few pixels does not
  if (Math.hypot(mouse.x-mouse.ax, mouse.y-mouse.ay) > 14) { mouse.ax = mouse.x; mouse.ay = mouse.y; mouse.lastMove = clock; }
});
addEventListener('mousedown', e => {
  initAudio();
  if (e.target !== canvas || gameState !== 'DUNGEON') return;
  if (e.button === 2) { if (!window.view3D) dodge(); return; }
  mouse.down = true; useSkill(SKILL.slash);
});
addEventListener('mouseup', () => { mouse.down = false; });
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden && gameState === 'DUNGEON' && !paused && dungeon && dungeon.state === 'fight') togglePause(); });

// --- MOBILE TOUCH CONTROLS ---
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window && innerWidth < 1024);
const touchJoystick = { active:false, dx:0, dy:0 };

// One entry point for every action button, on any device
function act(a) {
  if (gameState !== 'DUNGEON' || !player || paused) return;
  if (a === 'dodge') dodge();
  else if (a === 'potion') usePotion();
  else if (a === 'arise') tryArise();
  else if (SKILL[a]) useSkill(SKILL[a]);
}

if (isMobile) {
  document.body.style.cursor = 'default';
  document.body.style.height = '100dvh';
  const tc = $('touch-controls'); tc.style.display = 'block'; tc.style.height = '100dvh';
  addEventListener('orientationchange', () => setTimeout(resize, 200));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

  // Prevent scrolling/zooming EXCEPT inside menus and overlays
  document.addEventListener('touchmove', e => {
    if (!e.target.closest || !e.target.closest('#system-menu, #extraction-overlay, #victory-overlay, #death-overlay, #name-screen, #title-screen, #boon-overlay, #pause-overlay')) e.preventDefault();
  }, { passive:false });

  const jZone = $('joystick-zone'), jThumb = $('joystick-thumb'), jBase = $('joystick-base');
  jThumb.style.cssText += 'left:50%;top:50%;bottom:auto;';
  const setThumb = (x, y) => { jThumb.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`; };
  let jCenter = { x:0, y:0 }, jTouchId = null;
  const jMove = touch => {
    const dx = touch.clientX - jCenter.x, dy = touch.clientY - jCenter.y, d = Math.hypot(dx, dy), maxR = 45;
    const cd = Math.min(d, maxR), nx = d > 0 ? dx/d : 0, ny = d > 0 ? dy/d : 0;
    setThumb(nx*cd, ny*cd);
    touchJoystick.active = true; touchJoystick.dx = nx*(cd/maxR); touchJoystick.dy = ny*(cd/maxR);
  };
  jZone.addEventListener('touchstart', e => {
    e.preventDefault(); initAudio();
    const touch = e.changedTouches[0], rect = jBase.getBoundingClientRect();
    jCenter = { x:rect.left + rect.width/2, y:rect.top + rect.height/2 };
    jTouchId = touch.identifier; jMove(touch);
  }, { passive:false });
  document.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === jTouchId) jMove(t); }, { passive:false });
  const jEnd = e => { for (const t of e.changedTouches) if (t.identifier === jTouchId) { jTouchId = null; touchJoystick.active = false; touchJoystick.dx = touchJoystick.dy = 0; setThumb(0, 0); } };
  document.addEventListener('touchend', jEnd); document.addEventListener('touchcancel', jEnd);

  const btnMap = { 'tbtn-attack':'slash', 'tbtn-2':'dash_strike', 'tbtn-3':'shadow_strike', 'tbtn-4':'rulers', 'tbtn-5':'legion', 'tbtn-ult':'ult', 'tbtn-dodge':'dodge', 'tbtn-potion':'potion', 'tbtn-arise':'arise' };
  Object.entries(btnMap).forEach(([id, a]) => {
    $(id).addEventListener('touchstart', e => { e.preventDefault(); initAudio(); act(a); if (a === 'slash') touchAttack = true; }, { passive:false });
  });
  const atkEnd = () => { touchAttack = false; };
  $('tbtn-attack').addEventListener('touchend', atkEnd); $('tbtn-attack').addEventListener('touchcancel', atkEnd);
  $('pause-btn').addEventListener('touchstart', e => { e.preventDefault(); togglePause(); }, { passive:false });
}
