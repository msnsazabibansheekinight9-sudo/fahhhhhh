'use strict';
// ============================================================================
// Avatars — blocky R6-style characters built from six parts, animated by hand.
//
// Proportions are in studs and match the hitboxes in weapons.js: legs to 3,
// torso 3-5, head 5-6.2. Death is the authentic Roblox one — the character
// comes apart into its parts and they tumble.
// ============================================================================

R.TEAM_COLORS = {
  blue: { shirt: '#2f6fd0', pants: '#1f3f7a', accent: '#7fb0ff', name: 'BLUE' },
  red: { shirt: '#c8352c', pants: '#7a1f1a', accent: '#ff9a8f', name: 'RED' },
  green: { shirt: '#3f9a4a', pants: '#24632c', accent: '#9fe6a6', name: 'GREEN' },
  yellow: { shirt: '#d8b02a', pants: '#8a6a12', accent: '#ffe79a', name: 'YELLOW' },
};
const SKIN = '#f3c98b';

// Charms and skins the shop sells. Purely cosmetic, exactly like the real ones.
R.CHARMS = [
  { id: 'none', name: 'None', cost: 0, owned: true },
  { id: 'cube', name: 'Spinning Cube', cost: 40, color: '#ffd24a' },
  { id: 'heart', name: 'Pixel Heart', cost: 60, color: '#ff4a7a' },
  { id: 'skull', name: 'Tiny Skull', cost: 90, color: '#f0f0e8' },
  { id: 'star', name: 'Gold Star', cost: 140, color: '#ffe066' },
  { id: 'orb', name: 'Void Orb', cost: 220, color: '#b388ff' },
  { id: 'crown', name: 'Crown', cost: 400, color: '#ffc81e' },
];

R.SKINS = [
  { id: 'default', name: 'Default', cost: 0, owned: true },
  { id: 'noob', name: 'Noob', cost: 25, shirt: '#2fb0d8', pants: '#3fa02f' },
  { id: 'ghost', name: 'Ghost', cost: 120, shirt: '#e8e8f0', pants: '#c0c0d0', skin: '#e8e8f0' },
  { id: 'carbon', name: 'Carbon', cost: 180, shirt: '#1c1c20', pants: '#101014', skin: '#3a3a40' },
  { id: 'neon', name: 'Neon', cost: 300, shirt: '#19ffb0', pants: '#0a8a60', skin: '#d8fff0' },
  { id: 'gold', name: 'Midas', cost: 650, shirt: '#e0b020', pants: '#a07a10', skin: '#f0d070' },
];

function brick(w, h, d, color, surface) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), R.tiledMat(color, surface || 'plastic', Math.max(w, d), h));
  m.castShadow = R.settings.quality !== 'low';
  return m;
}

// R6 proportions, in studs, exactly as Roblox builds a classic character:
// legs 1x2x1 from the floor to 2, torso 2x2x1 from 2 to 4, arms 1x2x1 beside
// it, head on top to 5.25. A character is five and a quarter studs tall and
// the eyes sit at 4.6, which is what the camera and the hitboxes use.
R.R6 = { leg: 2, torso: 2, head: 1.25, total: 5.25, eye: 4.6 };

R.buildAvatar = function (opts) {
  opts = opts || {};
  const team = R.TEAM_COLORS[opts.team] || R.TEAM_COLORS.blue;
  const skin = R.SKINS.find(s => s.id === (opts.skin || 'default')) || R.SKINS[0];
  const shirt = skin.shirt || team.shirt;
  const pants = skin.pants || team.pants;
  const flesh = skin.skin || SKIN;

  const g = new THREE.Group();
  const parts = {};

  // Torso: the 2 x 2 x 1 brick, centred at y 3.
  parts.torso = brick(2, 2, 1, shirt);
  parts.torso.position.set(0, 3, 0);

  // Head: a 1.5 x 1.25 x 1.25 block with the face decal on the front.
  const headG = new THREE.Group();
  parts.head = brick(1.5, 1.25, 1.25, flesh);
  headG.add(parts.head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.2), R.faceMaterial(opts.face || 'smile'));
  face.position.z = 0.63;
  headG.add(face);
  headG.position.set(0, 4.625, 0);
  parts.headG = headG;

  // Hats and hair, so skins read at a glance.
  if (skin.id === 'noob') {
    const hat = brick(1.7, 0.3, 1.7, '#d8d8d8'); hat.position.y = 0.78; headG.add(hat);
  } else if (skin.id === 'carbon' || skin.id === 'gold') {
    const cap = brick(1.6, 0.35, 1.4, skin.id === 'gold' ? '#ffd24a' : '#26262c');
    cap.position.y = 0.76; headG.add(cap);
    const peak = brick(1.5, 0.14, 0.7, skin.id === 'gold' ? '#ffd24a' : '#26262c');
    peak.position.set(0, 0.64, 0.86); headG.add(peak);
  } else if (skin.id === 'neon' || skin.id === 'ghost') {
    const halo = brick(1.62, 0.18, 1.36, skin.id === 'neon' ? '#19ffb0' : '#e8e8f0');
    halo.position.y = 0.74; headG.add(halo);
  }

  // Limbs pivot at the shoulder and hip, with the brick hung below the pivot.
  const limb = (w, h, d, color, sleeveCol) => {
    const pivot = new THREE.Group();
    const m = brick(w, h, d, color);
    m.position.y = -h / 2;
    pivot.add(m);
    return pivot;
  };
  parts.armL = limb(1, 2, 1, shirt); parts.armL.position.set(-1.5, 4, 0);
  parts.armR = limb(1, 2, 1, shirt); parts.armR.position.set(1.5, 4, 0);
  parts.legL = limb(1, 2, 1, pants); parts.legL.position.set(-0.5, 2, 0);
  parts.legR = limb(1, 2, 1, pants); parts.legR.position.set(0.5, 2, 0);
  // Classic two-tone limbs: a hand at the end of each arm, a shoe on each leg.
  for (const k of ['armL', 'armR']) {
    const hand = brick(1.02, 0.55, 1.02, flesh);
    hand.position.y = -1.72; parts[k].add(hand);
  }
  for (const k of ['legL', 'legR']) {
    const shoe = brick(1.04, 0.4, 1.16, '#23232a');
    shoe.position.set(0, -1.8, 0.08); parts[k].add(shoe);
  }

  g.add(parts.torso, headG, parts.armL, parts.armR, parts.legL, parts.legR);

  const charmDef = R.CHARMS.find(c => c.id === (opts.charm || 'none'));
  if (charmDef && charmDef.id !== 'none') {
    const c = R.buildCharm(charmDef);
    c.position.set(0, 5.9, 0);
    g.add(c);
    parts.charm = c;
  }

  if (opts.tag) {
    const tag = R.makeNameTag(opts.tag, team.accent);
    tag.position.set(0, 6.5, 0);
    g.add(tag);
    parts.tag = tag;
  }

  g.userData.parts = parts;
  g.userData.team = opts.team;
  g.userData.anim = { t: 0, lean: 0, swing: 0 };
  return g;
};

// The Roblox face: two eyes and a mouth on a plane.
R._faceMats = {};
R.faceMaterial = function (kind) {
  if (R._faceMats[kind]) return R._faceMats[kind];
  const t = R._canvas(64, (x, s) => {
    x.clearRect(0, 0, s, s);
    x.fillStyle = '#1a1a1a';
    const ey = s * 0.36, ex = s * 0.26, er = s * 0.075;
    x.beginPath(); x.ellipse(s / 2 - ex, ey, er, er * 1.25, 0, 0, 7); x.fill();
    x.beginPath(); x.ellipse(s / 2 + ex, ey, er, er * 1.25, 0, 0, 7); x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath(); x.arc(s / 2 - ex + er * 0.3, ey - er * 0.4, er * 0.3, 0, 7); x.fill();
    x.beginPath(); x.arc(s / 2 + ex + er * 0.3, ey - er * 0.4, er * 0.3, 0, 7); x.fill();
    x.strokeStyle = '#1a1a1a'; x.lineWidth = s * 0.045; x.lineCap = 'round';
    x.beginPath();
    if (kind === 'angry') { x.moveTo(s * 0.36, s * 0.68); x.lineTo(s * 0.64, s * 0.68); }
    else if (kind === 'flat') { x.moveTo(s * 0.38, s * 0.66); x.lineTo(s * 0.62, s * 0.66); }
    else x.arc(s / 2, s * 0.56, s * 0.15, 0.25, Math.PI - 0.25);
    x.stroke();
    if (kind === 'angry') {
      x.lineWidth = s * 0.05;
      x.beginPath(); x.moveTo(s * 0.2, s * 0.2); x.lineTo(s * 0.36, s * 0.28); x.stroke();
      x.beginPath(); x.moveTo(s * 0.8, s * 0.2); x.lineTo(s * 0.64, s * 0.28); x.stroke();
    }
  });
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true });
  R._faceMats[kind] = m;
  return m;
};

R.buildCharm = function (def) {
  const g = new THREE.Group();
  const col = def.color || '#ffd24a';
  if (def.id === 'cube') g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), R.mat(col, 'neon')));
  else if (def.id === 'orb') g.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), R.mat(col, 'neon')));
  else if (def.id === 'heart') {
    for (const [dx, dy, s] of [[-0.16, 0.14, 0.34], [0.16, 0.14, 0.34], [0, -0.06, 0.42]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, 0.2), R.mat(col, 'neon'));
      m.position.set(dx, dy, 0); g.add(m);
    }
  } else if (def.id === 'skull') {
    const sk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.45), R.mat(col, 'plastic'));
    g.add(sk);
    for (const dx of [-0.13, 0.13]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.05), R.mat('#101010', 'neon'));
      e.position.set(dx, 0.05, 0.24); g.add(e);
    }
  } else if (def.id === 'star' || def.id === 'crown') {
    const n = def.id === 'star' ? 5 : 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.46, 0.14), R.mat(col, 'neon'));
      m.position.set(Math.cos(a) * 0.22, def.id === 'crown' ? 0.1 : Math.sin(a) * 0.22, 0);
      m.rotation.z = a; g.add(m);
    }
    if (def.id === 'crown') {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 10), R.mat(col, 'neon'));
      band.position.y = -0.12; g.add(band);
    }
  }
  g.userData.spin = true;
  return g;
};

R.makeNameTag = function (text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 72;
  const x = c.getContext('2d');
  const draw = (hp) => {
    x.clearRect(0, 0, 256, 72);
    x.font = 'bold 30px Inter, system-ui, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.75)';
    x.strokeText(text, 128, 24);
    x.fillStyle = color || '#ffffff';
    x.fillText(text, 128, 24);
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(48, 48, 160, 12);
    x.fillStyle = hp > 0.5 ? '#4ade80' : hp > 0.25 ? '#fbbf24' : '#ef4444';
    x.fillRect(50, 50, 156 * R.clamp(hp, 0, 1), 8);
  };
  draw(1);
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }));
  s.scale.set(5.2, 1.46, 1);
  s.userData = { canvas: c, ctx: x, tex: t, draw, hp: 1 };
  s.renderOrder = 10;
  return s;
};

R.setTagHealth = function (tag, hp) {
  if (!tag || Math.abs(tag.userData.hp - hp) < 0.01) return;
  tag.userData.hp = hp;
  tag.userData.draw(hp);
  tag.userData.tex.needsUpdate = true;
};

/* ------------------------- animation ------------------------- */
// Hand-authored cycles: a walk swing, an idle sway, a jump tuck, a slide
// crouch, and the held-weapon arm pose.

R.animateAvatar = function (group, state, dt) {
  const p = group.userData.parts;
  const a = group.userData.anim;
  const speed = state.speed || 0;
  a.t += dt * (0.7 + speed * 0.075);

  const walking = speed > 1.2 && state.grounded && !state.sliding;
  const sw = Math.sin(a.t * 6.2);
  const target = walking ? R.clamp(speed / 22, 0.3, 1.25) : 0;
  a.swing = R.damp(a.swing, target, 9, dt);

  // Legs
  if (state.sliding) {
    // Sliding folds the character down to about half height.
    p.legL.rotation.x = R.damp(p.legL.rotation.x, -1.3, 14, dt);
    p.legR.rotation.x = R.damp(p.legR.rotation.x, -0.6, 14, dt);
    p.torso.position.y = R.damp(p.torso.position.y, 1.5, 14, dt);
    p.headG.position.y = R.damp(p.headG.position.y, 2.6, 14, dt);
    p.armL.position.y = p.armR.position.y = R.damp(p.armR.position.y, 2.2, 14, dt);
    p.legL.position.y = p.legR.position.y = R.damp(p.legR.position.y, 1.0, 14, dt);
  } else {
    const air = !state.grounded;
    p.legL.rotation.x = R.damp(p.legL.rotation.x, air ? -0.5 : sw * 0.75 * a.swing, 12, dt);
    p.legR.rotation.x = R.damp(p.legR.rotation.x, air ? 0.35 : -sw * 0.75 * a.swing, 12, dt);
    p.torso.position.y = R.damp(p.torso.position.y, 3 + (walking ? Math.abs(sw) * 0.09 : Math.sin(a.t * 1.6) * 0.04), 10, dt);
    p.headG.position.y = R.damp(p.headG.position.y, 4.625 + (walking ? Math.abs(sw) * 0.08 : Math.sin(a.t * 1.6) * 0.035), 10, dt);
    p.armL.position.y = p.armR.position.y = R.damp(p.armR.position.y, 4, 10, dt);
    p.legL.position.y = p.legR.position.y = R.damp(p.legR.position.y, 2, 10, dt);
  }

  // Arms: the held-weapon pose points them forward; the free arm swings.
  const holding = state.holding !== false;
  const melee = state.melee;
  const swingFx = state.swingT ? Math.sin(R.clamp(state.swingT, 0, 1) * Math.PI) : 0;
  if (holding) {
    const pitch = -1.35 + (state.pitch || 0) * 0.55 - swingFx * (melee ? 1.5 : 0.35);
    p.armR.rotation.x = R.damp(p.armR.rotation.x, pitch, 14, dt);
    p.armR.rotation.z = R.damp(p.armR.rotation.z, 0.12, 12, dt);
    p.armL.rotation.x = R.damp(p.armL.rotation.x, melee ? -0.3 + sw * 0.4 * a.swing : pitch + 0.12, 14, dt);
    p.armL.rotation.z = R.damp(p.armL.rotation.z, melee ? 0 : -0.3, 12, dt);
  } else {
    p.armL.rotation.x = R.damp(p.armL.rotation.x, -sw * 0.7 * a.swing, 12, dt);
    p.armR.rotation.x = R.damp(p.armR.rotation.x, sw * 0.7 * a.swing, 12, dt);
    p.armL.rotation.z = p.armR.rotation.z = 0;
  }

  // Head tracks pitch; the torso leans into a strafe.
  p.headG.rotation.x = R.damp(p.headG.rotation.x, R.clamp(-(state.pitch || 0) * 0.6, -0.7, 0.7), 12, dt);
  a.lean = R.damp(a.lean, R.clamp((state.strafe || 0) * 0.14, -0.2, 0.2), 8, dt);
  p.torso.rotation.z = a.lean;
  if (p.charm) { p.charm.rotation.y += dt * 2.4; p.charm.position.y = 5.9 + Math.sin(R.t * 2.2) * 0.16; }
  if (p.tag) p.tag.visible = state.tagVisible !== false;
};

// The Roblox death: unweld the parts, give each a velocity, let them tumble.
R.explodeAvatar = function (group, dir, force) {
  const parts = group.userData.parts;
  const bits = [];
  const kick = force == null ? 1 : force;
  for (const key of ['torso', 'headG', 'armL', 'armR', 'legL', 'legR']) {
    const node = parts[key];
    if (!node) continue;
    const world = new THREE.Vector3();
    node.getWorldPosition(world);
    const quat = new THREE.Quaternion();
    node.getWorldQuaternion(quat);
    group.remove(node);
    node.position.copy(world);
    node.quaternion.copy(quat);
    R.scene.add(node);
    bits.push({
      node,
      vel: new THREE.Vector3(
        (dir ? dir.x * 16 : 0) + R.rand(-22, 22),
        R.rand(18, 42) * kick,
        (dir ? dir.z * 16 : 0) + R.rand(-22, 22)),
      spin: new THREE.Vector3(R.rand(-9, 9), R.rand(-9, 9), R.rand(-9, 9)),
      life: 0,
    });
  }
  if (parts.tag) parts.tag.visible = false;
  if (parts.charm) parts.charm.visible = false;
  R.ragdolls.push({ bits, life: 0 });
};

R.ragdolls = [];
R.updateRagdolls = function (dt) {
  for (let i = R.ragdolls.length - 1; i >= 0; i--) {
    const rd = R.ragdolls[i];
    rd.life += dt;
    for (const b of rd.bits) {
      b.vel.y -= R.GRAVITY * dt;
      const next = b.node.position.clone().add(b.vel.clone().multiplyScalar(dt));
      // Cheap floor/wall response so parts do not sink through the map.
      const hit = R.raycastWorld(b.node.position, b.vel.clone().normalize(), b.vel.length() * dt + 0.6);
      if (hit) {
        const n = hit.normal;
        b.vel.sub(n.clone().multiplyScalar(2 * b.vel.dot(n))).multiplyScalar(0.42);
        b.spin.multiplyScalar(0.6);
      } else {
        b.node.position.copy(next);
      }
      b.node.rotation.x += b.spin.x * dt;
      b.node.rotation.y += b.spin.y * dt;
      b.node.rotation.z += b.spin.z * dt;
      if (rd.life > 3.2) {
        const s = Math.max(0, 1 - (rd.life - 3.2) / 0.8);
        b.node.scale.setScalar(s);
      }
    }
    if (rd.life > 4) {
      for (const b of rd.bits) R.scene.remove(b.node);
      R.ragdolls.splice(i, 1);
    }
  }
};
R.clearRagdolls = function () {
  for (const rd of R.ragdolls) for (const b of rd.bits) R.scene.remove(b.node);
  R.ragdolls.length = 0;
};

/* --------------------------- weapon models --------------------------- */
// Every gun is modelled once, in WEAPON SPACE: studs, barrel down +z, the
// bore on y 0, the grip under the origin. The same model is used in the
// player's hands and on every other character, so first and third person can
// never disagree about what someone is holding.

const GUN = {
  black: '#1d1f24', body: '#2b2e35', grey: '#3a3e47', steel: '#8a9099',
  dark: '#14161a', wood: '#6b4526', tan: '#8a7a56', accent: '#d8a23a',
};

// b(w, h, d, x, y, z, colour, surface, rotX) — one brick in weapon space.
function gunPart(g, w, h, d, x, y, z, color, surface, rx, ry) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), R.tiledMat(color, surface || 'plastic', Math.max(w, d), h));
  m.position.set(x, y, z);
  if (rx) m.rotation.x = rx;
  if (ry) m.rotation.y = ry;
  m.castShadow = R.settings.quality === 'high';
  g.add(m);
  return m;
}
function gunTube(g, r1, r2, len, x, y, z, color, surface, axis) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 10),
    R.tiledMat(color, surface || 'metal', r1 * 4, len));
  m.position.set(x, y, z);
  if (axis !== 'y') m.rotation.x = Math.PI / 2;
  m.castShadow = R.settings.quality === 'high';
  g.add(m);
  return m;
}

R.buildWorldWeapon = function (id) {
  const g = new THREE.Group();
  const b = (...a) => gunPart(g, ...a);
  const t = (...a) => gunTube(g, ...a);
  const C = GUN;

  switch (id) {
    /* ---- Assault Rifle: the default. Carbine receiver, rail, 30-round mag. */
    case 'rifle':
      b(0.46, 0.62, 1.9, 0, 0, 0.55, C.body);                 // lower receiver
      b(0.44, 0.34, 2.3, 0, 0.44, 0.95, C.grey);              // upper receiver
      b(0.5, 0.1, 2.1, 0, 0.63, 1.0, C.dark);                 // top rail
      b(0.42, 0.44, 1.5, 0, 0.02, 2.25, C.grey);              // handguard
      b(0.5, 0.12, 1.4, 0, -0.24, 2.25, C.dark);              // bottom rail
      t(0.1, 0.1, 1.5, 0, 0.06, 3.35, C.black);               // barrel
      t(0.17, 0.17, 0.42, 0, 0.06, 4.1, C.black);             // flash hider
      b(0.3, 0.95, 0.52, 0, -0.68, 0.5, C.body, 'plastic', 0.13);   // magazine
      b(0.32, 0.8, 0.42, 0, -0.62, -0.32, C.black, 'plastic', 0.42); // pistol grip
      b(0.36, 0.52, 1.35, 0, 0.1, -1.25, C.body);             // stock
      b(0.3, 0.26, 0.5, 0, 0.44, -0.55, C.grey);              // buffer tube
      b(0.26, 0.3, 0.62, 0, 0.82, 1.15, C.dark);              // optic body
      b(0.3, 0.3, 0.1, 0, 0.82, 1.47, '#5aa0ff', 'glass');    // optic lens
      b(0.12, 0.2, 0.12, 0.26, 0.5, 0.2, C.steel);            // charging handle
      break;

    /* ---- Burst Rifle: a tighter bullpup-ish frame with a carry handle. */
    case 'burst':
      b(0.46, 0.66, 2.4, 0, 0, 0.4, '#30333b');
      b(0.44, 0.3, 1.9, 0, 0.48, 0.9, C.grey);
      b(0.14, 0.34, 1.5, 0, 0.78, 0.7, C.dark);               // carry handle
      b(0.4, 0.4, 1.2, 0, 0.02, 2.1, C.grey);
      t(0.09, 0.09, 1.3, 0, 0.06, 3.1, C.black);
      t(0.15, 0.15, 0.3, 0, 0.06, 3.75, C.black);
      b(0.3, 0.8, 0.46, 0, -0.62, 0.35, '#30333b', 'plastic', 0.1);
      b(0.32, 0.78, 0.4, 0, -0.6, -0.5, C.black, 'plastic', 0.4);
      b(0.4, 0.56, 1.0, 0, 0.06, -1.3, '#30333b');
      break;

    /* ---- SMG: compact, folding stock, magazine through the grip. */
    case 'smg':
      b(0.42, 0.56, 1.5, 0, 0, 0.3, C.body);
      b(0.4, 0.28, 1.3, 0, 0.4, 0.45, C.grey);
      b(0.44, 0.08, 1.1, 0, 0.56, 0.5, C.dark);
      b(0.34, 0.36, 0.9, 0, 0, 1.45, C.grey);
      t(0.08, 0.08, 0.9, 0, 0.04, 2.15, C.black);
      t(0.13, 0.13, 0.26, 0, 0.04, 2.7, C.black);
      b(0.3, 1.0, 0.44, 0, -0.68, 0.0, C.body, 'plastic', 0.08);
      b(0.3, 0.7, 0.4, 0, -0.5, -0.45, C.black, 'plastic', 0.38);
      b(0.1, 0.32, 0.9, 0.18, 0.18, -0.9, C.grey);            // folded stock rail
      b(0.3, 0.3, 0.14, 0, 0.2, -1.35, C.grey);
      break;

    /* ---- LMG: box magazine, heavy barrel, bipod. */
    case 'lmg':
      b(0.56, 0.74, 2.4, 0, 0, 0.5, '#26292f');
      b(0.52, 0.34, 2.0, 0, 0.52, 0.8, C.grey);
      b(0.58, 0.1, 1.8, 0, 0.72, 0.9, C.dark);
      t(0.14, 0.14, 2.3, 0, 0.06, 2.9, C.black);
      b(0.3, 0.3, 0.9, 0, 0.3, 2.6, C.grey);                  // gas block
      t(0.2, 0.2, 0.4, 0, 0.06, 4.2, C.black);
      b(0.95, 0.95, 1.1, 0, -0.62, 0.5, '#2f333a');           // ammo box
      b(0.34, 0.76, 0.4, 0, -0.62, -0.75, C.black, 'plastic', 0.4);
      b(0.42, 0.62, 1.5, 0, 0.1, -1.6, '#26292f');            // stock
      b(0.1, 0.9, 0.1, -0.3, -0.5, 3.4, C.steel, 'metal', 0.3); // bipod legs
      b(0.1, 0.9, 0.1, 0.3, -0.5, 3.4, C.steel, 'metal', -0.3);
      break;

    /* ---- Sniper: long bolt-action, big glass, thumbhole stock. */
    case 'sniper':
      b(0.44, 0.52, 2.6, 0, 0, 0.9, '#24272d');               // receiver
      t(0.11, 0.09, 3.4, 0, 0.02, 3.4, C.black);              // barrel
      t(0.16, 0.16, 0.5, 0, 0.02, 5.3, C.black);              // muzzle brake
      b(0.28, 0.2, 0.9, 0.26, 0.26, 0.6, C.steel);            // bolt
      t(0.07, 0.07, 0.5, 0.42, 0.3, 0.3, C.steel, 'metal', 'y'); // bolt handle
      t(0.26, 0.26, 2.0, 0, 0.72, 1.5, C.dark);               // scope tube
      t(0.34, 0.34, 0.4, 0, 0.72, 2.6, C.dark);               // objective bell
      b(0.52, 0.52, 0.08, 0, 0.72, 2.82, '#7ac8ff', 'glass'); // glass
      b(0.16, 0.26, 0.3, 0, 0.5, 0.75, C.grey);               // scope mounts
      b(0.16, 0.26, 0.3, 0, 0.5, 2.25, C.grey);
      b(0.34, 0.8, 0.44, 0, -0.6, -0.1, '#24272d', 'plastic', 0.38); // grip
      b(0.42, 0.66, 2.2, 0, -0.1, -1.6, '#2b2f36');           // stock
      b(0.42, 0.26, 0.9, 0, 0.3, -0.9, '#2b2f36');            // comb
      b(0.46, 0.5, 0.3, 0, -0.2, -2.6, '#17191d');            // butt pad
      b(0.44, 0.4, 1.2, 0, -0.42, 1.9, '#2b2f36');            // forend
      break;

    /* ---- Shotgun: pump action, tube magazine under the barrel. */
    case 'shotgun':
      b(0.46, 0.56, 1.5, 0, 0, 0.3, '#2b2e35');               // receiver
      t(0.15, 0.15, 3.0, 0, 0.1, 2.3, C.black);               // barrel
      t(0.12, 0.12, 2.4, 0, -0.18, 2.0, C.grey);              // magazine tube
      b(0.36, 0.36, 0.9, 0, -0.16, 1.6, C.wood, 'wood');      // pump grip
      b(0.3, 0.1, 0.9, 0, -0.34, 1.6, C.dark);
      b(0.3, 0.74, 0.4, 0, -0.56, -0.3, C.wood, 'wood', 0.42); // grip
      b(0.4, 0.6, 1.8, 0, -0.04, -1.3, C.wood, 'wood');       // stock
      b(0.44, 0.48, 0.26, 0, -0.1, -2.2, C.dark);
      b(0.12, 0.14, 0.12, 0, 0.3, 3.6, C.steel);              // bead sight
      break;

    /* ---- Revolver: six-shot, exposed cylinder. */
    case 'revolver':
      b(0.26, 0.42, 1.0, 0, 0.05, 0.3, '#51575f', 'metal');   // frame
      t(0.26, 0.26, 0.6, 0, 0.0, 0.05, C.steel);              // cylinder
      t(0.1, 0.1, 1.5, 0, 0.1, 1.2, '#51575f');               // barrel
      b(0.2, 0.18, 1.3, 0, 0.3, 1.2, '#51575f', 'metal');     // top strap
      b(0.1, 0.16, 0.1, 0, 0.42, 1.8, C.steel);               // front sight
      b(0.26, 0.82, 0.44, 0, -0.5, -0.35, C.wood, 'wood', 0.42); // grip
      b(0.16, 0.26, 0.3, 0, -0.18, -0.1, '#51575f');          // hammer
      b(0.1, 0.24, 0.1, 0, -0.26, 0.28, C.steel, 'metal', 0.3); // trigger
      break;

    /* ---- RPG: launch tube, warhead, pistol grip, optic. */
    case 'rpg':
      t(0.34, 0.34, 4.0, 0, 0, 0.6, '#39412f');               // tube
      t(0.46, 0.3, 0.7, 0, 0, 2.9, '#39412f');                // muzzle bell
      t(0.5, 0.5, 0.5, 0, 0, -1.5, '#2c3325');                // blast cone
      t(0.26, 0.4, 0.8, 0, 0, 3.4, '#7a2a22');                // warhead body
      t(0.4, 0.05, 0.7, 0, 0, 4.1, '#7a2a22');                // warhead tip
      b(0.3, 0.8, 0.42, 0, -0.62, 0.1, C.black, 'plastic', 0.4);  // grip
      b(0.28, 0.5, 0.36, 0, -0.5, 1.6, C.black, 'plastic', 0.2);  // fore grip
      b(0.22, 0.42, 0.9, -0.42, 0.3, 1.1, '#2c3325');         // optic
      b(0.4, 0.14, 0.5, 0, 0.42, 0.2, '#2c3325');             // heat shield
      break;

    /* ---- Grenade Launcher: fat break-action barrel. */
    case 'gl':
      t(0.42, 0.42, 2.2, 0, 0.05, 1.3, '#39412f');            // barrel
      t(0.46, 0.46, 0.4, 0, 0.05, 2.5, '#2c3325');
      b(0.46, 0.62, 1.4, 0, -0.3, 0.1, '#39412f');            // receiver
      b(0.3, 0.78, 0.42, 0, -0.78, -0.45, C.black, 'plastic', 0.4);
      b(0.4, 0.56, 1.3, 0, -0.26, -1.3, '#2c3325');           // stock
      b(0.16, 0.34, 0.14, 0, 0.42, 0.4, C.steel);             // ladder sight
      b(0.36, 0.3, 0.7, 0, -0.5, 1.5, C.wood, 'wood');        // forend
      break;

    /* ---- Energy Rifle: coils, vents and a glowing core. */
    case 'energy':
      b(0.46, 0.6, 2.0, 0, 0, 0.5, '#242038');
      b(0.42, 0.3, 1.6, 0, 0.44, 0.8, '#2e2848');
      b(0.5, 0.14, 1.2, 0, 0.62, 0.9, '#b388ff', 'neon');     // glowing spine
      t(0.16, 0.16, 1.6, 0, 0.04, 2.3, '#2e2848');            // emitter shroud
      for (let i = 0; i < 3; i++) t(0.26, 0.26, 0.12, 0, 0.04, 1.8 + i * 0.5, '#b388ff', 'neon');
      t(0.12, 0.12, 0.5, 0, 0.04, 3.3, '#d8c0ff', 'neon');    // emitter
      b(0.34, 0.5, 0.6, 0, -0.5, 0.6, '#b388ff', 'neon');     // cell
      b(0.3, 0.76, 0.4, 0, -0.56, -0.3, '#1b1830', 'plastic', 0.4);
      b(0.38, 0.5, 1.0, 0, 0.04, -1.1, '#242038');
      break;

    /* ---- Freeze Ray: pressure tank and a wide nozzle. */
    case 'freeze':
      b(0.44, 0.54, 1.4, 0, 0, 0.3, '#cfe4ee');
      t(0.3, 0.3, 1.0, 0, 0.1, -0.7, '#9fc4d4');              // tank
      t(0.34, 0.34, 0.2, 0, 0.1, -1.25, '#7fb0c4');
      t(0.14, 0.2, 1.1, 0, 0.06, 1.5, '#9fc4d4');             // nozzle
      t(0.34, 0.26, 0.4, 0, 0.06, 2.2, '#8ff0ff', 'neon');    // emitter
      b(0.3, 0.3, 0.5, 0, 0.42, 0.5, '#8ff0ff', 'neon');      // sight glow
      b(0.3, 0.74, 0.4, 0, -0.54, -0.3, '#b0cede', 'plastic', 0.4);
      break;

    /* ---- Bow: limbs, string and a nocked arrow. */
    case 'bow': {
      const limbs = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.11, 6, 18, Math.PI * 1.1),
        R.tiledMat(C.wood, 'wood', 2, 2));
      limbs.rotation.y = Math.PI / 2;
      limbs.rotation.z = Math.PI * 0.45;
      g.add(limbs);
      b(0.22, 1.1, 0.34, 0, 0, 0, C.wood, 'wood');            // riser
      b(0.16, 0.5, 0.26, 0, 0, 0.3, '#4a3018', 'wood');       // grip wrap
      b(0.05, 0.05, 3.6, 0, 0, -0.1, '#e8e8e8');              // string
      b(0.1, 0.1, 2.2, 0, 0, 1.0, C.tan, 'wood');             // arrow shaft
      b(0.16, 0.16, 0.34, 0, 0, 2.2, C.steel, 'metal');       // arrowhead
      b(0.03, 0.42, 0.42, 0, 0, 0.1, '#c83a3a');              // fletching
      break;
    }

    /* ---- Knife: blade, guard, wrapped handle. */
    case 'knife':
      b(0.09, 0.34, 1.5, 0, 0.05, 0.9, '#c9d2d8', 'metal');
      b(0.1, 0.16, 0.5, 0, -0.08, 1.75, '#c9d2d8', 'metal');  // point
      b(0.3, 0.1, 0.16, 0, 0, 0.12, '#5a5f66', 'metal');      // guard
      b(0.16, 0.22, 0.8, 0, 0, -0.35, '#24262a');             // handle
      b(0.18, 0.24, 0.12, 0, 0, -0.8, '#5a5f66', 'metal');    // pommel
      break;

    /* ---- Battle Axe: haft and a double-bit head. */
    case 'axe':
      b(0.16, 0.16, 2.8, 0, 0, 0.2, '#4a3220', 'wood');       // haft
      b(0.14, 1.5, 0.9, 0, 0.1, 1.5, '#b9c3cb', 'metal');     // head
      b(0.2, 0.6, 0.4, 0, 0.1, 1.2, '#6a7079', 'metal');      // collar
      b(0.1, 0.5, 0.45, 0, 0.75, 1.9, '#d6dde3', 'metal', 0.5); // upper bit
      b(0.1, 0.5, 0.45, 0, -0.55, 1.9, '#d6dde3', 'metal', -0.5); // lower bit
      b(0.2, 0.2, 0.3, 0, 0, -1.15, '#24262a');               // pommel
      break;

    default:
      return g;                                               // fists hold nothing
  }
  g.scale.setScalar(0.58);
  return g;
};
