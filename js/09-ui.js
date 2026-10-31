'use strict';

// ================================================================
//  HUD — only touches the DOM when a value actually changes
// ================================================================
const hudCache = {};
function setT(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setW(id, pct) { const v = clamp(pct, 0, 100).toFixed(1)+'%'; if (hudCache[id+':w'] !== v) { hudCache[id+':w'] = v; $(id).style.width = v; } }
function setD(id, on, mode = 'block') { const v = on ? mode : 'none'; if (hudCache[id+':d'] !== v) { hudCache[id+':d'] = v; $(id).style.display = v; } }
function setC(id, cls, on) { const k = id+':c:'+cls; if (hudCache[k] !== on) { hudCache[k] = on; $(id).classList.toggle(cls, on); } }

// The System's own window for a level-up / rank-up. Plays again from the start if it is already up.
let sysPopTimer = null;
function systemPop(head, big, sub, tone) {
  const el = $('sys-pop');
  if (!el) return; // the Node test harness has no DOM
  el.querySelector('.sp-head').textContent = `[ ${head} ]`;
  el.querySelector('.sp-big').textContent = big;
  el.querySelector('.sp-sub').textContent = sub;
  el.classList.toggle('violet', tone === 'violet');
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  clearTimeout(sysPopTimer);
  sysPopTimer = setTimeout(() => el.classList.remove('on'), 1950);
}

let titleQueue = [], titleGap = 0, titleCheckT = 0;
// Grants every title whose feat is met. silent: grant without the System window (used once on load, for deeds done before titles existed). Returns the number granted.
function checkTitles(silent) {
  if (!player) return 0;
  let granted = 0;
  for (const t of TITLES) {
    if (player.titles.includes(t.id) || !t.has(player, highScores)) continue;
    player.titles.push(t.id); granted++;
    if (!silent) titleQueue.push(t.id);
  }
  if (granted) saveGame();
  return granted;
}
// Called every frame in a gate: re-checks every 0.5 s and shows queued titles one at a time, 2.4 s apart
function titleTick(dt) {
  titleCheckT -= dt; if (titleCheckT <= 0) { titleCheckT = 0.5; checkTitles(false); }
  titleGap -= dt;
  if (titleGap <= 0 && titleQueue.length) {
    const t = TITLES.find(x => x.id === titleQueue[0]);
    titleQueue.shift();
    systemPop('TITLE ACQUIRED', t.name, t.how.toUpperCase());
    playSfx('boon'); titleGap = 2.4;
  }
}

const SHORT = { slash:'Slash', dash_strike:'Dash', shadow_strike:'Strike', rulers:'Domain', legion:'Legion', ult:'Awaken' };
let skillEls = [];
function buildSkillBar() {
  $('hud-skills').innerHTML = SKILL_DEFS.map(s => `<div class="skill-slot" id="slot-${s.id}"><span class="key">${s.key}</span><span class="icon">${s.icon}</span><span class="cd-num"></span><div class="cd-overlay"></div><span class="skill-name">${SHORT[s.id]}</span></div>`).join('');
  skillEls = SKILL_DEFS.map(s => { const el = $('slot-'+s.id); return { s, el, ov:el.querySelector('.cd-overlay'), num:el.querySelector('.cd-num'), cls:'', h:'', n:'' }; });
}

let touchShown = true; // the touch controls show only inside a gate (on the title, name and story screens they sat faintly behind the text)
function updateHUD() {
  if (isMobile && touchShown !== (gameState === 'DUNGEON')) { touchShown = !touchShown; $('touch-controls').style.visibility = touchShown ? '' : 'hidden'; }
  if (!player || gameState !== 'DUNGEON' || !dungeon) return;
  setT('hud-name', player.name); setT('hud-rank', `RANK ${player.rank} — ${titleName(player)}`);
  setW('hud-hp-fill', player.hp/player.maxHp*100); setT('hud-hp-text', `${fmtNum(Math.ceil(player.hp))} / ${fmtNum(player.maxHp)}`);
  setW('hud-mp-fill', player.mp/player.maxMp*100); setT('hud-mp-text', `${fmtNum(Math.ceil(player.mp))} / ${fmtNum(player.maxMp)}`);
  setW('hud-xp-fill', player.xp/player.xpToNext*100); setT('hud-xp-text', `${fmtNum(player.xp)} / ${fmtNum(player.xpToNext)}`);
  const ultOn = player.level >= SKILL.ult.unlockLevel;
  setD('hud-ult', ultOn); setW('hud-ult-fill', player.ultT > 0 ? player.ultT/(8+2*tr('sovereign'))*100 : player.ult); setC('hud-ult', 'full', player.ult >= 100);
  setT('hud-level', player.ultT > 0 ? `LV. ${player.level}  👁️ MONARCH ${Math.ceil(player.ultT)}s` : legionTimer > 0 ? `LV. ${player.level}  ☠️ LEGION ${Math.ceil(legionTimer)}s` : `LV. ${player.level}`);
  setT('hud-gold', `◈ ${fmtNum(player.gold)}`); setT('hud-potions', `✚ ${player.potions}`);
  setT('hud-wave', dungeon.bossRef ? 'BOSS HUNT' : dungeon.endless ? `FLOOR ${dungeon.wave}` : `WAVE ${Math.min(dungeon.wave, dungeon.maxWaves)} / ${dungeon.maxWaves}`);
  setT('hud-enemies', dungeon.alive > 0 ? `ENEMIES: ${dungeon.alive}` : '');
  if (dungeon.bossRef) { const p = dungeon.bossRef.hp/dungeon.bossRef.maxHp*100; setW('boss-bar-fill', p); setW('boss-bar-ghost', p); }

  const comboOn = comboCount >= 3 && comboTimer > 0;
  setD('hud-combo', comboOn);
  if (comboOn) { setT('combo-count', comboCount); setT('combo-multi', `x${(1 + Math.min(comboCount,50)*0.02).toFixed(2)} XP`); }

  for (const k of skillEls) {
    const s = k.s, unlocked = player.level >= s.unlockLevel, isUlt = s.type === 'ult';
    const cd = player.cds[s.id] || 0, max = s.id === 'slash' ? 0.46 : s.cooldown*cdMult();
    const pct = !unlocked ? 100 : isUlt ? (player.ultT > 0 ? 0 : 100-player.ult) : cd > 0 ? cd/max*100 : 0;
    const cls = 'skill-slot ' + (!unlocked ? 'locked' : isUlt ? (player.ult >= 100 || player.ultT > 0 ? 'ult-ready' : 'on-cd') : cd <= 0 ? 'ready' : 'on-cd');
    const h = clamp(pct, 0, 100).toFixed(0)+'%', n = !isUlt && unlocked && cd >= 1 ? String(Math.ceil(cd)) : '';
    if (k.cls !== cls) { k.cls = cls; k.el.className = cls; }
    if (k.h !== h) { k.h = h; k.ov.style.height = h; }
    if (k.n !== n) { k.n = n; k.num.textContent = n; }
  }
  if (isMobile) { setT('tbtn-potion-n', player.potions); setC('tbtn-potion', 'empty', player.potions <= 0); setC('tbtn-ult', 'ready', player.ult >= 100); setD('tbtn-arise', dungeon.state === 'fight' && !!nearRemnant(), 'flex'); }
}

// ================================================================
//  SYSTEM MENU — Status · Gates · Skill Tree · Shadows · Record · Armory
// ================================================================
const TABS = [['status','STATUS'], ['gates','GATES'], ['tree','SKILL TREE'], ['shadows','SHADOWS'], ['record','RECORD'], ['armory','ARMORY'], ['controls','CONTROLS']];
let nickEdit = -1; // the shadow being named, or -1
const row = (k, v) => `<div class="stat-row"><span class="stat-name">${k}</span><span class="stat-value">${v}</span></div>`;
const potionCost = () => 40 + player.level*6;

function renderSystemMenu() {
  if (!player) return;
  checkDailyReset();
  $('sys-tabs').innerHTML = TABS.map(([id, label], i) => {
    const pip = id === 'status' ? player.statPoints : id === 'tree' ? player.skillPoints : id === 'armory' ? player.bag.filter(it => gearBetter(it)).length : 0;
    return `<div class="sys-tab ${menuTab === id ? 'on' : ''}" data-act="tab" data-v="${id}">${isMobile ? '' : `<span style="opacity:.4">${i+1}</span> `}${label}${pip ? `<span class="pip">${pip}</span>` : ''}</div>`;
  }).join('');

  const w = WEAPONS[player.weapon];
  $('sys-card').innerHTML = `
    <div class="rank-badge ${player.rank}"><span>${player.rank}</span></div>
    <div class="card-name">${esc(player.name)}</div>
    <div class="card-sub">LEVEL ${player.level} · ${player.rank}-RANK HUNTER</div>
    <div class="hud-bar xp" style="width:100%"><div class="hud-bar-fill" style="width:${player.xp/player.xpToNext*100}%"></div><div class="hud-bar-text">${fmtNum(player.xp)} / ${fmtNum(player.xpToNext)} XP</div></div>
    <div style="height:10px"></div>
    ${row('HP', fmtNum(player.maxHp))}${row('MP', fmtNum(player.maxMp))}
    ${row('ATTACK', fmtNum(pDamage()))}${row('CRIT', Math.round(pCrit()*100)+'%')}
    ${row('GOLD', `<span style="color:#ffd866">◈ ${fmtNum(player.gold)}</span>`)}
    ${row('POTIONS', `<span style="color:#ff7788">✚ ${player.potions}</span>`)}
    ${row('ARMY', `<span style="color:#bb88ff">${Math.min(player.shadows.length, armyCap())} / ${armyCap()}</span>`)}
    <div style="margin-top:12px;font-size:12px;color:${w.color};letter-spacing:1px;text-align:center">⚔ ${w.name}</div>
    ${isMobile ? '' : `<button class="sys-btn" data-act="aim" style="width:100%;margin-top:14px">AIM: ${settings.aim.toUpperCase()} &nbsp;[M]</button>`}`;

  $('sys-main').innerHTML = ({ status:tabStatus, gates:tabGates, tree:tabTree, shadows:tabShadows, record:tabRecord, armory:tabArmory, controls:tabControls })[menuTab]();
}

function tabStatus() {
  let left = '<h3>Attributes</h3>';
  if (player.statPoints > 0) left += `<div class="stat-points">Available Points: <span>${player.statPoints}</span> <button class="sys-btn" style="margin-left:10px" data-act="auto">AUTO</button></div>`;
  const hint = { STR:'damage', AGI:'speed · attack rate', INT:'mana · extraction', VIT:'health · defense', PER:'critical hits' };
  for (const [k, v] of Object.entries(player.stats)) left += `<div class="stat-row"><span class="stat-name">${k} <span style="font-size:10px;opacity:.4;letter-spacing:1px">${hint[k]}</span></span><span class="stat-value">${v}${player.statPoints > 0 ? `<button class="stat-btn" data-act="stat" data-v="${k}">+</button>` : ''}</span></div>`;
  left += '<h3>Records</h3>' + row('Best Level', highScores.bestLevel) + row('Best Combo', highScores.bestCombo+'x') + row('Total Kills', fmtNum(highScores.totalKills))
    + row('Gates Cleared', highScores.gatesCleared) + row('Best Gate', highScores.bestGate+'-RANK') + row('Demon Castle', highScores.bestFloor ? 'FLOOR '+highScores.bestFloor : '—');
  left += '<h3>Titles <span style="font-size:11px;opacity:.5">' + player.titles.length + ' / ' + TITLES.length + '</span></h3>';
  for (const t of TITLES) {
    const shown = player.title === t.id;
    if (player.titles.includes(t.id)) left += `<div class="stat-row"><span class="stat-name" style="color:#00d4ff">${t.name}<span style="display:block;font-size:10px;opacity:.4;letter-spacing:1px">${t.how}</span></span><span class="stat-value"><button class="sys-btn${shown ? ' on' : ''}" data-act="title" data-v="${t.id}">${shown ? 'SHOWN' : 'SHOW'}</button></span></div>`;
    else left += `<div class="stat-row" style="opacity:.35"><span class="stat-name">${t.name}<span style="display:block;font-size:10px;letter-spacing:1px">${t.how}</span></span></div>`;
  }

  const now = new Date(), midnight = new Date(now); midnight.setHours(24,0,0,0);
  const ms = midnight - now, hL = Math.floor(ms/3600000), mL = Math.floor((ms%3600000)/60000);
  let right = `<h3>Daily Quests</h3><div style="text-align:center;margin-bottom:10px;padding:6px;border:1px solid rgba(0,212,255,0.1);font-family:Orbitron,monospace;font-size:10px;letter-spacing:2px;color:rgba(0,212,255,0.4)">RESETS IN ${hL}h ${mL}m</div>`;
  DAILY_QUESTS.forEach(q => {
    const prog = Math.min(questProgress[q.stat] || 0, q.target);
    right += `<div class="quest-item"><div class="quest-name">${q.name} ${q.completed ? '✓' : ''}</div>
      <div class="quest-progress"><div class="quest-progress-fill" style="width:${prog/q.target*100}%"></div></div>
      <div class="quest-reward">${q.desc} — ${fmtNum(prog)}/${fmtNum(q.target)} — ${q.completed ? 'COMPLETE' : `Reward: ${q.reward*player.level} XP`}</div></div>`;
  });
  if (bonusQuestsUnlocked) {
    right += '<h3 style="color:rgba(136,68,255,0.6)">Bonus Quests</h3>';
    BONUS_QUESTS.forEach(q => {
      const prog = Math.min(highScores[BONUS_STAT[q.stat]] || 0, q.target);
      right += `<div class="quest-item"><div class="quest-name" style="color:#bb88ff">${q.name} ${q.completed ? '✓' : ''}</div>
        <div class="quest-progress"><div class="quest-progress-fill" style="width:${prog/q.target*100}%;background:linear-gradient(90deg,#8844ff,#bb88ff)"></div></div>
        <div class="quest-reward" style="color:rgba(136,68,255,0.6)">${q.desc} — ${fmtNum(prog)}/${fmtNum(q.target)} — ${q.completed ? 'COMPLETE' : `Reward: ${q.reward} Stat Points`}</div></div>`;
    });
  }
  return `<div class="two-col"><div>${left}</div><div>${right}</div></div>`;
}

function tabGates() {
  if (gateAsk) return `<h3>Bag full</h3><div class="g-total">Your bag is full (${player.bag.length} / ${BAG_MAX}). Gear found in this gate will be sold on the spot for gold.</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px"><button class="sys-btn" data-act="gate-go">ENTER ANYWAY</button><button class="sys-btn" data-act="tab" data-v="armory">OPEN ARMORY</button><button class="sys-btn" data-act="gate-back">BACK</button></div>`;
  // Highlight the highest unlocked gate
  let nextId = null;
  for (let i = GATE_DEFS.length-1; i >= 0; i--) if (player.level >= GATE_DEFS[i].reqLevel) { nextId = GATE_DEFS[i].id; break; }
  let h = '<h3>Gates</h3><div class="gate-grid">';
  GATE_DEFS.forEach(g => {
    const locked = player.level < g.reqLevel, n = player.cleared[g.id] || 0;
    h += `<div class="gate-item ${locked ? 'locked' : ''} ${g.id === nextId ? 'next-gate' : ''}" ${locked ? '' : `data-act="gate" data-v="${g.id}"`} style="border-left:3px solid ${g.theme.line}">
      <span class="gate-rank">${g.rank}-RANK</span><div class="gate-name">${g.name}${g.id === nextId ? ' ◄' : ''}</div>
      <div class="gate-desc">${locked ? `Requires Level ${g.reqLevel}` : `${g.waves} waves — ${g.boss.name}`}</div>
      <div class="gate-meta">${locked ? 'LOCKED' : n ? `CLEARED ×${n}` : 'UNCLEARED'}</div></div>`;
  });
  const eLocked = player.level < ENDLESS.reqLevel;
  h += `<div class="gate-item endless ${eLocked ? 'locked' : ''}" ${eLocked ? '' : 'data-act="endless"'} style="border-left:3px solid #8844ff">
    <span class="gate-rank">ENDLESS</span><div class="gate-name">${ENDLESS.name}</div>
    <div class="gate-desc">${eLocked ? `Requires Level ${ENDLESS.reqLevel}` : ENDLESS.desc}</div>
    <div class="gate-meta">${highScores.bestFloor ? `BEST: FLOOR ${highScores.bestFloor}` : 'UNCLIMBED'}</div></div></div>`;
  return h;
}

function tabTree() {
  let h = `<h3>Skill Tree</h3><div class="stat-points">Skill Points: <span>${player.skillPoints}</span> <button class="sys-btn" style="margin-left:10px" data-act="respec">RESET TREE</button><div style="font-size:11px;opacity:.5;margin-top:6px;letter-spacing:1px">You earn 1 skill point every 2 levels</div></div><div class="tree">`;
  TREE.forEach(b => {
    h += `<div class="branch" style="color:${b.color}"><h4>${b.name}</h4>`;
    b.nodes.forEach((n, i) => {
      const r = player.tree[n.id] || 0, open = i === 0 || (player.tree[b.nodes[i-1].id] || 0) > 0;
      let pips = ''; for (let p = 0; p < n.max; p++) pips += `<i class="${p < r ? 'f' : ''}"></i>`;
      h += `<div class="node ${open ? '' : 'locked'} ${r ? 'owned' : ''}" data-act="node" data-v="${n.id}"><div class="n-pips">${pips}</div><div class="n-name">${n.name}</div><div class="n-desc">${n.desc}</div></div>`;
    });
    h += '</div>';
  });
  h += '</div><h3>Active Skills</h3>';
  SKILL_DEFS.forEach(s => { const u = player.level >= s.unlockLevel; h += `<div class="stat-row" style="opacity:${u ? 1 : 0.3}"><span class="stat-name">${s.icon} ${s.name} <span style="opacity:.4">[${s.key}]</span></span><span class="stat-value" style="font-size:11px;font-family:Rajdhani,sans-serif;letter-spacing:1px">${u ? s.desc : `Unlocks Lv.${s.unlockLevel}`}</span></div>`; });
  return h;
}

function tabShadows() {
  const ranked = [...player.shadows].sort((a,b) => b.damage - a.damage);
  const roles = shadowRole(ranked, armyCap(), legionTimer > 0, player.ultT > 0);
  const nEscort = roles.filter(r => r.role === 'escort').length;
  const nLegion = roles.filter(r => r.role === 'legion').length;
  const nReserve = roles.filter(r => r.role === 'reserve').length;
  let h = `<h3>Shadow Army — ${nEscort} escort · ${nLegion} answer the call · ${nReserve} in reserve</h3>`;
  if (!ranked.length) return h + '<div style="color:rgba(255,255,255,0.35);font-size:14px;line-height:1.7">No shadows extracted yet.<br>Slain enemies sometimes leave a shadow behind — stand over it and press <b style="color:#bb88ff">E</b> to say the word.<br>Bosses can always be extracted. You get three attempts.</div>';
  h += '<div class="two-col" style="gap:0 22px">';
  roles.forEach(({ shadow: s, role }) => {
    const i = player.shadows.indexOf(s), naming = i === nickEdit; // each shadow can be named; a name sits over what it was
    const name = naming
      ? `<input id="nick-input" maxlength="16" value="${esc(s.nick || '')}" placeholder="${esc(s.name)}">`
      : `${esc(s.nick || s.name)}<span class="grade" style="color:${GRADE_COLOR[s.grade] || '#9988bb'}">${(s.grade || 'Soldier').toUpperCase()}</span>${s.nick ? `<div class="shadow-level" style="opacity:.7">${esc(s.name)}</div>` : ''}`;
    const btns = naming
      ? `<button class="sys-btn" data-act="nick-ok" data-v="${i}">OK</button><button class="sys-btn" data-act="nick-clear" data-v="${i}">CLEAR</button>`
      : `<button class="sys-btn" data-act="nick" data-v="${i}">NAME</button>`;
    h += `<div class="shadow-item" style="opacity:${role === 'reserve' ? 0.4 : 1}"><div class="shadow-icon" style="color:${s.color}">☠</div><div><div class="shadow-name">${name}</div>
      <div class="shadow-level">DMG ${fmtNum(shadowDmg(s))} — ${role.toUpperCase()}</div></div>${btns}</div>`;
  });
  if (nickEdit >= 0) setTimeout(() => { const e = $('nick-input'); if (e) e.focus(); }, 0);
  return h + '</div><div style="margin-top:14px;font-size:12px;color:rgba(255,255,255,0.35);letter-spacing:1px">Three shadows walk with you. Arise: Legion calls the strongest for a short time. The Awakening calls every shadow you own.</div>';
}

// The Hunter's Record: each gate in order, its enemies and boss with the number slain. Never slain shows ??? dimmed; a boss shadow the hunter owns is marked.
function tabRecord() {
  const cols = ['', ''];
  let seen = 0, total = 0;
  GATE_DEFS.forEach((g, gi) => {
    let h = `<h3>${g.rank}-RANK · ${esc(g.name)}</h3>`;
    [...g.enemies.map(e => [e.name, e.kind.toUpperCase(), false]), [g.boss.name, 'BOSS', true]].forEach(([name, kind, boss]) => {
      const n = player.slain[name] | 0, raised = boss && player.shadows.some(s => s.name === name);
      total++; if (n > 0) seen++;
      const tag = `<span style="opacity:.4">${kind}</span>${raised ? ' <span style="color:#bb88ff">· SHADOW RAISED</span>' : ''}`;
      h += `<div class="stat-row"${n > 0 ? '' : ' style="opacity:.35"'}><span class="stat-name">${n > 0 ? esc(name) : '???'}<span style="display:block;font-size:10px;letter-spacing:1px">${tag}</span></span><span class="stat-value">${fmtNum(n)}</span></div>`;
    });
    cols[gi < GATE_DEFS.length/2 ? 0 : 1] += h;
  });
  return `<h3>Discovered ${seen} / ${total}</h3><div class="two-col"><div>${cols[0]}</div><div>${cols[1]}</div></div>`;
}

function tabControls() {
  const k = (what, keys) => `<div class="stat-row"><span class="stat-name" style="letter-spacing:1px">${what}</span><span class="stat-value" style="font-size:12px">${keys}</span></div>`;
  const or = ' <span style="opacity:.4;font-family:Rajdhani,sans-serif">or</span> ';
  const left = '<h3>Keyboard + Mouse</h3>' + k('Move', 'W A S D' + or + 'ARROWS') + k('Attack (hold it down)', 'X' + or + 'J' + or + 'CLICK')
    + k('Dodge', 'SPACE' + or + 'SHIFT') + k('Skills', '1 &nbsp; 2 &nbsp; 3 &nbsp; 4 &nbsp; 5') + k('Awakening, when the purple bar is full', 'R')
    + k('Arise a fallen shadow (stand on the wisp)', 'E') + k('Healing potion', 'F') + k('Pause', 'ESC' + or + 'P') + k('Change aim mode', 'M') + k('Pick a reward between waves', '1 &nbsp; 2 &nbsp; 3');
  const slider = (id, label) => `<div class="stat-row"><span class="stat-name">${label}</span><span class="audio-ctrl"><input type="range" data-set="${id}" min="0" max="100" value="${Math.round(settings[id]*100)}" style="width:150px"></span></div>`;
  const aimText = { auto:'Face where you move. The pointer takes over only while you move it.', keys:'Always face where you move.', mouse:'Always face the pointer.' }[settings.aim];
  const right = '<h3>Touch</h3>' + k('Move and aim', 'LEFT STICK') + k('Attack (hold it down)', '⚔️') + k('Dodge', '🏃') + k('Skills', '💨 🗡️ 👑 ☠️') + k('Awakening', '👁️') + k('Healing potion', '✚') + k('Arise a fallen shadow', 'ARISE BUTTON')
    + '<h3>Settings</h3>' + (isMobile ? '' : `<div class="stat-row"><span class="stat-name">Aim</span><button class="sys-btn" data-act="aim">${settings.aim.toUpperCase()}</button></div><div style="font-size:12px;color:rgba(255,255,255,0.45);padding:4px 0 8px">${aimText}</div>`)
    + `<div class="stat-row"><span class="stat-name">Hunter look</span><button class="sys-btn" data-act="look">${settings.hunter === 'classic' ? 'CLASSIC' : 'NEW'}</button></div><div style="font-size:12px;color:rgba(255,255,255,0.45);padding:4px 0 8px">${settings.hunter === 'classic' ? 'The original stick-figure hunter.' : 'The hunter with a full body.'}</div>`
    + slider('music', 'Music') + slider('sfx', 'Sound effects')
    + '<h3>Good to know</h3><div style="font-size:13px;color:rgba(255,255,255,0.55);line-height:1.6">Keep moving: standing still makes every hit hurt more.<br>Your shadows only fight while you do.<br>The third slash in a row is the big one.<br>Near an enemy the hunter faces it on his own: move to circle it, or step back.<br>Dodge an attack at the last moment, then attack: that is a Counter.</div>';
  return `<div class="two-col"><div>${left}</div><div>${right}</div></div>`;
}

function tabArmory() {
  let h = '<h3>Weapons</h3>';
  WEAPONS.forEach((w, i) => {
    const cur = i === player.weapon, owned = i < player.weapon, next = i === player.weapon+1;
    h += `<div class="shop-item ${cur ? 'cur' : ''} ${owned ? 'done' : ''}" style="color:${w.color}"><div class="s-ico"></div><div class="s-body"><div class="s-name">${w.name}</div><div class="s-desc">${w.desc}</div></div>
      ${cur ? '<span class="grade" style="color:#ffcc00">EQUIPPED</span>' : owned ? '' : `<button class="sys-btn gold" data-act="weapon" ${next && player.gold >= w.cost ? '' : 'disabled'}>◈ ${fmtNum(w.cost)}</button>`}</div>`;
  });
  const pc = potionCost();
  h += `<h3>Supplies</h3><div class="shop-item" style="color:#ff7788"><div class="s-ico"></div><div class="s-body"><div class="s-name">Healing Potion <span style="opacity:.5">(${player.potions}/5)</span></div><div class="s-desc">Restores 40% HP. Press F in a gate.</div></div>
    <button class="sys-btn gold" data-act="potion" ${player.potions < 5 && player.gold >= pc ? '' : 'disabled'}>◈ ${fmtNum(pc)}</button></div>`;
  return h + gearSection();
}

// --- GEAR: three slots, the total they give, and the bag ---
const gearChip = (k, v) => gearModText(k, v).replace(/ /g, '&nbsp;'); // a line of mods breaks between mods, never inside one
const gearMods = it => Object.keys(it.mods).map(k => gearChip(k, it.mods[k])).join(' · ');
const gearRow = (it, btns, up) => `<div class="shop-item gear-item" style="color:${GEAR_COLORS[it.rarity]}"><div class="s-ico"></div><div class="s-body"><div class="s-name">${esc(it.name)}<span class="grade">${GEAR_RARITY[it.rarity].toUpperCase()}</span></div>
  <div class="s-desc">${it.slot.toUpperCase()} · LV ${it.lvl}${up ? '<span class="grade" style="color:#44ff66;border-color:#44ff66">UPGRADE</span>' : ''}</div><div class="g-mods">${gearMods(it)}</div></div><div class="g-btns">${btns}</div></div>`;
function gearSection() {
  const bag = player.bag, room = bag.length < BAG_MAX;
  let h = '<h3>Gear</h3>';
  GEAR_SLOTS.forEach(s => {
    const it = player.gear[s];
    h += it ? gearRow(it, room ? `<button class="sys-btn" data-act="gear-unequip" data-v="${s}">UNEQUIP</button>` : '')
      : `<div class="shop-item gear-item done" style="color:#8899aa"><div class="s-ico"></div><div class="s-body"><div class="s-name">${s.toUpperCase()}</div><div class="s-desc">Nothing equipped</div></div></div>`;
  });
  const total = GEAR_KEYS.filter(k => gearMod(k) > 0).map(k => gearChip(k, k === 'cdr' ? Math.min(0.25, gearMod(k)) : gearMod(k))).join(' · ');
  h += `<div class="g-total">${total ? `GEAR TOTAL &nbsp; <span>${total}</span>` : 'Enemies inside gates drop gear. A boss always drops one item.'}</div>`;
  h += `<h3>Bag — ${bag.length} / ${BAG_MAX}</h3>`;
  if (!room) h += '<div class="g-total">The bag is full. New finds in a gate are sold on the spot.</div>';
  const weaker = bag.filter(it => gearWeaker(it));
  if (weaker.length) h += `<button class="sys-btn gold" data-act="gear-sell-weaker" style="margin-bottom:10px">SELL ALL WEAKER THAN EQUIPPED &nbsp; ◈ ${fmtNum(weaker.reduce((a, it) => a + gearValue(it), 0))}</button>`;
  if (!bag.length) h += '<div class="g-total">The bag is empty. When it is full, new finds are sold on the spot.</div>';
  bag.forEach((it, i) => { h += gearRow(it, `<button class="sys-btn" data-act="gear-equip" data-v="${i}">EQUIP</button><button class="sys-btn gold" data-act="gear-sell" data-v="${i}">SELL ◈ ${fmtNum(gearValue(it))}</button>`, gearBetter(it)); });
  return h;
}

// ================================================================
//  STORY — full-screen cards in the System's voice: the opening, and a chapter card for each gate
// ================================================================
let storyRun = null; // while a card is up: { cards, i, head, onEnd, lock, timer }. Everything else ignores keys and clicks until it ends.
let gateAsk = null; // when the bag is full, the gate waiting for the hunter's answer: { id } or { endless:true }
const STORY_CHAPTER_MS = 3200;

// cards: arrays of lines. head: null for the opening, or { chapter, name, rank } for a chapter card. onEnd runs when the last card is done or skipped.
function runStory(cards, head, onEnd) {
  if (storyRun) return;
  storyRun = { cards, i:0, head, onEnd, lock:0, timer:0 };
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // a focused button would turn Enter or Space into a second click
  $('story-overlay').classList.toggle('chapter', !!head);
  $('story-skip').style.display = head ? 'none' : '';
  show('story-overlay', 'flex');
  storyCard(0);
}
function storyCard(i) {
  const s = storyRun, h = s.head, box = $('story-card');
  s.i = i; s.lock = performance.now() + (h ? 400 : 250); // a double click or a held key must not skip a card unread
  const add = (cls, text, delay) => { const el = document.createElement('div'); el.className = cls; el.textContent = text; if (delay) el.style.animationDelay = delay+'s'; box.appendChild(el); };
  box.textContent = '';
  box.style.animation = 'none'; void box.offsetWidth; box.style.animation = ''; // play the entrance again for every card
  add('story-kicker', h ? `CHAPTER ${h.chapter}` : '[ SYSTEM ]');
  if (h) { add('story-title', h.name); add('story-rank', `${h.rank}-RANK GATE`); }
  s.cards[i].forEach((line, n) => add('story-line', line.replace(/\{name\}/g, player.name), 0.25 + n*0.6));
  const dots = $('story-dots'); dots.textContent = '';
  if (s.cards.length > 1) s.cards.forEach((_, n) => { const d = document.createElement('i'); if (n <= i) d.className = 'on'; dots.appendChild(d); });
  $('story-hint').textContent = h ? (isMobile ? 'TAP TO ENTER' : 'CLICK OR PRESS ANY KEY') : i === s.cards.length-1 ? (isMobile ? 'TAP TO BEGIN' : 'CLICK OR PRESS ENTER TO BEGIN') : (isMobile ? 'TAP TO CONTINUE' : 'CLICK, ENTER OR SPACE TO CONTINUE');
  clearTimeout(s.timer);
  if (h) s.timer = setTimeout(storyEnd, STORY_CHAPTER_MS);
}
function storyNext() {
  const s = storyRun;
  if (!s || performance.now() < s.lock) return;
  playSfx('ui');
  if (s.i + 1 < s.cards.length) storyCard(s.i + 1); else storyEnd();
}
function storyEnd() {
  const s = storyRun; if (!s) return;
  clearTimeout(s.timer); storyRun = null; hide('story-overlay');
  s.onEnd();
}
// Called first by onKey while a card is up. Esc ends the story at once; the opening takes Enter or Space, a chapter card takes any key.
function storyKey(key, e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // browser shortcuts are not for the story
  if (key === 'enter' || key === ' ' || key === 'escape') e.preventDefault(); // not a second click on a focused button
  if (key === 'escape') { storyEnd(); return; }
  if (['shift','control','alt','meta','capslock','tab'].includes(key)) return;
  if (storyRun.head || key === 'enter' || key === ' ') storyNext();
}
$('story-overlay').addEventListener('click', storyNext);
$('story-skip').addEventListener('click', e => { e.stopPropagation(); storyEnd(); });

// A gate's chapter card: the first time the hunter walks in, if the gate has never been cleared
const chapterDue = g => !!STORY[g.id] && !player.cleared[g.id] && !player.story.gates[g.id];
function showChapter(g, then) {
  const st = STORY[g.id];
  player.story.gates[g.id] = true; saveGame();
  runStory([st.lines], { chapter:st.chapter, name:g.name, rank:g.rank }, then);
}
// The victory screen's closing line, for the first clear of a gate (clearGate has already counted this clear)
function storyVictoryLine(g) {
  let el = $('victory-story');
  if (!el) { el = document.createElement('div'); el.id = 'victory-story'; $('victory-stats').after(el); }
  const st = STORY[g.id];
  el.textContent = st && player.cleared[g.id] === 1 ? st.cleared : '';
  el.style.display = el.textContent ? '' : 'none';
}
