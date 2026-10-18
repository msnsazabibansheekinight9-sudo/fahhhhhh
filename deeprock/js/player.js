/* Rock & Stone — the dwarf you are driving. Movement resolves against the
   density field directly (no collision meshes), which is what lets you dig a
   tunnel and immediately walk down it. */
(function (RS) {
  'use strict';

  var EYE = 1.42, STAND = 1.68, CROUCH = 1.0, RAD = 0.42;
  var GRAV = 23.0, JUMP = 7.3;
  var WALK = 5.1, SPRINT = 6.6, CROUCH_SPD = 2.7, AIR_CTL = 0.32;

  RS.Player = function (game) {
    this.g = game;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.height = STAND;
    this.crouching = false;
    this.grounded = false; this.groundNormal = new THREE.Vector3(0, 1, 0);
    this.coyote = 0; this.jumpBuffer = 0;
    this.maxHp = 110; this.hp = 110;
    this.maxShield = 25; this.shield = 25; this.shieldTimer = 0;
    this.downed = false; this.downTime = 0; this.reviveProgress = 0;
    this.lives = 3;
    this.dead = false;
    this.bobT = 0; this.bobAmt = 0;
    this.viewRoll = 0; this.viewKick = new THREE.Vector3();
    this.shake = 0;
    this.fallVel = 0;
    this.lastDamage = 999;
    this.onZip = null; this.zipT = 0; this.zipDir = 1;
    this.grappleTarget = null; this.grappleT = 0;
    this.drilling = false;
    this.lamp = null;
    this.flares = 4; this.flareCool = 0;
    this.resources = { nitra: 0, morkite: 0, gold: 0, crystal: 0 };
    this.carried = null;            // objective item in hands (aquarq / egg / fuel cell)
    this.mineCool = 0; this.swingT = 0; this.powerCool = 0;
    this.stepDist = 0;
    this.hazardTimer = 0;
    this._n = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
  };

  var PP = RS.Player.prototype;

  PP.spawn = function (p) {
    this.pos.set(p.x, p.y + 1.0, p.z);
    this.vel.set(0, 0, 0);
    this.hp = this.maxHp; this.shield = this.maxShield;
    this.downed = false; this.dead = false;
  };

  PP.eyeY = function () { return this.pos.y + (this.height - STAND) + EYE; };

  PP.forward = function (out) {
    out = out || this._fwd;
    var cp = Math.cos(this.pitch);
    out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    return out;
  };
  PP.rightVec = function (out) {
    out = out || this._right;
    out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    return out;
  };

  PP.look = function (dx, dy, sens, invert) {
    if (this.dead) return;
    this.yaw -= dx * 0.0022 * sens;
    this.pitch -= dy * 0.0022 * sens * (invert ? -1 : 1);
    this.pitch = RS.clamp(this.pitch, -1.52, 1.52);
    if (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    if (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
  };

  // ------------------------------------------------------------- collision
  /* The field is close enough to a signed distance near the surface that we can
     push the body out along the gradient until it clears. Three passes is
     plenty, even inside a freshly drilled tunnel. */
  PP.resolve = function (t) {
    var hs = [0.42, this.height * 0.5, this.height - 0.34];
    var pushed = false;
    for (var pass = 0; pass < 3; pass++) {
      var any = false;
      for (var i = 0; i < hs.length; i++) {
        var y = this.pos.y + hs[i];
        var d = t.sample(this.pos.x, y, this.pos.z);
        if (d > -RAD) {
          t.normalAt(this.pos.x, y, this.pos.z, this._n);
          var push = (d + RAD) * 0.8;
          this.pos.x += this._n.x * push;
          this.pos.y += this._n.y * push;
          this.pos.z += this._n.z * push;
          // kill velocity into the wall
          var vd = this.vel.dot(this._n);
          if (vd < 0) this.vel.addScaledVector(this._n, -vd);
          any = true; pushed = true;
        }
      }
      if (!any) break;
    }
    return pushed;
  };

  PP.checkGround = function (t) {
    var feetY = this.pos.y;
    // terrain below
    var best = null, bn = null;
    var probe = t.raycast(this.pos.x, feetY + 0.55, this.pos.z, 0, -1, 0, 1.6);
    if (probe.hit && !probe.inside) {
      best = probe.y;
      bn = new THREE.Vector3(probe.nx, probe.ny, probe.nz);
    }
    // engineer platforms, pods, ziplines and other solid props
    var sup = this.g.supportAt ? this.g.supportAt(this.pos.x, feetY + 0.6, this.pos.z, 1.7) : null;
    if (sup !== null && (best === null || sup > best)) { best = sup; bn = new THREE.Vector3(0, 1, 0); }

    if (best !== null && feetY - best < 0.42 && this.vel.y <= 0.6) {
      var slope = bn ? bn.y : 1;
      this.pos.y = best;
      if (!this.grounded) this.onLand();
      this.grounded = true;
      this.groundNormal.copy(bn || this.groundNormal);
      if (this.vel.y < 0) this.vel.y = 0;
      this.coyote = 0.12;
      this.steepGround = slope < 0.62;
    } else {
      if (this.grounded) this.coyote = 0.1;
      this.grounded = false;
      this.steepGround = false;
    }
  };

  PP.onLand = function () {
    var v = -this.fallVel;
    if (v > 15) {
      var dmg = (v - 15) * 4.2;
      this.hurt(dmg, 'fall');
      this.shake = Math.min(1.4, dmg * 0.045);
      this.g.audio && this.g.audio.play('thud', this.pos, 1);
    } else if (v > 5) {
      this.shake = Math.min(0.35, v * 0.02);
      this.g.audio && this.g.audio.play('step', this.pos, 0.8);
    }
    this.fallVel = 0;
  };

  // ------------------------------------------------------------- damage
  PP.hurt = function (amount, cause) {
    if (this.downed || this.dead || amount <= 0) return;
    if (this.g.godMode) return;
    this.lastDamage = 0;
    this.shieldTimer = 0;
    if (this.shield > 0) {
      var s = Math.min(this.shield, amount);
      this.shield -= s; amount -= s;
      if (this.shield <= 0) this.g.audio && this.g.audio.play('shieldbreak', this.pos, 0.8);
    }
    if (amount > 0) {
      this.hp -= amount;
      this.g.fx && this.g.fx.damageFlash(amount / this.maxHp);
      this.shake = Math.min(1.2, this.shake + amount * 0.012);
      if (this.hp <= 0) this.goDown(cause);
    }
    RS.bus.emit('player-hurt', amount, cause);
  };

  PP.heal = function (a) { this.hp = Math.min(this.maxHp, this.hp + a); };

  PP.goDown = function (cause) {
    this.hp = 0;
    this.lives--;
    if (this.lives <= 0) {
      this.dead = true;
      RS.bus.emit('player-dead', cause);
    } else {
      this.downed = true;
      this.downTime = 0;
      this.reviveProgress = 0;
      this.vel.set(0, 0, 0);
      RS.bus.emit('player-down', cause);
    }
  };

  PP.revive = function () {
    this.downed = false;
    this.hp = Math.max(28, this.maxHp * 0.3);
    this.shield = this.maxShield;
    this.reviveProgress = 0;
    RS.bus.emit('player-revived');
  };

  // ------------------------------------------------------------- main step
  PP.update = function (dt, input) {
    var t = this.g.terrain;
    this.lastDamage += dt;
    this.mineCool = Math.max(0, this.mineCool - dt);
    this.powerCool = Math.max(0, this.powerCool - dt);
    this.flareCool = Math.max(0, this.flareCool - dt);
    if (this.swingT > 0) this.swingT = Math.max(0, this.swingT - dt);

    // shields recharge after a short lull, like the originals' blue bar
    if (!this.downed && this.shield < this.maxShield) {
      this.shieldTimer += dt;
      if (this.shieldTimer > 5.0) this.shield = Math.min(this.maxShield, this.shield + this.maxShield * dt * 0.55);
    }

    if (this.dead) return;

    if (this.downed) {
      this.downTime += dt;
      // bleed out slowly; Bosco or a teammate can still get you up
      this.vel.y -= GRAV * dt;
      this.pos.y += this.vel.y * dt;
      this.resolve(t);
      this.checkGround(t);
      if (this.grounded) this.vel.y = 0;
      if (this.downTime > 60) { this.dead = true; RS.bus.emit('player-dead', 'bleedout'); }
      this.shake = Math.max(0, this.shake - dt * 2);
      return;
    }

    // ---- zipline ride --------------------------------------------------
    if (this.onZip) {
      var z = this.onZip;
      this.zipT += dt * (2.6 / Math.max(1, z.len)) * this.zipDir;
      if (this.zipT <= 0 || this.zipT >= 1 || input.jump) {
        if (input.jump) this.vel.set(this.vel.x, 4.2, this.vel.z);
        this.onZip = null;
      } else {
        this.pos.lerpVectors(z.a, z.b, this.zipT);
        this.pos.y -= 0.9;
        this.vel.set(0, 0, 0);
        this.bobT += dt * 4;
        this.updateCamera(dt);
        return;
      }
    }

    // ---- grapple pull --------------------------------------------------
    if (this.grappleTarget) {
      this.grappleT += dt;
      var gp = this.grappleTarget;
      this._tmp.copy(gp).sub(this.pos);
      var gd = this._tmp.length();
      if (gd < 2.0 || this.grappleT > 2.6) {
        this.grappleTarget = null;
        this.vel.multiplyScalar(0.35);
      } else {
        this._tmp.normalize();
        var spd = 25;
        this.vel.copy(this._tmp).multiplyScalar(spd);
        this.pos.addScaledVector(this.vel, dt);
        if (this.resolve(t)) { this.grappleTarget = null; this.vel.multiplyScalar(0.2); }
        this.updateCamera(dt);
        this.fallVel = 0;
        return;
      }
    }

    // ---- crouch --------------------------------------------------------
    var wantCrouch = input.crouch;
    if (!wantCrouch && this.crouching) {
      // only stand if there is headroom
      if (t.sample(this.pos.x, this.pos.y + STAND - 0.3, this.pos.z) < -0.2) this.crouching = false;
    } else this.crouching = wantCrouch;
    var targetH = this.crouching ? CROUCH : STAND;
    this.height += (targetH - this.height) * Math.min(1, dt * 12);

    // ---- horizontal movement ------------------------------------------
    var fwd = this.rightVec(this._right);
    var fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    var mx = 0, mz = 0;
    if (input.fwd) { mx += fx; mz += fz; }
    if (input.back) { mx -= fx; mz -= fz; }
    if (input.right) { mx += this._right.x; mz += this._right.z; }
    if (input.left) { mx -= this._right.x; mz -= this._right.z; }
    var ml = Math.hypot(mx, mz);
    if (ml > 0) { mx /= ml; mz /= ml; }

    var speed = this.crouching ? CROUCH_SPD : (input.sprint ? SPRINT : WALK);
    if (this.carried && this.carried.heavy) speed *= 0.62;    // hauling an aquarq
    if (this.drilling) speed *= 0.72;
    if (this.g.slowFactor) speed *= this.g.slowFactor;

    var accel = this.grounded ? 42 : 42 * AIR_CTL;
    var desiredX = mx * speed, desiredZ = mz * speed;
    this.vel.x += (desiredX - this.vel.x) * Math.min(1, accel * dt / Math.max(1, speed));
    this.vel.z += (desiredZ - this.vel.z) * Math.min(1, accel * dt / Math.max(1, speed));
    if (this.grounded && ml === 0) {
      var fr = Math.max(0, 1 - dt * 11);
      this.vel.x *= fr; this.vel.z *= fr;
    }
    // slide off slopes that are too steep to stand on
    if (this.grounded && this.steepGround) {
      this.vel.x += this.groundNormal.x * 16 * dt;
      this.vel.z += this.groundNormal.z * 16 * dt;
    }

    // ---- jump ----------------------------------------------------------
    this.coyote = Math.max(0, this.coyote - dt);
    if (input.jump) this.jumpBuffer = 0.14; else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (this.jumpBuffer > 0 && (this.grounded || this.coyote > 0)) {
      this.vel.y = JUMP;
      this.grounded = false; this.coyote = 0; this.jumpBuffer = 0;
      this.g.audio && this.g.audio.play('jump', this.pos, 0.5);
    }

    // ---- gravity + integrate ------------------------------------------
    this.vel.y -= GRAV * dt;
    if (this.vel.y < -58) this.vel.y = -58;
    if (!this.grounded) this.fallVel = Math.min(this.fallVel, this.vel.y);

    // substep so fast falls can't tunnel through thin floors
    var move = this._tmp.copy(this.vel).multiplyScalar(dt);
    var steps = Math.max(1, Math.ceil(move.length() / 0.35));
    var inv = 1 / steps;
    for (var s = 0; s < steps; s++) {
      this.pos.x += move.x * inv; this.pos.y += move.y * inv; this.pos.z += move.z * inv;
      this.resolve(t);
    }
    // keep inside the block
    this.pos.x = RS.clamp(this.pos.x, 3, t.nx - 3);
    this.pos.z = RS.clamp(this.pos.z, 3, t.nz - 3);
    if (this.pos.y < 1) { this.pos.y = 1; this.hurt(9999, 'void'); }

    this.checkGround(t);

    // ---- footsteps + view bob ------------------------------------------
    var hspd = Math.hypot(this.vel.x, this.vel.z);
    if (this.grounded && hspd > 0.8) {
      this.stepDist += hspd * dt;
      var stride = input.sprint ? 2.0 : 2.4;
      if (this.stepDist > stride) {
        this.stepDist = 0;
        this.g.audio && this.g.audio.play('step', this.pos, 0.5 + Math.random() * 0.2);
      }
      this.bobT += dt * (hspd * 1.5);
      this.bobAmt += (Math.min(1, hspd / WALK) - this.bobAmt) * Math.min(1, dt * 7);
    } else {
      this.bobAmt += (0 - this.bobAmt) * Math.min(1, dt * 6);
    }

    this.updateCamera(dt);
    this.updateHazards(dt);
  };

  PP.updateHazards = function (dt) {
    var hz = this.g.biome && this.g.biome.hazard;
    if (!hz) return;
    this.hazardTimer += dt;
    // Light environmental pressure, so biomes feel different to stand around in.
    if (hz === 'radiation' && this.hazardTimer > 2.2) {
      this.hazardTimer = 0;
      var near = this.g.nearRadSource ? this.g.nearRadSource(this.pos) : false;
      if (near) this.hurt(3 * RS.perkHazardScale(this.g), 'radiation');
    } else if (hz === 'cold' && this.hazardTimer > 1.0) {
      this.hazardTimer = 0;
      if (!this.g.nearHeat || !this.g.nearHeat(this.pos)) {
        this.cold = Math.min(1, (this.cold || 0) + 0.035);
        if (this.cold >= 1) { this.hurt(4 * RS.perkHazardScale(this.g), 'cold'); this.cold = 0.72; }
      } else this.cold = Math.max(0, (this.cold || 0) - 0.12);
    } else if (hz === 'heat' && this.hazardTimer > 1.0) {
      this.hazardTimer = 0;
      if (this.g.nearLava && this.g.nearLava(this.pos)) { this.hurt(6 * RS.perkHazardScale(this.g), 'heat'); }
    }
  };

  PP.updateCamera = function (dt) {
    var cam = this.g.camera;
    var bob = this.bobAmt;
    var by = Math.sin(this.bobT * 2) * 0.045 * bob;
    var bx = Math.cos(this.bobT) * 0.03 * bob;
    this.shake = Math.max(0, this.shake - dt * 2.6);
    var sh = this.shake * (this.g.profile ? this.g.profile.settings.shake : 1) * RS.perkRecoilScale(this.g);
    var sx = (Math.random() - 0.5) * sh * 0.14;
    var sy = (Math.random() - 0.5) * sh * 0.14;

    cam.position.set(this.pos.x + bx, this.eyeY() + by, this.pos.z);
    this.viewRoll += (((this.vel.x * Math.cos(this.yaw) - this.vel.z * Math.sin(this.yaw)) * -0.012) - this.viewRoll) * Math.min(1, dt * 7);
    cam.rotation.set(0, 0, 0);
    cam.rotation.order = 'YXZ';
    cam.rotation.y = this.yaw + sx;
    cam.rotation.x = this.pitch + sy + (this.downed ? -0.55 : 0);
    cam.rotation.z = this.viewRoll + Math.sin(this.bobT) * 0.012 * bob + (this.downed ? 0.5 : 0);
    if (this.downed) cam.position.y = this.pos.y + 0.45;

    if (this.lamp) {
      this.lamp.position.copy(cam.position);
      this.forward(this._fwd);
      this.lamp.target.position.copy(cam.position).addScaledVector(this._fwd, 12);
      this.lamp.target.updateMatrixWorld();
    }
  };

  // ------------------------------------------------------------- mining
  /* Pickaxe. Everyone carries one; it is the universal answer to terrain and
     the fastest way to clear a mineral seam. */
  PP.mine = function (power) {
    if (this.mineCool > 0 || this.downed) return false;
    var t = this.g.terrain;
    this.forward(this._fwd);
    var reach = power ? 3.4 : 3.0;
    var cam = this.g.camera.position;
    var hit = t.raycast(cam.x, cam.y, cam.z, this._fwd.x, this._fwd.y, this._fwd.z, reach);
    var hitOre = this.g.oreNodeNear ? this.g.oreNodeNear(cam, this._fwd, reach) : null;
    if (!hit.hit && !hitOre) return false;
    if (hit.hit && hit.mat === RS.MAT.HARD) {
      this.g.fx && this.g.fx.sparks(hit, 6, 0xffd090);
      this.g.audio && this.g.audio.play('clang', this.pos, 0.8);
      this.mineCool = 0.5; this.swingT = 0.32;
      this.g.toast && this.g.toast('That rock is not going anywhere.');
      return true;
    }
    var hardness = hit.hit ? (RS.MAT_HARDNESS[hit.mat] || 1) : 1;
    var r = power ? 2.35 : 1.28;
    var px = hit.hit ? hit.x : hitOre.x, py = hit.hit ? hit.y : hitOre.y, pz = hit.hit ? hit.z : hitOre.z;
    t.carveSphere(px - this._fwd.x * -0.2, py, pz, r, 0.3, undefined, 0.5);
    this.g.collectOreIn(px, py, pz, r + 0.7);
    // the pick is a weapon too, and a surprisingly good one up close
    if (this.g.enemies) {
      this.g.enemies.coneDamage(cam, this._fwd, reach + 0.6, 0.55,
        power ? 180 : 85, 'pickaxe');
    }
    this.mineCool = (power ? 1.05 : 0.46) * Math.min(1.6, hardness) * RS.perkMeleeSpeed(this.g);
    this.swingT = power ? 0.5 : 0.3;
    if (power) this.powerCool = 4.0;
    this.g.fx && this.g.fx.rubble(px, py, pz, hit.hit ? hit.mat : RS.MAT.ROCK, power ? 16 : 8);
    this.g.audio && this.g.audio.play(power ? 'pickbig' : 'pick', this.pos, 0.9);
    this.shake = Math.max(this.shake, power ? 0.3 : 0.1);
    return true;
  };

  PP.throwFlare = function () {
    if (this.flares <= 0 || this.flareCool > 0) return false;
    this.flares--; this.flareCool = 0.4;
    this.forward(this._fwd);
    var cam = this.g.camera.position;
    this.g.spawnFlare(
      cam.x + this._fwd.x, cam.y + this._fwd.y - 0.1, cam.z + this._fwd.z,
      this._fwd.x * 16 + this.vel.x * 0.5, this._fwd.y * 16 + 3, this._fwd.z * 16 + this.vel.z * 0.5
    );
    this.g.audio && this.g.audio.play('flare', this.pos, 0.6);
    return true;
  };
})(window.RS);
