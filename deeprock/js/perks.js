/* Rock & Stone — perks. One active perk on a key, two passives that quietly
   change how a dwarf plays. Chosen on the loadout screen and saved. */
(function (RS) {
  'use strict';

  RS.ACTIVE_PERKS = [
    {
      id: 'ironwill', name: 'Iron Will', cd: 0,
      desc: 'Once a mission, get back on your feet by sheer spite. Twelve seconds to fix the situation.',
      use: function (g) {
        var p = g.player;
        if (!p.downed || g.perks.ironWillUsed) return false;
        g.perks.ironWillUsed = true;
        p.revive();
        p.hp = Math.max(p.hp, 40);
        p.ironWill = 12;
        g.toast('IRON WILL — twelve seconds');
        g.audio.play('rockstone', null, 1);
        return true;
      }
    },
    {
      id: 'dash', name: 'Dash', cd: 22,
      desc: 'A hard shove forward. Good for closing a gap, better for leaving one.',
      use: function (g) {
        var p = g.player;
        var f = p.forward(new THREE.Vector3());
        p.vel.x += f.x * 15; p.vel.z += f.z * 15;
        if (p.grounded) p.vel.y += 2.4;
        g.audio.play('jump', null, 0.8);
        g.fx.dust(p.pos.x, p.pos.y + 0.4, p.pos.z, 10, 0x8a8070, 1.4);
        return true;
      }
    },
    {
      id: 'berzerker', name: 'Berzerker', cd: 30,
      desc: 'Eight seconds of very fast pickaxe work, and every kill patches you up.',
      use: function (g) {
        g.perks.berzerk = 8;
        g.toast('BERZERKER');
        g.audio.play('rockstone', null, 0.9);
        return true;
      }
    }
  ];

  RS.PASSIVE_PERKS = [
    { id: 'tough', name: 'Tough', desc: '+30 maximum health.',
      init: function (g) { g.player.maxHp += 30; g.player.hp += 30; } },
    { id: 'thorns', name: 'Thorns', desc: 'Anything that bites you takes 28 damage for the trouble.' },
    { id: 'vampire', name: 'Vampire', desc: 'Pickaxe and drill kills restore 14 health.' },
    { id: 'pockets', name: 'Deep Pockets', desc: 'Every mineral lump yields a third more.' },
    { id: 'bornready', name: 'Born Ready', desc: 'Holstered weapons reload themselves.' },
    { id: 'sweettooth', name: 'Sweet Tooth', desc: 'Picking up minerals heals a little.' },
    { id: 'insulated', name: 'Elemental Insulation', desc: 'Half damage from heat, cold and radiation.' },
    { id: 'depositor', name: 'Veteran Depositor', desc: 'Depositing at the M.U.L.E. refills your shield.' },
    { id: 'resupplier', name: 'Resupplier', desc: 'Resupply pods also top up your health completely.' },
    { id: 'steadfast', name: 'Steady', desc: 'A third less recoil and camera shake.' }
  ];

  RS.perkById = function (id) {
    var i;
    for (i = 0; i < RS.ACTIVE_PERKS.length; i++) if (RS.ACTIVE_PERKS[i].id === id) return RS.ACTIVE_PERKS[i];
    for (i = 0; i < RS.PASSIVE_PERKS.length; i++) if (RS.PASSIVE_PERKS[i].id === id) return RS.PASSIVE_PERKS[i];
    return null;
  };

  /* Build the per-mission perk state and run the ones that change starting
     stats. Everything else is a flag the systems check. */
  RS.applyPerks = function (g, chosen) {
    var set = {};
    var passives = (chosen && chosen.passive) || [];
    for (var i = 0; i < passives.length; i++) set[passives[i]] = true;
    g.perks = {
      active: (chosen && chosen.active) ? RS.perkById(chosen.active) : null,
      has: function (id) { return !!set[id]; },
      cd: 0, ironWillUsed: false, berzerk: 0
    };
    for (i = 0; i < passives.length; i++) {
      var p = RS.perkById(passives[i]);
      if (p && p.init) p.init(g);
    }
    return g.perks;
  };

  RS.usePerk = function (g) {
    if (!g.perks || !g.perks.active) return;
    if (g.perks.cd > 0) {
      g.toast(g.perks.active.name + ' ready in ' + Math.ceil(g.perks.cd) + 's');
      return;
    }
    if (g.perks.active.use(g)) g.perks.cd = g.perks.active.cd;
  };

  RS.updatePerks = function (g, dt) {
    if (!g.perks) return;
    if (g.perks.cd > 0) g.perks.cd = Math.max(0, g.perks.cd - dt);
    if (g.perks.berzerk > 0) g.perks.berzerk = Math.max(0, g.perks.berzerk - dt);
    var p = g.player;
    if (p.ironWill > 0) {
      p.ironWill -= dt;
      // the clock runs out and you go straight back down unless something saved you
      if (p.ironWill <= 0 && p.hp <= 40 && !p.downed) p.goDown('iron will expired');
    }
    // holstered weapons quietly top themselves up
    if (g.perks.has('bornready') && g.weapons) {
      var list = g.weapons.list;
      for (var i = 0; i < list.length; i++) {
        var w = list[i];
        if (i === g.weapons.idx || !w.reserveMax || w.mag >= w.magMax) continue;
        w.bornT = (w.bornT || 0) + dt;
        if (w.bornT > 2.4) {
          w.bornT = 0;
          var take = Math.min(w.magMax - w.mag, w.reserve);
          w.mag += take; w.reserve -= take;
        }
      }
    }
  };

  // Hooks the rest of the game calls.
  RS.perkOnMeleeHit = function (g, enemy) {
    if (g.perks && g.perks.has('thorns') && g.enemies) {
      g.enemies.damage(enemy, 28, null, false, 'thorns');
      g.fx.sparks({ x: enemy.pos.x, y: enemy.pos.y + 0.5, z: enemy.pos.z, nx: 0, ny: 1, nz: 0 }, 4, 0xffd090);
    }
  };
  RS.perkOnKill = function (g, cause) {
    if (!g.perks) return;
    var melee = cause === 'pickaxe' || cause === 'drill' || cause === 'axe';
    if (g.perks.has('vampire') && melee) { g.player.heal(14); g.audio.play('heal', null, 0.4); }
    if (g.perks.berzerk > 0) g.player.heal(8);
  };
  RS.perkOreMultiplier = function (g) {
    return (g.perks && g.perks.has('pockets')) ? 1.34 : 1;
  };
  RS.perkOnPickup = function (g) {
    if (g.perks && g.perks.has('sweettooth')) g.player.heal(1.6);
  };
  RS.perkOnDeposit = function (g) {
    if (g.perks && g.perks.has('depositor')) {
      g.player.shield = g.player.maxShield;
      g.player.shieldTimer = 0;
    }
  };
  RS.perkOnResupply = function (g) {
    if (g.perks && g.perks.has('resupplier')) g.player.hp = g.player.maxHp;
  };
  RS.perkHazardScale = function (g) {
    return (g.perks && g.perks.has('insulated')) ? 0.5 : 1;
  };
  RS.perkRecoilScale = function (g) {
    return (g.perks && g.perks.has('steadfast')) ? 0.66 : 1;
  };
  RS.perkMeleeSpeed = function (g) {
    return (g.perks && g.perks.berzerk > 0) ? 0.45 : 1;
  };
})(window.RS);
