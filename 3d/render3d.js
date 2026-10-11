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

const hintEl = document.querySelector('.hud-hint');
if (hintEl) hintEl.innerHTML += ' &nbsp;·&nbsp; Z / C TURN CAMERA &nbsp;·&nbsp; V RESET';


// Floor and walls
let currentGate = null, floorTexture = null, floorMesh = null;
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.85 });
const wallMeshes = [], floorGroup = new THREE.Group();
scene.add(floorGroup);
let lastArenaW = 0, lastArenaH = 0, lastLine = '';
let lastFloorKey = '', lastLayoutRef = null;
const layoutMeshes = []; // floor pieces, door bars and the exit light of a layout

function clearFloorAndWalls() {
  if (floorMesh) { floorGroup.remove(floorMesh); floorMesh.geometry.dispose(); floorMesh = null; }
  while (wallMeshes.length) { const wm = wallMeshes.pop(); floorGroup.remove(wm); wm.geometry.dispose(); wm.material.dispose(); }
  while (layoutMeshes.length) { const m = layoutMeshes.pop(); floorGroup.remove(m); m.geometry.dispose(); if (m.material !== floorMaterial) m.material.dispose(); }
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

  const wallMat = new THREE.MeshBasicMaterial({ color: line, transparent: true, opacity: 0.65 });
  const wallH = 30, t = 2;
  for (const s of L.walls) {
    const horiz = s.y0 === s.y1, len = horiz ? Math.abs(s.x1 - s.x0) : Math.abs(s.y1 - s.y0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(horiz ? len : t, wallH, horiz ? t : len), wallMat);
    m.position.set((s.x0 + s.x1) / 2, wallH / 2, (s.y0 + s.y1) / 2); floorGroup.add(m); wallMeshes.push(m);
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
}

function buildFloor(g) {
  currentGate = g;
  floorMaterial.map = null; floorMaterial.color.set(0x111118); floorMaterial.needsUpdate = true;
  const url = 'assets/floors/' + (g.floor || g.id) + '.webp';
  new THREE.TextureLoader().load(url, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    floorTexture = tex;
    const w = typeof arenaW !== 'undefined' ? arenaW : 1400;
    const h = typeof arenaH !== 'undefined' ? arenaH : 1000;
    if (typeof layout !== 'undefined' && layout) tex.repeat.set(1, 1); else tex.repeat.set(w / 384, h / 384);
    floorMaterial.map = tex; floorMaterial.color.set(0xffffff); floorMaterial.needsUpdate = true;
  }, undefined, () => {
    floorTexture = null; floorMaterial.map = null; floorMaterial.color.set(0x111118); floorMaterial.needsUpdate = true;
  });
}

// Hunter
const hunterGroup = new THREE.Group(); scene.add(hunterGroup);
hunterGroup.scale.set(1.6, 1.6, 1.6);
const hunterMat = new THREE.MeshStandardMaterial({
  color: (typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : 0x00d4ff,
  emissive: (typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : 0x00d4ff,
  emissiveIntensity: 0.5, roughness: 0.4
});
const hBodyGeom = new THREE.CylinderGeometry(5, 6, 22, 16); hBodyGeom.translate(0, 15, 0);
hunterGroup.add(new THREE.Mesh(hBodyGeom, hunterMat));
const hHeadGeom = new THREE.SphereGeometry(5.5, 16, 16); hHeadGeom.translate(0, 31, 0);
hunterGroup.add(new THREE.Mesh(hHeadGeom, hunterMat));
const swordPivot = new THREE.Group(); swordPivot.position.set(9, 16, 2); hunterGroup.add(swordPivot);
const swordGeom = new THREE.BoxGeometry(2, 26, 4); swordGeom.translate(0, 11, 4);
swordPivot.add(new THREE.Mesh(swordGeom, hunterMat));

// Shared geometries
const geoSphere = new THREE.SphereGeometry(1, 16, 16), geoCone = new THREE.ConeGeometry(1, 2, 16);
const geoCharger = new THREE.ConeGeometry(1, 2, 16); geoCharger.rotateX(Math.PI / 2);
const geoBox = new THREE.BoxGeometry(1.8, 1.8, 1.8), geoIcosa = new THREE.IcosahedronGeometry(1, 0);
const geoOcta = new THREE.OctahedronGeometry(1, 0), geoDodeca = new THREE.DodecahedronGeometry(1, 0);
const geoRing = new THREE.RingGeometry(1.1, 1.4, 32); geoRing.rotateX(-Math.PI / 2);
const geoProjectile = new THREE.SphereGeometry(1, 10, 10), geoOrb = new THREE.SphereGeometry(6, 12, 12);
const geoRemnant = new THREE.ConeGeometry(7, 14, 12);

// Entity tracking maps
const enemyMeshes = new Map(), shadowMeshes = new Map(), projectileMeshes = new Map();
const orbMeshes = new Map(), remnantMeshes = new Map(), telegraphMeshes = new Map();

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

function createMeshForKind(kind, isBoss, color) {
  const mat = new THREE.MeshStandardMaterial({ color: color || 0xffffff, roughness: 0.5 });
  if (isBoss) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(geoDodeca, mat);
    const ringMat = new THREE.MeshBasicMaterial({ color: color || 0xff4455, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geoRing, ringMat); ring.position.y = 1;
    group.add(body); group.add(ring);
    group.userData = { isBoss: true, body, ring, mat, ringMat };
    return group;
  }
  const geoms = { ranged: geoCone, charger: geoCharger, bomber: geoIcosa, brute: geoBox, caster: geoOcta, boss: geoDodeca };
  const mesh = new THREE.Mesh(geoms[kind] || geoSphere, mat);
  mesh.userData = { mat };
  return mesh;
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
    [enemyMeshes, shadowMeshes, projectileMeshes, orbMeshes, remnantMeshes, telegraphMeshes].forEach(m => pruneMap(m, emptySet));
    renderer.render(scene, camera3D);
    drawFx3D();
    return;
  }

  if ((typeof paused === 'undefined' || !paused) && typeof keys !== 'undefined') {
    if (keys['z']) view3D.yaw -= 1.8 * dt;
    if (keys['c']) view3D.yaw += 1.8 * dt;
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
    if (player.facing && (player.facing.x || player.facing.y)) {
      hunterGroup.rotation.y = Math.atan2(player.facing.x, player.facing.y);
    }
    let hc = (typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : 0x00d4ff;
    if (player.hitFlash > 0) hc = 0xff2222;
    else if (player.ultT > 0) hc = 0xbb66ff;
    hunterMat.color.set(hc); hunterMat.emissive.set(hc);
    hunterMat.emissiveIntensity = (player.hitFlash > 0 || player.ultT > 0) ? 0.9 : 0.45;

    if (player.atkT > 0) {
      const p = player.atkDur ? Math.max(0, Math.min(1, 1 - player.atkT / player.atkDur)) : 0;
      swordPivot.rotation.set(0.3, -1.2 + p * 2.443, -0.3);
    } else {
      swordPivot.rotation.set(-0.3, 0, 0);
    }
    hunterGroup.visible = !(dungeon.state === 'dead');
    hunterLight.position.set(player.x, 30, player.y);
    hunterLight.color.set(player.ultT > 0 ? 0xbb66ff : ((typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : 0x00d4ff));
  } else {
    hunterGroup.visible = false;
  }

  // Enemies
  const activeEnemies = new Set();
  for (const e of (enemies || [])) {
    if (!e || e.alive === false) continue;
    activeEnemies.add(e);
    let m = enemyMeshes.get(e);
    if (!m) { m = createMeshForKind(e.kind, e.isBoss, e.color); scene.add(m); enemyMeshes.set(e, m); }
    const sz = e.size || 14, grow = e.spawnT > 0 ? Math.max(0.01, 1 - e.spawnT / 0.55) : 1, s = sz * grow;
    const mat = m.userData.mat;
    mat.color.set(e.color || 0xffffff);
    if (e.hitFlash > 0) { mat.emissive.set(0xffffff); mat.emissiveIntensity = 1.0; }
    else if (e.elite) { mat.emissive.set(0xffaa00); mat.emissiveIntensity = 0.6; }
    else { mat.emissive.set(0x000000); mat.emissiveIntensity = 0; }

    if (e.isBoss) {
      m.position.set(e.x, 0, e.y);
      m.userData.body.position.set(0, s + 4, 0); m.userData.body.scale.set(s, s, s);
      m.userData.ring.scale.set(s, s, s); m.userData.ringMat.color.set(e.color || 0xff4455);
    } else {
      let py = s;
      if (e.kind === 'caster') { py = s + 12 + Math.sin(clock * 4 + e.x) * 4; m.rotation.y = clock * 1.5; }
      else if (e.kind === 'brute') { py = s * 0.9; }
      else if (e.kind === 'charger' && e.facing) { m.rotation.y = Math.atan2(e.facing.x, e.facing.y); }
      else if (e.kind === 'bomber') {
        const bs = s * (1 + 0.18 * Math.sin(clock * 10));
        m.position.set(e.x, bs, e.y); m.scale.set(bs, bs, bs); continue;
      }
      m.position.set(e.x, py, e.y); m.scale.set(s, s, s);
    }
  }
  pruneMap(enemyMeshes, activeEnemies);

  // Shadows
  const activeShadows = new Set();
  if (player && player.shadows) {
    const isLegion = typeof legionTimer !== 'undefined' && legionTimer > 0;
    for (const s of player.shadows) {
      if (!s || !s.active) continue;
      activeShadows.add(s);
      let m = shadowMeshes.get(s);
      if (!m) { m = createMeshForKind(s.kind || 'melee', false, 0x1a052e); scene.add(m); shadowMeshes.set(s, m); }
      const rad = s.kind === 'boss' ? 28 : (s.size || 14);
      m.userData.mat.color.set(0x1a052e); m.userData.mat.emissive.set(0x8844ff);
      m.userData.mat.emissiveIntensity = isLegion ? 1.4 : 0.6;
      m.scale.set(rad, rad, rad);
      let py = s.kind === 'caster' ? rad + 12 : s.kind === 'brute' ? rad * 0.9 : rad;
      m.position.set(s.x, py, s.y);
      if (s.facing) m.rotation.y = Math.atan2(s.facing.x, s.facing.y);
    }
  }
  pruneMap(shadowMeshes, activeShadows);

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

  // Orbs
  const activeOrbs = new Set();
  for (const o of (orbs || [])) {
    activeOrbs.add(o);
    let m = orbMeshes.get(o);
    const col = o.type === 'gold' ? 0xffcc00 : 0x44ff66;
    if (!m) {
      m = new THREE.Mesh(geoOrb, new THREE.MeshBasicMaterial({ color: col }));
      scene.add(m); orbMeshes.set(o, m);
    }
    m.material.color.set(col); m.position.set(o.x, 8, o.y);
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
