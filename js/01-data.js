'use strict';

// ================================================================
//  CONSTANTS + DATA
// ================================================================
const VERSION = 17, SAVE_KEY = 'arise_save';
const COLORS = { bg:'#06060c', primary:'#00d4ff', secondary:'#2244ff', accent:'#8844ff', danger:'#ff4455', health:'#44ff66', mana:'#4488ff', xp:'#ffcc00', gold:'#ffd866', text:'#e0e8ff' };
const RANKS = ['E','D','C','B','A','S'];
const RANK_LEVELS = [1,10,25,45,70,100];
const BOX_CHANCE = 0.35, BOX_RISE = 0.8, BOX_REACH = 46;
// System titles: earned by feats, shown under the hunter's name; cosmetic only. has(p, h): p = the player, h = highScores
const TITLES = [
  { id:'gate_walker', name:'GATE WALKER',       how:'Clear your first gate',              has:(p, h) => h.gatesCleared >= 1 },
  { id:'cuts_100',    name:'HUNDRED CUTS',      how:'Defeat 100 enemies',                 has:(p, h) => h.totalKills >= 100 },
  { id:'cuts_1000',   name:'THOUSAND CUTS',     how:'Defeat 1,000 enemies',               has:(p, h) => h.totalKills >= 1000 },
  { id:'chain_50',    name:'UNBROKEN CHAIN',    how:'Reach a 50-hit combo',               has:(p, h) => h.bestCombo >= 50 },
  { id:'ghost_step',  name:'GHOST STEP',        how:'Make 25 perfect dodges',             has:(p) => p.feats.perfects >= 25 },
  { id:'captain',     name:'SHADOW CAPTAIN',    how:'Raise an army of 10 shadows',        has:(p) => p.shadows.length >= 10 },
  { id:'commander',   name:'LEGION COMMANDER',  how:'Raise an army of 40 shadows',        has:(p) => p.shadows.length >= 40 },
  { id:'seeker',      name:'TREASURE SEEKER',   how:'Open 10 reward boxes',               has:(p) => p.feats.boxes >= 10 },
  { id:'breaker',     name:'GATE BREAKER',      how:'Clear 25 gates',                     has:(p, h) => h.gatesCleared >= 25 },
  { id:'untouchable', name:'UNTOUCHABLE',       how:'Clear a gate without taking damage', has:(p) => p.feats.flawless >= 1 },
  { id:'climber',     name:'CASTLE CLIMBER',    how:'Reach floor 20 of the Demon Castle', has:(p, h) => h.bestFloor >= 20 },
  { id:'heir',        name:"THE MONARCH'S HEIR", how:'Clear the S-rank gate',             has:(p) => (p.cleared.s_gate | 0) >= 1 },
];
const titleName = p => { const t = p && p.title && TITLES.find(x => x.id === p.title); return t ? t.name : 'HUNTER'; };
function boxDue(roomI, nFight, given, roll) { return roomI >= 1 && (roll < BOX_CHANCE || (roomI === nFight && given === 0)); }
// Quadratic early, cubic late, and a steep soft cap past the S-rank threshold
// XP_PACE 2 (2026-10-12): at 1 a bot filled the whole skill tree in 17 gate runs, about 14 minutes of fighting; at 2 it takes about 31 runs and 24 minutes (node tools/balance_bot.js)
const XP_PACE = 2, xpNeed = L => Math.floor(XP_PACE * (80 + 40*L + 2.2*L*L + 0.008*L*L*L) * (1 + Math.max(0, L-100)*0.08));
const TAU = Math.PI*2;

const SKILL_DEFS = [
  { id:'slash', name:'Slash', icon:'⚔️', key:'1', unlockLevel:1, cooldown:0.28, manaCost:0, damage:1.0, desc:'3-hit combo — the third strike cleaves', type:'melee' },
  { id:'dash_strike', name:'Dash Strike', icon:'💨', key:'2', unlockLevel:3, cooldown:3, manaCost:15, damage:2.2, desc:'Blink forward, cutting everything in your path', range:200, type:'dash' },
  { id:'shadow_strike', name:'Shadow Strike', icon:'🗡️', key:'3', unlockLevel:6, cooldown:5, manaCost:25, damage:3.2, desc:'Teleport behind the enemy nearest your aim', range:440, type:'teleport' },
  { id:'rulers', name:"Ruler's Domain", icon:'👑', key:'4', unlockLevel:10, cooldown:12, manaCost:50, damage:4.0, desc:'Drag enemies in, then detonate', range:210, type:'aoe' },
  { id:'legion', name:'Arise: Legion', icon:'☠️', key:'5', unlockLevel:1, cooldown:30, manaCost:40, damage:0, desc:'Call your army to the field (12s). They fight berserk, then return to the shadows', type:'legion' },
  { id:'ult', name:"Monarch's Awakening", icon:'👁️', key:'R', unlockLevel:15, cooldown:0, manaCost:0, damage:0, desc:'Full gauge: become the Shadow Monarch and call every shadow you own', type:'ult' },
];
const SKILL = Object.fromEntries(SKILL_DEFS.map(s => [s.id, s]));

// enemy def: name, kind, hp, damage, speed(px/s), size, xp, color, w = first wave it appears
const E = (name,kind,hp,damage,speed,size,xp,color,w=1) => ({ name,kind,hp,damage,speed,size,xp,color,w });
const GATE_DEFS = [
  { id:'e_gate', name:'Goblin Cavern', rank:'E', reqLevel:1, waves:5, ambientColor:'#224422',
    theme:{ a:'#0f150f', b:'#0a0f0a', line:'#55cc66', ember:'#66ff88' },
    enemies:[ E('Goblin','melee',40,10,84,14,15,'#55aa55'), E('Goblin Archer','ranged',26,14,60,12,20,'#448844'), E('Goblin Sapper','bomber',30,22,150,12,25,'#aacc44',3) ],
    boss:{ name:'Spider Queen', title:'Brood Mother of the Cavern', hp:1500, damage:30, speed:66, size:34, xp:150, color:'#884488', shadow:true, patterns:['burst','summon','charge','brood'] } },
  { id:'d_gate', name:'Orc Fortress', rank:'D', reqLevel:10, waves:6, ambientColor:'#332211',
    theme:{ a:'#15110c', b:'#0f0c09', line:'#cc7733', ember:'#ffaa55' },
    enemies:[ E('Orc Warrior','melee',140,40,72,18,60,'#886644'), E('Orc Shaman','caster',90,50,54,16,80,'#668844'), E('Orc Raider','charger',160,50,80,18,85,'#aa7744',2), E('Orc Brute','brute',420,65,50,26,140,'#775533',4) ],
    boss:{ name:'Orc Chieftain', title:'Warlord of the Iron Tusk', hp:6000, damage:80, speed:62, size:40, xp:700, color:'#aa4422', shadow:true, patterns:['slam','charge','summon','burst','pound'] } },
  { id:'c_gate', name:'Undead Crypt', rank:'C', reqLevel:25, waves:7, ambientColor:'#1a1133',
    theme:{ a:'#100d18', b:'#0b0912', line:'#8866cc', ember:'#aa88ff' },
    enemies:[ E('Skeleton','melee',420,85,90,16,140,'#aaaaaa'), E('Bone Archer','ranged',300,100,60,14,160,'#bbbb99'), E('Lich','caster',280,115,48,14,180,'#8866cc'), E('Death Hound','charger',480,105,100,16,190,'#665588',3) ],
    boss:{ name:'Death Knight', title:'Blood-Red Commander', hp:20000, damage:170, speed:74, size:42, xp:2200, color:'#6622aa', shadow:true, patterns:['charge','slam','spiral','nova','cleave'] } },
  { id:'b_gate', name:'Demon Realm', rank:'B', reqLevel:45, waves:8, ambientColor:'#331111',
    theme:{ a:'#170c0c', b:'#110909', line:'#cc4444', ember:'#ff6644' },
    enemies:[ E('Demon','melee',1000,150,78,20,320,'#cc4444'), E('Succubus','ranged',650,180,96,16,400,'#cc44aa'), E('Imp Bomber','bomber',500,220,160,13,330,'#ff7733'), E('Hellguard','brute',2600,210,52,28,600,'#882222',3) ],
    boss:{ name:'Demon Lord', title:'Sovereign of the Burning Keep', hp:50000, damage:300, speed:68, size:50, xp:6500, color:'#aa0000', shadow:true, patterns:['spiral','nova','charge','summon','burst','firewall'] } },
  { id:'a_gate', name:"Dragon's Lair", rank:'A', reqLevel:70, waves:10, ambientColor:'#332200',
    theme:{ a:'#17140c', b:'#110f09', line:'#ccaa22', ember:'#ffcc44' },
    enemies:[ E('Drake','charger',1900,270,74,24,560,'#cc8800'), E('Wyvern','ranged',1300,300,100,20,700,'#ccaa44'), E('Flame Cultist','caster',1400,330,55,16,650,'#dd6622'), E('Dragonkin','brute',4400,360,54,30,1100,'#aa6600',4) ],
    boss:{ name:'Ancient Dragon', title:'Calamity of the Old World', hp:100000, damage:520, speed:56, size:58, xp:16000, color:'#ffcc00', shadow:true, patterns:['spiral','nova','slam','burst','charge','breath'] } },
  { id:'s_gate', floor:'s_gate_v2', name:'Cartenon Temple', rank:'S', reqLevel:90, waves:10, ambientColor:'#223344',
    theme:{ a:'#10141a', b:'#0a0d12', line:'#88ccff', ember:'#cceeff' },
    enemies:[ E('Stone Knight','melee',3400,420,96,22,1000,'#8899aa'), E('Seraph Statue','caster',2400,480,50,18,1200,'#aaccee'), E('Stone Hound','charger',3000,440,110,18,1100,'#778899'), E('Temple Sentinel','brute',8000,520,58,32,2000,'#667788',3) ],
    boss:{ name:'Statue of God', title:'The Architect\'s Final Trial', hp:250000, damage:800, speed:50, size:66, xp:45000, color:'#ddeeff', shadow:true, patterns:['nova','spiral','slam','burst','summon','charge','pillars'] } },
];
// The Hunter's Record counts kills by these names: every gate enemy and every boss. A save keeps only counts under these.
function recordNames() { const s = new Set(); for (const g of GATE_DEFS) { for (const e of g.enemies) s.add(e.name); s.add(g.boss.name); } return s; }
const ENDLESS = { id:'endless', name:'Demon Castle', rank:'∞', reqLevel:15, desc:'Endless floors. A boss every 5th. How high can you climb?' };

// The System's words, all original. opening: cards shown once to a new hunter, one to three lines each ({name} becomes the hunter's name).
// Per gate id: the chapter number, the lines on its chapter card (first visit), and one closing line for the first clear.
const STORY = {
  opening: [
    ['Qualification confirmed.', 'Welcome, player.'],
    ['You were the weakest hunter on record.', 'That changes now.'],
    ['Gates are opening across the city.', 'Most hunters never come back out.'],
    ['The System will give you strength.', 'It will not give you mercy.'],
    ['Clear every gate.', 'Grow stronger than what waits inside.', 'Begin, {name}.'],
  ],
  e_gate: { chapter:1, lines:['Every hunter starts somewhere small.', 'Goblins hold the cavern. Something far larger rules it.'],
    cleared:'The brood mother is gone, and the cavern finally goes quiet.' },
  d_gate: { chapter:2, lines:['A fortress built by people who only know war.', 'Break the Chieftain and the rest will scatter.'],
    cleared:'The Iron Tusk banner falls, and the fortress is yours.' },
  c_gate: { chapter:3, lines:['Cold stone, old armor, and no daylight.', 'The dead here have not forgotten how to fight.'],
    cleared:'The Death Knight falls, and the crypt stops marching.' },
  b_gate: { chapter:4, lines:['Heat rolls out of the gate before you step through.', 'Everything here was made to burn a hunter down.'],
    cleared:'The Demon Lord is beaten, and the heat drains out of the gate.' },
  a_gate: { chapter:5, lines:['Gold glitters in the dark. Do not trust it.', 'Wings, fire, and a beast that has never lost.'],
    cleared:'The Ancient Dragon is down, and very few hunters ever stand where you stand.' },
  s_gate: { chapter:6, lines:['Silent halls of pale stone, older than the gates.', 'The statues here are not decoration.'],
    cleared:'The last guardian crumbles, and the gates have nothing stronger to send.' },
};

const WEAPONS = [
  { name:'Rusted Dagger', mult:1.0, cost:0, color:'#aaddff', desc:'It is, technically, a weapon.' },
  { name:"Kasaka's Venom Fang", mult:1.25, cost:300, color:'#66ffaa', desc:'+25% damage' },
  { name:'Knight Killer', mult:1.55, cost:1500, color:'#66aaff', desc:'+55% damage' },
  { name:"Baruka's Dagger", mult:1.9, cost:6000, color:'#bb88ff', desc:'+90% damage' },
  { name:"Demon King's Daggers", mult:2.4, cost:25000, color:'#ff5566', desc:'+140% damage' },
  { name:"Kamish's Wrath", mult:3.0, cost:100000, color:'#ffcc33', desc:'+200% damage. The strongest blade there is.' },
];

// Skill tree — 3 branches, each node requires the one above it
const TREE = [
  { id:'assassin', name:'ASSASSIN', color:'#00d4ff', nodes:[
    { id:'edge', name:'Honed Edge', max:5, desc:'+6% damage per rank' },
    { id:'swift', name:'Quicksilver', max:3, desc:'+4% move speed, -6% dodge cooldown per rank' },
    { id:'lethal', name:'Lethality', max:5, desc:'+3% crit chance, +10% crit damage per rank' },
    { id:'phantom', name:'Phantom Chain', max:2, desc:'Dash Strike resets on a kill. Shadow Strike chains to +1 target per rank' } ] },
  { id:'ruler', name:'RULER', color:'#4488ff', nodes:[
    { id:'aegis', name:'Aegis', max:5, desc:'+10% defense, +5% max HP per rank' },
    { id:'flow', name:'Mana Flow', max:5, desc:'+15% MP regen, -4% cooldowns per rank' },
    { id:'domain', name:"Ruler's Authority", max:3, desc:"Ruler's Domain +20% radius and damage per rank" },
    { id:'leech', name:'Bloodlust', max:3, desc:'Heal 1% of damage dealt per rank' } ] },
  { id:'monarch', name:'MONARCH', color:'#bb66ff', nodes:[
    { id:'army', name:'Shadow Army', max:5, desc:'+2 shadows answer the Legion call per rank' },
    { id:'might', name:'Shadow Might', max:5, desc:'+12% shadow damage per rank' },
    { id:'march', name:"Legion's March", max:3, desc:'Arise: Legion lasts +3s and recharges 3s faster per rank' },
    { id:'sovereign', name:'Shadow Sovereign', max:3, desc:'Awakening charges 15% faster and lasts +2s per rank' } ] },
];
const NODE = {}; TREE.forEach(b => b.nodes.forEach((n,i) => { NODE[n.id] = { ...n, branch:b, prev:i>0?b.nodes[i-1].id:null }; }));

// Run boons — picked between waves, last for one gate
const BOONS = [
  { id:'might', name:'Bloodlust', icon:'⚔️', desc:'+15% damage', max:5 },
  { id:'haste', name:'Shadow Step', icon:'💨', desc:'+10% move speed', max:3 },
  { id:'focus', name:"Hunter's Eye", icon:'🎯', desc:'+8% crit chance', max:4 },
  { id:'vamp', name:'Life Drain', icon:'🩸', desc:'Heal 2% of damage dealt', max:3 },
  { id:'chain', name:'Chain Lightning', icon:'⚡', desc:'Hits arc to a nearby enemy', max:3 },
  { id:'nova', name:'Death Nova', icon:'💥', desc:'Slain enemies explode', max:3 },
  { id:'mana', name:'Mana Font', icon:'🔷', desc:'+60% MP regen', max:3 },
  { id:'ward', name:'Iron Body', icon:'🛡️', desc:'-15% damage taken', max:3 },
  { id:'surge', name:'Monarch Surge', icon:'👁️', desc:'+40% Awakening charge', max:2 },
  { id:'tide', name:'Dark Tide', icon:'☠️', desc:'Shadows deal +25% damage', max:3 },
  { id:'greed', name:'Greed', icon:'🪙', desc:'+50% gold', max:2 },
  { id:'heal', name:'Elixir of Life', icon:'🧪', desc:'Restore 50% HP right now', instant:true },
];

const DAILY_QUESTS = [
  { id:'pushups', name:'100 Push-ups', desc:'Defeat 20 enemies', target:20, reward:50, stat:'kills' },
  { id:'situps', name:'100 Sit-ups', desc:'Take 500 damage', target:500, reward:50, stat:'damageTaken' },
  { id:'run', name:'Run 10km', desc:'Clear 2 gates', target:2, reward:100, stat:'gatesCleared' },
];
const BONUS_QUESTS = [
  { id:'bonus_slayer', name:'Shadow Slayer', desc:'Defeat 50 enemies', target:50, reward:2, stat:'kills' },
  { id:'bonus_combo', name:'Combo Master', desc:'Get a 15+ combo', target:15, reward:3, stat:'bestCombo' },
  { id:'bonus_gates', name:'Gate Crusher', desc:'Clear 5 gates', target:5, reward:3, stat:'gatesCleared' },
  { id:'bonus_tank', name:'Iron Will', desc:'Take 2000 damage', target:2000, reward:2, stat:'damageTaken' },
];
const KILL_STREAKS = [
  { count:5, label:'FIVE KILL STREAK', color:'gold' },
  { count:10, label:'UNSTOPPABLE', color:'red' },
  { count:15, label:'GODLIKE', color:'purple' },
  { count:25, label:'BEYOND GODLIKE', color:'purple' },
  { count:50, label:'⚡ MONARCH ⚡', color:'purple' },
  { count:100, label:'⚡ SHADOW SOVEREIGN ⚡', color:'purple' },
];
const GRADE_COLOR = { Soldier:'#9988bb', Elite:'#ffcc66', Marshal:'#ff66aa' };

// ================================================================
//  UTILITIES
// ================================================================
const $ = id => document.getElementById(id);
const lerp = (a,b,t) => a+(b-a)*t;
const clamp = (v,mn,mx) => Math.max(mn,Math.min(mx,v));
const dist = (x1,y1,x2,y2) => Math.hypot(x2-x1,y2-y1);
const rand = (a,b) => Math.random()*(b-a)+a;
const randInt = (a,b) => Math.floor(rand(a,b+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const angDiff = (a,b) => { let d = (a-b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const cleanNick = v => String(v || '').replace(/[\u0000-\u001f<>&"'`]/g, '').trim().slice(0, 16); // a shadow's name as the player typed it — short, and inert in markup
function fmtNum(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (n >= 1e4) return (n/1e3).toFixed(1)+'K';
  return Math.round(n).toString();
}
// distance from point to segment
function segDist(px,py,x1,y1,x2,y2) {
  const dx = x2-x1, dy = y2-y1, l2 = dx*dx+dy*dy || 1;
  const t = clamp(((px-x1)*dx+(py-y1)*dy)/l2, 0, 1);
  return Math.hypot(px-(x1+dx*t), py-(y1+dy*t));
}

// ================================================================
//  GEAR — armor, boots and a ring. Dropped in gates, kept in a small bag
// ================================================================
const GEAR_SLOTS = ['armor','boots','ring'];
const GEAR_RARITY = ['Common','Rare','Epic','Legendary'];
const GEAR_COLORS = ['#cfd8e3','#4aa8ff','#bb66ff','#ffcc33'];
const BAG_MAX = 24;
// mod key -> the most one item may carry. dmg, hp, mp, spd, def and gold multiply by (1+v); crit adds v; cdr multiplies cooldowns by (1-v)
const GEAR_CAPS = { dmg:0.18, hp:0.25, mp:0.30, spd:0.10, crit:0.10, def:0.30, cdr:0.08, gold:0.30 };
const GEAR_KEYS = Object.keys(GEAR_CAPS);
const GEAR_LABEL = { dmg:'damage', hp:'max HP', mp:'max MP', spd:'move speed', crit:'crit chance', def:'defence', cdr:'cooldowns', gold:'gold' };
const GEAR_FIRST = { armor:['hp','def'], boots:['spd'], ring:['dmg','crit'] }; // the slot decides an item's first mod
// rarity weights [Common, Rare, Epic, Legendary] by who dropped it: 0 = any enemy, 1 = elite, 2 = boss
const GEAR_ODDS = [[820,150,28,2], [640,290,65,5], [0,700,270,30]];
const GEAR_NAMES = {
  rarity:[['Worn','Plain','Sturdy','Rough'], ['Tempered','Fine','Keen','Polished'], ['Masterwork','Gilded','Storm-forged','Royal'], ["Monarch's",'Sovereign','Peerless','Ancient']],
  material:['Iron','Steel','Bronze','Obsidian','Silver','Granite','Ember','Frost','Gale','Tide'],
  owner:["Warden's","Hunter's","Ranger's","Vanguard's","Sentinel's","Captain's"],
  origin:['the Deep','the Gale','the Forge','the Tide','the North','the Summit','the Vanguard','Embers'],
  armor:['Plate','Cuirass','Mail','Vest','Hauberk'], boots:['Greaves','Boots','Treads','Striders','Sabatons'], ring:['Band','Ring','Loop','Coil'],
};
function gearName(slot, rarity) {
  const n = GEAR_NAMES, noun = pick(n[slot]), r = Math.random();
  if (r < 0.5) return `${pick(n.rarity[rarity])} ${pick(n.material)} ${noun}`;
  if (rarity < 2 && r < 0.75) return `${pick(n.owner)} ${noun}`;
  return `${rarity >= 2 ? pick(n.rarity[rarity]) + ' ' : ''}${noun} of ${pick(n.origin)}`;
}
// Mod values are whole percents, so the menu shows exactly what an item gives
const gearVal = (k, v) => clamp(Math.round(v*100)/100, 0.01, GEAR_CAPS[k]);

// lvl = the gate's level. luck: 0 any enemy, 1 elite, 2 boss. Higher gates lean towards the better rarities.
function rollGear(lvl, minRarity = 0, luck = 0) {
  lvl = clamp(lvl|0, 1, 100);
  const t = lvl/100, odds = GEAR_ODDS[clamp(luck|0, 0, 2)];
  const w = [odds[0], odds[1]*(1 + 0.3*t), odds[2]*(1 + 0.6*t), odds[3]*(1 + 0.5*t)].map((x, i) => i < minRarity ? 0 : x);
  let r = Math.random()*(w[0] + w[1] + w[2] + w[3]), rarity = 3;
  for (let i = 0; i < 3; i++) { r -= w[i]; if (r < 0) { rarity = i; break; } }
  const slot = pick(GEAR_SLOTS), keys = [pick(GEAR_FIRST[slot])], rest = GEAR_KEYS.filter(k => k !== keys[0]);
  while (keys.length < 1 + rarity) keys.push(rest.splice(randInt(0, rest.length-1), 1)[0]);
  // A Legendary from the highest gate tops out at three quarters of the cap: three of them give about +40% damage
  const power = (0.24 + 0.12*rarity) * (1 + 0.25*t), mods = {};
  for (const k of keys) mods[k] = gearVal(k, GEAR_CAPS[k]*power*rand(0.8, 1));
  return { slot, name:gearName(slot, rarity), rarity, lvl, mods };
}
const gearValue = item => Math.round((20 + item.lvl*6) * (1 + item.rarity*1.5)); // sell price
// An item's strength: each mod as a share of its cap, summed (so more mods and bigger mods both count)
const gearScore = it => it ? Object.keys(it.mods).reduce((a, k) => a + it.mods[k]/GEAR_CAPS[k], 0) : 0;
function gearBetter(it, p = player) { return !p.gear[it.slot] || gearScore(it) > gearScore(p.gear[it.slot]) + 1e-9; }
function gearWeaker(it, p = player) { return !!p.gear[it.slot] && gearScore(it) < gearScore(p.gear[it.slot]) - 1e-9; }
// Anything read from a save goes through here: a clean item, or null
function cleanGear(x) {
  if (!x || typeof x !== 'object' || !GEAR_SLOTS.includes(x.slot) || !x.mods || typeof x.mods !== 'object') return null;
  const rarity = clamp(x.rarity|0, 0, 3), mods = {};
  let n = 0;
  for (const k of Object.keys(x.mods)) {
    const v = +x.mods[k];
    if (n > rarity || !GEAR_KEYS.includes(k) || !(v > 0)) continue;
    mods[k] = gearVal(k, v); n++;
  }
  if (!n) return null;
  const name = typeof x.name === 'string' ? x.name.trim().slice(0, 40).trim() : '';
  return { slot:x.slot, name:name || GEAR_NAMES[x.slot][0], rarity, lvl:clamp(x.lvl|0, 1, 100), mods };
}
// The summed value of one mod across the three equipped items: 0 with nothing equipped
function gearMod(key, p = player) {
  let v = 0;
  if (p && p.gear) for (const s of GEAR_SLOTS) { const it = p.gear[s]; if (it) v += it.mods[key] || 0; }
  return v;
}
const gearModText = (k, v) => `${k === 'cdr' ? '-' : '+'}${Math.round(v*100)}% ${GEAR_LABEL[k]}`;
