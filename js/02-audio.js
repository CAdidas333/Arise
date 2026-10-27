'use strict';

// ================================================================
//  AUDIO ENGINE (Web Audio API — everything synthesized at runtime)
// ================================================================
let AC = null, master, musicGain, sfxGain, revSend, noiseBuf;
let musicMode = 'off', musicStep = 0, nextStepT = 0, musicIntensity = 0.5;
let synthBus, trkVol, trk = null, trkIv = -1, synthT = 1; // recorded-music state, see RECORDED MUSIC below
const settings = { music:0.4, sfx:0.6, aim:'auto', hunter:'new' };

function initAudio() {
  if (window.__arise) window.__arise.musicState = musicState; // test hook, only when the page was opened with #debug
  if (AC) { if (AC.state !== 'running' && !paused) AC.resume(); return; }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  AC = new Ctor(); AC.resume();
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18;
  master = AC.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(AC.destination);
  musicGain = AC.createGain(); musicGain.gain.value = settings.music; musicGain.connect(master);
  synthBus = AC.createGain(); synthBus.connect(musicGain); // the synthesised music plays through here so it can be faded under a recorded track
  trkVol = AC.createGain(); trkVol.connect(musicGain);     // recorded tracks end up here (light intensity scaling)
  sfxGain = AC.createGain(); sfxGain.gain.value = settings.sfx; sfxGain.connect(master);
  // Reverb from a generated impulse — gives the dungeon its space
  const len = Math.floor(AC.sampleRate*2.2), ir = AC.createBuffer(2, len, AC.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 2.6); }
  const conv = AC.createConvolver(); conv.buffer = ir;
  revSend = AC.createGain(); revSend.gain.value = 0.32; revSend.connect(conv); conv.connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random()*2-1;
  setInterval(musicTick, 25);
  loadClips();
  loadMusic();
  // Timers lag in a background tab and the clock stops while suspended: re-check the moment audio runs or the tab is seen again
  AC.onstatechange = () => { if (AC.state === 'running') musicTick(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) musicTick(); });
}

// o: { type, f, f2, dur, vol, t, a, lp, lp2, q, rev, dest }
function tone(o) {
  const t = o.t || AC.currentTime, dur = o.dur || 0.1, osc = AC.createOscillator(), g = AC.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t+dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.vol || 0.2, t+(o.a || 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  let node = osc;
  if (o.lp) {
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.lp, t);
    if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t+dur);
    osc.connect(f); node = f;
  }
  node.connect(g); g.connect(o.dest || sfxGain);
  if (o.rev) g.connect(revSend);
  osc.start(t); osc.stop(t+dur+0.03);
}
// o: { dur, vol, type, f, f2, q, t, rev, dest }
function noise(o) {
  const t = o.t || AC.currentTime, dur = o.dur || 0.1, src = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
  src.buffer = noiseBuf; src.loop = true;
  f.type = o.type || 'highpass'; f.Q.value = o.q || 0.7;
  f.frequency.setValueAtTime(o.f || 1000, t);
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t+dur);
  g.gain.setValueAtTime(o.vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  src.connect(f); f.connect(g); g.connect(o.dest || sfxGain);
  if (o.rev) g.connect(revSend);
  src.start(t, Math.random()*0.9); src.stop(t+dur+0.03);
}

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

const sfxLast = {};
function playSfx(type, p = 1) {
  if (!AC || AC.state !== 'running') return;
  const t = AC.currentTime;
  if (sfxLast[type] && t - sfxLast[type] < 0.035) return; // don't stack 30 identical hits in one frame
  sfxLast[type] = t;
  const rec = SFX_CLIP[type];
  if (rec && playClip('s_'+rec[0], rec[1])) return;
  switch (type) {
    case 'slash': noise({ dur:0.09, vol:0.22, type:'bandpass', f:2600*p, f2:700, q:1.2 }); tone({ type:'sawtooth', f:340*p, f2:110, dur:0.08, vol:0.1, lp:1800 }); break;
    case 'slash3': noise({ dur:0.2, vol:0.3, type:'bandpass', f:3800, f2:500, q:0.9, rev:1 }); tone({ type:'sawtooth', f:520, f2:70, dur:0.22, vol:0.18, lp:2400, lp2:300 }); break;
    case 'hit': tone({ type:'square', f:190, f2:55, dur:0.1, vol:0.15, lp:1200 }); noise({ dur:0.04, vol:0.14, f:1800 }); break;
    case 'crit': tone({ type:'sawtooth', f:880, f2:160, dur:0.16, vol:0.18, lp:4000, lp2:500, rev:1 }); noise({ dur:0.07, vol:0.2, f:3000 }); tone({ f:90, f2:40, dur:0.16, vol:0.3 }); break;
    case 'kill': tone({ f:420, f2:70, dur:0.28, vol:0.13 }); noise({ dur:0.14, vol:0.1, type:'lowpass', f:900, f2:120 }); break;
    case 'levelup': [523,659,784,1047,1319,1568].forEach((f,i) => tone({ type:'triangle', f, dur:0.5, vol:0.15, t:t+i*0.07, rev:1 })); tone({ f:130, dur:0.9, vol:0.2 }); break;
    case 'dash': noise({ dur:0.18, vol:0.24, type:'bandpass', f:2400, f2:400, q:1.5 }); break;
    case 'hurt': tone({ type:'square', f:120, f2:45, dur:0.18, vol:0.2, lp:700 }); noise({ dur:0.08, vol:0.16, type:'lowpass', f:600 }); break;
    case 'boss': [0,0.14,0.28,0.42].forEach((d,i) => tone({ type:'sawtooth', f:58-i*5, dur:0.7, vol:0.26, t:t+d, lp:500, rev:1 })); noise({ dur:1.4, vol:0.14, type:'lowpass', f:300, f2:60, rev:1 }); break;
    case 'extract': { // the signature moment: an impact, a rising D-minor wall of sound, then a second, brighter hit
      tone({ f:72, f2:26, dur:1.5, vol:0.6 }); noise({ dur:0.9, vol:0.3, type:'lowpass', f:2400, f2:120, rev:1 });
      [73.42,110,146.83,174.61,220].forEach(f => [1,1.006].forEach(dt => tone({ type:'sawtooth', f:f*dt, dur:3.4, vol:0.075, a:0.25, lp:320, lp2:2400, q:2, rev:1 })));
      noise({ dur:1.1, vol:0.14, type:'bandpass', f:220, f2:4200, q:2.5, t:t+0.08, rev:1 });
      [293.66,349.23,440,587.33].forEach((f,i) => tone({ type:'triangle', f, dur:2.6-i*0.3, vol:0.11, a:0.06, t:t+0.2+i*0.22, rev:1 }));
      const h = t+1.1;
      tone({ f:82, f2:28, dur:1.6, vol:0.6, t:h }); noise({ dur:1.8, vol:0.16, type:'bandpass', f:6500, f2:2500, q:0.8, t:h, rev:1 });
      [587.33,880,1174.66,1760].forEach((f,i) => tone({ f, dur:2.2, vol:0.07, a:0.01, t:h+i*0.05, rev:1 }));
      [36.71,73.42].forEach(f => tone({ type:'sawtooth', f, dur:2.4, vol:0.16, a:0.02, lp:500, lp2:120, t:h, rev:1 }));
      break;
    }
    case 'arise': tone({ type:'sawtooth', f:82, f2:164, dur:0.5, vol:0.16, a:0.04, lp:900, rev:1 }); noise({ dur:0.5, vol:0.1, type:'bandpass', f:300, f2:1800, q:2, rev:1 }); break;
    case 'fail': tone({ type:'sawtooth', f:220, f2:60, dur:0.5, vol:0.18, lp:800 }); break;
    case 'legion': [55,82.4,110,164.8].forEach((f,i) => tone({ type:i<2?'sawtooth':'triangle', f, dur:1.6, vol:0.14, a:0.08, lp:900, rev:1 })); noise({ dur:1.2, vol:0.1, type:'bandpass', f:300, f2:1800, q:3, rev:1 }); break;
    case 'ult': [41.2,82.4,123.5,164.8,247].forEach((f,i) => tone({ type:'sawtooth', f, f2:f*2, dur:1.8, vol:0.13, a:0.02, lp:400, lp2:5000, rev:1 })); noise({ dur:1.8, vol:0.2, type:'bandpass', f:120, f2:6000, q:1.5, rev:1 }); tone({ f:60, f2:25, dur:1.2, vol:0.5 }); break;
    case 'explode': tone({ f:140, f2:30, dur:0.4, vol:0.4 }); noise({ dur:0.35, vol:0.3, type:'lowpass', f:2200, f2:150, rev:1 }); break;
    case 'tele': tone({ type:'triangle', f:660, f2:990, dur:0.12, vol:0.06 }); break;
    case 'shoot': tone({ type:'square', f:520, f2:220, dur:0.08, vol:0.05, lp:1500 }); break;
    case 'pickup': tone({ f:880*p, f2:1320*p, dur:0.08, vol:0.07 }); break;
    case 'heal': [392,523,659].forEach((f,i) => tone({ type:'triangle', f, dur:0.3, vol:0.12, t:t+i*0.06, rev:1 })); break;
    case 'ui': tone({ type:'triangle', f:740, dur:0.05, vol:0.08 }); break;
    case 'buy': [660,880,1320].forEach((f,i) => tone({ type:'triangle', f, dur:0.18, vol:0.12, t:t+i*0.05, rev:1 })); break;
    case 'deny': tone({ type:'square', f:140, dur:0.12, vol:0.1, lp:600 }); break;
    case 'boon': [330,494,659,988].forEach((f,i) => tone({ type:'sine', f, dur:0.6, vol:0.12, t:t+i*0.05, rev:1 })); break;
    case 'perfect': tone({ f:1320, f2:2640, dur:0.25, vol:0.14, rev:1 }); noise({ dur:0.3, vol:0.1, type:'bandpass', f:6000, f2:1500, q:3, rev:1 }); break;
    case 'death': tone({ type:'sawtooth', f:200, f2:28, dur:1.8, vol:0.25, lp:500, rev:1 }); noise({ dur:1.5, vol:0.1, type:'lowpass', f:400, f2:60, rev:1 }); break;
    case 'victory': [[330,415,494],[392,494,587],[440,554,659],[494,622,740,988]].forEach((ch,i) => ch.forEach(f => tone({ type:'triangle', f, dur:i===3?1.6:0.3, vol:0.11, t:t+i*0.24, rev:1 }))); break;
  }
}

// --- ADAPTIVE MUSIC: a lookahead step sequencer, three moods, layers gated by combat intensity ---
const mtof = m => 440*Math.pow(2, (m-69)/12);
const MUSIC = {
  hub:    { bpm:76,  roots:[40,36,45,35], major:[0,1,0,1], drums:false },
  battle: { bpm:140, roots:[40,36,43,38], major:[0,1,1,1], drums:true,  kick:[0,4,8,12],       bass:[1,0,0,1, 0,0,1,0, 1,0,1,0, 0,1,0,1] },
  boss:   { bpm:158, roots:[40,41,40,35], major:[0,1,0,1], drums:true,  kick:[0,3,6,8,11,14],  bass:[1,1,0,1, 1,0,1,1, 0,1,1,0, 1,1,0,1] },
};
const LEAD = [7,null,7,5, 3,null,5,7, 10,null,7,null, 5,3,null,null, 7,null,7,5, 3,null,2,3, 5,null,null,3, 2,null,-2,null];
const ARP = [0,1,2,1, 0,2,1,2, 0,1,2,1, 2,1,0,1];

function setMusic(mode) { if (mode === musicMode) return; musicMode = mode; musicStep = 0; nextStepT = 0; syncMusic(); }

function musicTick() {
  if (!AC) return;
  reapPlayers(); trkTick();
  if (musicMode === 'off' || musicBuf[musicMode] || AC.state !== 'running') return; // a decoded track plays its mode instead of the sequencer
  const M = MUSIC[musicMode], stepDur = 60/M.bpm/4;
  if (nextStepT < AC.currentTime) nextStepT = AC.currentTime + 0.05;
  while (nextStepT < AC.currentTime + 0.12) { playStep(M, musicStep++, nextStepT, stepDur); nextStepT += stepDur; }
}

// --- RECORDED MUSIC: optional mp3 tracks that replace the synthesised music per mode (a missing file changes nothing) ---
// Every track is an AudioBufferSource on the AudioContext clock, so pause (AC.suspend) stops it too. They are not seamless loops:
// about 2.5 s before the end the next copy starts, and the two crossfade with equal-power curves (each copy has its own gain node).
// Path: source -> copy gain (loop crossfade) -> player bus (mode fade) -> trkVol (intensity) -> musicGain (volume slider).
// Memory: at start-up only the compressed files are fetched and kept (about 2 MB each). A mode is decoded (about 35 MB) the first time it is
// asked for, and the synthesiser plays until that finishes. At most 2 decoded tracks are kept (1 on a phone); the least recently used one that
// is not playing or fading out is dropped, and decoded again from the kept bytes if it is wanted later.
const MUSIC_FILES = { hub:'assets/music/hub.mp3', battle:'assets/music/fight.mp3', boss:'assets/music/boss.mp3' };
const musicRaw = {};  // compressed file bytes by mode, once fetched (never decoded in place: decodeAudioData gets a copy)
const musicBuf = {};  // decoded tracks by mode, only the ones currently kept
const musicUsed = {}, musicFail = {};  // last-used stamp by mode; modes whose decode failed (they stay on the synthesiser)
let decoding = null, players = [], useSeq = 0, evictDue = false; // decoding: the mode being decoded now; players: tracks playing or still fading out

// Equal-power fade of a gain param (sine in, cosine out) as 12 linear ramps. Only touches events from t0 on, so it can interrupt another fade.
function fadeParam(p, to, dur, t0 = AC.currentTime, from = p.value) {
  p.cancelScheduledValues(t0); p.setValueAtTime(from, t0);
  for (let i = 1; i <= 12; i++) { const x = i/12; p.linearRampToValueAtTime(to >= from ? from + (to-from)*Math.sin(x*Math.PI/2) : to + (from-to)*Math.cos(x*Math.PI/2), t0 + dur*x); }
}

// Fetch the three files and keep their bytes; decoding waits until a mode is asked for (see decodeMusic)
function loadMusic() {
  try {
    // fetch() fails when the game is opened straight from disk (file://); then those modes simply keep the synthesised music
    Promise.all(Object.keys(MUSIC_FILES).map(mode => fetch(MUSIC_FILES[mode])
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(b => { if (!b.byteLength) throw new Error('empty'); musicRaw[mode] = b; syncMusic(); return null; })
      .catch(e => mode + ' (' + ((e && e.message) || e) + ')')
    )).then(miss => { miss = miss.filter(Boolean); if (miss.length) console.info('Music: no recorded track for ' + miss.join(', ') + '; the synthesised music plays there'); });
  } catch (e) { console.info('Music: recorded tracks unavailable, the synthesised music plays'); }
}

// Decode one mode's track from its kept bytes. Only one decode runs at a time (a second request is picked up when the first ends, if its mode
// is still the wanted one), so a burst of mode switches cannot pile up decoded audio. A failed decode is not tried again.
function decodeMusic(mode) {
  if (!AC || decoding || !musicRaw[mode] || musicBuf[mode] || musicFail[mode]) return;
  decoding = mode;
  let p;
  try { p = AC.decodeAudioData(musicRaw[mode].slice(0)); } catch (e) { p = Promise.reject(e); } // decodeAudioData detaches what it is given, so it gets a copy
  p.then(buf => {
    if (!(buf.duration >= 3)) throw new Error('too short');
    decoding = null; musicBuf[mode] = buf;
    evictMusic(); // a track for a mode that is no longer current is kept only if it fits the cap
    syncMusic();  // switches over from the synthesiser if this mode is the current one
  }).catch(e => {
    decoding = null; musicFail[mode] = true;
    console.info('Music: could not decode the ' + mode + ' track (' + ((e && e.message) || e) + '); the synthesised music plays there');
    syncMusic(); // let the current mode start its own decode now
  });
}

// Most decoded tracks kept at once: 2, or 1 on a phone. isMobile is defined in a later script, so it is read only now, at run time.
function musicCap() { try { return typeof isMobile !== 'undefined' && isMobile ? 1 : 2; } catch (e) { return 2; } }

// Drop the least recently used decoded tracks above the cap, never the current mode or one that is still playing or fading out
function evictMusic() {
  const cap = musicCap(), held = Object.keys(musicBuf);
  evictDue = false;
  while (held.length > cap) {
    const free = held.filter(m => m !== musicMode && !players.some(P => P.mode === m)).sort((a, b) => (musicUsed[a] || 0) - (musicUsed[b] || 0));
    if (!free.length) { evictDue = true; return; } // all the rest are in use: look again when a fade has finished
    delete musicBuf[free[0]]; held.splice(held.indexOf(free[0]), 1);
  }
}

// Forget players whose sources have all stopped, so their AudioBuffer can be freed, then apply the cap
function reapPlayers() {
  for (let i = players.length - 1; i >= 0; i--) {
    const P = players[i];
    if (!P.dead || (P.live.size && AC.currentTime < P.freeAt + 0.2)) continue; // still playing, or still fading out
    players.splice(i, 1); evictDue = true;
    try { P.live.forEach(v => { v.src.disconnect(); v.vg.disconnect(); }); P.bus.disconnect(); } catch (e) {}
    P.live.clear(); P.buf = null;
  }
  if (evictDue) evictMusic();
}

// Make what is audible match musicMode and which tracks have decoded. Safe to call at any time (mode change, a track finishing decoding).
function syncMusic() {
  if (!AC || !trkVol) return;
  try {
    if (musicMode !== 'off') { musicUsed[musicMode] = ++useSeq; decodeMusic(musicMode); } // first request of a mode starts its decode (no-op if decoded)
    const want = musicBuf[musicMode] ? musicMode : null;
    if (trk && trk.mode !== want) retireTrack(trk, musicMode === 'off' ? 0.6 : 0.8);
    if (want && !trk) startTrack(want);
    // The synthesised path goes quiet while a track plays and comes back when it is wanted again. It is left alone when no track was ever involved.
    const target = trk ? 0 : musicMode !== 'off' ? 1 : synthT;
    if (target !== synthT) { synthT = target; fadeParam(synthBus.gain, target, 0.8); }
  } catch (e) { // never leave the game silent: drop the track for this mode and fall back to the sequencer
    console.info('Music: recorded track failed, the synthesised music plays');
    delete musicBuf[musicMode]; musicFail[musicMode] = true; synthT = 1;
    try { if (trk) retireTrack(trk, 0.1); } catch (e2) { trk = null; }
    try { synthBus.gain.cancelScheduledValues(0); synthBus.gain.value = 1; } catch (e2) {}
  }
}

// Where the music in a track really ends. A recorded track can close on a fade-out (the hub take decays for its last 10 s), and looping
// the whole file would leave that hole in the music every time round. The track's typical level is the median of its quarter-second
// windows; the loop ends 1 s after the last window within 6 dB of it, so the crossfade covers the fade-out. Worked out once per decode.
function trackLen(buf) {
  if (buf.loopLen) return buf.loopLen;
  const d = buf.getChannelData(0), W = Math.floor(buf.sampleRate / 4), n = Math.floor(d.length / W), lv = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = i*W, e = j + W; j < e; j++) s += d[j]*d[j]; lv[i] = s / W; }
  const med = Float32Array.from(lv).sort()[n >> 1], floor = med * 0.25; // 6 dB below the median, in power
  let k = n - 1; while (k > 0 && lv[k] < floor) k--;
  return (buf.loopLen = clamp((k + 1) / 4 + 1, Math.max(3, buf.duration - 15), buf.duration)); // never trims more than 15 s
}

function startTrack(mode) {
  const buf = musicBuf[mode], len = trackLen(buf), P = { mode, buf, len, bus:AC.createGain(), live:new Set(), last:null, nextT:0, dead:false, xf:Math.min(2.5, len/4) };
  P.bus.gain.value = 0; P.bus.connect(trkVol); fadeParam(P.bus.gain, 1, 0.8);
  players.push(P); trk = P; trkCopy(P, AC.currentTime + 0.03, 0);
}

// Start one copy of the track at AudioContext time t; the previous copy fades out under it over xf seconds
function trkCopy(P, t, xf) {
  const src = AC.createBufferSource(), vg = AC.createGain(), v = { src, vg, end:t + P.len };
  src.buffer = P.buf; src.connect(vg); vg.connect(P.bus);
  if (P.last) {
    fadeParam(vg.gain, 1, xf, t, 0); fadeParam(P.last.vg.gain, 0, xf, t, 1);
    try { P.last.src.stop(t + xf + 0.05); } catch (e) {}
  }
  src.onended = () => { P.live.delete(v); try { src.disconnect(); vg.disconnect(); } catch (e) {} };
  src.start(t); P.live.add(v); P.last = v; P.nextT = v.end - P.xf;
}

function retireTrack(P, dur) {
  if (trk === P) trk = null;
  P.dead = true; P.freeAt = AC.currentTime + dur + 0.05; fadeParam(P.bus.gain, 0, dur);
  P.live.forEach(v => { try { v.src.stop(P.freeAt); } catch (e) {} });
}

// Runs on the 25 ms timer, on resume and when the tab is seen again. Decides by the AudioContext clock, so a late timer only starts the next copy late.
function trkTick() {
  const P = trk;
  if (!P || AC.state !== 'running') return;
  try {
    const now = AC.currentTime;
    if (now >= P.nextT - 4) { // look ahead 4 s: the copy is scheduled at its exact time, so timer jitter does not matter
      const t = Math.max(P.nextT, now + 0.02);
      trkCopy(P, t, clamp(P.last.end - t, 0.05, P.xf)); // started late: crossfade over what is left of the old copy (a gap gets a short fade-in)
    }
    // Intensity: a light, slow touch on the level (0.8 at calm to 1.0 at the peak)
    const tg = 0.8 + 0.2*clamp((musicIntensity - 0.2)/0.8, 0, 1);
    trkIv = trkIv < 0 ? tg : trkIv + (tg - trkIv)*0.01;
    if (Math.abs(trkIv - trkVol.gain.value) > 0.002) trkVol.gain.value = trkIv;
  } catch (e) {}
}

function musicState() {
  return { mode:musicMode, loaded:{ hub:!!musicRaw.hub, battle:!!musicRaw.battle, boss:!!musicRaw.boss }, // loaded = the file was fetched
    decoded:{ hub:!!musicBuf.hub, battle:!!musicBuf.battle, boss:!!musicBuf.boss }, playing:trk ? 'file' : musicMode === 'off' ? 'off' : 'synth' };
}

function playStep(M, step, t, sd) {
  const s = step % 16, bar = Math.floor(step/16) % 4, cyc = Math.floor(step/64) % 2;
  const root = M.roots[bar], chord = M.major[bar] ? [0,4,7] : [0,3,7], I = musicIntensity, d = synthBus;
  // Pad — one long chord per bar
  if (s === 0) chord.forEach((c,i) => tone({ type:'sawtooth', f:mtof(root+12+c), dur:sd*16, vol:M.drums?0.022:0.04, a:sd*3, lp:M.drums?500:700, t, dest:d, rev:1 }));
  if (!M.drums) {
    // Hub: slow glassy arpeggio over the pad
    if (s % 4 === 0) tone({ type:'sine', f:mtof(root+24+chord[(s/4+bar)%3]+(s===12?12:0)), dur:sd*6, vol:0.05, a:0.02, t, dest:d, rev:1 });
    if (s === 0) tone({ type:'sine', f:mtof(root-12), dur:sd*14, vol:0.1, a:0.2, t, dest:d });
    return;
  }
  // Kick
  if (M.kick.includes(s) || (I > 0.8 && s === 10)) {
    tone({ f:165, f2:36, dur:0.16, vol:0.5, t, dest:d });
    tone({ type:'square', f:900, dur:0.012, vol:0.08, t, dest:d });
  }
  // Snare
  if (s === 4 || s === 12) {
    noise({ dur:0.13, vol:0.2, f:1400, t, dest:d, rev:1 });
    tone({ type:'triangle', f:210, f2:110, dur:0.08, vol:0.16, t, dest:d });
  }
  // Hats — 8ths, opening up to 16ths as the fight heats up
  if (s % 2 === 0 || I > 0.55) noise({ dur:s%4===2?0.06:0.025, vol:(s%2===0?0.07:0.035)*(0.6+I*0.6), f:7500, t, dest:d });
  // Bass
  if (M.bass[s]) tone({ type:'sawtooth', f:mtof(root + (s===14?12:0)), dur:sd*1.7, vol:0.15, lp:520, lp2:160, q:4, t, dest:d });
  // Arp — joins once there is something to fight
  if (I > 0.3) tone({ type:'square', f:mtof(root+24+chord[ARP[s]]), dur:sd*0.9, vol:0.022+I*0.015, lp:2600, lp2:500, t, dest:d, rev:1 });
  // Lead — second half of each 8-bar cycle, or constantly when it gets wild
  if ((cyc === 1 || I > 0.85) && s % 2 === 0) {
    const n = LEAD[(bar*8 + s/2) % 32];
    if (n !== null) tone({ type:musicMode==='boss'?'square':'sawtooth', f:mtof(64+n), dur:sd*2.2, vol:0.05, a:0.01, lp:3200, lp2:900, t, dest:d, rev:1 });
  }
  // Crash + fill
  if (s === 0 && bar === 0) noise({ dur:0.7, vol:0.09, type:'bandpass', f:5000, q:0.5, t, dest:d, rev:1 });
  if (bar === 3 && s >= 12) tone({ f:130+(s-12)*26, f2:60, dur:0.08, vol:0.2, t, dest:d });
}
