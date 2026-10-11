'use strict';
// Underworld: notoriety (danger level), wanted stars and police patrols that
// are always on the lookout, post-heist pursuit (shake them, wipe them out or
// lie low), the Palmetto Bay Herald, criminal contacts and gang turf.

H.CITY_NAME = 'Palmetto Bay';

/* ---------------- notoriety & wanted ---------------- */
H.heat = {
  wanted: 0, lastSeen: null, unseenT: 0, searchR: 0, pursuitPool: 0, pursuitKills: 0, spawnT: 0, carT: 0,
  pendingTake: null, hideT: 0, patrolT: 0, recogT: 0,
  danger() { const s = H.save; return Math.min(5, Math.floor((s.stats.heists || 0) / 3) + Math.floor((s.heatPoints || 0) / 4)); },
  setWanted(n, pos, reason) {
    n = Math.min(5, Math.max(0, n));
    if (n > this.wanted) { this.pursuitPool = Math.max(this.pursuitPool, 4 + n * 4); H.ui.toast('WANTED ' + '★'.repeat(n), reason || 'The police are after you.'); H.audio.siren(true, H.P.pos); }
    this.wanted = n;
    if (pos) this.lastSeen = pos.clone();
    this.unseenT = 0; this.searchR = 70 + n * 35;
    H.music.set(n ? 'assault' : 'city');
    if (!n) H.audio.siren(false);
  },
  crime(severity, pos, witnessed = true) {
    // severity: 1 minor (carjack, assault), 2 shooting, 3 killing a civilian, 4 killing a cop
    if (H.run && !H.run.done) return; // heists run their own alarm
    if (!witnessed && severity < 2) return;
    const target = Math.min(5, Math.max(this.wanted, severity >= 4 ? Math.max(2, this.wanted + 1) : severity >= 3 ? Math.max(2, this.wanted) : 1));
    if (target > this.wanted) this.setWanted(target, pos);
    else { this.lastSeen = pos.clone(); this.unseenT = 0; }
  },
  // can any cop see the player right now?
  seenByPolice() {
    const p = H.P.inCar ? H.P.inCar.pos : H.P.pos, eye = H._v3.set(p.x, 1.4, p.z);
    for (const n of H.npcs) if (!n.dead && n.team === 'law' && !n.run && n.pos.distanceTo(p) < 45 && n.canSee(eye, 45, -1)) return true;
    for (const c of H.cars) if (c.police && !c.dead && c.pos.distanceTo(p) < 60 && H.world.los(H._v2.set(c.pos.x, 1.4, c.pos.z), eye)) return true;
    return false;
  },
  update(dt) {
    const P = H.P, p = P.inCar ? P.inCar.pos : P.pos;
    // ambient patrols scale with danger level
    this.patrolT -= dt;
    if (this.patrolT <= 0) {
      this.patrolT = 2;
      const dz = this.danger();
      const cars = H.cars.filter(c => c.police && c.patrol).length, foot = H.npcs.filter(n => n.patrol && !n.dead).length;
      if (cars < 2 + dz * 2 + this.wanted * 2) { const c = H.traffic.spawnOne(p, { type: dz >= 4 && Math.random() < 0.4 ? 'swatvan' : 'police', minD: 80, maxD: 240 }); if (c) { c.police = true; c.patrol = true; } }
      if (foot < 3 + dz * 2 && !H.run) spawnFootPatrol(p);
      for (const n of H.npcs.filter(n => n.patrol && !n.dead)) if (n.pos.distanceTo(p) > 260) n.remove();
    }
    // patrols recognise a known face at higher danger levels
    if (this.wanted === 0 && !H.run && this.danger() >= 2 && !P.masked) {
      let close = false;
      for (const n of H.npcs) if (n.patrol && !n.dead && n.pos.distanceTo(p) < 10 + this.danger() * 2 && n.canSee(H.camera.position, 20, 0.3)) { close = true; break; }
      this.recogT = close ? this.recogT + dt * (0.08 + this.danger() * 0.04) : Math.max(0, this.recogT - dt * 0.1);
      if (this.recogT > 1) { this.recogT = 0; this.setWanted(1, p, 'A patrol officer recognised you from the news.'); }
    } else this.recogT = 0;
    // masked and armed in public draws attention
    if (this.wanted === 0 && !H.run && P.masked && !P.inCar && this.seenByPolice()) this.setWanted(1, p, 'Police spotted a masked gunman.');
    if (!this.wanted) return;
    // pursuit
    const seen = this.seenByPolice();
    if (seen) { this.lastSeen = p.clone(); this.unseenT = 0; }
    else this.unseenT += dt;
    // the search area shrinks while you stay out of sight
    const outside = !this.lastSeen || p.distanceTo(this.lastSeen) > this.searchR;
    const hiding = H.game.inSafehouse();
    if (hiding) this.hideT += dt; else this.hideT = 0;
    if ((outside && this.unseenT > 6) || (this.unseenT > 25 + this.wanted * 8) || this.hideT > 12) { this.clear(hiding ? 'You laid low until the heat died down.' : 'You shook off the police.'); return; }
    if (this.pursuitKills >= this.pursuitPool && this.pursuitPool > 0) { this.clear('You took out the pursuit. No one left to chase you.'); return; }
    // spawn pursuit cars and foot units
    this.carT -= dt;
    const pursuers = H.cars.filter(c => c.pursuit && !c.dead).length;
    const left = this.pursuitPool - this.pursuitKills;
    if (this.carT <= 0 && pursuers < 1 + this.wanted && left > 0) {
      this.carT = 5 - this.wanted * 0.5;
      const c = H.traffic.spawnOne(p, { type: this.wanted >= 4 ? 'swatvan' : 'police', minD: 70, maxD: 160, siren: true, pursue: p });
      if (c) { c.police = true; c.pursuit = true; c.speed = 18; c.T = Object.assign({}, c.T, { speed: c.T.speed * 1.1 }); }
    }
    for (const c of H.cars) if (c.pursuit && !c.dead) {
      c.pursue = this.lastSeen || p;
      // close in: police cars drive straight at you when near, then deploy officers
      const d = c.pos.distanceTo(p);
      if (d < 26 && !c.deployed) { c.deployed = true; c.speed = 0; c.driver = null; for (let i = 0; i < (this.wanted >= 3 ? 3 : 2); i++) { const n = new H.Npc('cop', c.pos.x + H.rand(-2, 2), c.pos.z + H.rand(-2, 2), { etype: this.wanted >= 4 ? H.pick(['swat', 'heavy', 'fbi']) : this.wanted >= 3 ? H.pick(['swat', 'cop', 'fbi']) : 'cop' }); n.state = 'combat'; n.pursuitCop = true; } }
      if (c.deployed && d > 70) { c.deployed = false; c.driver = 'ai'; }
    }
    if (this.wanted >= 5 && Math.random() < dt * 0.05 && H.npcs.filter(n => n.pursuitCop && n.etype === 'dozer' && !n.dead).length < 1) { const n = new H.Npc('cop', p.x + 30, p.z + 30, { etype: 'dozer' }); n.state = 'combat'; n.pursuitCop = true; }
  },
  clear(msg) {
    this.wanted = 0; this.pursuitPool = 0; this.pursuitKills = 0; this.lastSeen = null; H.audio.siren(false); H.music.set('city');
    for (const c of H.cars.slice()) if (c.pursuit) { c.pursuit = false; c.siren = false; c.pursue = null; if (c.driver !== 'ai') c.driver = 'ai'; if (!c.wp) c.remove(); }
    for (const n of H.npcs.slice()) if (n.pursuitCop && !n.dead) n.remove();
    H.ui.toast('Wanted level cleared', msg);
    if (this.pendingTake) { H.game.bankTake(this.pendingTake); this.pendingTake = null; }
  },
  onCopKilled() { if (this.wanted) { this.pursuitKills++; } },
};
function spawnFootPatrol(near) {
  const C = H.city;
  for (let t = 0; t < 10; t++) {
    const b = H.pick(C.blocks); const L = b.L;
    if (Math.hypot(L.cx - near.x, L.cz - near.z) < 60 || Math.hypot(L.cx - near.x, L.cz - near.z) > 220) continue;
    const loop = { x0: L.x0 + 1.9, x1: L.x1 - 1.9, z0: L.z0 + 1.9, z1: L.z1 - 1.9 };
    for (let k = 0; k < 2; k++) {
      const n = new H.Npc('cop', loop.x0 + k, loop.z0, { etype: H.heat.danger() >= 3 ? H.pick(['cop', 'fbi', 'swat']) : 'cop' });
      n.patrol = true; n.loop = loop; n.corner = 0; n.dir = 1; n.state = 'walkpatrol';
    }
    return;
  }
}
// patrol officers walk their beat, then switch to combat when you're wanted
const NP = H.Npc.prototype, copUpdate = NP.u_cop;
NP.u_cop = function (dt) {
  if (this.state === 'static' && this.special !== 'sniper') { this.h.a.state = 'idle'; return; }
  if (this.state === 'walkpatrol') {
    if (H.heat.wanted > 0 && this.pos.distanceTo(H.P.inCar ? H.P.inCar.pos : H.P.pos) < 60) { this.state = 'combat'; this.pursuitCop = true; return; }
    const L = this.loop;
    if (!this.wp || Math.hypot(this.wp.x - this.pos.x, this.wp.z - this.pos.z) < 1) { this.corner = (this.corner + 1) % 4; const c = [[L.x0, L.z0], [L.x1, L.z0], [L.x1, L.z1], [L.x0, L.z1]][this.corner]; this.wp = { x: c[0], z: c[1] }; }
    this.h.a.state = 'idle'; this.steer(this.wp.x, this.wp.z, 1.4, dt);
    return;
  }
  if (!H.run && !H.heat.wanted && this.team === 'law' && !this.gangFight) { this.state = 'walkpatrol'; this.loop = this.loop || { x0: this.pos.x - 10, x1: this.pos.x + 10, z0: this.pos.z - 10, z1: this.pos.z + 10 }; this.corner = this.corner || 0; this.wp = null; return; }
  copUpdate.call(this, dt);
};

/* ---------------- the Palmetto Bay Herald ---------------- */
const SILLY = [
  ['Local Man Insists Pelican Stole His Lottery Ticket', 'Witnesses say the pelican "looked guilty". Police have no leads on the bird.'],
  ['Mayor Declares Thursday "Neon Appreciation Day"', 'Businesses are asked to leave signs on for 25 hours.'],
  ['Retiree Claims Flamingo Lawn Ornament Is Following Him', '"It was on the porch Monday. Tuesday it was by the pool," he said.'],
  ['Study: 9 Out of 10 Palmetto Residents Own Too Many Sunglasses', 'The tenth resident declined to comment from behind three pairs.'],
  ['Alligator Elected Honorary Golf Club Treasurer', 'Members say it is "the most responsible treasurer we have had."'],
  ['Man Sues Ocean for Being "Too Wet"', 'The case was dismissed. The ocean was unavailable for comment.'],
  ['Synth-Pop Band Arrested for Excessive Keytar', 'The judge allowed one solo before sentencing.'],
  ['Shoulder Pads Return, Experts Warn of Doorway Congestion', 'Architects scramble to widen entrances across downtown.'],
  ['Local Psychic Predicts Something Will Happen', '"Possibly tomorrow, possibly not," she added.'],
  ['Tourist Asks Police for Directions, Is Given a Speeding Ticket', 'He was on foot at the time.'],
  ['Council Votes to Rename Main Street "Main Street"', 'The motion passed unanimously after nine hours of debate.'],
  ['Hot Dog Vendor Swears Hot Dogs Are "Mostly Dog-Free"', 'Health inspectors will visit "eventually".'],
  ['Man Teaches Parrot to Say "No Comment", Becomes Press Secretary', 'The parrot has already been more forthcoming than his predecessor.'],
  ['Heatwave Melts Ice Sculpture Contest Before It Begins', 'Judges awarded first place to "Puddle, No. 3".'],
];
H.makeNewspaper = function (day) {
  const s = H.save, R = H.seeded(day * 7919 + 13);
  const pick = a => a[Math.floor(R() * a.length)];
  const items = [];
  // the lead story is about your last job
  if (s.lastHeist) {
    const lh = s.lastHeist;
    const crew = s.crewName || 'The Payday Gang';
    items.push({ kind: 'lead', head: lh.loud ? `Shootout at ${lh.name}: ${lh.kills} Dead, Police Baffled` : `${lh.name} Robbed Without a Trace`, body: lh.loud ? `Police chief vows "maximum effort" against the masked crew some are calling ${crew}. ${H.money(lh.take)} reported stolen. Patrols increased citywide.` : `Staff only noticed ${H.money(lh.take)} missing the next morning. "Professionals," said one detective. "Or ghosts."` });
  }
  // useful tips with real effects for the day
  const tips = [];
  const hs = H.HEISTS.filter(h => h.tpl !== 'shop');
  for (let i = 0; i < 3; i++) {
    const h = pick(hs), r = R();
    if (r < 0.3) tips.push({ kind: 'tip', head: `${h.name} Expects Large Delivery`, body: `Insiders say extra stock arrives today. Pay on this contract is up 50% today only.`, fx: { heist: h.id, payMul: 1.5 } });
    else if (r < 0.5) tips.push({ kind: 'tip', head: `Security Contractor Strike Hits ${h.name}`, body: `Half the guards called in sick. Fewer guards there today.`, fx: { heist: h.id, guardsMul: 0.5 } });
    else if (r < 0.7) tips.push({ kind: 'warn', head: `${h.name} Upgrades Security After Scare`, body: `Two extra guards and a camera upgrade. Proceed with caution.`, fx: { heist: h.id, guardsAdd: 2 } });
    else if (r < 0.85) tips.push({ kind: 'tip', head: `Police Union Holds Rally Downtown`, body: `Fewer patrols on the street today while officers march.`, fx: { patrolMul: 0.5 } });
    else tips.push({ kind: 'warn', head: `Chief Announces "Operation Sunburn"`, body: `Double patrols and faster response all day.`, fx: { patrolMul: 2, responseMul: 0.7 } });
  }
  // the silly ones (always more than you need)
  const silly = [pick(SILLY), pick(SILLY), pick(SILLY)].map(([head, body]) => ({ kind: 'silly', head, body }));
  items.push(...tips.slice(0, R() < 0.5 ? 1 : 2), ...silly);
  // classifieds: an informant tip some days
  if (R() < 0.4) items.push({ kind: 'class', head: 'CLASSIFIED: "Looking for professionals. Big job. Big pay. Ask the bartender at the Coral Club."', body: 'A new contract is on your board today.', fx: { bonusContract: true } });
  if (R() < 0.3) items.push({ kind: 'class', head: 'CLASSIFIED: Used getaway van, one careful owner, bullet holes negotiable.', body: '' });
  return { day, items, weather: pick(['Sunny, 31°C', 'Humid, 33°C', 'Afternoon storms, 29°C', 'Clear skies, 30°C']), price: '25¢' };
};
H.newsFx = function () {
  const n = H.save.news; const out = { pay: {}, guards: {}, patrolMul: 1, responseMul: 1 };
  if (!n) return out;
  for (const it of n.items) if (it.fx) {
    if (it.fx.heist && it.fx.payMul) out.pay[it.fx.heist] = it.fx.payMul;
    if (it.fx.heist && (it.fx.guardsMul || it.fx.guardsAdd)) out.guards[it.fx.heist] = it.fx;
    if (it.fx.patrolMul) out.patrolMul *= it.fx.patrolMul;
    if (it.fx.responseMul) out.responseMul *= it.fx.responseMul;
  }
  return out;
};

/* ---------------- contacts & locations ---------------- */
H.CONTACTS = [
  { id: 'fence', name: 'Sal the Fence', place: 'Sal\'s Pawn & Loan', desc: 'Launders offshore money into spending cash (30% cut). Buys the odd trinket.', color: 0xd8b04a },
  { id: 'arms', name: 'Dmitri', place: 'Lock & Load Guns', desc: 'Black market weapons, mods and ammo.', color: 0xe04040 },
  { id: 'informant', name: 'Whisper', place: 'Coral Club bar', desc: 'Sells tips and blueprints for upcoming jobs.', color: 0x40c0ff },
  { id: 'cop', name: 'Sgt. Dooley', place: 'Precinct back door', desc: 'Crooked cop. Pays off your heat — for a price.', color: 0x4060ff },
  { id: 'doc', name: 'Doc Ramirez', place: 'Back-alley clinic', desc: 'Patches you up and restocks medical gear.', color: 0x40ff90 },
  { id: 'spray', name: 'Spray Shack', place: 'Spray Shack', desc: 'Respray your ride to lose the police (+1 star off).', color: 0xff7ae0 },
  { id: 'tailor', name: 'Madame Lu', place: 'Mask Atelier', desc: 'Masks, materials and patterns.', color: 0xa070e0 },
  { id: 'dealer', name: 'Vinnie Cars', place: 'Vinnie\'s Lot', desc: 'Buys stolen cars and sells clean ones.', color: 0xf0c040 },
];
H.placeContacts = function () {
  const C = H.city, rng = H.seeded(4242);
  const free = C.blocks.filter(b => b.kind === 'generic' && b.dist !== 'beach');
  H.contactSpots = [];
  H.CONTACTS.forEach((c, i) => {
    const b = free[Math.floor(rng() * free.length)];
    const L = b.L;
    const x = L.cx + (i % 2 ? 12 : -12), z = L.z1 - 2.2;
    const npc = new H.Npc('ped', x, z, { speed: 0 }); npc.state = 'static'; npc.contact = c.id; npc.yaw = 0; npc.h.a.state = c.id === 'cop' ? 'idle' : 'phone';
    npc.immortal = true;
    const sign = H.buildNeon(c.place.split(' ')[0].replace(/'s$/, ''), c.color); sign.scale.setScalar(0.5); sign.position.set(x, 4.2, z - 0.3); C.root.add(sign); C.props.push(sign);
    const spot = { c, x, z, npc };
    H.contactSpots.push(spot);
    H.game.addInteract({ pos: new THREE.Vector3(x, 1.2, z), r: 2.4, label: () => c.id === 'fence' && H.P.bag ? 'Sell the ' + H.LOOT[H.P.bag].name.toLowerCase() + ' to Sal (' + H.money(H.LOOT[H.P.bag].value * 0.75) + ')' : 'Talk to ' + c.name, time: 0, world: true, done: () => { if (c.id === 'fence' && H.P.bag) H.game.fenceBag(0.75); else H.ui.openContact(c.id); } });
  });
};

/* ---------------- gang turf ---------------- */
H.GANGS = [
  { id: 'cuchillos', name: 'Los Cuchillos', color: 0xd03030, district: 'docks' },
  { id: 'kings', name: 'Southside Kings', color: 0x7a3ac0, district: 'suburb' },
  { id: 'tide', name: 'Black Tide', color: 0x2a8ad0, district: 'beach' },
];
H.spawnGangs = function () {
  const C = H.city;
  for (const g of H.GANGS) {
    const blocks = C.blocks.filter(b => b.dist === g.district && b.kind === 'generic').slice(0, 3);
    for (const b of blocks) for (let i = 0; i < 3; i++) {
      const n = new H.Npc('thug', b.L.x0 + 3 + i * 1.2, b.L.z0 + 2.5, { etype: 'thug', team: 'neutralgang' });
      n.gang = g.id; n.state = 'loiter'; n.h.a.state = 'idle'; n.yaw = Math.PI * Math.random();
      n.h.J.spine.traverse(m => { if (m.material && m.material.color && m.material.color.getHex() !== 0x22252a) {} });
    }
  }
};
const thugUpdate = NP.u_thug;
NP.u_thug = function (dt) {
  if (this.state === 'loiter') {
    this.stop(dt); this.h.a.state = Math.sin(this.t * 0.3 + this.id) > 0.6 ? 'phone' : 'idle';
    const P = H.P;
    if ((this.provoked || (P.masked && this.pos.distanceTo(P.pos) < 8)) && !H.run) { this.state = 'combat'; this.team = 'gang'; for (const n of H.npcs) if (n.gang === this.gang && n.pos.distanceTo(this.pos) < 25) { n.state = 'combat'; n.team = 'gang'; } }
    return;
  }
  thugUpdate.call(this, dt);
};
