'use strict';

// Checks hunter colours earned by titles: the TITLES.hue table, hunterHue/hexRgba, the WEAR/WORN toggle and save/load.
// Run: node tools/test_title_colours.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api } = createGame();
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;
  const ok = (cond, msg) => { if (!cond) fail(msg); checked++; };

  // 1. every TITLES entry has a 6-digit hex hue; all twelve differ; none is the default cyan, hit red or Awakening violet
  const titles = at('TITLES');
  const primary = at('COLORS.primary'), danger = at('COLORS.danger');
  const reserved = new Set([primary.toLowerCase(), danger.toLowerCase(), '#cc88ff', '#8844ff']);
  ok(titles.length === 12, `TITLES has ${titles.length} entries, not 12`);
  const hues = new Set();
  for (const t of titles) {
    ok(typeof t.hue === 'string' && /^#[0-9a-f]{6}$/.test(t.hue), `${t.id} hue ${t.hue} does not match /^#[0-9a-f]{6}$/`);
    ok(!reserved.has(t.hue.toLowerCase()), `${t.id} hue ${t.hue} matches a reserved colour`);
    hues.add(t.hue);
  }
  ok(hues.size === 12, `TITLES has ${hues.size} distinct hues, not 12`);

  // 2. a new player has hue === '' and hunterHue(player) === COLORS.primary
  const newPlayer = () => { const p = api.createPlayer('HueBot'); api.player = p; api.resetWorld(); return p; };
  let p = newPlayer();
  ok(p.hue === '', `a new player starts with hue ${JSON.stringify(p.hue)}`);
  ok(at('hunterHue(player)') === primary, `hunterHue(newPlayer) is ${at('hunterHue(player)')}, not ${primary}`);
  ok(at('hunterHue(null)') === primary, 'hunterHue(null) did not fall back to COLORS.primary');

  // 3. wearing: give the player cuts_100, run the hue action to wear and again to clear; unearned title cannot be worn
  const actHue = v => at(`(() => { const v = ${JSON.stringify(v)}; player.hue = player.hue === v ? '' : (player.titles.includes(v) ? v : player.hue); saveGame(); })()`);
  p.titles.push('cuts_100');
  actHue('ghost_step');
  ok(p.hue === '' && at('hunterHue(player)') === primary, 'an unearned title was worn');
  actHue('cuts_100');
  ok(p.hue === 'cuts_100', `wearing cuts_100 left hue as ${JSON.stringify(p.hue)}`);
  ok(at('hunterHue(player)') === '#3dffb0', `hunterHue with cuts_100 worn is ${at('hunterHue(player)')}, not #3dffb0`);
  ok(at('tabStatus()').includes('data-act="hue" data-v="cuts_100"') && at('tabStatus()').includes('WORN'), 'STATUS tab does not show WORN for the worn title');
  actHue('cuts_100');
  ok(p.hue === '', `pressing WORN again left hue as ${JSON.stringify(p.hue)}`);
  ok(at('hunterHue(player)') === primary, 'clearing hue did not return hunterHue to COLORS.primary');
  ok(at('tabStatus()').includes('WEAR') && !at('tabStatus()').includes('WORN'), 'STATUS tab still shows WORN after clearing');

  // 4. save round trip keeps hue; unearned, unknown or missing hue loads as ''
  p = newPlayer();
  p.titles.push('cuts_100', 'gate_walker');
  p.title = 'gate_walker';
  actHue('cuts_100');
  at('saveGame(); loadGame()');
  ok(api.player.hue === 'cuts_100' && api.player.title === 'gate_walker', `round trip gave title=${api.player.title}, hue=${api.player.hue}`);
  ok(at('hunterHue(player)') === '#3dffb0', 'hunterHue after load is not #3dffb0');

  const loadEdited = mutate => {
    at(`(() => {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      d.titles = ['cuts_100'];
      d.feats = { perfects:0, boxes:0, flawless:0 };
      d.highScores = { bestLevel:0, bestCombo:0, totalKills:0, gatesCleared:0, bestGate:'-', bestFloor:0, damageTaken:0 };
      (${mutate.toString()})(d);
      localStorage.setItem(SAVE_KEY, JSON.stringify(d));
      loadGame();
    })()`);
    return api.player;
  };
  ok(loadEdited(d => { d.hue = 'ghost_step'; }).hue === '', 'an unearned hue survived loadGame');
  ok(loadEdited(d => { d.hue = 'not_a_title'; }).hue === '', 'an unknown hue survived loadGame');
  ok(loadEdited(d => { delete d.hue; }).hue === '', 'a save with no hue field did not load as empty string');

  // 5. hexRgba helper
  ok(at("hexRgba('#3dffb0', 0.5)") === 'rgba(61,255,176,0.5)', `hexRgba('#3dffb0', 0.5) gave ${at("hexRgba('#3dffb0', 0.5)")}`);
  ok(at("hexRgba('#00d4ff', 0.17)") === 'rgba(0,212,255,0.17)', `hexRgba('#00d4ff', 0.17) gave ${at("hexRgba('#00d4ff', 0.17)")}`);

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
