'use strict';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.domElement.id = 'gl';
renderer.domElement.style.cssText = 'position:fixed; top:0; left:0; z-index:1; display:block;';
document.body.appendChild(renderer.domElement);

const _gameCanvas = document.getElementById('gameCanvas');
if (_gameCanvas) { _gameCanvas.style.display = 'block'; _gameCanvas.style.background = 'transparent'; _gameCanvas.style.zIndex = '2'; }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06060c);
scene.fog = new THREE.Fog(0x06060c, 900, 2600);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8); dirLight.position.set(0, 1000, 500); scene.add(dirLight);
const hunterLight = new THREE.PointLight((typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : 0x00d4ff, 1.8, 650); scene.add(hunterLight);
const camera3D = new THREE.PerspectiveCamera(50, 1, 10, 6000); scene.add(camera3D);
const hubImg3D = new Image(); hubImg3D.src = 'assets/bg/hub.webp';

// Orbit camera. The defaults reproduce the old fixed view exactly: 500 units away, 36.87 degrees up, looking along -z.
const view3D = window.view3D = { yaw: 0, pitch: Math.atan2(300, 400), dist: 500, drag: null };
const VIEW_DEFAULT = { yaw: 0, pitch: Math.atan2(300, 400), dist: 500 };

function canControlCamera() {
  return typeof gameState !== 'undefined' && gameState === 'DUNGEON' && (typeof paused === 'undefined' || !paused);
}

window.addEventListener('keydown', e => {
  if (e.key && e.key.toLowerCase() === 'v' && canControlCamera()) {
    view3D.yaw = VIEW_DEFAULT.yaw;
    view3D.pitch = VIEW_DEFAULT.pitch;
    view3D.dist = VIEW_DEFAULT.dist;
  }
});

window.addEventListener('mousedown', e => {
  if (e.button === 2 && canControlCamera()) {
    view3D.drag = { x: e.clientX, y: e.clientY, moved: 0 };
  }
});

window.addEventListener('mousemove', e => {
  if (view3D.drag) {
    if (!canControlCamera()) { view3D.drag = null; return; }
    const dx = e.clientX - view3D.drag.x, dy = e.clientY - view3D.drag.y;
    view3D.drag.x = e.clientX;
    view3D.drag.y = e.clientY;
    view3D.drag.moved += Math.hypot(dx, dy);
    view3D.yaw += dx * 0.006;
    view3D.pitch = Math.max(0.35, Math.min(1.25, view3D.pitch - dy * 0.004));
  }
});

window.addEventListener('mouseup', e => {
  if (e.button === 2 && view3D.drag) {
    const wasDodge = view3D.drag.moved < 6;
    view3D.drag = null;
    if (wasDodge && canControlCamera() && typeof dodge === 'function') dodge();
  }
});

window.addEventListener('wheel', e => {
  if (e.target === renderer.domElement || e.target === _gameCanvas) e.preventDefault();
  if (canControlCamera()) {
    view3D.dist *= Math.exp(e.deltaY * 0.0012);
    view3D.dist = Math.max(260, Math.min(900, view3D.dist));
  }
}, { passive: false });

// Touch: two fingers on the game view turn the camera (drag sideways) and zoom it (pinch).
// Only touches that began on the canvas count, so the joystick and the action buttons are never read as part of a gesture,
// and the hunter can keep moving on the joystick while two other fingers turn the view.
const viewTouch = { ids: null, x: 0, d: 0, told: false };
const onGameView = t => t.target === _gameCanvas || t.target === renderer.domElement;
function viewTouchUpdate(e) {
  let a = null, b = null, n = 0;
  for (let i = 0; i < e.touches.length; i++) {
    const t = e.touches[i];
    if (!onGameView(t)) continue;
    if (n === 0) a = t; else if (n === 1) b = t;
    n++;
  }
  if (n !== 2 || !canControlCamera()) { viewTouch.ids = null; return; }
  const x = (a.clientX + b.clientX) / 2, d = Math.max(24, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY));
  const ids = a.identifier + ':' + b.identifier;
  if (viewTouch.ids === ids) { // the same two fingers as last time: apply what changed
    view3D.yaw += (x - viewTouch.x) * 0.008;
    if (Math.abs(d - viewTouch.d) > 3) { // a few pixels of slack, so a plain sideways drag does not also zoom
      view3D.dist = Math.max(260, Math.min(900, view3D.dist * viewTouch.d / d));
      viewTouch.d = d;
    }
    if (e.cancelable) e.preventDefault();
  } else { viewTouch.ids = ids; viewTouch.d = d; }
  viewTouch.x = x;
}
for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) window.addEventListener(type, viewTouchUpdate, { passive: false });

const hintEl = document.querySelector('.hud-hint');
if (hintEl) hintEl.innerHTML += ' &nbsp;·&nbsp; Z / C TURN CAMERA &nbsp;·&nbsp; V RESET'
  + ((typeof isMobile !== 'undefined' && isMobile) ? ' &nbsp;·&nbsp; TWO FINGERS: TURN, PINCH: ZOOM' : '');


// Floor and walls
let currentGate = null, floorTexture = null, floorMesh = null;
let torchFlameMat3D = null, torchGlowMat3D = null, torchGlowTex3D = null;
const glowTex3D = () => torchGlowTex3D || (torchGlowTex3D = (() => { // a soft round falloff, made once; additive, so the black edge adds nothing
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#555555'); gr.addColorStop(1, '#000000'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})());
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.85 });
const wallMeshes = [], floorGroup = new THREE.Group();
scene.add(floorGroup);
let lastArenaW = 0, lastArenaH = 0, lastLine = '';
let lastFloorKey = '', lastLayoutRef = null;
const layoutMeshes = []; // floor pieces, door bars and the exit light of a layout

function clearFloorAndWalls() {
  if (floorMesh) { floorGroup.remove(floorMesh); floorMesh.geometry.dispose(); floorMesh = null; }
  while (wallMeshes.length) { const wm = wallMeshes.pop(); floorGroup.remove(wm); wm.geometry.dispose(); wm.material.dispose(); }
  while (layoutMeshes.length) { const m = layoutMeshes.pop(); floorGroup.remove(m); m.geometry.dispose(); if (m.material !== floorMaterial) m.material.dispose(); if (m.isInstancedMesh) m.dispose(); } // the dressing is rebuilt with every door and wave, so free its instance buffers too
  torchFlameMat3D = null;
  torchGlowMat3D = null;
}

function rebuildFloorAndWalls(w, h, line) {
  lastArenaW = w; lastArenaH = h; lastLine = line;
  clearFloorAndWalls();

  const fg = new THREE.PlaneGeometry(w, h); fg.rotateX(-Math.PI / 2);
  floorMesh = new THREE.Mesh(fg, floorMaterial); floorGroup.add(floorMesh);
  if (floorTexture) floorTexture.repeat.set(w / 384, h / 384);

  const wallMat = new THREE.MeshBasicMaterial({ color: line, transparent: true, opacity: 0.65 });
  const wallH = 30, t = 2, hw = w / 2, hh = h / 2;
  const walls = [
    [w, wallH, t, 0, wallH / 2, -hh], [w, wallH, t, 0, wallH / 2, hh],
    [t, wallH, h, -hw, wallH / 2, 0], [t, wallH, h, hw, wallH / 2, 0]
  ];
  for (const [bw, bh, bd, px, py, pz] of walls) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wallMat);
    m.position.set(px, py, pz); floorGroup.add(m); wallMeshes.push(m);
  }
}

// A flat floor piece over the world rectangle (x0,y0)-(x1,y1), textured in world units so neighbouring pieces line up
function floorPiece(x0, y0, x1, y1) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (y0 + y1) / 2);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 384, -pos.getZ(i) / 384);
  uv.needsUpdate = true;
  const m = new THREE.Mesh(g, floorMaterial); floorGroup.add(m); layoutMeshes.push(m);
}

// Rooms and corridors: a floor piece per rectangle, a wall box per outline segment, a bar across each shut door, a slab of light at the exit
function rebuildLayout3D(line) {
  clearFloorAndWalls();
  const L = layout;
  if (floorTexture) floorTexture.repeat.set(1, 1);
  for (const r of L.rooms) floorPiece(r.x0, r.y0, r.x1, r.y1);
  for (const h of L.halls) { // only the part of a hall that lies outside the rooms, so two floors never share the same spot
    let x0 = h.x0, y0 = h.y0, x1 = h.x1, y1 = h.y1;
    for (const r of L.rooms) {
      if (r.x1 <= x0 || r.x0 >= x1 || r.y1 <= y0 || r.y0 >= y1) continue;
      if (r.x0 <= h.x0 && r.x1 >= h.x1) { if (r.y0 <= y0) y0 = Math.max(y0, r.y1); else y1 = Math.min(y1, r.y0); } // the hall runs north-south
      else { if (r.x0 <= x0) x0 = Math.max(x0, r.x1); else x1 = Math.min(x1, r.x0); }                               // the hall runs east-west
    }
    if (x1 > x0 && y1 > y0) floorPiece(x0, y0, x1, y1);
  }

  const WT = 30, WH = 70;
  const edgeMat = new THREE.MeshBasicMaterial({ color: line, transparent: true, opacity: 0.35 });
  const northEdgeMat = new THREE.MeshBasicMaterial({ color: line, transparent: true, opacity: 0.6 });
  for (const s of L.walls) {
    const horiz = s.y0 === s.y1, len = horiz ? Math.abs(s.x1 - s.x0) : Math.abs(s.y1 - s.y0);
    let nx = 0, nz = 0;
    if (horiz) {
      const mx = (s.x0 + s.x1) / 2, my = s.y0;
      nz = !inMap(mx, my - 6) ? -1 : 1;
    } else {
      const mx = s.x0, my = (s.y0 + s.y1) / 2;
      nx = !inMap(mx - 6, my) ? -1 : 1;
    }
    const mx = (s.x0 + s.x1) / 2 + nx * (WT / 2);
    const mz = (s.y0 + s.y1) / 2 + nz * (WT / 2);
    const bw = horiz ? len + 2 * WT : WT;
    const bd = horiz ? WT : len + 2 * WT;

    const wm = new THREE.Mesh(new THREE.BoxGeometry(bw, WH, bd), new THREE.MeshLambertMaterial({ color: 0x1a1a24, transparent: true, opacity: 0.95 }));
    wm.position.set(mx, WH / 2, mz);
    wm.userData.nx = nx;
    wm.userData.nz = nz;
    floorGroup.add(wm);
    wallMeshes.push(wm);

    const isNorth = (nz === -1);
    const topM = new THREE.Mesh(new THREE.BoxGeometry(bw, 2, bd), isNorth ? northEdgeMat : edgeMat);
    topM.position.set(mx, WH + 1, mz);
    floorGroup.add(topM);
    layoutMeshes.push(topM);
  }

  const danger = (typeof COLORS !== 'undefined' && COLORS.danger) ? COLORS.danger : '#ff3344';
  const primary = (typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : '#00d4ff';
  const next = L.lock < 0 ? L.doors[2 * (dungeon.wave - 1)] : null; // the door the hunter should go through next
  for (const d of L.doors) {
    const shut = d.room === L.lock;
    if (!shut && d !== next) continue;
    const horiz = d.y0 === d.y1, len = horiz ? Math.abs(d.x1 - d.x0) : Math.abs(d.y1 - d.y0), hgt = shut ? 34 : 1.5, th = shut ? 6 : 10;
    const mat = new THREE.MeshBasicMaterial({ color: shut ? danger : primary, transparent: true, opacity: shut ? 0.85 : 0.7 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(horiz ? len : th, hgt, horiz ? th : len), mat);
    m.position.set((d.x0 + d.x1) / 2, hgt / 2 + 0.5, (d.y0 + d.y1) / 2); floorGroup.add(m); layoutMeshes.push(m);
  }

  const open = dungeon.wave >= dungeon.maxWaves;
  const ember = (dungeon.gate && dungeon.gate.theme && dungeon.gate.theme.ember) ? dungeon.gate.theme.ember : '#ffcc66';
  const sd = L.doors[L.doors.length - 1], eastward = sd.x0 === sd.x1; // the stub's door is a north-south segment when the stub runs east
  const em = new THREE.Mesh(new THREE.BoxGeometry(eastward ? 10 : 84, 150, eastward ? 84 : 10),
    new THREE.MeshBasicMaterial({ color: ember, transparent: true, opacity: open ? 0.5 : 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
  em.position.set(L.exit.x, 75, L.exit.y); floorGroup.add(em); layoutMeshes.push(em);

  const dc = L.decor || (L.decor = buildLayoutDecor(L));

  // Pilasters and torches
  if (dc.pil && dc.pil.length) {
    const pilCount = dc.pil.length;
    const pilGeo = new THREE.BoxGeometry(1, 1, 1);
    const pilMat = new THREE.MeshLambertMaterial({ color: 0x2a2a38 });
    const pilMesh = new THREE.InstancedMesh(pilGeo, pilMat, pilCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pilCount; i++) {
      const p = dc.pil[i];
      dummy.position.set(p.x, (WH - 4) / 2, p.y + 4);
      dummy.scale.set(18, WH - 4, 8);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      pilMesh.setMatrixAt(i, dummy.matrix);
    }
    pilMesh.instanceMatrix.needsUpdate = true;
    floorGroup.add(pilMesh);
    layoutMeshes.push(pilMesh);

    const torches = dc.pil.filter(p => p.torch);
    if (torches.length) {
      const tCount = torches.length;
      const bktGeo = new THREE.BoxGeometry(4, 10, 6);
      const bktMat = new THREE.MeshLambertMaterial({ color: 0x14141c });
      const bktMesh = new THREE.InstancedMesh(bktGeo, bktMat, tCount);

      const flameGeo = new THREE.ConeGeometry(4, 12, 6);
      torchFlameMat3D = new THREE.MeshBasicMaterial({ color: ember, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      const flameMesh = new THREE.InstancedMesh(flameGeo, torchFlameMat3D, tCount);

      const glowGeo = new THREE.PlaneGeometry(60, 60);
      torchGlowMat3D = new THREE.MeshBasicMaterial({ color: ember, map: glowTex3D(), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
      const glowMesh = new THREE.InstancedMesh(glowGeo, torchGlowMat3D, tCount);

      for (let i = 0; i < tCount; i++) {
        const p = torches[i];
        dummy.position.set(p.x, 44, p.y + 10);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        bktMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.set(p.x, 55, p.y + 10);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        flameMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.set(p.x, 55, p.y + 10.5);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        glowMesh.setMatrixAt(i, dummy.matrix);
      }
      bktMesh.instanceMatrix.needsUpdate = true;
      flameMesh.instanceMatrix.needsUpdate = true;
      glowMesh.instanceMatrix.needsUpdate = true;
      floorGroup.add(bktMesh); layoutMeshes.push(bktMesh);
      floorGroup.add(flameMesh); layoutMeshes.push(flameMesh);
      floorGroup.add(glowMesh); layoutMeshes.push(glowMesh);
    }
  }

  // Rubble
  let totalStones = 0;
  for (const rd of dc.rooms) {
    if (rd.rubble) totalStones += (rd.rubble.length / 8) | 0;
  }
  if (totalStones > 0) {
    const rubGeo = new THREE.BoxGeometry(1, 1, 1);
    const rubMat = new THREE.MeshLambertMaterial({ color: 0x24242e });
    const rubMesh = new THREE.InstancedMesh(rubGeo, rubMat, totalStones);
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (const rd of dc.rooms) {
      const rb = rd.rubble;
      if (!rb) continue;
      for (let i = 0; i < rb.length; i += 8) {
        const x0 = rb[i], y0 = rb[i + 1], x1 = rb[i + 2], y1 = rb[i + 3];
        const x2 = rb[i + 4], y2 = rb[i + 5], x3 = rb[i + 6], y3 = rb[i + 7];
        const cx = (x0 + x1 + x2 + x3) / 4;
        const cz = (y0 + y1 + y2 + y3) / 4;
        const spreadX = Math.max(x0, x1, x2, x3) - Math.min(x0, x1, x2, x3);
        const spreadZ = Math.max(y0, y1, y2, y3) - Math.min(y0, y1, y2, y3);
        const w = Math.max(spreadX, spreadZ);
        const h = 3 + w * 0.35;
        const ang = Math.atan2(y1 - y0, x1 - x0);
        dummy.position.set(cx, h / 2, cz);
        dummy.scale.set(w, h, w);
        dummy.rotation.set(0, ang, 0);
        dummy.updateMatrix();
        rubMesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    rubMesh.instanceMatrix.needsUpdate = true;
    floorGroup.add(rubMesh);
    layoutMeshes.push(rubMesh);
  }

  // Cracks
  const crackPos = [];
  for (const rd of dc.rooms) {
    if (!rd.cracks) continue;
    for (const pts of rd.cracks) {
      for (let j = 0; j < pts.length - 2; j += 2) {
        crackPos.push(pts[j], 0.4, pts[j + 1], pts[j + 2], 0.4, pts[j + 3]);
      }
    }
  }
  if (crackPos.length > 0) {
    const crackGeo = new THREE.BufferGeometry();
    crackGeo.setAttribute('position', new THREE.Float32BufferAttribute(crackPos, 3));
    const crackMat = new THREE.LineBasicMaterial({ color: 0x050508, transparent: true, opacity: 0.4 });
    const crackMesh = new THREE.LineSegments(crackGeo, crackMat);
    floorGroup.add(crackMesh);
    layoutMeshes.push(crackMesh);
  }

  // Inlays
  const inlayPos = [];
  for (const rd of dc.rooms) {
    if (!rd.inlay) continue;
    for (let k = 0; k < 2; k++) {
      const arr = rd.inlay[k];
      if (!arr) continue;
      for (let j = 0; j < arr.length; j += 4) {
        inlayPos.push(arr[j], 0.4, arr[j + 1], arr[j + 2], 0.4, arr[j + 3]);
      }
    }
  }
  if (inlayPos.length > 0) {
    const inlayGeo = new THREE.BufferGeometry();
    inlayGeo.setAttribute('position', new THREE.Float32BufferAttribute(inlayPos, 3));
    const inlayMat = new THREE.LineBasicMaterial({ color: line, transparent: true, opacity: 0.22 });
    const inlayMesh = new THREE.LineSegments(inlayGeo, inlayMat);
    floorGroup.add(inlayMesh);
    layoutMeshes.push(inlayMesh);
  }

  // Runners
  const runnerPos = [];
  if (dc.runners) {
    for (const r of dc.runners) {
      const s = r.s;
      if (!s || s.length < 8) continue;
      runnerPos.push(s[0], 0.4, s[1], s[2], 0.4, s[3]);
      runnerPos.push(s[4], 0.4, s[5], s[6], 0.4, s[7]);
    }
  }
  if (runnerPos.length > 0) {
    const runnerGeo = new THREE.BufferGeometry();
    runnerGeo.setAttribute('position', new THREE.Float32BufferAttribute(runnerPos, 3));
    const runnerMat = new THREE.LineBasicMaterial({ color: line, transparent: true, opacity: 0.18 });
    const runnerMesh = new THREE.LineSegments(runnerGeo, runnerMat);
    floorGroup.add(runnerMesh);
    layoutMeshes.push(runnerMesh);
  }
}

const floorTexCache = {};
function warmFloor(url) {
  if (floorTexCache[url]) return;
  new THREE.TextureLoader().load(url, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    floorTexCache[url] = tex;
  });
}
if (typeof GATE_DEFS !== 'undefined') {
  GATE_DEFS.forEach(g => warmFloor('assets/floors/' + (g.floor || g.id) + '.webp'));
}

function buildFloor(g) {
  currentGate = g;
  floorMaterial.map = null; floorMaterial.color.set(0x111118); floorMaterial.needsUpdate = true;
  const url = 'assets/floors/' + (g.floor || g.id) + '.webp';
  if (floorTexCache[url]) {
    const tex = floorTexCache[url];
    floorTexture = tex;
    const w = typeof arenaW !== 'undefined' ? arenaW : 1400;
    const h = typeof arenaH !== 'undefined' ? arenaH : 1000;
    if (typeof layout !== 'undefined' && layout) tex.repeat.set(1, 1); else tex.repeat.set(w / 384, h / 384);
    tex.needsUpdate = true;
    floorMaterial.map = tex; floorMaterial.color.set(0xffffff); floorMaterial.needsUpdate = true;
    return;
  }
  new THREE.TextureLoader().load(url, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    floorTexCache[url] = tex;
    floorTexture = tex;
    const w = typeof arenaW !== 'undefined' ? arenaW : 1400;
    const h = typeof arenaH !== 'undefined' ? arenaH : 1000;
    if (typeof layout !== 'undefined' && layout) tex.repeat.set(1, 1); else tex.repeat.set(w / 384, h / 384);
    floorMaterial.map = tex; floorMaterial.color.set(0xffffff); floorMaterial.needsUpdate = true;
  }, undefined, () => {
    floorTexture = null; floorMaterial.map = null; floorMaterial.color.set(0x111118); floorMaterial.needsUpdate = true;
  });
}

// ================================================================
//  FIGURES — the hunter, the six enemy kinds, the six bosses and the shadow soldiers, all built from primitives
// ================================================================
// A figure type is built once as a template: named bones (Groups) carrying unit primitives, each placed, scaled and tagged with
// a material role. The parts on a bone are then merged into one geometry per role, and every instance is a clone that shares
// those geometries. Materials come from palettes (role -> material) cached by colour, so a hit flash, an enraged boss or a
// shadow soldier is a palette swap and never an allocation.
// Unit space: 1 = the 2D radius (e.size); feet on y = 0; a figure faces +z and its left hand is on +x.
// Everything sits inside one function so its short helper names (B, P, S...) stay out of the scope the game scripts share.
// Art rule: plain bodies, armour, blades and flame only. No star shapes, no runes or glyph-like marks, no crosses, no halos,
// nothing occult or religious. Keep it that way when adding to a figure.
const hunterGroup = new THREE.Group(); scene.add(hunterGroup);

const Fig = (function () {
  const geo = {}, mats = {}, pals = {}, templates = {};
  const PI = Math.PI, UP = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), WHITE = new THREE.Color(0xffffff), BLACK = new THREE.Color(0x000000);
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const ease = (dt, rate) => dt > 0 ? Math.min(1, dt * rate) : 1; // how far a smoothed value moves this frame

  // ---- Unit primitives (diameter 1, height 1), made on first use ----
  const G = (k, make) => geo[k] || (geo[k] = make());
  const box = () => G('box', () => new THREE.BoxGeometry(1, 1, 1));
  const sph = () => G('sph', () => new THREE.SphereGeometry(0.5, 12, 8));
  const dome = () => G('dome', () => new THREE.SphereGeometry(0.5, 12, 4, 0, PI * 2, 0, PI / 2));
  const cyl = (top = 1, seg = 10) => G('cyl' + top + ':' + seg, () => new THREE.CylinderGeometry(0.5 * top, 0.5, 1, seg)); // top: the upper radius as a share of the lower
  const cone = (seg = 8) => G('cone' + seg, () => new THREE.ConeGeometry(0.5, 1, seg));
  const slab = top => G('slab' + top, () => new THREE.CylinderGeometry(0.7071 * top, 0.7071, 1, 4).rotateY(PI / 4)); // square in section, side 1 at the base
  const torus = (tube = 0.04, arc = PI * 2) => G('tor' + tube + ':' + arc, () => new THREE.TorusGeometry(0.5, tube, 5, 18, arc));
  // A dragon's wing as a flat fan: four ribs, the skin scalloped between them. s = 1 for the left wing, -1 for the right
  const WING_RIBS = [[-0.45, 1.5], [0.17, 1.6], [0.79, 1.4], [1.41, 1.05]]; // [angle back from straight out, length]
  const wingSkin = s => G('wing' + s, () => {
    const edge = [], v = [];
    WING_RIBS.forEach(([a, len], i) => {
      if (i) { const p = WING_RIBS[i - 1], am = (p[0] + a) / 2, lm = (p[1] + len) / 2 * 0.76; edge.push([Math.cos(am) * lm * s, -Math.sin(am) * lm]); }
      edge.push([Math.cos(a) * len * s, -Math.sin(a) * len]);
    });
    for (let i = 0; i + 1 < edge.length; i++) v.push(0, 0, 0, edge[i][0], 0, edge[i][1], edge[i + 1][0], 0, edge[i + 1][1]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3)); g.computeVertexNormals();
    return g;
  });

  // ---- Building: bones and parts ----
  function B(parent, name, x, y, z) {
    const g = new THREE.Group(); g.name = name || ''; g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g;
  }
  // One primitive on a bone: size, then position, then an optional turn (radians about x, y, z)
  function P(bone, geometry, role, sx, sy, sz, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geometry, null);
    m.userData.role = role; m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
    bone.add(m); return m;
  }
  // A limb section from a to b; top < 1 tapers it towards b
  function seg(bone, role, ax, ay, az, bx, by, bz, thick, top) {
    const m = P(bone, cyl(top || 1, 8), role, thick, 1, thick, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    dir.set(bx - ax, by - ay, bz - az); m.scale.y = dir.length(); m.quaternion.setFromUnitVectors(UP, dir.normalize());
    return m;
  }
  function merge(parts) {
    const list = []; let n = 0;
    for (const m of parts) {
      m.updateMatrix();
      let g = m.geometry.clone().applyMatrix4(m.matrix);
      if (g.index) g = g.toNonIndexed();
      list.push(g); n += g.attributes.position.count;
    }
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    for (const g of list) { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.count * 3; }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return out;
  }
  // Merge the parts on every bone into one mesh per material role
  function bake(root) {
    const bones = [];
    root.traverse(o => { if (!o.isMesh) bones.push(o); });
    for (const bone of bones) {
      const byRole = {};
      for (const c of bone.children.slice()) if (c.isMesh) { (byRole[c.userData.role] || (byRole[c.userData.role] = [])).push(c); bone.remove(c); }
      for (const role in byRole) { const m = new THREE.Mesh(merge(byRole[role]), null); m.userData.role = role; bone.add(m); }
    }
    return root;
  }
  // Like Object3D.clone(), without a throwaway geometry and material for every mesh
  function copy(src) {
    const dst = src.isMesh ? new THREE.Mesh(src.geometry, null) : new THREE.Group();
    if (src.isMesh) dst.userData.role = src.userData.role;
    else { dst.name = src.name; dst.rotation.order = src.rotation.order; dst.position.copy(src.position); dst.quaternion.copy(src.quaternion); dst.scale.copy(src.scale); }
    for (const c of src.children) dst.add(copy(c));
    return dst;
  }

  // ---- Materials and palettes ----
  // flags: 'g' = ghostly (a little see-through, for shadow soldiers), 'd' = both faces drawn (wing skin)
  function mat(color, glow, power, rough, flags) {
    const key = color + '|' + (glow || 0) + '|' + (power || 0) + '|' + (rough || 0) + '|' + (flags || '');
    let m = mats[key];
    if (!m) {
      m = mats[key] = new THREE.MeshStandardMaterial({ color, emissive: glow || 0, emissiveIntensity: power || 0, roughness: rough || 0.65, metalness: 0 });
      if (flags && flags.indexOf('g') >= 0) { m.transparent = true; m.opacity = 0.86; }
      if (flags && flags.indexOf('d') >= 0) m.side = THREE.DoubleSide;
      m.userData.shared = true;
    }
    return m;
  }
  // Light laid on the floor under elites, bosses and shadows; soft = fading to nothing at the rim
  let glowMap = null;
  function auraMat(color, opacity, soft) {
    const key = 'aura|' + color + '|' + opacity + '|' + (soft ? 1 : 0);
    if (!mats[key]) {
      if (soft && !glowMap) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 64;
        const c2 = cv.getContext('2d'), gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#666666'); gr.addColorStop(1, '#000000');
        c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
        glowMap = new THREE.CanvasTexture(cv);
      }
      mats[key] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, map: soft ? glowMap : null });
      mats[key].userData.shared = true;
    }
    return mats[key];
  }
  const lighten = (hex, k) => new THREE.Color(hex).lerp(WHITE, k).getHex();
  const darken = (hex, k) => new THREE.Color(hex).lerp(BLACK, k).getHex();
  // A body colour for lit surfaces: very bright colours are held back, or the lit faces burn out and the shape goes flat
  const tone = hex => { const c = new THREE.Color(hex), m = Math.max(c.r, c.g, c.b); return m > 0.76 ? c.multiplyScalar(0.76 / m).getHex() : c.getHex(); };
  function enemyPal(color, elite, wind) { // wind: the pale blink of a wind-up
    const key = 'e' + color + (elite ? 'E' : '') + (wind ? 'W' : '');
    if (pals[key]) return pals[key];
    const c = tone(color), lt = lighten(c, 0.4), leg = darken(c, 0.4), b = wind ? 0xffe0cc : c, eye = elite ? 0xffdd66 : 0xff8844;
    return (pals[key] = {
      body: mat(b, b, wind ? 0.6 : 0.14), limb: mat(leg, leg, 0.16), dark: mat(0x15151f), light: mat(lt, lt, 0.12), trim: mat(lt, lt, 0.12), eye: mat(eye, eye, 1.2),
      elite: mat(0xffcc55, 0xcc8800, 0.5, 0.4), steel: mat(0xc0c5d6, 0x30364a, 0.3, 0.4), glow: mat(lt, c, 1.4), fuse: mat(0xffd27a, 0xff7a11, wind ? 2.2 : 1.3),
      aura: auraMat(0xffcc66, 0.5),
    });
  }
  function bossPal(color, mode) { // mode: '' | 'W' wind-up blink | 'R' enraged
    const key = 'b' + color + mode;
    if (pals[key]) return pals[key];
    const c = tone(color), lt = lighten(c, 0.4), leg = darken(c, 0.4), hot = mode === 'R';
    const trim = mat(lt, hot ? 0xff6633 : lt, hot ? 0.35 : 0.12);
    return (pals[key] = {
      body: mode === 'W' ? mat(0xffe0cc, 0xffe0cc, 0.6) : mat(c, hot ? 0xff3311 : c, hot ? 0.5 : 0.12),
      limb: mat(leg, hot ? 0xff3311 : leg, hot ? 0.4 : 0.16), dark: mat(0x0e0e16), light: trim, trim, steel: trim, elite: trim, eye: mat(hot ? 0xffee66 : 0xff3344, hot ? 0xffee66 : 0xff3344, 1.4),
      flame: mat(0xff5510, 0xff4400, hot ? 1.5 : 1.0), glow: mat(0xff5510, 0xff4400, 1.0), fuse: mat(0xff5510, 0xff4400, 1.0),
      wing: mat(darken(c, 0.3), hot ? 0xff3311 : c, hot ? 0.4 : 0.1, 0.7, 'd'), aura: auraMat(hot ? 0xff2222 : 0xff4455, 0.6),
    });
  }
  function shadowPal(berserk) { // dark violet, glowing softly, a little see-through; brighter while the legion is unleashed
    const key = berserk ? 's1' : 's0';
    if (pals[key]) return pals[key];
    const edge = mat(berserk ? 0xdd77ff : 0x8855dd, berserk ? 0xdd77ff : 0x8855dd, 0.7, 0.5, 'g'), lit = mat(0xbb88ff, 0xbb66ff, 1.3, 0.5, 'g');
    return (pals[key] = {
      body: mat(berserk ? 0x2a0a3e : 0x1a0a2e, 0x8844ff, berserk ? 0.85 : 0.42, 0.6, 'g'), limb: mat(0x140822, 0x6633cc, berserk ? 0.7 : 0.36, 0.6, 'g'), dark: mat(0x0a0414, 0x5522aa, 0.25, 0.6, 'g'),
      light: edge, trim: edge, steel: edge, elite: edge, eye: mat(berserk ? 0xff66ff : 0xcc99ff, berserk ? 0xff66ff : 0xcc99ff, 1.4),
      glow: lit, fuse: lit, flame: lit, wing: mat(berserk ? 0x2a0a3e : 0x1a0a2e, 0x8844ff, berserk ? 0.85 : 0.42, 0.6, 'gd'),
      aura: auraMat(berserk ? 0xcc44ff : 0x8844ff, berserk ? 0.6 : 0.4, true),
    });
  }
  let flashP = null;
  function flashPal() { // struck: the whole figure goes white for an instant
    if (!flashP) { const w = mat(0xffffff, 0xffffff, 1); flashP = { body: w, wing: mat(0xffffff, 0xffffff, 1, 0, 'd'), aura: auraMat(0xffffff, 0.5) }; }
    return flashP;
  }
  function setPal(fig, pal) {
    const ud = fig.userData;
    if (ud.pal === pal) return;
    ud.pal = pal;
    for (const m of ud.meshes) m.material = pal[m.userData.role] || pal.body;
  }

  // ---- The six enemy kinds ----
  const KINDS = {
    // A soldier: horned head, a round shield on the off arm, a heavy chopping blade in the weapon arm
    melee(root) {
      const body = B(root, 'body', 0, 0.85, 0), legL = B(root, 'legL', 0.27, 0.85, 0), legR = B(root, 'legR', -0.27, 0.85, 0);
      for (const leg of [legL, legR]) { P(leg, cyl(0.8), 'limb', 0.36, 0.85, 0.36, 0, -0.42, 0); P(leg, box(), 'limb', 0.36, 0.16, 0.56, 0, -0.77, 0.1); }
      P(body, cyl(1.4), 'body', 0.74, 1.0, 0.52, 0, 0.5, 0);                       // torso, wider at the shoulders
      P(body, cyl(), 'dark', 0.82, 0.14, 0.6, 0, 0.06, 0);                         // belt
      P(body, sph(), 'body', 0.64, 0.62, 0.62, 0, 1.4, 0.03);                      // head
      for (const s of [1, -1]) {
        P(body, cone(), 'light', 0.2, 0.52, 0.2, s * 0.27, 1.77, 0, 0, 0, -s * 0.45); // horns
        P(body, sph(), 'eye', 0.13, 0.13, 0.13, s * 0.14, 1.44, 0.3);
        P(body, dome(), 'elite', 0.58, 0.46, 0.58, s * 0.56, 0.9, 0);              // elite: gold shoulder plates
      }
      P(body, cyl(), 'elite', 0.86, 0.1, 0.64, 0, 0.16, 0);                        // elite: gold belt
      P(body, cyl(), 'body', 0.26, 0.8, 0.26, 0.6, 0.56, 0.04, -0.2, 0, 0.12);     // off arm
      P(body, cyl(1, 12), 'light', 0.86, 0.07, 0.86, 0.8, 0.5, 0.16, 0, 0, PI / 2); // round shield
      P(body, sph(), 'dark', 0.26, 0.26, 0.26, 0.84, 0.5, 0.16);
      const arm = B(body, 'armR', -0.6, 0.94, 0);
      P(arm, cyl(), 'body', 0.26, 0.8, 0.26, 0, -0.4, 0); P(arm, sph(), 'dark', 0.3, 0.3, 0.3, 0, -0.84, 0);
      P(arm, box(), 'steel', 0.07, 0.36, 0.9, 0, -0.84, 0.6); P(arm, cone(4), 'steel', 0.07, 0.34, 0.36, 0, -0.84, 1.22, PI / 2); // the blade and its point
    },
    // An archer: hooded and slim, a quiver on the back, a bow held out in front
    ranged(root) {
      const body = B(root, 'body', 0, 0.9, 0), legL = B(root, 'legL', 0.2, 0.9, 0), legR = B(root, 'legR', -0.2, 0.9, 0);
      for (const leg of [legL, legR]) { P(leg, cyl(0.8), 'limb', 0.28, 0.9, 0.28, 0, -0.45, 0); P(leg, box(), 'limb', 0.28, 0.14, 0.5, 0, -0.83, 0.09); }
      P(body, cyl(1.25), 'body', 0.6, 0.95, 0.44, 0, 0.48, 0);                     // slim torso
      P(body, cyl(0.55), 'body', 0.98, 0.36, 0.74, 0, 0.86, 0);                    // short mantle over the shoulders
      P(body, sph(), 'body', 0.62, 0.62, 0.64, 0, 1.36, 0);                        // hood
      P(body, cone(), 'body', 0.46, 0.5, 0.46, 0, 1.68, -0.14, -0.6, 0, 0);        // its peak, tipped back
      P(body, sph(), 'dark', 0.46, 0.46, 0.4, 0, 1.33, 0.16);                      // the face in shadow
      for (const s of [1, -1]) { P(body, sph(), 'eye', 0.11, 0.11, 0.11, s * 0.11, 1.37, 0.35); P(body, dome(), 'elite', 0.42, 0.34, 0.46, s * 0.38, 0.98, 0); }
      P(body, cyl(), 'elite', 0.66, 0.1, 0.5, 0, 0.1, 0);
      P(body, cyl(), 'dark', 0.22, 0.78, 0.22, -0.14, 0.6, -0.34, 0, 0, 0.4);      // quiver across the back
      P(body, cyl(), 'trim', 0.26, 0.08, 0.26, -0.29, 0.96, -0.34, 0, 0, 0.4);
      P(body, cyl(), 'body', 0.2, 0.62, 0.2, -0.42, 0.62, -0.06, 0.5, 0, 0);       // draw arm, elbow back
      seg(body, 'body', 0.4, 0.86, 0.02, 0.44, 0.84, 0.66, 0.2);                   // bow arm, reaching forward
      const bow = B(body, 'bow', 0.44, 0.84, 0.72);
      P(bow, torus(0.06, PI), 'trim', 1.7, 0.9, 1, 0, 0, 0, 0, PI / 2, PI / 2);    // the bow: tips up and down, belly forward
      P(bow, cyl(1, 4), 'light', 0.03, 1.7, 0.03, 0, 0, 0);                        // string
      const arrow = B(bow, 'arrow', 0, 0, 0);
      P(arrow, cyl(1, 4), 'light', 0.04, 0.95, 0.04, 0, 0, 0.32, PI / 2); P(arrow, cone(4), 'steel', 0.12, 0.22, 0.12, 0, 0, 0.88, PI / 2);
    },
    // A caster: robe to the floor, hooded, hands raised under an orb that floats in front
    caster(root) {
      const body = B(root, 'body', 0, 0, 0), orb = B(root, 'orb', 0, 1.62, 0.98), orbit = B(orb, 'orbit', 0, 0, 0);
      P(body, cyl(0.42), 'body', 1.3, 1.8, 1.3, 0, 0.9, 0);                        // robe
      P(body, cyl(), 'trim', 1.36, 0.1, 1.36, 0, 0.06, 0);                         // hem
      P(body, cyl(0.6), 'trim', 1.0, 0.3, 0.9, 0, 1.78, 0);                        // mantle
      P(body, sph(), 'body', 0.74, 0.74, 0.76, 0, 2.2, -0.02);                     // hood
      P(body, sph(), 'dark', 0.54, 0.54, 0.46, 0, 2.17, 0.18);
      for (const s of [1, -1]) {
        P(body, sph(), 'eye', 0.11, 0.11, 0.11, s * 0.12, 2.2, 0.4);
        seg(body, 'body', s * 0.42, 1.72, 0.05, s * 0.34, 1.4, 0.72, 0.26, 1.5);   // sleeves, wide at the cuff
        P(body, sph(), 'dark', 0.2, 0.2, 0.2, s * 0.34, 1.38, 0.76);
      }
      P(body, torus(0.07), 'elite', 0.8, 0.8, 1, 0, 1.96, 0, PI / 2);              // elite: gold collar and hem
      P(body, cyl(), 'elite', 1.4, 0.1, 1.4, 0, 0.2, 0);
      P(orb, sph(), 'glow', 0.44, 0.44, 0.44, 0, 0, 0);
      for (let i = 0; i < 3; i++) P(orbit, sph(), 'glow', 0.1, 0.1, 0.1, Math.cos(i * 2.094) * 0.42, 0, Math.sin(i * 2.094) * 0.42);
    },
    // A charger: low and four-legged, a wedge head with tusks, plates down the spine
    charger(root) {
      const body = B(root, 'body', 0, 0.78, 0), legs = [B(root, 'legsA', 0, 0, 0), B(root, 'legsB', 0, 0, 0)];
      P(body, sph(), 'body', 0.95, 0.85, 1.75, 0, 0, -0.1);                        // barrel
      P(body, sph(), 'body', 1.08, 1.02, 1.0, 0, 0.1, 0.45);                       // heavy shoulders
      P(body, cone(), 'body', 0.66, 0.9, 0.6, 0, 0, 1.2, PI / 2);                  // wedge head
      P(body, box(), 'dark', 0.36, 0.1, 0.5, 0, -0.2, 1.1);                        // jaw
      for (const s of [1, -1]) { P(body, cone(), 'light', 0.13, 0.5, 0.13, s * 0.3, 0.1, 1.28, 1.0); P(body, sph(), 'eye', 0.12, 0.12, 0.12, s * 0.18, 0.14, 1.05); }
      [0.58, 0.5, 0.45, 0.38].forEach((y, i) => { P(body, cone(4), 'trim', 0.14, 0.34, 0.34, 0, y, 0.45 - i * 0.4); P(body, cone(4), 'elite', 0.2, 0.42, 0.4, 0, y + 0.03, 0.45 - i * 0.4); });
      P(body, torus(0.08), 'elite', 1.1, 1.04, 1, 0, 0.08, 0.8);                   // elite: gold collar (and gold spine plates)
      P(body, cone(), 'dark', 0.2, 0.75, 0.2, 0, 0.2, -1.2, -1.2);                 // tail
      [[1, 0.55], [-1, 0.55], [1, -0.65], [-1, -0.65]].forEach(([s, z], i) => {
        const bone = legs[(i === 0 || i === 3) ? 0 : 1];                           // diagonal pairs step together
        P(bone, cyl(1.3), 'body', 0.3, 0.72, 0.3, s * 0.37, 0.36, z); P(bone, box(), 'dark', 0.32, 0.12, 0.42, s * 0.37, 0.06, z + 0.06);
      });
    },
    // A bomber: a round body on stubby legs, a strap round the middle, a fuse on top
    bomber(root) {
      const body = B(root, 'body', 0, 1.0, 0), legL = B(root, 'legL', 0.36, 0, 0), legR = B(root, 'legR', -0.36, 0, 0);
      for (const leg of [legL, legR]) { P(leg, cyl(), 'limb', 0.3, 0.4, 0.3, 0, 0.2, 0); P(leg, box(), 'limb', 0.34, 0.12, 0.5, 0, 0.06, 0.1); }
      P(body, sph(), 'body', 1.7, 1.6, 1.7, 0, 0, 0);
      P(body, torus(0.035), 'dark', 1.74, 1.74, 2.2, 0, 0, 0, PI / 2);             // strap
      for (const s of [1, -1]) { P(body, sph(), 'eye', 0.22, 0.22, 0.22, s * 0.3, 0.22, 0.74); P(body, sph(), 'body', 0.34, 0.34, 0.34, s * 0.88, -0.12, 0.1); }
      P(body, cyl(), 'dark', 0.42, 0.2, 0.42, 0, 0.84, 0);                         // cap
      P(body, cyl(1, 5), 'trim', 0.07, 0.42, 0.07, 0.07, 1.1, 0, 0, 0, -0.35);     // fuse
      P(body, torus(0.05), 'elite', 1.6, 1.6, 1.6, 0, 0.32, 0, PI / 2); P(body, torus(0.05), 'elite', 1.6, 1.6, 1.6, 0, -0.32, 0, PI / 2); // elite: gold bands
      P(B(body, 'spark', 0.15, 1.3, 0), sph(), 'fuse', 0.24, 0.24, 0.24, 0, 0, 0);
    },
    // A brute: wide and heavy, a small head sunk between plated shoulders, fists down by the knees
    brute(root) {
      const body = B(root, 'body', 0, 0.7, 0), legL = B(root, 'legL', 0.42, 0.7, 0), legR = B(root, 'legR', -0.42, 0.7, 0);
      for (const leg of [legL, legR]) { P(leg, cyl(), 'limb', 0.5, 0.7, 0.5, 0, -0.35, 0); P(leg, box(), 'limb', 0.55, 0.18, 0.75, 0, -0.61, 0.1); }
      P(body, cyl(1.45), 'body', 1.25, 1.15, 0.95, 0, 0.55, 0);                    // torso, spreading to the shoulders
      P(body, cyl(), 'dark', 1.32, 0.16, 1.0, 0, 0.08, 0);                         // belt
      P(body, box(), 'elite', 0.3, 0.22, 0.1, 0, 0.08, 0.5);                       // elite: gold buckle
      P(body, sph(), 'body', 1.9, 0.72, 1.05, 0, 1.12, 0);                         // shoulder mass
      P(body, sph(), 'body', 0.52, 0.52, 0.52, 0, 1.42, 0.2);                      // head
      P(body, box(), 'dark', 0.36, 0.1, 0.12, 0, 1.28, 0.4);                       // jaw line
      for (const s of [1, -1]) {
        P(body, sph(), 'eye', 0.11, 0.11, 0.11, s * 0.12, 1.47, 0.43);
        P(body, dome(), 'trim', 0.76, 0.6, 0.78, s * 0.92, 1.16, 0);               // shoulder plates
        P(body, dome(), 'elite', 0.86, 0.72, 0.88, s * 0.92, 1.18, 0);             // elite: gold over them
        const arm = B(body, s > 0 ? 'armL' : 'armR', s * 1.02, 1.1, 0);
        P(arm, cyl(0.85), 'body', 0.46, 0.75, 0.46, 0, -0.38, 0); P(arm, cyl(0.72), 'body', 0.54, 0.62, 0.54, 0, -0.98, 0); P(arm, sph(), 'dark', 0.62, 0.6, 0.62, 0, -1.34, 0.02);
      }
    },
  };
  const KIND_SCALE = { melee: 1, ranged: 1, caster: 1, charger: 1, bomber: 1, brute: 0.9 };
  const WIND = { melee: 0.45, ranged: 0.4, charger: 0.6, bomber: 0.55, brute: 0.85, caster: 0.5 }; // wind-up length per kind, from the AI

  // ---- The six bosses ----
  const BOSSES = {
    // A spider: a great banded abdomen, a small head with fangs and six eyes, eight legs spread wide
    'Spider Queen'(root) {
      const body = B(root, 'body', 0, 0.8, 0.3), sets = [B(root, 'legsA', 0, 0, 0.3), B(root, 'legsB', 0, 0, 0.3)]; // set forward, so the whole animal sits over its spot
      P(body, sph(), 'body', 1.75, 1.4, 1.95, 0, 0.22, -0.8);
      for (const [z, k] of [[-0.3, 0.86], [-0.8, 1.0], [-1.3, 0.84]]) P(body, torus(0.03), 'dark', 1.77 * k, 1.42 * k, 2.5, 0, 0.22, z);
      P(body, sph(), 'body', 0.98, 0.82, 1.0, 0, 0, 0.5);                          // head and chest
      P(body, cone(), 'dark', 0.3, 0.45, 0.3, 0, 0.3, -1.85, -1.9);                // spinneret
      for (const s of [1, -1]) P(body, cone(), 'light', 0.15, 0.42, 0.15, s * 0.17, -0.3, 0.93, PI); // fangs
      for (let i = 0; i < 3; i++) for (let r = 0; r < 2; r++) P(body, sph(), 'eye', 0.12, 0.12, 0.12, (i - 1) * 0.2, 0.25 - r * 0.16, 0.9 + r * 0.09 - Math.abs(i - 1) * 0.05);
      for (let i = 0; i < 4; i++) for (const s of [1, -1]) {
        const bone = sets[(i + (s > 0 ? 0 : 1)) % 2], hz = 0.75 - i * 0.2, fz = [1.55, 0.7, -0.25, -1.3][i]; // neighbouring legs step in turn
        const kx = s * (1.15 + i * 0.05), ky = 1.5 - i * 0.05, kz = hz + (fz - hz) * 0.45, fx = s * (1.8 + i * 0.03);
        seg(bone, 'body', s * 0.38, 0.85, hz, kx, ky, kz, 0.2); seg(bone, 'body', kx, ky, kz, fx, 0, fz, 0.16, 0.5);
        P(bone, sph(), 'light', 0.22, 0.22, 0.22, kx, ky, kz);
      }
    },
    // An orc: barrel chest, plated shoulders, tusks, fists like boulders
    'Orc Chieftain'(root) {
      const body = B(root, 'body', 0, 0.82, 0), legL = B(root, 'legL', 0.4, 0.82, 0), legR = B(root, 'legR', -0.4, 0.82, 0);
      for (const leg of [legL, legR]) { P(leg, cyl(1.25), 'limb', 0.5, 0.82, 0.52, 0, -0.41, 0); P(leg, box(), 'limb', 0.56, 0.2, 0.82, 0, -0.72, 0.1); }
      P(body, cyl(), 'dark', 1.34, 0.3, 1.04, 0, 0.1, 0);                          // belt
      P(body, box(), 'dark', 0.5, 0.55, 0.1, 0, -0.25, 0.5);                       // cloth hanging from it
      P(body, cyl(1.45), 'body', 1.2, 0.9, 0.95, 0, 0.6, 0);                       // belly
      P(body, sph(), 'body', 1.85, 1.2, 1.3, 0, 1.05, 0.04);                       // barrel chest
      P(body, sph(), 'body', 0.72, 0.7, 0.72, 0, 1.78, 0.22);                      // head, low between the shoulders
      P(body, box(), 'body', 0.56, 0.3, 0.42, 0, 1.56, 0.36);                      // heavy jaw
      P(body, box(), 'dark', 0.6, 0.1, 0.16, 0, 1.9, 0.5);                         // brow
      for (const s of [1, -1]) {
        P(body, sph(), 'eye', 0.12, 0.12, 0.12, s * 0.15, 1.82, 0.54);
        P(body, cone(), 'light', 0.13, 0.32, 0.13, s * 0.27, 1.63, 0.6, 0.1, 0, -s * 0.32); // tusks
        P(body, dome(), 'light', 0.98, 0.78, 1.0, s * 1.0, 1.3, 0);                // shoulder plates, dark-rimmed
        P(body, cyl(1, 12), 'dark', 1.04, 0.1, 1.06, s * 1.0, 1.3, 0);
        const arm = B(body, s > 0 ? 'armL' : 'armR', s * 1.06, 1.22, 0);
        P(arm, cyl(0.9), 'body', 0.52, 0.85, 0.52, 0, -0.42, 0); P(arm, cyl(0.8), 'body', 0.58, 0.7, 0.58, 0, -1.1, 0);
        P(arm, cyl(), 'dark', 0.64, 0.24, 0.64, 0, -1.2, 0); P(arm, sph(), 'body', 0.74, 0.7, 0.74, 0, -1.62, 0.02);
      }
    },
    // A knight: a ragged cloak to the ground, a tall helm with a visor slit, a greatsword carried low at the side
    'Death Knight'(root) {
      const body = B(root, 'body', 0, 0, 0);
      for (const s of [1, -1]) {
        P(body, cyl(), 'dark', 0.34, 0.36, 0.4, s * 0.26, 0.18, 0.05);             // boots under the cloak
        P(body, cone(), 'light', 0.5, 0.62, 0.56, s * 0.72, 1.84, 0, 0, 0, -s * PI / 2); // pauldrons, pointing outward
        P(body, sph(), 'eye', 0.09, 0.09, 0.09, s * 0.11, 2.32, 0.39);
      }
      P(body, cyl(0.58), 'body', 1.75, 1.62, 1.5, 0, 1.03, 0);                     // cloak
      for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2; P(body, cone(4), 'body', 0.5, 0.34, 0.5, Math.sin(a) * 0.74, 0.15, Math.cos(a) * 0.63, PI); } // its ragged hem
      P(body, slab(1.6), 'dark', 0.26, 1.3, 0.2, 0, 1.12, 0.5, -0.19);             // dark armour where the cloak parts
      P(body, cyl(), 'dark', 0.5, 0.2, 0.5, 0, 1.92, 0);                           // gorget
      P(body, sph(), 'body', 0.72, 1.02, 0.76, 0, 2.36, 0);                        // tall helm
      P(body, box(), 'dark', 0.5, 0.15, 0.14, 0, 2.32, 0.33);                      // visor slit
      P(body, cyl(1, 12), 'light', 0.84, 0.05, 0.8, 0, 2.5, -0.1, 0, 0, PI / 2);   // crest over the top and back of the helm
      const arm = B(body, 'armR', -0.6, 1.74, 0.08), sw = B(arm, 'sword', -0.12, -0.5, 0.42);
      seg(arm, 'body', 0, 0, 0, -0.12, -0.5, 0.42, 0.28); P(arm, sph(), 'dark', 0.32, 0.32, 0.32, -0.12, -0.5, 0.42);
      dir.set(0.4, -0.72, 0.56).normalize(); sw.quaternion.setFromUnitVectors(UP, dir); // the blade slants down to the ground ahead
      P(sw, cyl(1, 6), 'light', 0.1, 0.46, 0.1, 0, -0.08, 0);                      // grip
      P(sw, sph(), 'light', 0.17, 0.17, 0.17, 0, -0.34, 0);                        // pommel
      for (const s of [1, -1]) P(sw, box(), 'light', 0.3, 0.08, 0.1, s * 0.16, 0.2, 0, 0, 0, s * 0.5); // swept guard
      P(sw, box(), 'light', 0.22, 1.25, 0.05, 0, 0.855, 0); P(sw, cone(4), 'light', 0.22, 0.3, 0.05, 0, 1.63, 0); // blade and point
      P(sw, box(), 'dark', 0.05, 1.05, 0.065, 0, 0.8, 0);                          // fuller
    },
    // A burning king in armour: layered shoulder guards with flame on them, a plain crown of straight tines
    'Demon Lord'(root) {
      const body = B(root, 'body', 0, 0.78, 0), legL = B(root, 'legL', 0.3, 0.78, 0), legR = B(root, 'legR', -0.3, 0.78, 0);
      for (const leg of [legL, legR]) { P(leg, cyl(1.2), 'limb', 0.4, 0.78, 0.42, 0, -0.39, 0); P(leg, box(), 'limb', 0.44, 0.18, 0.7, 0, -0.69, 0.1); }
      P(body, cyl(0.62), 'body', 1.5, 0.62, 1.1, 0, 0.22, 0);                      // armoured skirt
      P(body, cyl(), 'dark', 1.0, 0.18, 0.8, 0, 0.56, 0);                          // belt
      P(body, cyl(1.75), 'body', 0.98, 0.95, 0.7, 0, 1.08, 0);                     // breastplate, wide at the shoulders
      P(body, sph(), 'body', 0.7, 0.7, 0.7, 0, 1.9, 0.04);                         // head
      P(body, box(), 'dark', 0.36, 0.13, 0.1, 0, 1.74, 0.33);                      // mouth
      P(body, box(), 'dark', 0.56, 0.15, 0.1, 0, 1.95, 0.27);                      // a dark band the eyes burn in
      for (let i = 0; i < 4; i++) P(body, box(), 'light', 0.05, 0.07, 0.05, -0.12 + i * 0.08, 1.77, 0.37); // teeth
      for (const s of [1, -1]) {
        P(body, box(), 'eye', 0.2, 0.07, 0.08, s * 0.16, 1.95, 0.31, 0, 0, s * 0.4); // slanted eyes
        for (let k = 0; k < 3; k++) P(body, dome(), 'light', 0.8 - k * 0.06, 0.42, 0.86 - k * 0.06, s * (0.86 + k * 0.15), 1.5 - k * 0.15, 0); // three shoulder guards, stepping down and out
        const arm = B(body, s > 0 ? 'armL' : 'armR', s * 1.0, 1.3, 0);
        P(arm, cyl(0.9), 'body', 0.38, 0.8, 0.38, 0, -0.45, 0); P(arm, cyl(), 'dark', 0.42, 0.2, 0.42, 0, -0.8, 0); P(arm, sph(), 'body', 0.5, 0.5, 0.5, 0, -1.0, 0.03);
        const fl = B(body, s > 0 ? 'flameL' : 'flameR', s * 0.95, 1.7, -0.05);     // tongues of flame on the shoulder
        for (let i = 0; i < 3; i++) { const h = i === 1 ? 0.85 : 0.55; P(fl, cone(6), 'flame', 0.3, h, 0.3, (i - 1) * 0.26, h / 2, 0, 0, 0, -(i - 1) * 0.18); }
      }
      P(body, cyl(1, 12), 'light', 0.68, 0.1, 0.68, 0, 2.07, 0.04);                // crown: a band...
      for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2, h = i === 0 ? 0.38 : i % 2 ? 0.26 : 0.18; P(body, cone(4), 'light', 0.13, h, 0.13, Math.sin(a) * 0.31, 2.1 + h / 2, 0.04 + Math.cos(a) * 0.31); } // ...and straight tines, the front one tallest
    },
    // A dragon: long neck and tail, four legs, wings spread wide
    'Ancient Dragon'(root) {
      const body = B(root, 'body', 0, 0.9, 0), legs = [B(root, 'legsA', 0, 0, 0), B(root, 'legsB', 0, 0, 0)];
      P(body, sph(), 'body', 1.0, 0.95, 2.0, 0, 0, -0.1);                          // trunk
      P(body, sph(), 'body', 1.12, 1.08, 1.05, 0, 0.06, 0.5);                      // chest
      P(body, sph(), 'light', 0.72, 0.5, 1.6, 0, -0.3, 0.05);                      // pale belly
      for (let i = 0; i < 4; i++) P(body, cone(4), 'light', 0.12, 0.32, 0.3, 0, 0.6 - i * 0.05, 0.45 - i * 0.4); // ridge down the back
      [[1, 0.62], [-1, 0.62], [1, -0.72], [-1, -0.72]].forEach(([s, z], i) => {
        const bone = legs[(i === 0 || i === 3) ? 0 : 1];
        P(bone, cyl(1.5), 'body', 0.36, 0.9, 0.42, s * 0.52, 0.45, z); P(bone, box(), 'dark', 0.42, 0.14, 0.6, s * 0.52, 0.07, z + 0.1);
      });
      const neck = B(body, 'neck', 0, 0.3, 0.85), head = B(neck, 'head', 0, 1.02, 0.52);
      seg(neck, 'body', 0, -0.1, -0.1, 0, 0.5, 0.32, 0.56, 0.8); seg(neck, 'body', 0, 0.45, 0.28, 0, 1.0, 0.5, 0.46, 0.85);
      for (let i = 0; i < 3; i++) P(neck, cone(4), 'light', 0.1, 0.24, 0.22, 0, 0.3 + i * 0.3, -0.14 + i * 0.16, -0.5);
      P(head, sph(), 'body', 0.52, 0.46, 0.72, 0, 0.14, 0.2);                      // skull
      P(head, cyl(0.6), 'body', 0.36, 0.62, 0.3, 0, 0.08, 0.72, PI / 2);           // snout
      P(head, box(), 'dark', 0.26, 0.07, 0.6, 0, -0.1, 0.62);                      // jaw
      for (const s of [1, -1]) {
        P(head, box(), 'eye', 0.06, 0.13, 0.12, s * 0.24, 0.2, 0.34);              // slit eyes
        P(head, cone(6), 'light', 0.14, 0.8, 0.14, s * 0.2, 0.42, -0.28, -1.15, 0, -s * 0.25); // horns swept back
        const wing = B(body, s > 0 ? 'wingL' : 'wingR', s * 0.38, 0.42, 0.3);
        P(wing, wingSkin(s), 'wing', 1, 1, 1, 0, 0, 0);
        WING_RIBS.forEach(([a, len], i) => seg(wing, 'light', 0, 0, 0, Math.cos(a) * len * s, 0.01, -Math.sin(a) * len, i ? 0.05 : 0.09, 0.5));
      }
      const tail = B(body, 'tail', 0, 0.05, -0.95), tail2 = B(tail, 'tail2', 0, -0.2, -0.72);
      seg(tail, 'body', 0, 0, 0.1, 0, -0.2, -0.75, 0.5, 0.65);
      seg(tail2, 'body', 0, 0, 0.05, 0, -0.32, -0.8, 0.34, 0.5); P(tail2, cone(6), 'light', 0.22, 0.5, 0.22, 0, -0.42, -1.02, -1.95);
    },
    // A plain stone colossus on a plinth: squared shoulders, arms hanging straight, a tall flat-topped headdress.
    // The face is a brow bar, two eye slits and a short mouth line, and nothing else. No wings, no halo, no marks or signs.
    'Statue of God'(root) {
      const body = B(root, 'body', 0, 0, 0), eyes = B(body, 'eyes', 0, 2.3, 0.31);
      P(body, box(), 'body', 2.2, 0.28, 1.5, 0, 0.14, 0); P(body, box(), 'body', 1.7, 0.1, 1.15, 0, 0.33, 0); // plinth
      P(body, slab(1.27), 'body', 1.1, 1.5, 0.7, 0, 1.13, 0);                      // the body: a block widening to squared shoulders
      for (const s of [1, -1]) { P(body, box(), 'body', 0.26, 1.26, 0.38, s * 0.85, 1.25, 0); P(eyes, box(), 'eye', 0.15, 0.045, 0.04, s * 0.17, 0, 0); } // arms hanging straight; eye slits
      P(body, box(), 'body', 0.4, 0.18, 0.4, 0, 1.96, 0);                          // neck
      P(body, box(), 'body', 0.7, 0.46, 0.6, 0, 2.27, 0);                          // face block
      P(body, slab(1.43), 'body', 0.7, 0.5, 0.6, 0, 2.75, 0);                      // headdress, flaring to a flat top
      P(body, box(), 'dark', 0.5, 0.08, 0.04, 0, 2.4, 0.31);                       // brow bar
      P(body, box(), 'dark', 0.28, 0.03, 0.04, 0, 2.13, 0.31);                     // mouth line
      for (let i = 0; i < 4; i++) { const x = -0.3 + i * 0.2; P(body, box(), 'light', 0.03, 1.15, 0.03, x * 1.1, 1.15, 0.407, 0.063, 0, -x * 0.12); } // straight folds down the front
      P(body, box(), 'dark', 0.025, 0.36, 0.03, 0.18, 2.76, 0.372, 0.254, 0, 0.45); // hairline cracks: single straight lines, apart from each other
      P(body, box(), 'dark', 0.022, 0.4, 0.03, 0.85, 1.4, 0.195, 0, 0, 0.5);
      P(body, box(), 'dark', 0.022, 0.3, 0.03, -0.55, 0.15, 0.755, 0, 0, 1.2);
    },
  };
  const BOSS_SCALE = { 'Spider Queen': 1, 'Orc Chieftain': 0.85, 'Death Knight': 0.9, 'Demon Lord': 0.9, 'Ancient Dragon': 1, 'Statue of God': 0.88 };

  // ---- Motion. b = the figure's bones; A = { t: its own clock, ph + amp: stride, wind: 0..1 winding up, strike: 1..0 just struck, dash } ----
  const S = Math.sin, C = Math.cos;
  const walk = (b, A, sw, bob) => { // two-legged gait and the bounce that goes with it
    const w = S(A.ph) * sw * A.amp;
    b.legL.rotation.x = -w; b.legR.rotation.x = w;
    b.body.position.y = b.body.userData.y0 + S(A.t * 5) * bob + Math.abs(C(A.ph)) * bob * 1.6 * A.amp;
    return w;
  };
  const trot = (b, A, reach, lift) => { // four legs: diagonal pairs swap
    const w = S(A.ph) * A.amp, c = C(A.ph) * A.amp;
    b.legsA.position.z = w * reach; b.legsB.position.z = -w * reach;
    b.legsA.position.y = Math.max(0, c) * lift; b.legsB.position.y = Math.max(0, -c) * lift;
  };
  const ANIM = {
    melee(b, A) {
      const w = walk(b, A, 0.6, 0.025);
      b.body.rotation.x = 0.08 * A.amp - 0.15 * A.wind + 0.3 * A.strike;
      b.armR.rotation.x = -0.55 + w * 0.5 - 2.0 * A.wind + 1.3 * A.strike;       // raise high, then chop
    },
    ranged(b, A) {
      walk(b, A, 0.55, 0.02);
      b.body.rotation.x = 0.05 * A.amp - 0.1 * A.wind;
      b.bow.rotation.x = -0.25 * A.wind; b.arrow.visible = A.wind > 0;            // an arrow on the string while drawing
    },
    caster(b, A) {
      b.body.position.y = 0.1 + S(A.t * 2.4) * 0.06; b.body.rotation.x = 0.04 * A.amp - 0.06 * A.wind;
      b.orb.position.y = b.orb.userData.y0 + 0.1 + S(A.t * 3) * 0.08 + A.wind * 0.35;
      const k = 1 + S(A.t * 5) * 0.07 + A.wind * 0.7; b.orb.scale.set(k, k, k);
      b.orbit.rotation.y = A.t * 3;
    },
    charger(b, A) {
      trot(b, A, 0.22, 0.12);
      b.body.position.y = b.body.userData.y0 + S(A.t * 5) * 0.02 - 0.12 * A.wind;
      b.body.position.z = -0.18 * A.wind + 0.12 * A.dash;                         // draws back, then throws itself forward
      b.body.rotation.x = -0.16 * A.wind + 0.14 * A.dash;
      if (A.dash) { b.legsA.position.z = 0.3; b.legsB.position.z = -0.3; b.legsA.position.y = b.legsB.position.y = 0.1; }
    },
    bomber(b, A) {
      const w = S(A.ph) * A.amp, p = 1 + 0.1 * S(A.t * (A.wind > 0 ? 40 : 10)), f = 1 + 0.35 * S(A.t * 14) + 2.2 * A.wind;
      b.legL.position.z = w * 0.16; b.legR.position.z = -w * 0.16;
      b.body.rotation.z = w * 0.09; b.body.scale.set(p, p, p);                    // swells as it is about to burst
      b.spark.scale.set(f, f, f);
    },
    brute(b, A) {
      const w = walk(b, A, 0.4, 0.015), up = A.wind * A.wind * (3 - 2 * A.wind), sway = S(A.t * 2) * 0.06;
      b.body.rotation.x = 0.05 - 0.16 * up + 0.3 * A.strike;
      b.armL.rotation.x = w * 0.5 + sway - 2.7 * up + 0.5 * A.strike; b.armR.rotation.x = -w * 0.5 - sway - 2.7 * up + 0.5 * A.strike; // both fists overhead, then down
      b.armL.rotation.z = 0.12; b.armR.rotation.z = -0.12;
    },
    'Spider Queen'(b, A) {
      const w = A.t * 3 + A.ph, s = S(w), c = C(w);
      b.legsA.rotation.y = s * 0.07; b.legsB.rotation.y = -s * 0.07;
      b.legsA.position.y = Math.max(0, c) * 0.05; b.legsB.position.y = Math.max(0, -c) * 0.05;
      b.body.position.y = b.body.userData.y0 + S(A.t * 2) * 0.04 - 0.1 * A.wind;
      b.body.rotation.x = -0.14 * A.wind + 0.1 * A.dash;
    },
    'Orc Chieftain'(b, A) {
      const w = walk(b, A, 0.45, 0.015), br = S(A.t * 2.2);
      b.body.rotation.x = 0.06 - 0.16 * A.wind + 0.22 * A.dash;
      b.armL.rotation.x = w * 0.6 + br * 0.05 - 2.3 * A.wind; b.armR.rotation.x = -w * 0.6 - br * 0.05 - 2.3 * A.wind;
      b.armL.rotation.z = 0.16 + br * 0.03; b.armR.rotation.z = -0.16 - br * 0.03;
    },
    'Death Knight'(b, A) {
      const s = S(A.t * 1.4);
      b.body.rotation.z = s * 0.02; b.body.rotation.x = 0.03 + 0.05 * A.amp + 0.2 * A.dash - 0.08 * A.wind;
      b.body.position.y = 0.03 + S(A.t * 2.4) * 0.03;
      b.armR.rotation.x = s * 0.05 - 1.5 * A.wind;                                // lifts the greatsword to strike
    },
    'Demon Lord'(b, A) {
      const w = walk(b, A, 0.4, 0.015), br = S(A.t * 2);
      b.body.rotation.x = 0.04 - 0.12 * A.wind + 0.2 * A.dash;
      b.armL.rotation.x = w * 0.5 - 1.6 * A.wind; b.armR.rotation.x = -w * 0.5 - 1.6 * A.wind;
      b.armL.rotation.z = 0.14 + br * 0.03; b.armR.rotation.z = -0.14 - br * 0.03;
      b.flameL.rotation.z = S(A.t * 7) * 0.14; b.flameR.rotation.z = S(A.t * 7 + 2) * 0.14;
      b.flameL.scale.y = 1 + 0.18 * S(A.t * 11) + 0.6 * A.wind; b.flameR.scale.y = 1 + 0.18 * S(A.t * 11 + 1.7) + 0.6 * A.wind;
    },
    'Ancient Dragon'(b, A) {
      const beat = S(A.t * 2) * 0.14 + 0.25 * A.wind;
      trot(b, A, 0.2, 0.08);
      b.body.position.y = b.body.userData.y0 + S(A.t * 1.6) * 0.03;
      b.wingL.rotation.z = 0.38 + beat; b.wingR.rotation.z = -0.38 - beat;
      b.neck.rotation.y = S(A.t * 1.1) * 0.14; b.neck.rotation.x = S(A.t * 0.8) * 0.05 - 0.2 * A.wind + 0.3 * A.dash;
      b.head.rotation.x = 0.3 + 0.25 * A.wind;
      b.tail.rotation.y = S(A.t * 1.5) * 0.22; b.tail2.rotation.y = S(A.t * 1.5 - 0.9) * 0.3;
    },
    'Statue of God'(b, A) {
      b.body.rotation.z = S(A.t * 0.7) * 0.008; b.body.position.y = Math.abs(S(A.ph * 0.5)) * 0.02 * A.amp;
      b.eyes.scale.y = 1 + 0.35 * S(A.t * 2.5) + A.wind;                          // only the eyes stir
    },
  };

  // ---- Templates and instances ----
  const auraRing = new THREE.RingGeometry(1.4, 1.5, 40); auraRing.rotateX(-PI / 2);
  const auraDisc = new THREE.PlaneGeometry(3.6, 3.6); auraDisc.rotateX(-PI / 2);
  const keyFor = (kind, name) => kind === 'boss' ? 'boss:' + (BOSSES[name] ? name : 'Orc Chieftain') : (KINDS[kind] ? kind : 'melee');
  function template(key) {
    if (templates[key]) return templates[key];
    const boss = key.slice(0, 5) === 'boss:', name = boss ? key.slice(5) : key;
    const root = new THREE.Group(), inner = B(root, '', 0, 0, 0);
    inner.scale.setScalar((boss ? BOSS_SCALE[name] : KIND_SCALE[name]) || 1);
    (boss ? BOSSES : KINDS)[name](inner);
    bake(root);
    root.userData.h = new THREE.Box3().setFromObject(root).max.y;
    root.userData.anim = name;
    return (templates[key] = root);
  }
  // aura: 'ring' (elite, boss) or 'disc' (shadow) laid on the floor under the figure
  function make(key, aura, elite) {
    const t = template(key), fig = copy(t), meshes = [], bones = {};
    fig.traverse(o => {
      if (o.isMesh) { meshes.push(o); if (o.userData.role === 'elite') o.visible = !!elite; }
      else if (o.name) { bones[o.name] = o; o.userData.y0 = o.position.y; }
    });
    if (aura) { const a = new THREE.Mesh(aura === 'ring' ? auraRing : auraDisc, null); a.userData.role = 'aura'; a.position.y = 0.03; fig.add(a); meshes.push(a); }
    fig.userData = { meshes, bones, pal: null, pals: null, h: t.userData.h, anim: ANIM[t.userData.anim], phase: 0, amp: 0, lx: NaN, ly: 0, dx: 0, dy: 0, wound: false, cast: 0 };
    return fig;
  }
  // Legs follow the ground actually covered, so feet never slide
  function stride(ud, x, y, size, dt) {
    let d = 0;
    if (ud.lx === ud.lx) { ud.dx = x - ud.lx; ud.dy = y - ud.ly; d = Math.hypot(ud.dx, ud.dy); if (d > size * 3) d = 0; ud.phase += d / size * 2.1; }
    ud.lx = x; ud.ly = y;
    ud.amp += ((d > 0.01 ? 1 : 0) - ud.amp) * ease(dt, 9);
    return d;
  }
  function turn(o, target, k) { let d = target - o.rotation.y; d -= Math.round(d / (PI * 2)) * PI * 2; o.rotation.y += d * k; }
  const A = { t: 0, ph: 0, amp: 0, wind: 0, strike: 0, dash: 0 };

  function forEnemy(e) {
    const boss = !!e.isBoss, col = e.color || '#ffffff';
    const fig = make(keyFor(boss ? 'boss' : e.kind, (e.def && e.def.name) || e.name), (boss || e.elite) ? 'ring' : null, e.elite);
    fig.userData.pals = boss ? [bossPal(col, ''), bossPal(col, 'W'), bossPal(col, 'R')] : [enemyPal(col, e.elite, false), enemyPal(col, e.elite, true)];
    return fig;
  }
  function enemy(fig, e, dt, now) {
    const ud = fig.userData, sz = e.size || 14, grow = e.spawnT > 0 ? Math.max(0, 1 - e.spawnT / 0.55) : 1, k = sz * (0.5 + 0.5 * grow);
    const blink = (e.state === 'wind' || e.state === 'cwind') && S(now * 45) > 0;
    setPal(fig, e.hitFlash > 0 ? flashPal() : ud.pals[blink ? 1 : (e.isBoss && e.phase >= 2) ? 2 : 0]);
    fig.scale.set(k, k, k);
    fig.position.set(e.x, -(1 - grow) * ud.h * k, e.y);                            // spawning: it rises out of the floor
    if (e.facing && (e.facing.x || e.facing.y)) fig.rotation.y = Math.atan2(e.facing.x, e.facing.y);
    stride(ud, e.x, e.y, sz, dt);
    A.t = e.animT || 0; A.ph = ud.phase; A.amp = ud.amp; A.wind = 0; A.strike = 0; A.dash = (e.state === 'dash' || e.state === 'cdash') ? 1 : 0;
    if (e.isBoss) { ud.cast += (((e.state === 'cast' || e.state === 'swipe' || e.state === 'cwind' || e.state === 'spiral') ? 1 : 0) - ud.cast) * ease(dt, 7); A.wind = ud.cast; }
    else if (e.state === 'wind') { A.wind = 1 - clamp01(e.st / (WIND[e.kind] || 0.5)); ud.wound = true; }
    else if (ud.wound) { // just after the blow: the AI's cooldown tells how long ago it landed
      const s = e.kind === 'brute' ? (e.cd - 2.1) / 0.3 : e.kind === 'melee' ? (e.cd - 0.7) / 0.3 : 0;
      if (s > 0) A.strike = Math.min(1, s); else ud.wound = false;
    }
    ud.anim(ud.bones, A);
  }
  function forShadow(s) { return make(keyFor(s.kind, s.name), 'disc', s.grade === 'Elite'); }
  // fx, fy: the way the hunter faces, which a shadow standing in formation copies
  function shadow(fig, s, dt, berserk, fx, fy) {
    const ud = fig.userData, r = (s.kind === 'boss' ? 28 : s.grade === 'Elite' ? 16 : 12) * (s.atkT > 0 ? 1.15 : 1);
    setPal(fig, shadowPal(berserk));
    fig.scale.set(r, r, r); fig.position.set(s.x, 0, s.y);
    const d = stride(ud, s.x, s.y, r, dt);
    let tx = fx, ty = fy;
    if (s.facing && s.facing.y) { tx = s.facing.x; ty = s.facing.y; }              // fighting: it faces its target
    else if (d > 0.6) { tx = ud.dx; ty = ud.dy; }                                  // falling in: it faces the way it walks
    if (tx || ty) turn(fig, Math.atan2(tx, ty), ease(dt, 10));
    A.t = s.animT || 0; A.ph = ud.phase; A.amp = ud.amp; A.wind = 0; A.dash = 0; A.strike = s.atkT > 0 ? Math.min(1, s.atkT / 0.18) : 0;
    ud.anim(ud.bones, A);
  }

  // ---- The hunter: one figure with materials of its own (it is tinted as a whole), in the units of the 2D drawing (48 tall) ----
  const CYAN = (typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : '#00d4ff';
  const HUE = { vest: 0x2b2a58, trim: 0x3d3c78, pants: 0x32325a, boot: 0x15131f, sole: 0x262438, skin: 0x54407a, wrap: 0x7a72b4, wrapLine: 0x3f3a6c, hair: 0x0d0915, strap: 0x0c0a16, pommel: 0x6b4a3a, steel: 0xd4d6ea };
  const HM = {}, HB = {};
  for (const k in HUE) HM[k] = new THREE.MeshStandardMaterial({ color: HUE[k], roughness: 0.7 });
  HM.glow = new THREE.MeshBasicMaterial({ color: CYAN });                           // the zip line
  HM.eye = new THREE.MeshBasicMaterial({ color: 0xaaeeff });
  HM.blade = new THREE.MeshStandardMaterial({ color: 0xd4d6ea, roughness: 0.3, emissive: 0xaaddff, emissiveIntensity: 0.35 });
  HM.edge = new THREE.MeshBasicMaterial({ color: 0xaaddff });                       // the line of light down each blade
  (function buildHunter() {
    const hb = (parent, name, x, y, z) => (HB[name] = B(parent, name, x, y, z));
    const hip = hb(hunterGroup, 'hip', 0, 18.4, 0), chest = hb(hip, 'chest', 0, 2.2, 0), head = hb(chest, 'head', 0, 22.9, 0);
    P(hip, cyl(1.08), 'pants', 7.4, 3.4, 5.2, 0, 0.4, 0);
    P(hip, cyl(), 'strap', 8.3, 1.5, 5.9, 0, 1.9, 0);                              // belt and buckle
    P(hip, box(), 'steel', 1.3, 1.5, 0.5, 1.0, 1.9, 2.9);
    P(chest, cyl(1.36), 'vest', 7.6, 13.6, 5.0, 0, 6.8, 0);                        // combat vest
    P(chest, cyl(1.18), 'vest', 5.4, 3.8, 5.4, 0, 15.3, -0.2);                     // high collar
    P(chest, cyl(), 'skin', 2.6, 4, 2.6, 0, 16.5, 0);                              // neck
    P(chest, box(), 'glow', 0.6, 13, 0.4, 0, 6.9, 3.08, 0.066);                    // glowing zip line, up the vest and the collar
    P(chest, box(), 'glow', 0.6, 3.4, 0.4, 0, 15.3, 2.86, 0.13);
    for (const s of [1, -1]) {
      P(chest, sph(), 'vest', 4.6, 3.6, 5.2, s * 4.6, 12.6, 0);                    // shoulder of the vest
      P(chest, box(), 'trim', 2.6, 2.6, 0.6, s * 2.2, 10, 2.85); P(chest, box(), 'trim', 2.5, 2.2, 0.6, s * 2.1, 3.6, 2.4); // pockets
      P(head, box(), 'eye', 1.8, 0.8, 0.6, s * 1.8, 0.2, 4.2);                     // glowing eyes
      const L = s > 0 ? 'L' : 'R';
      const arm = hb(chest, 'arm' + L, s * 5.7, 12.6, 0), fore = hb(arm, 'fore' + L, 0, -7, 0), sw = hb(fore, 'sword' + L, 0, -6.9, 0);
      arm.rotation.order = 'YXZ';
      P(arm, sph(), 'skin', 3.8, 3.8, 3.8, 0, 0, 0); P(arm, cyl(1.15), 'skin', 3.2, 7, 3.2, 0, -3.5, 0);
      P(fore, cyl(1.1), 'wrap', 3.0, 6.5, 3.0, 0, -3.25, 0);                       // wrapped forearm
      for (let i = 1; i <= 3; i++) P(fore, cyl(), 'wrapLine', 3.25, 0.4, 3.25, 0, -1.6 * i, 0, 0, 0, 0.12);
      P(fore, sph(), 'skin', 2.9, 2.9, 2.9, 0, -6.9, 0);                           // hand
      P(sw, cyl(1, 6), 'strap', 0.95, 3.4, 0.95, 0, -0.3, 0);                      // a short sword: grip, pommel, oval guard, blade and point
      P(sw, sph(), 'pommel', 1.5, 1.5, 1.5, 0, -2.3, 0);
      P(sw, sph(), 'strap', 4.2, 1.0, 1.8, 0, 1.7, 0);
      P(sw, box(), 'blade', 1.9, 16, 0.5, 0, 10.2, 0); P(sw, cone(4), 'blade', 1.9, 5, 0.5, 0, 20.7, 0);
      P(sw, box(), 'edge', 0.35, 15, 0.62, 0, 10, 0);
      const leg = hb(hip, 'leg' + L, s * 2.3, 0, 0), shin = hb(leg, 'shin' + L, 0, -9, 0);
      P(leg, cyl(0.86), 'pants', 4.7, 9.4, 4.9, 0, -4.5, 0);                       // baggy trousers...
      P(shin, sph(), 'pants', 5.2, 5.6, 5.4, 0, -2.2, 0);                          // ...bloused over the boot top
      P(shin, cyl(0.92), 'boot', 3.3, 5.6, 3.5, 0, -6.2, 0); P(shin, cyl(), 'sole', 3.8, 0.9, 4.0, 0, -4.4, 0);
      P(shin, box(), 'boot', 3.3, 2.3, 6.6, 0, -8.25, 1.5); P(shin, box(), 'sole', 3.5, 0.6, 6.8, 0, -9.15, 1.5);
    }
    P(head, sph(), 'skin', 9.0, 9.4, 9.0, 0, 0, 0);
    P(head, sph(), 'hair', 10.0, 8.6, 10.2, 0, 1.3, -0.9);                         // hair, and its spikes: [x, y, z, length, tilt forward, tilt sideways]
    for (const [x, y, z, h, rx, rz] of [[0, 5.6, -0.6, 4.6, -0.25, 0], [-1.6, 4.9, 2.6, 3.8, 0.75, 0.25], [1.9, 4.8, 2.3, 3.4, 0.7, -0.35], [4.3, 3.4, -0.6, 3.8, -0.1, -1.0], [-4.3, 3.4, -0.6, 3.8, -0.1, 1.0],
      [2.7, 4.6, -3.2, 4.2, -0.8, -0.5], [-2.7, 4.6, -3.2, 4.2, -0.8, 0.5], [0, 3.4, -4.9, 4.6, -1.2, 0], [0, 0.2, -5.3, 3.8, -1.75, 0]]) P(head, cone(6), 'hair', 2.6, h, 2.6, x, y, z, rx, 0, rz);
    bake(hunterGroup);
    hunterGroup.traverse(o => { if (o.isMesh) o.material = HM[o.userData.role]; });
    hunterGroup.scale.setScalar(1.25);
  })();

  // 0 = as he is, 1 = struck (red for an instant), 2 = awakened (violet). The blades take the colour of the weapon carried.
  let tintNow = -1, bladeNow = '';
  function tintHunter(state, blade) {
    if (state !== tintNow) {
      tintNow = state;
      const glow = state === 1 ? 0xff2222 : state === 2 ? 0xbb66ff : CYAN;
      for (const k in HUE) { const m = HM[k]; m.emissive.set(state ? glow : HUE[k]); m.emissiveIntensity = state === 1 ? 0.9 : state === 2 ? 0.55 : 0.45; }
      HM.glow.color.set(glow); HM.eye.color.set(state === 1 ? 0xff5555 : state === 2 ? 0xff66ff : 0xaaeeff);
    }
    if (blade !== bladeNow) { bladeNow = blade; HM.edge.color.set(blade); HM.blade.emissive.set(blade); }
  }
  // Pose: swings are positive forwards. l/r = left/right; A arm, Y arm sweep, E elbow, W wrist (blade angle), L leg
  const HP = { lA: 0.2, rA: 0.1, lY: 0, rY: 0, lE: 0.7, rE: 0.7, lW: 1.5, rW: 1.5, lL: 0, rL: 0, lean: 0, bob: 0, twist: 0 }, HT = Object.assign({}, HP);
  const knee = a => 0.12 + (a < 0 ? -a * 0.9 : a * 0.5);
  function poseHunter(p, dt) {
    const t = p.animT || 0, T = HT;
    const anim = p.atkT > 0 ? (p.anim === 'dash' ? 'dash' : 'attack') : p.dodgeT > 0 ? 'dash' : p.moving ? 'run' : 'idle';
    T.lY = T.rY = T.twist = 0;
    if (anim === 'run') {
      const w = S(t * 13);
      T.lA = w * 0.7; T.rA = -w * 0.7; T.lL = -w * 0.65; T.rL = w * 0.65; T.lE = T.rE = 0.9; T.lW = T.rW = 1.6; T.lean = 0.16; T.bob = -Math.abs(w) * 1.3;
    } else if (anim === 'attack') { // a level cut across the front, in the direction the game sweeps its slash arc; the twin blades take turns
      const k = p.atkDur ? clamp01(1 - p.atkT / p.atkDur) : 0, d = p.atkDir < 0 ? -1 : 1, yaw = d * (0.5 - k) * 2.5;
      T.twist = yaw * 0.4; T.lean = 0.2 * (1 - k); T.bob = -0.8; T.lL = 0.45 * d; T.rL = -0.4 * d;
      if (d > 0) { T.lA = 1.4; T.lY = yaw; T.lE = 0.12; T.lW = 2.75; T.rA = -0.5; T.rE = 0.9; T.rW = 1.4; }
      else { T.rA = 1.4; T.rY = yaw; T.rE = 0.12; T.rW = 2.75; T.lA = -0.5; T.lE = 0.9; T.lW = 1.4; }
    } else if (anim === 'dash') { // a dodge or a dash strike: bent low, arms and blades swept back
      T.lA = T.rA = -1.0; T.lE = T.rE = 0.25; T.lW = T.rW = 2.6; T.lL = 0.75; T.rL = -0.5; T.lean = 0.5; T.bob = -2;
    } else { // standing: breathing, both blades held forward, one higher than the other (upright, a blade crosses the face from some angles)
      const b = S(t * 1.5) * 0.05;
      T.lA = 0.22 + b; T.rA = 0.12 - b; T.lE = 0.75; T.rE = 0.6; T.lW = 1.95; T.rW = 2.3; T.lL = 0.17; T.rL = -0.13; T.lean = 0.03; T.bob = S(t * 2) * 0.5;
    }
    const k = dt > 0 ? 1 - Math.exp(-dt * 26) : 1;
    for (const key in T) HP[key] += (T[key] - HP[key]) * k;
    HB.hip.position.y = 18.4 + HP.bob; HB.hip.rotation.x = HP.lean; HB.chest.rotation.y = HP.twist;
    HB.armL.rotation.set(-HP.lA, HP.lY, 0.1); HB.armR.rotation.set(-HP.rA, HP.rY, -0.1);
    HB.foreL.rotation.x = -HP.lE; HB.foreR.rotation.x = -HP.rE; HB.swordL.rotation.x = HP.lW; HB.swordR.rotation.x = HP.rW;
    HB.legL.rotation.x = -HP.lL; HB.legR.rotation.x = -HP.rL; HB.shinL.rotation.x = knee(HP.lL); HB.shinR.rotation.x = knee(HP.rL);
  }

  return { forEnemy, enemy, forShadow, shadow, tintHunter, poseHunter, turn, ease };
})();

// Shared geometries
const geoProjectile = new THREE.SphereGeometry(1, 10, 10), geoOrb = new THREE.SphereGeometry(6, 12, 12);
const geoGear = new THREE.OctahedronGeometry(8, 0), geoRemnant = new THREE.ConeGeometry(7, 14, 12);
const GEAR_HEX3D = [0xcfd8e3, 0x4aa8ff, 0xbb66ff, 0xffcc33]; // by rarity

// Entity tracking maps
const enemyMeshes = new Map(), shadowMeshes = new Map(), projectileMeshes = new Map();
const orbMeshes = new Map(), remnantMeshes = new Map(), telegraphMeshes = new Map(), zoneMeshes = new Map();
const seenFigures = new Set(); // the enemies, then the shadows, drawn this frame; reused so a frame allocates nothing for them

function disposeNode(node) {
  scene.remove(node);
  if (node.geometry && node.userData?.disposeGeom) node.geometry.dispose();
  if (node.material && !node.material.userData?.shared) {
    (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => m.dispose());
  }
  if (node.userData?.mat && node.userData.mat !== node.material) node.userData.mat.dispose();
  if (node.userData?.ringMat) node.userData.ringMat.dispose();
  if (node.children) {
    for (const c of node.children) {
      if (c.geometry && c.userData?.disposeGeom) c.geometry.dispose();
      if (c.material && !c.material.userData?.shared) c.material.dispose();
    }
  }
}

function pruneMap(map, activeSet) {
  for (const [obj, mesh] of map) {
    if (!activeSet.has(obj)) { disposeNode(mesh); map.delete(obj); }
  }
}

const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const rayHit = new THREE.Vector3();

window.mouseWorld3D = function() {
  if (typeof mouse === 'undefined' || typeof W === 'undefined' || !W || !H) {
    return { x: (typeof player !== 'undefined' && player) ? player.x : 0, y: (typeof player !== 'undefined' && player) ? player.y : 0 };
  }
  mouseVec.x = (mouse.x / W) * 2 - 1; mouseVec.y = -(mouse.y / H) * 2 + 1;
  raycaster.setFromCamera(mouseVec, camera3D);
  const hit = raycaster.ray.intersectPlane(groundPlane, rayHit);
  if (hit) return { x: rayHit.x, y: rayHit.z };
  return { x: (typeof player !== 'undefined' && player) ? player.x : 0, y: (typeof player !== 'undefined' && player) ? player.y : 0 };
};

let lastW = 0, lastH = 0, lastDrawTime = 0;

function draw() {
  const now = performance.now();
  const dt = lastDrawTime ? Math.min((now - lastDrawTime) / 1000, 0.05) : 0;
  lastDrawTime = now;

  const curW = typeof W !== 'undefined' ? W : window.innerWidth;
  const curH = typeof H !== 'undefined' ? H : window.innerHeight;
  const curDPR = typeof DPR !== 'undefined' ? DPR : (window.devicePixelRatio || 1);
  if (curW !== lastW || curH !== lastH) {
    lastW = curW; lastH = curH;
    renderer.setPixelRatio(curDPR); renderer.setSize(curW, curH);
    camera3D.aspect = curW / (curH || 1); camera3D.updateProjectionMatrix();
  }

  if (typeof gameState === 'undefined' || gameState !== 'DUNGEON' || typeof dungeon === 'undefined' || !dungeon) {
    view3D.yaw = 0; viewYaw = 0;
    hunterGroup.visible = false;
    const emptySet = new Set();
    [enemyMeshes, shadowMeshes, projectileMeshes, orbMeshes, remnantMeshes, telegraphMeshes, zoneMeshes].forEach(m => pruneMap(m, emptySet));
    renderer.render(scene, camera3D);
    drawFx3D();
    return;
  }

  if ((typeof paused === 'undefined' || !paused) && typeof keys !== 'undefined') {
    if (keys['z']) view3D.yaw -= 1.8 * dt;
    if (keys['c']) view3D.yaw += 1.8 * dt;
  }
  // Phones hide the hint line, so say once per visit how the view turns
  if (!viewTouch.told && typeof isMobile !== 'undefined' && isMobile && typeof toast === 'function') {
    viewTouch.told = true; toast('TWO FINGERS: TURN THE VIEW · PINCH: ZOOM', 'blue', 4500);
  }

  // Camera
  const camX = (typeof camera !== 'undefined' && camera) ? camera.x : 0;
  const camY = (typeof camera !== 'undefined' && camera) ? camera.y : 0;
  const sh = (typeof camera !== 'undefined' && camera && camera.shake) ? camera.shake : 0;
  const sx = sh ? (Math.random() * 2 - 1) * sh : 0, sy = sh ? (Math.random() * 2 - 1) * sh : 0;
  const cp = Math.cos(view3D.pitch), hd = view3D.dist * cp;
  camera3D.position.set(camX + Math.sin(view3D.yaw)*hd + sx, 20 + Math.sin(view3D.pitch)*view3D.dist + sy, camY + Math.cos(view3D.yaw)*hd);
  camera3D.lookAt(camX, 20, camY);
  viewYaw = view3D.yaw;

  // Cutaway so tall walls never hide the hunter
  if (typeof player !== 'undefined' && player) {
    const tcx = camera3D.position.x - player.x, tcz = camera3D.position.z - player.y;
    const tlen = Math.hypot(tcx, tcz);
    if (tlen > 0.0001) {
      const toCamX = tcx / tlen, toCamZ = tcz / tlen;
      for (let i = 0; i < wallMeshes.length; i++) {
        const wm = wallMeshes[i];
        if (wm.userData && wm.userData.nx !== undefined) {
          const target = (wm.userData.nx * toCamX + wm.userData.nz * toCamZ > 0.35) ? 0.18 : 0.95;
          wm.material.opacity += (target - wm.material.opacity) * Math.min(1, dt * 8);
        }
      }
    }
  }

  const clk = typeof clock !== 'undefined' ? clock : now / 1000;
  if (torchFlameMat3D) torchFlameMat3D.opacity = 0.75 + 0.2 * Math.sin(clk * 11);
  if (torchGlowMat3D) torchGlowMat3D.opacity = 0.5 + 0.15 * Math.sin(clk * 7);

  // Floor and walls are rebuilt when the arena size, the layout, a door, the wave or the wall colour changes
  const curArenaW = typeof arenaW !== 'undefined' ? arenaW : 1400;
  const curArenaH = typeof arenaH !== 'undefined' ? arenaH : 1000;
  const curLine = (dungeon.gate && dungeon.gate.theme && dungeon.gate.theme.line)
    ? dungeon.gate.theme.line
    : ((typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : '#00d4ff');
  const L3 = (typeof layout !== 'undefined') ? layout : null;
  const floorKey = L3 ? 'L' + L3.seed + '|' + L3.lock + '|' + dungeon.wave + '|' + curLine : 'A' + curArenaW + 'x' + curArenaH + '|' + curLine;
  if (floorKey !== lastFloorKey || L3 !== lastLayoutRef || (!L3 && !floorMesh)) {
    lastFloorKey = floorKey; lastLayoutRef = L3;
    if (L3) rebuildLayout3D(curLine); else rebuildFloorAndWalls(curArenaW, curArenaH, curLine);
  }

  // Hunter
  if (typeof player !== 'undefined' && player) {
    hunterGroup.position.set(player.x, 0, player.y);
    if (player.facing && (player.facing.x || player.facing.y)) Fig.turn(hunterGroup, Math.atan2(player.facing.x, player.facing.y), Fig.ease(dt, 22));
    const ult = player.ultT > 0;
    Fig.tintHunter(player.hitFlash > 0 ? 1 : ult ? 2 : 0,
      ult ? '#dd88ff' : ((typeof WEAPONS !== 'undefined' && WEAPONS[player.weapon]) ? WEAPONS[player.weapon].color : '#aaddff'));
    Fig.poseHunter(player, dt);
    hunterGroup.visible = !(dungeon.state === 'dead');
    hunterLight.position.set(player.x, 30, player.y);
    hunterLight.color.set(ult ? 0xbb66ff : ((typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : 0x00d4ff));
  } else {
    hunterGroup.visible = false;
  }

  // Enemies
  const gameClock = typeof clock !== 'undefined' ? clock : now / 1000;
  seenFigures.clear();
  for (const e of (enemies || [])) {
    if (!e || e.alive === false) continue;
    seenFigures.add(e);
    let m = enemyMeshes.get(e);
    if (!m) { m = Fig.forEnemy(e); scene.add(m); enemyMeshes.set(e, m); }
    Fig.enemy(m, e, dt, gameClock);
  }
  pruneMap(enemyMeshes, seenFigures);

  // Shadows
  seenFigures.clear();
  if (player && player.shadows) {
    const isLegion = (typeof legionTimer !== 'undefined' && legionTimer > 0) || (player.ultT > 0);
    const fx = player.facing ? player.facing.x : 0, fy = player.facing ? player.facing.y : 1;
    for (const s of player.shadows) {
      if (!s || !s.active) continue;
      seenFigures.add(s);
      let m = shadowMeshes.get(s);
      if (!m) { m = Fig.forShadow(s); scene.add(m); shadowMeshes.set(s, m); }
      Fig.shadow(m, s, dt, isLegion, fx, fy);
    }
  }
  pruneMap(shadowMeshes, seenFigures);

  // Projectiles
  const activeProj = new Set();
  for (const p of (projectiles || [])) {
    activeProj.add(p);
    let m = projectileMeshes.get(p);
    if (!m) {
      m = new THREE.Mesh(geoProjectile, new THREE.MeshBasicMaterial({ color: p.color || 0xffffff }));
      scene.add(m); projectileMeshes.set(p, m);
    }
    const r = p.size || 5; m.scale.set(r, r, r); m.position.set(p.x, 12, p.y); m.material.color.set(p.color || 0xffffff);
  }
  pruneMap(projectileMeshes, activeProj);

  // Orbs: gold, health, and gear (an octahedron in the colour of its rarity, turning slowly)
  const activeOrbs = new Set();
  for (const o of (orbs || [])) {
    activeOrbs.add(o);
    let m = orbMeshes.get(o);
    const gear = o.type === 'gear';
    const col = gear ? (GEAR_HEX3D[o.item ? o.item.rarity : 0] || GEAR_HEX3D[0]) : o.type === 'gold' ? 0xffcc00 : 0x44ff66;
    if (!m) {
      m = new THREE.Mesh(gear ? geoGear : geoOrb, new THREE.MeshBasicMaterial({ color: col }));
      scene.add(m); orbMeshes.set(o, m);
    }
    m.material.color.set(col); m.position.set(o.x, gear ? 12 + Math.sin(gameClock * 4 + o.x) * 2 : 8, o.y);
    if (gear) m.rotation.y = gameClock * 2;
  }
  pruneMap(orbMeshes, activeOrbs);

  // Remnants
  const activeRem = new Set();
  for (const r of (remnants || [])) {
    activeRem.add(r);
    let m = remnantMeshes.get(r);
    if (!m) {
      m = new THREE.Mesh(geoRemnant, new THREE.MeshStandardMaterial({ color: 0x441166, emissive: 0x8844ff, emissiveIntensity: 0.8 }));
      scene.add(m); remnantMeshes.set(r, m);
    }
    m.position.set(r.x, 7, r.y);
  }
  pruneMap(remnantMeshes, activeRem);

  // Telegraphs
  const activeTele = new Set();
  for (const g of (telegraphs || [])) {
    activeTele.add(g);
    let m = telegraphMeshes.get(g);
    if (!m) {
      let geom;
      if (g.type === 'circle') { geom = new THREE.CircleGeometry(g.r || 50, 32); geom.rotateX(-Math.PI / 2); }
      else { geom = new THREE.PlaneGeometry(g.w || 20, g.len || 100); geom.rotateX(-Math.PI / 2); }
      const mat = new THREE.MeshBasicMaterial({ color: g.color || 0xff4444, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false });
      m = new THREE.Mesh(geom, mat); m.userData.disposeGeom = true;
      scene.add(m); telegraphMeshes.set(g, m);
    }
    const p = Math.max(0, Math.min(1, g.dur ? g.t / g.dur : 0));
    m.material.opacity = 0.15 + 0.40 * p; m.material.color.set(g.color || 0xff4444);
    if (g.type === 'circle') {
      m.position.set(g.x, 1.2, g.y);
    } else {
      const d = Math.hypot(g.ax, g.ay) || 1, nx = g.ax / d, nz = g.ay / d;
      const mx = g.x + nx * (g.len || 100) * 0.5, mz = g.y + nz * (g.len || 100) * 0.5;
      m.position.set(mx, 1.2, mz); m.lookAt(mx + nx, 1.2, mz + nz);
    }
  }
  pruneMap(telegraphMeshes, activeTele);

  // Zones
  const activeZones = new Set();
  for (const z of (typeof zones !== 'undefined' ? zones : [])) {
    activeZones.add(z);
    let m = zoneMeshes.get(z);
    if (!m) {
      if (z.type === 'circle' && z.kind === 'web') {
        const discG = new THREE.CircleGeometry(z.r || 50, 32); discG.rotateX(-Math.PI / 2);
        const discM = new THREE.MeshBasicMaterial({ color: 0xd8d0e8, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
        const dm = new THREE.Mesh(discG, discM); dm.userData.disposeGeom = true; dm.userData.baseOpacity = 0.12;
        const wireG = new THREE.CircleGeometry(z.r || 50, 7); wireG.rotateX(-Math.PI / 2);
        const wireM = new THREE.MeshBasicMaterial({ color: 0xd8d0e8, wireframe: true, transparent: true, opacity: 0.6, depthWrite: false });
        const wm = new THREE.Mesh(wireG, wireM); wm.userData.disposeGeom = true; wm.userData.baseOpacity = 0.6;
        wm.position.y = 0.3;
        m = new THREE.Group();
        m.add(dm); m.add(wm);
      } else {
        let geom;
        if (z.type === 'circle') { geom = new THREE.CircleGeometry(z.r || 50, 32); geom.rotateX(-Math.PI / 2); }
        else { geom = new THREE.PlaneGeometry(z.w || 20, z.len || 100); geom.rotateX(-Math.PI / 2); }
        const col = z.kind === 'web' ? 0xd8d0e8 : z.kind === 'fire' ? 0xff6622 : z.kind === 'rubble' ? 0x8a7a66 : z.kind === 'blood' ? 0xaa1133 : (z.color || 0xff4444);
        const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
        m = new THREE.Mesh(geom, mat); m.userData.disposeGeom = true; m.userData.baseOpacity = 0.3;
      }
      scene.add(m); zoneMeshes.set(z, m);
    }
    const a = clamp(Math.min(z.t / 0.3, (z.dur - z.t) / 0.6), 0, 1);
    if (m.isGroup) {
      for (const c of m.children) c.material.opacity = (c.userData.baseOpacity || 0.3) * a;
    } else {
      const base = z.kind === 'fire' ? 0.3 + 0.12 * Math.sin(clock * 9 + z.x) : (m.userData.baseOpacity || 0.3);
      m.material.opacity = base * a;
    }
    if (z.type === 'circle') {
      m.position.set(z.x, 0.8, z.y);
    } else {
      const d = Math.hypot(z.ax, z.ay) || 1, nx = z.ax / d, nz = z.ay / d;
      const mx = z.x + nx * (z.len || 100) * 0.5, mz = z.y + nz * (z.len || 100) * 0.5;
      m.position.set(mx, 0.8, mz); m.lookAt(mx + nx, 0.8, mz + nz);
    }
  }
  pruneMap(zoneMeshes, activeZones);

  renderer.render(scene, camera3D);
  drawFx3D();
}

const _pv = new THREE.Vector3();
// World (x, y) at height h -> overlay pixels, or null when behind the camera
function toScreen(x, y, h) {
  _pv.set(x, h || 0, y).project(camera3D);
  if (_pv.z > 1 || _pv.z < -1) return null;
  return [(_pv.x + 1) / 2 * W, (1 - _pv.y) / 2 * H];
}

function drawFx3D() {
  if (typeof ctx === 'undefined' || !ctx) return;
  const dpr = typeof DPR !== 'undefined' ? DPR : (window.devicePixelRatio || 1);
  const w = typeof W !== 'undefined' ? W : window.innerWidth;
  const h = typeof H !== 'undefined' ? H : window.innerHeight;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  if (typeof gameState === 'undefined' || gameState !== 'DUNGEON' || typeof dungeon === 'undefined' || !dungeon) {
    try {
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
      drawPortal(hubImg3D.complete && hubImg3D.naturalWidth ? hubImg3D : null);
      drawMotes(COLORS.primary, COLORS.accent, 0);
    } catch (e) {}
    return;
  }

  try {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function pxPer(x, y) {
      const p0 = toScreen(x, y, 0);
      const p1 = toScreen(x, y, 10);
      if (!p0 || !p1) return 1;
      return Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 10;
    }

    // 3. Rings
    if (typeof rings !== 'undefined' && rings) {
      for (const r of rings) {
        const p = r.t / r.dur;
        const rad = r.r0 + (r.r1 - r.r0) * (1 - (1 - p) * (1 - p));
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.w * (1 - p) + 1;

        let ok = true;
        const pts = [];
        for (let i = 0; i < 40; i++) {
          const ang = (i / 40) * Math.PI * 2;
          const pt = toScreen(r.x + Math.cos(ang) * rad, r.y + Math.sin(ang) * rad, 2);
          if (!pt) { ok = false; break; }
          pts.push(pt);
        }
        if (ok && pts.length > 0) {
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    // 3a. Dodge afterimages
    if (typeof ghosts !== 'undefined' && ghosts) {
      for (const g of ghosts) {
        const p0 = toScreen(g.x, g.y, 0), p1 = toScreen(g.x, g.y, 75);
        if (!p0 || !p1) continue;
        const hh = p0[1] - p1[1];
        if (hh <= 0) continue;
        const a = (1 - g.t / g.dur) * 0.4;
        ctx.fillStyle = '#00d4ff';
        // A faint wider glow first (same shapes, radii x1.6, alpha x0.35)
        ctx.globalAlpha = a * 0.35;
        ctx.beginPath(); ctx.ellipse(p0[0], p0[1] - hh * 0.42, hh * 0.17 * 1.6, hh * 0.34 * 1.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(p0[0], p0[1] - hh * 0.86, hh * 0.11 * 1.6, 0, Math.PI * 2); ctx.fill();
        // Body and head
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.ellipse(p0[0], p0[1] - hh * 0.42, hh * 0.17, hh * 0.34, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(p0[0], p0[1] - hh * 0.86, hh * 0.11, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 3c. Arise light pillars
    if (typeof pillarFx !== 'undefined' && pillarFx) {
      for (const pl of pillarFx) {
        const hgt = pl.big ? 380 : 240;
        const width = (pl.big ? 70 : 40) * pxPer(pl.x, pl.y);
        const p0 = toScreen(pl.x, pl.y, 0), p1 = toScreen(pl.x, pl.y, hgt);
        if (!p0 || !p1) continue;
        const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
        const len = Math.hypot(dx, dy);
        if (len < 1e-3) continue;
        const s = Math.sin(Math.PI * pl.t / pl.dur);
        if (s <= 0) continue;

        ctx.save();
        ctx.translate(p0[0], p0[1]);
        ctx.rotate(Math.atan2(dx, -dy));

        const g1 = ctx.createLinearGradient(0, 0, 0, -len);
        g1.addColorStop(0, COLORS.accent);
        g1.addColorStop(1, 'rgba(136,68,255,0)');
        ctx.globalAlpha = 0.55 * s;
        ctx.fillStyle = g1;
        ctx.fillRect(-width / 2, -len, width, len);

        const g2 = ctx.createLinearGradient(0, 0, 0, -len);
        g2.addColorStop(0, '#ddbbff');
        g2.addColorStop(1, 'rgba(221,187,255,0)');
        ctx.globalAlpha = 0.7 * s;
        ctx.fillStyle = g2;
        const cw = width * 0.28;
        ctx.fillRect(-cw / 2, -len, cw, len);

        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // 3b. The floor mark under the enemy the hunter has squared up to
    if (typeof player !== 'undefined' && player && player.target && player.target.alive) {
      const t = player.target, markR = (t.size || 14) + 10;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,212,255,0.55)';
      ctx.lineWidth = 2;
      let ok = true;
      const pts = [];
      for (let i = 0; i < 40; i++) {
        const ang = (i / 40) * Math.PI * 2;
        const pt = toScreen(t.x + Math.cos(ang) * markR, t.y + Math.sin(ang) * markR, 2);
        if (!pt) { ok = false; break; }
        pts.push(pt);
      }
      if (ok && pts.length > 0) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
    }

    // 4. Slash arcs
    if (typeof arcs !== 'undefined' && arcs) {
      for (const a of arcs) {
        const p = a.t / a.dur;
        const sweep = a.span * Math.min(1, p * 2.4);
        const s0 = a.a - a.dir * a.span / 2;
        const s1 = s0 + a.dir * sweep;
        const lo = Math.min(s0, s1);
        const hi = Math.max(s0, s1);
        const al = 1 - p;

        const passes = [
          { r: a.r * 0.76, color: a.color, alpha: al * 0.35, w: a.w * 1.7 },
          { r: a.r * 0.86, color: a.color, alpha: al * 0.9, w: a.w * (1 - p) + 1 },
          { r: a.r * 0.92, color: '#ffffff', alpha: al, w: a.w * (1 - p) * 0.35 + 1 }
        ];

        for (const pass of passes) {
          ctx.strokeStyle = pass.color;
          ctx.globalAlpha = pass.alpha;
          ctx.lineWidth = pass.w;

          let ok = true;
          const pts = [];
          for (let i = 0; i < 16; i++) {
            const ang = lo + (i / 15) * (hi - lo);
            const pt = toScreen(a.x + Math.cos(ang) * pass.r, a.y + Math.sin(ang) * pass.r, 16);
            if (!pt) { ok = false; break; }
            pts.push(pt);
          }
          if (ok && pts.length > 0) {
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) {
              ctx.lineTo(pts[i][0], pts[i][1]);
            }
            ctx.stroke();
          }
        }
      }
    }

    // 5. Bolts
    if (typeof bolts !== 'undefined' && bolts) {
      for (const b of bolts) {
        const al = 1 - b.t / b.dur;
        const scrPts = [];
        let ok = true;
        for (const q of b.pts) {
          const pt = toScreen(q[0], q[1], 18);
          if (!pt) { ok = false; break; }
          scrPts.push(pt);
        }
        if (ok && scrPts.length > 0) {
          ctx.beginPath();
          scrPts.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]));
          ctx.strokeStyle = b.color;
          ctx.globalAlpha = al * 0.6;
          ctx.lineWidth = 5;
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.globalAlpha = al;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // 6. Particles
    if (typeof particles !== 'undefined' && particles) {
      const step = particles.length > 600 ? 2 : 1;
      for (let i = 0; i < particles.length; i += step) {
        const p = particles[i];
        const pt = toScreen(p.x, p.y, 12);
        if (!pt) continue;

        const k = p.life / p.max;
        const pxp = pxPer(p.x, p.y);

        if (p.type === 'spark') {
          const pt2 = toScreen(p.x - p.vx * 0.045, p.y - p.vy * 0.045, 12);
          if (!pt2) continue;
          ctx.globalAlpha = p.alpha * k;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, p.size * 0.7 * pxp);
          ctx.beginPath();
          ctx.moveTo(pt[0], pt[1]);
          ctx.lineTo(pt2[0], pt2[1]);
          ctx.stroke();
        } else if (p.type === 'glow') {
          const rGlow = Math.max(1, p.size * (0.4 + 0.6 * k) * pxp);
          ctx.globalAlpha = p.alpha * k;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], rGlow, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = p.alpha * k * 0.28;
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], p.size * 2.6 * pxp, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'smoke') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = p.alpha * k;
          ctx.fillStyle = p.color;
          const rSmoke = p.size * (1.7 - k * 0.7) * pxp;
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], Math.max(0.1, rSmoke), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
        }
      }
    }

    // 7. Reset to source-over
    ctx.globalCompositeOperation = 'source-over';

    // 8. Texts
    if (typeof texts !== 'undefined' && texts) {
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      for (const t of texts) {
        const pt = toScreen(t.x, t.y, 36);
        if (!pt) continue;

        const pop = 1 + 0.6 * Math.max(0, 1 - t.t / 0.12);
        ctx.globalAlpha = Math.min(1, (t.dur - t.t) / 0.3);
        ctx.font = `bold ${Math.round(t.size * pop)}px Orbitron, monospace`;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(t.text, pt[0], pt[1]);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, pt[0], pt[1]);
      }
      ctx.textAlign = 'left';
    }

    // 8b. Between chambers: an arrow to the door out, then to the next chamber, and at the end to the way to the boss
    if (typeof layout !== 'undefined' && layout && layout.lock < 0 && dungeon.state === 'fight' && !(dungeon.bossRef && dungeon.bossRef.alive)) {
      const k = dungeon.wave - 1, d = layout.doors[2 * k], boss = dungeon.wave >= dungeon.maxWaves;
      let tx, ty;
      if (roomAt(player.x, player.y) === k) { tx = (d.x0 + d.x1) / 2; ty = (d.y0 + d.y1) / 2; }
      else if (boss) { tx = layout.exit.x; ty = layout.exit.y; }
      else { const r = layout.rooms[dungeon.wave]; tx = (r.x0 + r.x1) / 2; ty = (r.y0 + r.y1) / 2; }
      const col = boss ? '#ffcc33' : ((typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : '#00d4ff');
      const far = dist(player.x, player.y, tx, ty), sp = toScreen(tx, ty, 70);
      ctx.fillStyle = col; ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
      if (sp && sp[0] > 40 && sp[0] < w - 40 && sp[1] > 40 && sp[1] < h - 40) {
        // the target is on screen: a small marker bobbing above it, pointing down
        const bob = Math.sin(clock * 4) * 5;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(sp[0], sp[1] + 12 + bob); ctx.lineTo(sp[0] - 10, sp[1] - 6 + bob); ctx.lineTo(sp[0] + 10, sp[1] - 6 + bob); ctx.closePath(); ctx.fill();
      } else if (far > 1) {
        // off screen (or behind the camera): an arrow at the screen edge, in the direction the hunter must walk
        const ux = (tx - player.x) / far, uy = (ty - player.y) / far;
        const p0 = toScreen(player.x, player.y, 0), p1 = toScreen(player.x + ux * 150, player.y + uy * 150, 0);
        if (p0 && p1) {
          const a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), mg = 70;
          const kk = Math.min((w / 2 - mg) / Math.abs(Math.cos(a) || 1e-6), (h / 2 - mg) / Math.abs(Math.sin(a) || 1e-6));
          ctx.save(); ctx.translate(w / 2 + Math.cos(a) * kk, h / 2 + Math.sin(a) * kk);
          ctx.globalAlpha = 0.7 + 0.3 * Math.sin(clock * 6);
          ctx.fillText(Math.round(far / 10) + 'm', 0, -22);
          ctx.rotate(a); ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    drawMinimap();

    // 9. Screen flash
    if (typeof screenFlash !== 'undefined' && screenFlash && screenFlash.alpha > 0) {
      ctx.globalAlpha = Math.min(1, screenFlash.alpha);
      ctx.fillStyle = screenFlash.color;
      ctx.fillRect(0, 0, w, h);
    }

    // 10. End with ctx.globalAlpha = 1
    ctx.globalAlpha = 1;
  } catch (err) {
    if (!drawFx3D.warned) {
      drawFx3D.warned = true;
      console.error('[ARISE 3D fx]', err);
    }
  }
}
