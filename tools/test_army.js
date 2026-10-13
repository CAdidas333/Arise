'use strict';

// Checks the shadow army roles in js/07-skills-shadows.js: who escorts, who answers the Legion call, who waits in reserve, and who is on the field.
// Run: node tools/test_army.js   (prints PASS <number of cases checked>)

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../js/07-skills-shadows.js'), 'utf8');

const testBody = `
const fail = msg => { throw new Error(msg); };
let checked = 0;

// A roster of n shadows, damage highest first (the order deployShadows sorts into)
const roster = n => Array.from({ length: n }, (_, i) => ({ damage: n - i, active: false, lingerT: 0 }));

const SIZES = [0, 1, 3, 4, 7, 16, 40];
const CAPS = [6, 16];
const STATES = [[false, false, 'idle'], [true, false, 'Legion'], [false, true, 'Awakening'], [true, true, 'both']];

for (const n of SIZES) for (const cap of CAPS) {
  const dep = Math.min(n, cap), escort = Math.min(dep, ESCORT_SIZE), legion = dep - escort, reserve = n - dep;
  for (const [inLegion, inUlt, tag] of STATES) {
    const r = shadowRole(roster(n), cap, inLegion, inUlt);
    const where = ' (n=' + n + ' cap=' + cap + ' ' + tag + ')';
    if (r.length !== n) fail('lost a shadow' + where);
    const cnt = { escort:0, legion:0, reserve:0 };
    r.forEach(x => cnt[x.role]++);
    if (cnt.escort !== escort) fail('escort ' + cnt.escort + ' != ' + escort + where);
    if (cnt.legion !== legion) fail('legion ' + cnt.legion + ' != ' + legion + where);
    if (cnt.reserve !== reserve) fail('reserve ' + cnt.reserve + ' != ' + reserve + where);
    r.forEach((x, i) => {
      if (x.role === 'legion' && i >= legion) fail('this shadow should be escort or reserve, not legion' + where);
      if (x.role === 'reserve' && i < dep) fail('a deployed shadow is marked reserve' + where);
      if (i < n - 1 && x.shadow.damage < r[i + 1].shadow.damage) fail('roster is not damage order' + where);
      const want = x.role === 'escort' ? true : x.role === 'legion' ? (inLegion || inUlt) : inUlt;
      if (x.active !== want) fail('role ' + x.role + ' active=' + x.active + ' want ' + want + where);
      checked++;
    });
    // Every escort is weaker than every shadow that answers the Legion call
    const esc = r.filter(x => x.role === 'escort'), leg = r.filter(x => x.role === 'legion');
    for (const a of esc) for (const b of leg) if (a.shadow.damage > b.shadow.damage) fail('an escort outranks a legion shadow' + where);
  }
}

// A freshly raised reserve shadow is on the field while its linger lasts, and no one else is woken
const rs = roster(10);
rs[7].lingerT = 2;
const r = shadowRole(rs, 6, false, false);
if (!r[7].active) fail('a lingering reserve shadow is not on the field');
if (r[0].active || r[6].active || r[9].active) fail('a non-lingering reserve shadow is on the field');
checked += 2;

return checked;
`;

try {
  const checked = new Function(src + testBody)();
  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
