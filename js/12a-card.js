'use strict';

// ================================================================
//  RESULT CARD — a 1200x630 picture of the run, drawn on its own offscreen canvas
//  (never on the game canvas) and handed to the player through the share sheet or a download.
//  Plain rectangles, lines, gradients and text only. Reads: dungeon, run, player (all still alive while
//  the victory / death overlay is open; returnToHub clears them). Does not need either renderer.
// ================================================================
const CARD_W = 1200, CARD_H = 630;
const CARD_GRADE_COLORS = { S:'#bb66ff', A:'#ffcc00', B:'#00d4ff', C:'#8899aa' };
const CARD_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
let cardCache = null, cardToken = 0, cardBusy = false; // cardCache: the finished PNG, made ahead of the click so sharing can start inside it

// --- small drawing helpers ---
function cardRgba(hex, a) {
  const h = String(hex).replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16) || 0;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function cardMix(a, b, t) {
  const p = s => { const h = String(s).replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const x = p(a), y = p(b);
  return '#' + [0, 1, 2].map(i => Math.round(x[i] + (y[i]-x[i])*t).toString(16).padStart(2, '0')).join('');
}
const fmtNumCard = n => typeof fmtNum === 'function' ? fmtNum(n) : String(Math.round(n));
const cardFont = (weight, px) => `${weight} ${px}px Orbitron, monospace`; // falls back to monospace if the page font did not load

// Canvas letter-spacing is not in every browser, so spaced text is drawn one character at a time
function cardSpacedWidth(c, text, sp) {
  const chars = Array.from(text);
  return chars.reduce((w, ch) => w + c.measureText(ch).width, 0) + sp*Math.max(0, chars.length-1);
}
function cardSpaced(c, text, x, y, sp, align = 'left') {
  const chars = Array.from(text), total = cardSpacedWidth(c, text, sp), was = c.textAlign;
  let cx = align === 'center' ? x - total/2 : align === 'right' ? x - total : x;
  c.textAlign = 'left';
  chars.forEach(ch => { c.fillText(ch, cx, y); cx += c.measureText(ch).width + sp; });
  c.textAlign = was;
  return total;
}
// Shrinks the font until the text fits maxW; at the smallest size a long text is cut with an ellipsis
function cardFit(c, text, weight, maxPx, minPx, maxW, spEm = 0) {
  let px = maxPx, t = String(text);
  for (; px > minPx; px -= 2) { c.font = cardFont(weight, px); if (cardSpacedWidth(c, t, spEm*px) <= maxW) break; }
  c.font = cardFont(weight, px);
  if (cardSpacedWidth(c, t, spEm*px) > maxW) {
    const chars = Array.from(t);
    while (chars.length > 1 && cardSpacedWidth(c, chars.join('') + '…', spEm*px) > maxW) chars.pop();
    t = chars.join('') + '…';
  }
  return { text:t, px, sp:spEm*px };
}
function cardGlow(c, x, y, r, color, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, cardRgba(color, a)); g.addColorStop(1, cardRgba(color, 0));
  c.fillStyle = g; c.fillRect(0, 0, CARD_W, CARD_H);
}
// One slanted light bar, fading as it runs down the card
function cardSlant(c, x, w, skew, color, a) {
  const g = c.createLinearGradient(0, 0, 0, CARD_H);
  g.addColorStop(0, cardRgba(color, a)); g.addColorStop(1, cardRgba(color, 0));
  c.fillStyle = g;
  c.beginPath(); c.moveTo(x, 0); c.lineTo(x + w, 0); c.lineTo(x + w - skew, CARD_H); c.lineTo(x - skew, CARD_H); c.closePath(); c.fill();
}
// Corner brackets: two short straight lines per corner
function cardBrackets(c, x0, y0, x1, y1, len, color, lw) {
  c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'butt';
  c.beginPath();
  c.moveTo(x0, y0 + len); c.lineTo(x0, y0); c.lineTo(x0 + len, y0);
  c.moveTo(x1 - len, y0); c.lineTo(x1, y0); c.lineTo(x1, y0 + len);
  c.moveTo(x1, y1 - len); c.lineTo(x1, y1); c.lineTo(x1 - len, y1);
  c.moveTo(x0 + len, y1); c.lineTo(x0, y1); c.lineTo(x0, y1 - len);
  c.stroke();
}

// --- what goes on the card ---
function cardData(kind) {
  if (typeof dungeon === 'undefined' || typeof run === 'undefined' || typeof player === 'undefined' || !dungeon || !run || !player) return null;
  const g = dungeon.gate, endless = !!dungeon.endless, loot = Array.isArray(run.loot) ? run.loot : [];
  const best = loot.reduce((m, it) => Math.max(m, it.rarity|0), 0);
  const mm = Math.floor(run.time/60), ss = String(Math.floor(run.time%60)).padStart(2, '0'), now = new Date();
  const d = {
    kind, endless, gateId:g.id, theme:g.theme, rank:g.rank, gateName:g.name,
    hunter:String(player.name || 'HUNTER'), level:player.level, hunterRank:player.rank,
    time:`${mm}:${ss}`, kills:run.kills|0, combo:run.bestCombo|0, gold:Math.round((run.gold || 0) + (kind === 'victory' ? (run.bonus || 0) : 0)), xp:Math.round(run.xp || 0),
    lootCount:loot.length, lootBest:best, shadows:Array.isArray(player.shadows) ? player.shadows.length : 0,
    grade:kind === 'victory' && CARD_GRADE_COLORS[run.grade] ? run.grade : '', boss:endless ? '' : (g.boss && g.boss.name) || '',
    wave:dungeon.wave, maxWaves:dungeon.maxWaves,
    bestFloor:typeof highScores !== 'undefined' && highScores ? highScores.bestFloor|0 : 0,
    date:`${now.getDate()} ${CARD_MONTHS[now.getMonth()]} ${now.getFullYear()}`,
  };
  d.kicker = endless ? `DEMON CASTLE — FLOOR ${dungeon.wave}` : `${g.rank}-RANK GATE`;
  d.title = g.name.toUpperCase();
  d.tag = kind === 'victory' ? 'GATE CLEARED' : endless ? 'RUN ENDED' : 'HUNTER FALLEN';
  d.shareText = kind === 'victory'
    ? `${d.hunter} cleared the ${g.name} (${g.rank}-rank gate)${d.grade ? ' with grade ' + d.grade : ''} in ARISE. cadidas333.github.io/Arise`
    : endless ? `${d.hunter} reached floor ${dungeon.wave} of the Demon Castle in ARISE. cadidas333.github.io/Arise`
    : `${d.hunter} fell on wave ${dungeon.wave} in the ${g.name} in ARISE. cadidas333.github.io/Arise`;
  d.fileName = 'arise-' + ((endless ? 'demon-castle-floor-' + dungeon.wave : g.name) + '-' + d.hunter).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) + '.png';
  return d;
}

// The painted floor of the gate, dimmed, fading in from the left. Only when the 2D renderer loaded it.
function cardTexture(c, d) {
  if (d.flat) return;
  const img = typeof ART !== 'undefined' && ART ? ART[d.gateId] : null;
  if (!img || !img.complete || !img.naturalWidth) return;
  const lay = document.createElement('canvas'); lay.width = CARD_W; lay.height = CARD_H;
  const l = lay.getContext('2d'); if (!l) return;
  l.fillStyle = l.createPattern(img, 'repeat'); l.fillRect(0, 0, CARD_W, CARD_H);
  l.globalCompositeOperation = 'destination-in';
  const h = l.createLinearGradient(430, 0, 900, 0); h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)');
  l.fillStyle = h; l.fillRect(0, 0, CARD_W, CARD_H);
  const v = l.createLinearGradient(0, 0, 0, CARD_H);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.22, 'rgba(0,0,0,1)'); v.addColorStop(0.7, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0.25)');
  l.fillStyle = v; l.fillRect(0, 0, CARD_W, CARD_H);
  c.save(); c.globalAlpha = 0.85; c.drawImage(lay, 0, 0); c.restore();
}

function cardPaint(c, d) {
  const th = d.theme, line = th.line, ember = th.ember, MUTED = '#8196b8', WHITE = '#f2f6ff';
  const dead = d.kind === 'death', accent = dead ? '#ff6b6b' : line;
  c.textBaseline = 'alphabetic';

  // ground: the gate's own colours
  const bg = c.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, cardMix(th.a, line, 0.16)); bg.addColorStop(0.5, cardMix(th.b, line, 0.05)); bg.addColorStop(1, cardMix(th.b, ember, 0.10));
  c.fillStyle = bg; c.fillRect(0, 0, CARD_W, CARD_H);
  cardTexture(c, d);
  cardGlow(c, 930, 200, 700, line, 0.30);
  cardGlow(c, 90, 660, 560, ember, 0.15);
  cardSlant(c, 560, 90, 300, line, 0.10); cardSlant(c, 668, 16, 300, ember, 0.14); cardSlant(c, 720, 150, 300, line, 0.06);
  c.fillStyle = 'rgba(0,0,0,0.10)'; for (let y = 0; y < CARD_H; y += 4) c.fillRect(0, y, CARD_W, 1); // faint scan lines, like the System window
  const vg = c.createRadialGradient(CARD_W/2, CARD_H/2, 300, CARD_W/2, CARD_H/2, 820);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.62)');
  c.fillStyle = vg; c.fillRect(0, 0, CARD_W, CARD_H);

  // frame: a thin glowing line, a quieter one inside it, heavier brackets at the corners
  c.save();
  c.shadowColor = line; c.shadowBlur = 16;
  c.strokeStyle = cardRgba(line, 0.55); c.lineWidth = 1.5; c.strokeRect(20, 20, CARD_W-40, CARD_H-40);
  c.shadowBlur = 22; cardBrackets(c, 20, 20, CARD_W-20, CARD_H-20, 54, line, 4);
  c.restore();
  c.strokeStyle = cardRgba(line, 0.14); c.lineWidth = 1; c.strokeRect(34.5, 34.5, CARD_W-69, CARD_H-69);

  // header: wordmark left, what happened right, a rule under both
  c.save(); c.fillStyle = WHITE; c.font = cardFont(900, 34); c.shadowColor = '#00d4ff'; c.shadowBlur = 22;
  cardSpaced(c, 'ARISE', 72, 92, 15); c.restore();
  c.save(); c.fillStyle = accent; c.font = cardFont(700, 16); c.shadowColor = accent; c.shadowBlur = 12;
  cardSpaced(c, d.tag, CARD_W-72, 90, 7, 'right'); c.restore();
  const hr = c.createLinearGradient(72, 0, CARD_W-72, 0); hr.addColorStop(0, cardRgba(line, 0.6)); hr.addColorStop(1, cardRgba(line, 0.08));
  c.fillStyle = hr; c.fillRect(72, 112, CARD_W-144, 1.5);

  // title block
  c.fillStyle = accent; c.font = cardFont(700, 19); cardSpaced(c, d.kicker, 72, 172, 8);
  const t = cardFit(c, d.title, 900, 76, 38, 700, 0.03);
  c.save(); c.fillStyle = WHITE; c.shadowColor = line; c.shadowBlur = 26;
  cardSpaced(c, t.text, 72, 252, t.sp); c.restore();
  const ar = c.createLinearGradient(72, 0, 440, 0); ar.addColorStop(0, line); ar.addColorStop(1, cardRgba(line, 0));
  c.fillStyle = ar; c.fillRect(72, 274, 368, 4);

  // hunter
  const nm = cardFit(c, d.hunter, 700, 38, 22, 660, 0.04);
  c.fillStyle = WHITE; cardSpaced(c, nm.text, 72, 336, nm.sp);
  c.fillStyle = MUTED; c.font = cardFont(700, 17); cardSpaced(c, `LEVEL ${d.level}  ·  ${d.hunterRank}-RANK HUNTER`, 72, 370, 5);

  // right panel: the grade, or the floor / wave where the hunter fell
  const px = 836, py = 128, pw = 292, ph = 252, cx = px + pw/2;
  let pLabel, pValue, pCol, pCap1 = '', pCap2 = '';
  if (d.kind === 'victory') { pLabel = d.grade ? 'GRADE' : 'CLEARED'; pValue = d.grade || d.rank; pCol = CARD_GRADE_COLORS[d.grade] || line; pCap1 = d.boss ? 'BOSS DEFEATED' : ''; pCap2 = d.boss.toUpperCase(); }
  else if (d.endless) { pLabel = 'FLOOR REACHED'; pValue = String(d.wave); pCol = accent; pCap1 = 'BEST FLOOR'; pCap2 = String(Math.max(d.bestFloor, d.wave)); }
  else { pLabel = 'FELL ON WAVE'; pValue = String(d.wave); pCol = accent; pCap1 = 'OF'; pCap2 = String(d.maxWaves); }
  c.fillStyle = 'rgba(2,4,10,0.58)'; c.fillRect(px, py, pw, ph);
  c.save(); c.shadowColor = pCol; c.shadowBlur = 20; c.strokeStyle = cardRgba(pCol, 0.75); c.lineWidth = 2; c.strokeRect(px+1, py+1, pw-2, ph-2); c.restore();
  c.strokeStyle = cardRgba(pCol, 0.16); c.lineWidth = 1; c.strokeRect(px+9.5, py+9.5, pw-19, ph-19);
  c.fillStyle = MUTED; c.font = cardFont(700, 15); cardSpaced(c, pLabel, cx, py+42, 8, 'center');
  if (pValue) {
    const v = cardFit(c, pValue, 900, 150, 56, pw-56);
    c.save(); c.fillStyle = pCol; c.shadowColor = pCol; c.shadowBlur = 30; cardSpaced(c, v.text, cx, py+121+v.px*0.36, 0, 'center'); c.restore();
  }
  if (pCap1) { c.fillStyle = MUTED; c.font = cardFont(700, 12); cardSpaced(c, pCap1, cx, py+ph-44, 6, 'center'); }
  if (pCap2) { const cp = cardFit(c, pCap2, 700, 19, 11, pw-44, 0.16); c.fillStyle = pCol; cardSpaced(c, cp.text, cx, py+ph-20, cp.sp, 'center'); }

  // stat band
  const bx = 72, by = 408, bw = CARD_W-144, bh = 104, cw = bw/4;
  c.fillStyle = 'rgba(2,4,10,0.93)'; c.fillRect(bx, by, bw, bh);
  c.fillStyle = cardRgba(line, 0.45); c.fillRect(bx, by, bw, 1.5); c.fillRect(bx, by+bh-1.5, bw, 1.5);
  const cells = [['TIME', d.time, WHITE], ['KILLS', String(d.kills), WHITE], ['BEST COMBO', d.combo + 'x', '#00d4ff'], ['GOLD', fmtNumCard(d.gold), '#ffd866']];
  cells.forEach(([label, value, col], i) => {
    const x = bx + i*cw + 28;
    if (i) { c.fillStyle = cardRgba(line, 0.22); c.fillRect(bx + i*cw, by+16, 1, bh-32); }
    c.fillStyle = MUTED; c.font = cardFont(700, 13); cardSpaced(c, label, x, by+34, 6);
    const f = cardFit(c, value, 900, 48, 24, cw-52);
    c.save(); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 9; cardSpaced(c, f.text, x, by+86, f.sp); c.restore();
  });

  // second row: loot, the shadow army, xp
  const items = [];
  if (d.lootCount) { items.push([['LOOT', String(d.lootCount), WHITE], ['BEST', (GEAR_RARITY[d.lootBest] || '').toUpperCase(), GEAR_COLORS[d.lootBest] || WHITE]]); }
  items.push([['SHADOW ARMY', String(d.shadows), '#bb88ff']]);
  items.push([['XP EARNED', fmtNumCard(d.xp), WHITE]]);
  let x = 72; const y2 = 552;
  items.forEach((group, gi) => {
    if (gi) { c.fillStyle = cardRgba(line, 0.3); c.fillRect(x + 22, y2-20, 1, 24); x += 46; }
    group.forEach(([label, value, col], i) => {
      if (i) x += 30;
      c.fillStyle = MUTED; c.font = cardFont(700, 13); x += cardSpaced(c, label, x, y2, 5) + 14;
      c.fillStyle = col; c.font = cardFont(900, 22); x += cardSpaced(c, value, x, y2, 2);
    });
  });

  // footer
  c.fillStyle = cardRgba(line, 0.2); c.fillRect(72, 572, CARD_W-144, 1);
  c.fillStyle = 'rgba(160,176,205,0.75)'; c.font = cardFont(700, 13);
  cardSpaced(c, d.date, 72, 596, 5); cardSpaced(c, 'cadidas333.github.io/Arise', CARD_W-72, 596, 3, 'right');
}

// Returns a 1200x630 canvas with the card on it, or null if there is nothing to show. Draws at once, so fonts that
// are still loading come out as monospace; prepareResultCard waits for them first.
function makeResultCard(kind, flat) {
  try {
    const d = cardData(kind);
    if (!d) return null;
    d.flat = !!flat;
    const cv = document.createElement('canvas'); cv.width = CARD_W; cv.height = CARD_H;
    const c = cv.getContext('2d'); if (!c) return null;
    cardPaint(c, d);
    cv.cardInfo = { name:d.fileName, text:d.shareText };
    return cv;
  } catch (e) { console.error('result card:', e); return null; }
}

// --- fonts, rendering, sharing ---
function cardFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const wait = Promise.all([document.fonts.ready, document.fonts.load('900 40px Orbitron'), document.fonts.load('700 16px Orbitron')]).catch(() => {});
  return Promise.race([wait, new Promise(r => setTimeout(r, 1500))]); // never hold the card for more than 1.5 s
}
function cardRender(kind) {
  return cardFonts().then(() => new Promise(resolve => {
    const done = (cv, blob) => {
      if (!blob) { resolve(null); return; }
      let file = null; try { file = new File([blob], cv.cardInfo.name, { type:'image/png' }); } catch (e) {}
      resolve({ kind, blob, file, name:cv.cardInfo.name, text:cv.cardInfo.text });
    };
    let cv = makeResultCard(kind); if (!cv) { resolve(null); return; }
    try { cv.toBlob(b => done(cv, b), 'image/png'); }
    catch (e) { // a tainted canvas (the page was opened from a file) cannot be read back: draw the card again without the painted floor
      try { cv = makeResultCard(kind, true); cv.toBlob(b => done(cv, b), 'image/png'); } catch (e2) { resolve(null); }
    }
  }));
}
// Called when the overlay opens: shows the button and makes the PNG ahead of time, so that pressing it can call
// navigator.share() in the same breath as the click (Safari and Chrome both require that).
function armResultCard(kind) {
  const btn = $(kind === 'death' ? 'death-share' : 'victory-share');
  if (!btn) return;
  const ok = kind === 'victory' || !!(dungeon && dungeon.endless);
  btn.style.display = ok ? '' : 'none'; btn.textContent = 'SAVE RESULT CARD';
  cardCache = null; const token = ++cardToken;
  if (!ok) return;
  cardRender(kind).then(item => { if (item && token === cardToken) cardCache = item; }).catch(() => {});
}
let cardNoteTimer = 0;
function cardNote(kind, text) { // the toast sits behind the full-screen overlay, so the button says it too
  const btn = $(kind === 'death' ? 'death-share' : 'victory-share');
  if (!btn) return;
  btn.textContent = text; clearTimeout(cardNoteTimer);
  cardNoteTimer = setTimeout(() => { btn.textContent = 'SAVE RESULT CARD'; }, 2600);
}
function cardFail(kind) {
  try { toast('COULD NOT SAVE THE RESULT CARD', 'red', 2500); } catch (e) {}
  cardNote(kind, 'COULD NOT SAVE');
}
function cardDownload(item) {
  try {
    const url = URL.createObjectURL(item.blob), a = document.createElement('a');
    a.href = url; a.download = item.name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    try { toast('RESULT CARD SAVED', 'blue', 2200); } catch (e) {}
    cardNote(item.kind, 'SAVED');
  } catch (e) { cardFail(item.kind); }
}
function cardSend(item) {
  try {
    if (item.file && navigator.share && navigator.canShare && navigator.canShare({ files:[item.file] })) {
      navigator.share({ files:[item.file], title:'ARISE', text:item.text })
        .catch(err => { if (!err || err.name !== 'AbortError') cardDownload(item); }); // closing the share sheet is not a failure
      return;
    }
  } catch (e) { /* refused: fall through to the download */ }
  cardDownload(item);
}
// Wired to the SAVE RESULT CARD buttons. Never throws.
function shareResultCard(kind) {
  try {
    if (cardCache && cardCache.kind === kind) { cardSend(cardCache); return; } // made ahead: the share starts inside this click
    if (cardBusy) return;
    cardBusy = true;
    cardRender(kind).then(item => { cardBusy = false; if (item) cardSend(item); else cardFail(kind); }).catch(() => { cardBusy = false; cardFail(kind); });
  } catch (e) { cardBusy = false; cardFail(kind); }
}
