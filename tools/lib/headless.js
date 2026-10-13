'use strict';

// headless.js — loads the Arise game scripts into a single Node `vm` context so a bot can
// play the game without a browser. The loader mirrors index.html: it reads the <script src>
// tags in order, strips the ?v= cache-buster, and runs each classic script in ONE shared
// context (so top-level let/const from one script are visible to the next, exactly as they
// are in a browser). Everything the scripts only draw, play or show is a "soak" proxy that
// swallows any access/call; the few values game LOGIC reads are real (window size, clock,
// in-memory localStorage, seeded Math.random). There are no dependencies: Node built-ins only.
//
// Used by tools/balance_bot.js. Run the bot, not this file.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

// Any drawn/played/shown object: resolves to itself on every read, call and construct, and
// converts to the number 0 in arithmetic, so canvas contexts, DOM nodes and AudioContexts
// can be touched freely without throwing.
function makeSoak() {
  const soak = new Proxy(function () {}, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : soak),
    apply: () => soak,
    construct: () => soak,
    set: () => true,
  });
  return soak;
}

// The <script src="..."> order in index.html, with the ?v= query strings removed.
function scriptOrder(html) {
  const order = [];
  const re = /<script\s+src="(js\/[^"?]+)(?:\?[^"]*)?"/g;
  let m;
  while ((m = re.exec(html))) order.push(m[1]);
  return order;
}

// Build the sandbox, run every game script in order, then install a seeded Math.random and
// hand back an object of getters/functions for the live top-level bindings.
function createGame() {
  const soak = makeSoak();

  const store = new Map();
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
    clear: () => { store.clear(); },
  };

  // A plain window object (not the soak) so the load-time checks stay off: no AudioContext
  // means the whole audio engine disables itself, no visualViewport means resize() uses
  // innerHeight, and no mouseWorld3D keeps the 2D aim path.
  const win = {
    visualViewport: undefined,
    AudioContext: undefined,
    webkitAudioContext: undefined,
    mouseWorld3D: undefined,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const sandbox = {
    console,
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
    location: { hash: '#debug', search: '', href: 'http://localhost/' },
    navigator: soak,
    document: soak,
    window: win,
    localStorage,
    performance: { now: () => Date.now() },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => 0,
    setTimeout: () => 0,
    clearTimeout: () => 0,
    setInterval: () => 0,
    clearInterval: () => 0,
    fetch: () => new Promise(() => {}),
    addEventListener: () => {},
    removeEventListener: () => {},
    alert: () => {},
    AudioContext: undefined,
    webkitAudioContext: undefined,
    Image: soak,      // loadArt() builds <img> tiles at load; onload never fires, so the painted fallback is used
    Audio: soak,      // only reached if an AudioContext exists, which it never does here
    DOMMatrix: soak,  // buildFloor's tiled-floor transform, only on the (unreached) image path
  };

  const ctx = vm.createContext(sandbox);

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const files = scriptOrder(html);
  if (!files.length) throw new Error('headless: no <script src> tags found in index.html');

  for (const file of files) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    try {
      vm.runInContext(src, ctx, { filename: file });
    } catch (err) {
      throw new Error('headless: failed loading ' + file + ': ' + err.message);
    }
  }

  // Install the seeded RNG from tools/test_gear.js in place of Math.random, and return a bag
  // of live bindings. The IIFE keeps the seed in a closure so reseed() is repeatable.
  const bridge = vm.runInContext(`(function () {
    let __seed = 1;
    Math.random = function () {
      __seed = (__seed + 0x6D2B79F5) | 0;
      let t = Math.imul(__seed ^ (__seed >>> 15), 1 | __seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    function reseed(seed) { __seed = seed | 0; }
    function resetWorld() {
      highScores = { bestLevel:0, bestCombo:0, totalKills:0, gatesCleared:0, bestGate:'-', bestFloor:0, damageTaken:0 };
      questProgress = { kills:0, damageTaken:0, gatesCleared:0 };
      bonusQuestsUnlocked = false; allQuestsJustCompleted = false;
      comboCount = 0; comboTimer = 0; legionTimer = 0; gameTime = 0; clock = 0;
    }
    return {
      reseed, resetWorld,
      get player() { return player; }, set player(v) { player = v; },
      get dungeon() { return dungeon; },
      get run() { return run; },
      get enemies() { return enemies; },
      get telegraphs() { return telegraphs; },
      get remnants() { return remnants; },
      get layout() { return layout; },
      get gameState() { return gameState; },
      keys, touchJoystick, moveDir,
      GATE_DEFS, ENDLESS, SKILL, SKILL_DEFS, TREE, NODE,
      createPlayer, recalcPlayer, autoAssign, buyNode,
      startDungeon, step, useSkill, dodge, castUlt, chooseBoon,
      tryArise, usePotion, nearRemnant, roomAt, liveEnemies,
    };
  })()`, ctx);

  return { ctx, api: bridge, soak };
}

module.exports = { createGame, scriptOrder, makeSoak, ROOT };
