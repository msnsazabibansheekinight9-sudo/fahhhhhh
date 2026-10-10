// Kestrel — items, crafting, story logs, population and objectives.
(function () {
  const K = window.K;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  K.ITEMS = {
    medkit: { name: 'Trauma Kit', desc: 'Sealed field dressing and coagulant injector. Restores a lot of health.', stack: 5, cat: 'use' },
    gel: { name: 'Coagulant Gel', desc: 'Half a medkit. Combine with a bandage roll.', stack: 9, cat: 'part' },
    cloth: { name: 'Bandage Roll', desc: 'Sterile, mostly. Crafting component.', stack: 9, cat: 'part' },
    scrap: { name: 'Scrap Metal', desc: 'Bent plating, bolts, wire. Crafting component.', stack: 9, cat: 'part' },
    chem: { name: 'Ethanol Canister', desc: 'Volatile. Crafting component.', stack: 9, cat: 'part' },
    battery: { name: 'Power Cell', desc: 'Recharges the shoulder lamp, or powers a noisemaker.', stack: 9, cat: 'use' },
    flare: { name: 'Flare', desc: 'Throw to light an area. Bright, red and loud enough to draw attention.', stack: 6, cat: 'throw' },
    noise: { name: 'Noisemaker', desc: 'Throw it. It beeps, then shrieks. Everything nearby goes to look.', stack: 5, cat: 'throw' },
    bomb: { name: 'Pipe Bomb', desc: 'Short fuse. Shrapnel kills infected crew and drives the creature away.', stack: 4, cat: 'throw' },
    rounds: { name: '.357 Rounds', desc: 'Revolver ammunition.', stack: 60, cat: 'ammo' },
    shells: { name: '12ga Shells', desc: 'Shotgun ammunition.', stack: 40, cat: 'ammo' },
    fuel: { name: 'Fuel Canister', desc: 'Incinerator fuel. 50 units per canister.', stack: 400, cat: 'ammo' },
    cells: { name: 'Pulse Cells', desc: 'Carbine ammunition.', stack: 160, cat: 'ammo' },
    revolver: { name: '.357 Revolver', desc: 'Six rounds. Loud. Puts the infected down; only angers the creature.', cat: 'weapon' },
    shotgun: { name: 'Pump Shotgun', desc: 'Devastating at close range. Shell-by-shell reload.', cat: 'weapon' },
    flamer: { name: 'Incinerator', desc: 'The only thing it is afraid of. Burns fuel fast.', cat: 'weapon' },
    pulse: { name: 'Pulse Carbine', desc: 'Military issue, fully automatic. Found aboard the Calliope.', cat: 'weapon' },
    tracker: { name: 'Motion Tracker', desc: 'Hold T (or Tab) to raise it. Shows movement ahead. It beeps; things can hear it.', cat: 'key' },
    key2: { name: 'Clearance Card', desc: 'Opens doors one security level up.', cat: 'key' },
    key3: { name: 'Clearance Card', desc: 'Opens doors one security level up.', cat: 'key' },
    log: { name: 'Data Log', desc: '', cat: 'log' },
  };
  K.RECIPES = [
    { out: 'medkit', n: 1, need: { gel: 1, cloth: 1 } },
    { out: 'noise', n: 1, need: { scrap: 1, battery: 1 } },
    { out: 'flare', n: 2, need: { chem: 1, scrap: 1 } },
    { out: 'bomb', n: 1, need: { scrap: 2, chem: 2 } },
  ];
  K.MAPINFO = {
    station: {
      title: 'KESTREL STATION', sub: 'Halden-Voss Deep Orbital Research Platform · Tethys IV',
      keyNames: ['', 'Station power', 'Blue clearance', 'Red clearance', ''],
      lockMsg: ['', 'NO POWER — restore it at Reactor Control', 'LOCKED — requires BLUE clearance', 'LOCKED — requires RED clearance', 'SEALED'],
      cards: { 2: { name: 'Blue Clearance Card', color: 0x3a7bd5 }, 3: { name: 'Red Clearance Card', color: 0xc8322a } },
      obj: ['Restore station power at Reactor Control', 'Find a BLUE clearance card in the Security Office', 'Find the RED clearance card in Administration', 'Reach the Docking Ring and board the Calliope'],
    },
    cruiser: {
      title: 'ISV CALLIOPE', sub: 'Halden-Voss heavy cruiser · docked at Kestrel, systems failing',
      keyNames: ['', 'Reactor', 'Officer clearance', 'Captain clearance', 'Launch lock'],
      lockMsg: ['', 'NO POWER — restart the reactor in Engineering', 'LOCKED — requires an OFFICER keycard', "LOCKED — requires the CAPTAIN'S keycard", 'SHUTTLE BAY SEALED — launch must be authorised from the Bridge'],
      cards: { 2: { name: 'Officer Keycard', color: 0xd0a030 }, 3: { name: "Captain's Keycard", color: 0xe8e8f0 } },
      obj: ["Restart the Calliope's reactor in Engineering", 'Find an Officer keycard in the Officer Berths', "Find the Captain's keycard in the Captain's Quarters", 'Reach the Bridge'],
    },
  };

  // story logs: found on terminals and data pads
  K.LOGS = [
    ['Dr. Imre Vale — Research Log 41', 'The specimen recovered from the Tethys ice has done something none of us predicted. It is not dormant. It is waiting. Its tissue reorganises when the lights are on and goes still when they are off. Halden-Voss wants growth data by the end of the quarter. I have asked for a second containment layer. Again.'],
    ['Security Chief R. Okonjo', 'Two of the lab techs reported a "ticking" in the ceiling of C-ring. Maintenance found nothing in the ducts except scratches. Fresh ones. I have ordered the vent grilles welded shut on the medical deck. Whatever got out of Lab 3 is not on the crew manifest and it is not a rat.'],
    ['Personal — Maya Ferro', 'Lina did not come back from her shift. Her locker was open and her boots were still in it. They keep telling us to stay in our quarters. I keep hearing something walking above my room. It stops when I hold my breath. I think it is listening for me.'],
    ['Maintenance Ticket #2291', 'Reactor Control breakers tripped on rings 2 through 6. Manual restart requires the main lever in the reactor hall. Note: emergency lighting is on a separate bus and will stay on. Note from Okafor: do NOT go down there alone. Ticket closed — no one available.'],
    ['Dr. Imre Vale — Research Log 44', 'Subject 2 (Daniel) was exposed nine days ago. His temperature is low, he has stopped speaking and he no longer reacts to his name. But he walks. He walks toward warmth and sound. I have seen the growths reach his spine. If you are reading this, he is not Daniel anymore. Shoot for the head.'],
    ['Station PA — automated', 'ATTENTION ALL PERSONNEL. A QUARANTINE IS IN EFFECT. DOCKING RING ACCESS REQUIRES RED CLEARANCE. THE ISV CALLIOPE WILL NOT ACCEPT PASSENGERS UNTIL CLEARED BY MEDICAL. REMAIN CALM. HALDEN-VOSS THANKS YOU FOR YOUR PATIENCE.'],
    ['Unsent message — T. Brandt', "If anyone finds this: the creature is afraid of fire. Mendez held it off with a cutting torch for almost a minute. It screamed and went back into the vents. Then the torch ran dry. Don't let your fuel run dry."],
    ['Medical Officer Chen', 'Lockers are the safest place on this station and also the worst. It checks them. When it stops in front of you, do not breathe. I watched it pull Hollis out through the slats. I did not breathe. I am alive. I do not know how to live with that.'],
    ['Administrator Halvorsen', 'Corporate has authorised Protocol Nine. The Calliope will undock with the research team and samples aboard. Remaining staff are to be "managed in place." I have the red card. I am not going to the docking ring. I am going to sit here with the lights off and wait for it.'],
    ['Engineer Okafor — voice note', "Motion tracker works through walls but the thing hears the ping if it's close. I switch it off when I hide. Also: it hates being in the light for long. It goes back up into the ducts after a while. Count to sixty. Then move."],
    ['ISV Calliope — Captain Ruiz', 'Took aboard the Kestrel research team at 0300. Dr. Vale insisted on bringing cargo crate 7. By 0900 we had lost contact with the hangar crew. I have locked the bridge behind my own card. If the ship is lost, the self-destruct can be armed from the bridge and the shuttle released from there. God help whoever has to do it.'],
    ['ISV Calliope — Chief Engineer', 'Reactor is in cold shutdown. Restart from the Engineering hall: the primary lever on the core housing. The whole ship will light up, so whatever is aboard will know exactly where the power came from. Have a way out before you pull it.'],
    ['ISV Calliope — Marine Cpl. Adeyemi', 'Pulse rounds go straight through the small ones. The big one just shrugs them off. Sergeant says aim for the legs to slow it down. Sergeant is dead. Officer keycards are in the berths, if anyone still has one on them.'],
    ['Cargo Manifest — Crate 7', 'CONTENTS: BIOLOGICAL. CLASS: RESTRICTED. HANDLING: DO NOT OPEN. TEMPERATURE: KEEP BELOW 4C. NOTE (handwritten): it is warm. it was always warm.'],
    ['Child\'s drawing, laminated', 'A crayon picture of a stick family on the station, waving. A tall black shape stands behind them with too many teeth. Written underneath in careful letters: THE TALL MAN LIVES IN THE WALLS.'],
    ['Lab 3 — automated alarm log', '02:14 CONTAINMENT BREACH. 02:14 CONTAINMENT BREACH. 02:15 CONTAINMENT BREACH. 02:15 PERSONNEL LIFE SIGNS: 4. 02:16 PERSONNEL LIFE SIGNS: 2. 02:17 PERSONNEL LIFE SIGNS: 0. 02:17 VENTILATION OVERRIDE ENGAGED.'],
    ['Hydroponics — G. Laurent', "The plants in bay 4 are dying from the roots up. There's black growth in the soil. It's warm to the touch and it moves away from my hand. I've stopped eating anything we grow here."],
    ['Security Office — sticky note', 'BLUE CARD IN THE DESK. If you take it, close the door behind you. Something keeps opening it at night.'],
  ];

  // ------------------------------------------------------------------ item models
  let IM = null;
  function itemMats(env) {
    if (IM) return IM;
    const S = o => new THREE.MeshStandardMaterial(Object.assign({ envMap: env, envMapIntensity: .8, emissive: 0x111111 }, o));
    IM = { white: S({ color: 0xe8e6de, roughness: .4 }), red: S({ color: 0xb0201a, roughness: .4 }), brass: S({ color: 0xb8913f, metalness: 1, roughness: .3 }), dark: S({ color: 0x24262a, metalness: .6, roughness: .4 }),
      olive: S({ color: 0x4d533c, roughness: .6 }), orange: S({ color: 0xc8611c, roughness: .5 }), blue: S({ color: 0x3a7bd5, roughness: .3, emissive: 0x0a1a33 }), steel: S({ color: 0x8a9096, metalness: .9, roughness: .3 }),
      green: S({ color: 0x3a8a4a, roughness: .5 }), yellow: S({ color: 0xc9a31e, roughness: .5 }), cloth: S({ color: 0xd8d2bf, roughness: 1 }), screen: new THREE.MeshBasicMaterial({ color: 0x59ff9a }) };
    return IM;
  }
  const B = (g, m, x, y, z, w, h, d, ry = 0) => { const o = new THREE.Mesh(K.prim.box, m); o.position.set(x, y, z); o.scale.set(w, h, d); o.rotation.y = ry; o.castShadow = true; g.add(o); return o; };
  const C = (g, m, x, y, z, r, h, rx = 0, rz = 0) => { const o = new THREE.Mesh(K.prim.cyl, m); o.position.set(x, y, z); o.scale.set(r * 2, h, r * 2); o.rotation.set(rx, 0, rz); o.castShadow = true; g.add(o); return o; };
  K.itemModel = function (type, env, mapInfo) {
    const M = itemMats(env), g = new THREE.Group();
    switch (type) {
      case 'medkit': B(g, M.white, 0, .06, 0, .3, .12, .2); B(g, M.red, 0, .121, 0, .1, .005, .03); B(g, M.red, 0, .121, 0, .03, .005, .1); B(g, M.dark, 0, .13, 0, .1, .02, .02); break;
      case 'gel': C(g, M.green, 0, .06, 0, .03, .12); C(g, M.white, 0, .13, 0, .015, .02); break;
      case 'cloth': C(g, M.cloth, 0, .04, 0, .04, .08, 0, Math.PI / 2); break;
      case 'scrap': B(g, M.steel, 0, .02, 0, .2, .02, .12, .3); B(g, M.dark, .04, .05, 0, .1, .02, .06, -.4); C(g, M.steel, -.05, .03, .04, .01, .1, 0, 1.2); break;
      case 'chem': C(g, M.orange, 0, .08, 0, .045, .16); C(g, M.dark, 0, .17, 0, .015, .03); B(g, M.white, 0, .08, .046, .05, .06, .002); break;
      case 'battery': B(g, M.yellow, 0, .04, 0, .07, .08, .05); B(g, M.dark, 0, .085, 0, .03, .01, .02); break;
      case 'flare': C(g, M.red, 0, .02, 0, .015, .15, Math.PI / 2, 0); break;
      case 'noise': B(g, M.dark, 0, .02, 0, .06, .035, .03); B(g, M.screen, .015, .04, 0, .006, .004, .006); break;
      case 'bomb': C(g, M.steel, 0, .025, 0, .022, .11, 0, Math.PI / 2); break;
      case 'rounds': B(g, M.olive, 0, .03, 0, .1, .06, .07); for (let k = 0; k < 4; k++) C(g, M.brass, -.03 + k * .02, .07, 0, .005, .02); break;
      case 'shells': B(g, M.red, 0, .035, 0, .12, .07, .08); B(g, M.yellow, 0, .036, .041, .08, .02, .002); break;
      case 'fuel': C(g, M.red, 0, .12, 0, .07, .24); C(g, M.dark, 0, .25, 0, .03, .03); B(g, M.yellow, 0, .12, .071, .06, .06, .002); break;
      case 'cells': B(g, M.olive, 0, .05, 0, .04, .1, .07); B(g, M.screen, 0, .09, .036, .02, .01, .002); break;
      case 'revolver': { const w = K.weaponPreview('revolver'); w.rotation.set(Math.PI / 2, 0, Math.PI / 2); w.position.y = .02; g.add(w); break; }
      case 'shotgun': { const w = K.weaponPreview('shotgun'); w.rotation.set(Math.PI / 2, 0, Math.PI / 2); w.position.y = .03; g.add(w); break; }
      case 'flamer': { const w = K.weaponPreview('flamer'); w.rotation.set(Math.PI / 2, 0, Math.PI / 2); w.position.y = .05; g.add(w); break; }
      case 'pulse': { const w = K.weaponPreview('pulse'); w.rotation.set(Math.PI / 2, 0, Math.PI / 2); w.position.y = .04; g.add(w); break; }
      case 'tracker': B(g, M.dark, 0, .03, 0, .11, .05, .085); B(g, M.screen, 0, .056, .0, .08, .002, .06); B(g, M.dark, 0, .02, .07, .03, .03, .07); break;
      case 'key2': case 'key3': { const c = mapInfo.cards[type === 'key2' ? 2 : 3]; const m = new THREE.MeshStandardMaterial({ color: c.color, emissive: c.color, emissiveIntensity: .35, roughness: .3, metalness: .3 }); B(g, m, 0, .003, 0, .086, .004, .054); B(g, M.brass, -.025, .006, 0, .012, .002, .01); break; }
      case 'log': B(g, M.dark, 0, .01, 0, .13, .016, .09); B(g, M.screen, 0, .019, 0, .1, .001, .065); break;
    }
    return g;
  };
  K.weaponPreview = function (k) { const vm = K.__previewVM, src = vm.models[k], ud = src.userData; src.userData = {}; const m = src.clone(); src.userData = ud; m.visible = true; m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.setScalar(1); return m; };

  // ------------------------------------------------------------------ population
  K.populate = function (G, L, W, mapName) {
    const r = K.rng(L.seed ^ 0x1234), items = [], enemies = [], logs = [];
    const info = K.MAPINFO[mapName];
    const spotIn = (room, used) => {
      const sp = W.spotsByRoom[room.id] || [];
      const free = sp.filter(s => !used.has(s));
      if (free.length) { const s = r.pick(free); used.add(s); return s; }
      return [(room.x + r.range(.6, room.w - .6)) * K.S, .02, (room.y + r.range(.6, room.h - .6)) * K.S];
    };
    const used = new Set();
    const add = (type, room, count = 1, extra) => { const s = spotIn(room, used); items.push(Object.assign({ id: items.length, type, count, x: s[0], y: s[1], z: s[2], room: room.id }, extra || {})); };
    const roomsAt = lv => L.rooms.filter(rm => L.areas[rm.id].level === lv && rm.type !== 'save');
    // key progression
    for (let lv = 2; lv <= 3; lv++) add('key' + lv, L.keyRooms[lv]);
    W.goalRoom = L.goalRoom;
    if (mapName === 'station') {
      add('tracker', L.startRoom); add('medkit', L.startRoom); add('battery', L.startRoom);
      add('revolver', r.pick(roomsAt(0).filter(x => x !== L.startRoom)) || L.startRoom, 1); add('rounds', L.startRoom, 6);
      add('shotgun', r.pick(roomsAt(1)) || L.keyRooms[1], 1);
      add('flamer', L.keyRooms[2], 1); add('fuel', L.keyRooms[2], 50);
    } else {
      add('pulse', L.startRoom.id >= 0 ? (r.pick(L.rooms.filter(rm => rm.type === 'armory' && L.areas[rm.id].level <= 1)) || r.pick(roomsAt(0))) : L.startRoom, 1);
      add('cells', L.startRoom, 32); add('medkit', L.startRoom); add('fuel', L.startRoom, 50);
    }
    // consumables
    const table = [['medkit', 5], ['gel', 9], ['cloth', 9], ['scrap', 14], ['chem', 10], ['battery', 8], ['flare', 6], ['noise', 3], ['rounds', 10], ['shells', 8], ['fuel', 6], ['cells', mapName === 'cruiser' ? 10 : 0], ['log', 7]];
    const tot = table.reduce((a, b) => a + b[1], 0);
    const amount = { rounds: () => r.int(3, 6), shells: () => r.int(2, 4), fuel: () => 25, cells: () => r.int(16, 32) };
    for (const room of L.rooms) {
      if (room === L.startRoom) continue;
      const n = room.type === 'save' ? 2 : Math.min(4, Math.floor(room.cells / 9) + r.int(0, 2));
      for (let k = 0; k < n; k++) {
        let x = r() * tot, pick = 'scrap'; for (const [t, w] of table) { if ((x -= w) < 0) { pick = t; break; } }
        if (room.type === 'save' && k === 0) pick = 'medkit';
        add(pick, room, amount[pick] ? amount[pick]() : 1);
      }
    }
    // logs: assign texts in order of discovery depth
    let li = mapName === 'station' ? 0 : 10;
    for (const it of items) if (it.type === 'log') { it.log = K.LOGS[li % K.LOGS.length]; li++; }
    // terminals with logs on some desks/consoles: interacts
    // enemies
    const safe = new Set(L.saveRooms.map(s => s.id));
    const enemyRooms = L.rooms.filter(rm => rm !== L.startRoom && !safe.has(rm.id) && L.areas[rm.id].level >= 0);
    const nH = mapName === 'station' ? 34 : 28, nC = mapName === 'station' ? 6 : 22;
    for (let k = 0; k < nH; k++) {
      const rm = r.pick(enemyRooms); if (L.areas[rm.id].level === 0 && r.chance(.6)) continue;
      const x = (rm.x + r.range(.5, rm.w - .5)) * K.S, z = (rm.y + r.range(.5, rm.h - .5)) * K.S;
      enemies.push({ id: enemies.length, kind: 'husk', x, z, seed: r.int(1, 1e6) });
    }
    // corridor husks
    const corr = L.areas.filter(a => !a.isRoom && a.level >= 1);
    for (let k = 0; k < (mapName === 'station' ? 10 : 8); k++) { const a = r.pick(corr); const c = r.pick(a.cells); const [x, z] = L.cellCenter(c); enemies.push({ id: enemies.length, kind: 'husk', x, z, seed: r.int(1, 1e6) }); }
    for (let k = 0; k < nC; k++) {
      const rm = r.pick(enemyRooms.filter(x => L.areas[x.id].level >= (mapName === 'station' ? 2 : 1))); if (!rm) break;
      enemies.push({ id: enemies.length, kind: 'crawler', x: (rm.x + r.range(.5, rm.w - .5)) * K.S, z: (rm.y + r.range(.5, rm.h - .5)) * K.S, seed: r.int(1, 1e6) });
    }
    return { items, enemies };
  };
})();
