'use strict';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.domElement.id = 'gl';
renderer.domElement.style.cssText = 'position:fixed; top:0; left:0; z-index:1; display:block;';
document.body.appendChild(renderer.domElement);

const _gameCanvas = document.getElementById('gameCanvas');
if (_gameCanvas) _gameCanvas.style.display = 'none';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06060c);
scene.fog = new THREE.Fog(0x06060c, 900, 2600);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8); dirLight.position.set(0, 1000, 500); scene.add(dirLight);
const hunterLight = new THREE.PointLight((typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : 0x00d4ff, 1.8, 650); scene.add(hunterLight);
const camera3D = new THREE.PerspectiveCamera(50, 1, 10, 6000); scene.add(camera3D);

// Floor and walls
let currentGate = null, floorTexture = null, floorMesh = null;
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.85 });
const wallMeshes = [], floorGroup = new THREE.Group();
scene.add(floorGroup);
let lastArenaW = 0, lastArenaH = 0, lastLine = '';

function rebuildFloorAndWalls(w, h, line) {
  lastArenaW = w; lastArenaH = h; lastLine = line;
  if (floorMesh) { floorGroup.remove(floorMesh); floorMesh.geometry.dispose(); floorMesh = null; }
  while (wallMeshes.length) { const wm = wallMeshes.pop(); floorGroup.remove(wm); wm.geometry.dispose(); wm.material.dispose(); }

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

function buildFloor(g) {
  currentGate = g;
  floorMaterial.map = null; floorMaterial.color.set(0x111118); floorMaterial.needsUpdate = true;
  const url = '../assets/floors/' + (g.floor || g.id) + '.webp';
  new THREE.TextureLoader().load(url, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    floorTexture = tex;
    const w = typeof arenaW !== 'undefined' ? arenaW : 1400;
    const h = typeof arenaH !== 'undefined' ? arenaH : 1000;
    tex.repeat.set(w / 384, h / 384);
    floorMaterial.map = tex; floorMaterial.color.set(0xffffff); floorMaterial.needsUpdate = true;
  }, undefined, () => {
    floorTexture = null; floorMaterial.map = null; floorMaterial.color.set(0x111118); floorMaterial.needsUpdate = true;
  });
}

// Hunter
const hunterGroup = new THREE.Group(); scene.add(hunterGroup);
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

let lastW = 0, lastH = 0;

function draw() {
  const curW = typeof W !== 'undefined' ? W : window.innerWidth;
  const curH = typeof H !== 'undefined' ? H : window.innerHeight;
  const curDPR = typeof DPR !== 'undefined' ? DPR : (window.devicePixelRatio || 1);
  if (curW !== lastW || curH !== lastH) {
    lastW = curW; lastH = curH;
    renderer.setPixelRatio(curDPR); renderer.setSize(curW, curH);
    camera3D.aspect = curW / (curH || 1); camera3D.updateProjectionMatrix();
  }

  if (typeof gameState === 'undefined' || gameState !== 'DUNGEON' || typeof dungeon === 'undefined' || !dungeon) {
    hunterGroup.visible = false;
    const emptySet = new Set();
    [enemyMeshes, shadowMeshes, projectileMeshes, orbMeshes, remnantMeshes, telegraphMeshes].forEach(m => pruneMap(m, emptySet));
    renderer.render(scene, camera3D);
    return;
  }

  // Camera
  const camX = (typeof camera !== 'undefined' && camera) ? camera.x : 0;
  const camY = (typeof camera !== 'undefined' && camera) ? camera.y : 0;
  const sh = (typeof camera !== 'undefined' && camera && camera.shake) ? camera.shake : 0;
  const sx = sh ? (Math.random() * 2 - 1) * sh : 0, sy = sh ? (Math.random() * 2 - 1) * sh : 0;
  camera3D.position.set(camX + sx, 20 + 430 + sy, camY + 560);
  camera3D.lookAt(camX, 20, camY);

  // Floor & walls rebuild if arena dimensions change
  const curArenaW = typeof arenaW !== 'undefined' ? arenaW : 1400;
  const curArenaH = typeof arenaH !== 'undefined' ? arenaH : 1000;
  const curLine = (dungeon.gate && dungeon.gate.theme && dungeon.gate.theme.line)
    ? dungeon.gate.theme.line
    : ((typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : '#00d4ff');
  if (curArenaW !== lastArenaW || curArenaH !== lastArenaH || curLine !== lastLine || !floorMesh) {
    rebuildFloorAndWalls(curArenaW, curArenaH, curLine);
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
}
