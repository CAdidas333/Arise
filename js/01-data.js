'use strict';

// ================================================================
//  CONSTANTS + DATA
// ================================================================
const VERSION = 17, SAVE_KEY = 'arise_save';
const COLORS = { bg:'#06060c', primary:'#00d4ff', secondary:'#2244ff', accent:'#8844ff', danger:'#ff4455', health:'#44ff66', mana:'#4488ff', xp:'#ffcc00', gold:'#ffd866', text:'#e0e8ff' };
const RANKS = ['E','D','C','B','A','S'];
const RANK_LEVELS = [1,10,25,45,70,100];
// Quadratic early, cubic late, and a steep soft cap past the S-rank threshold
const xpNeed = L => Math.floor((80 + 40*L + 2.2*L*L + 0.008*L*L*L) * (1 + Math.max(0, L-100)*0.08));
const TAU = Math.PI*2;

const SKILL_DEFS = [
  { id:'slash', name:'Slash', icon:'⚔️', key:'1', unlockLevel:1, cooldown:0.28, manaCost:0, damage:1.0, desc:'3-hit combo — the third strike cleaves', type:'melee' },
  { id:'dash_strike', name:'Dash Strike', icon:'💨', key:'2', unlockLevel:3, cooldown:3, manaCost:15, damage:2.2, desc:'Blink forward, cutting everything in your path', range:200, type:'dash' },
  { id:'shadow_strike', name:'Shadow Strike', icon:'🗡️', key:'3', unlockLevel:6, cooldown:5, manaCost:25, damage:3.2, desc:'Teleport behind the enemy nearest your aim', range:440, type:'teleport' },
  { id:'rulers', name:"Ruler's Domain", icon:'👑', key:'4', unlockLevel:10, cooldown:12, manaCost:50, damage:4.0, desc:'Drag enemies in, then detonate', range:210, type:'aoe' },
  { id:'legion', name:'Arise: Legion', icon:'☠️', key:'5', unlockLevel:1, cooldown:30, manaCost:40, damage:0, desc:'Shadow army goes berserk (12s)', type:'legion' },
  { id:'ult', name:"Monarch's Awakening", icon:'👁️', key:'R', unlockLevel:15, cooldown:0, manaCost:0, damage:0, desc:'Full gauge: become the Shadow Monarch', type:'ult' },
];
const SKILL = Object.fromEntries(SKILL_DEFS.map(s => [s.id, s]));

// enemy def: name, kind, hp, damage, speed(px/s), size, xp, color, w = first wave it appears
const E = (name,kind,hp,damage,speed,size,xp,color,w=1) => ({ name,kind,hp,damage,speed,size,xp,color,w });
const GATE_DEFS = [
  { id:'e_gate', name:'Goblin Cavern', rank:'E', reqLevel:1, waves:5, ambientColor:'#224422',
    theme:{ a:'#0f150f', b:'#0a0f0a', line:'#55cc66', ember:'#66ff88' },
    enemies:[ E('Goblin','melee',40,10,84,14,15,'#55aa55'), E('Goblin Archer','ranged',26,14,60,12,20,'#448844'), E('Goblin Sapper','bomber',30,22,150,12,25,'#aacc44',3) ],
    boss:{ name:'Spider Queen', title:'Brood Mother of the Cavern', hp:1500, damage:30, speed:66, size:34, xp:150, color:'#884488', shadow:true, patterns:['burst','summon','charge'] } },
  { id:'d_gate', name:'Orc Fortress', rank:'D', reqLevel:10, waves:6, ambientColor:'#332211',
    theme:{ a:'#15110c', b:'#0f0c09', line:'#cc7733', ember:'#ffaa55' },
    enemies:[ E('Orc Warrior','melee',140,40,72,18,60,'#886644'), E('Orc Shaman','caster',90,50,54,16,80,'#668844'), E('Orc Raider','charger',160,50,80,18,85,'#aa7744',2), E('Orc Brute','brute',420,65,50,26,140,'#775533',4) ],
    boss:{ name:'Orc Chieftain', title:'Warlord of the Iron Tusk', hp:6000, damage:80, speed:62, size:40, xp:700, color:'#aa4422', shadow:true, patterns:['slam','charge','summon','burst'] } },
  { id:'c_gate', name:'Undead Crypt', rank:'C', reqLevel:25, waves:7, ambientColor:'#1a1133',
    theme:{ a:'#100d18', b:'#0b0912', line:'#8866cc', ember:'#aa88ff' },
    enemies:[ E('Skeleton','melee',420,85,90,16,140,'#aaaaaa'), E('Bone Archer','ranged',300,100,60,14,160,'#bbbb99'), E('Lich','caster',280,115,48,14,180,'#8866cc'), E('Death Hound','charger',480,105,100,16,190,'#665588',3) ],
    boss:{ name:'Death Knight', title:'Blood-Red Commander', hp:20000, damage:170, speed:74, size:42, xp:2200, color:'#6622aa', shadow:true, patterns:['charge','slam','spiral','nova'] } },
  { id:'b_gate', name:'Demon Realm', rank:'B', reqLevel:45, waves:8, ambientColor:'#331111',
    theme:{ a:'#170c0c', b:'#110909', line:'#cc4444', ember:'#ff6644' },
    enemies:[ E('Demon','melee',1000,150,78,20,320,'#cc4444'), E('Succubus','ranged',650,180,96,16,400,'#cc44aa'), E('Imp Bomber','bomber',500,220,160,13,330,'#ff7733'), E('Hellguard','brute',2600,210,52,28,600,'#882222',3) ],
    boss:{ name:'Demon Lord', title:'Sovereign of the Burning Keep', hp:50000, damage:300, speed:68, size:50, xp:6500, color:'#aa0000', shadow:true, patterns:['spiral','nova','charge','summon','burst'] } },
  { id:'a_gate', name:"Dragon's Lair", rank:'A', reqLevel:70, waves:10, ambientColor:'#332200',
    theme:{ a:'#17140c', b:'#110f09', line:'#ccaa22', ember:'#ffcc44' },
    enemies:[ E('Drake','charger',1900,270,74,24,560,'#cc8800'), E('Wyvern','ranged',1300,300,100,20,700,'#ccaa44'), E('Flame Cultist','caster',1400,330,55,16,650,'#dd6622'), E('Dragonkin','brute',4400,360,54,30,1100,'#aa6600',4) ],
    boss:{ name:'Ancient Dragon', title:'Calamity of the Old World', hp:100000, damage:520, speed:56, size:58, xp:16000, color:'#ffcc00', shadow:true, patterns:['spiral','nova','slam','burst','charge'] } },
  { id:'s_gate', floor:'s_gate_v2', name:'Cartenon Temple', rank:'S', reqLevel:90, waves:10, ambientColor:'#223344',
    theme:{ a:'#10141a', b:'#0a0d12', line:'#88ccff', ember:'#cceeff' },
    enemies:[ E('Stone Knight','melee',3400,420,96,22,1000,'#8899aa'), E('Seraph Statue','caster',2400,480,50,18,1200,'#aaccee'), E('Stone Hound','charger',3000,440,110,18,1100,'#778899'), E('Temple Sentinel','brute',8000,520,58,32,2000,'#667788',3) ],
    boss:{ name:'Statue of God', title:'The Architect\'s Final Trial', hp:250000, damage:800, speed:50, size:66, xp:45000, color:'#ddeeff', shadow:true, patterns:['nova','spiral','slam','burst','summon','charge'] } },
];
const ENDLESS = { id:'endless', name:'Demon Castle', rank:'∞', reqLevel:15, desc:'Endless floors. A boss every 5th. How high can you climb?' };

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
    { id:'army', name:'Shadow Army', max:5, desc:'+2 deployed shadows per rank' },
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
