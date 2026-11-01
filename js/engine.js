/**
 * NEON FLIP – Core 60 FPS Canvas Game Engine
 * Physics, procedural obstacle generation, collision detection, power-ups, and particle systems.
 */

(function (window) {
  'use strict';

  // Constants
  const VIRTUAL_WIDTH = 380;
  const VIRTUAL_HEIGHT = 640;
  const FLOOR_HEIGHT = 45;
  const CEILING_HEIGHT = 45;
  const BALL_RADIUS = 15;
  const BASE_GRAVITY = 1800; // px/s^2
  const JUMP_IMPULSE = 380;

  class ParticlePool {
    constructor(maxSize = 250) {
      this.pool = [];
      this.active = [];
      this.maxSize = maxSize;
      for (let i = 0; i < maxSize; i++) {
        this.pool.push({
          x: 0, y: 0, vx: 0, vy: 0,
          size: 2, color: '#fff', alpha: 1,
          decay: 0.02, shape: 'circle'
        });
      }
    }

    spawn(x, y, vx, vy, size, color, decay = 0.03, shape = 'circle') {
      const p = this.pool.pop() || { x, y, vx, vy, size, color, alpha: 1, decay, shape };
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.size = size;
      p.color = color;
      p.alpha = 1;
      p.decay = decay;
      p.shape = shape;
      this.active.push(p);
      return p;
    }

    update(dt) {
      for (let i = this.active.length - 1; i >= 0; i--) {
        const p = this.active[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * (dt * 60);
        if (p.alpha <= 0) {
          this.active.splice(i, 1);
          if (this.pool.length < this.maxSize) {
            this.pool.push(p);
          }
        }
      }
    }

    draw(ctx) {
      for (let i = 0; i < this.active.length; i++) {
        const p = this.active[i];
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    clear() {
      while (this.active.length > 0) {
        this.pool.push(this.active.pop());
      }
    }
  }

  class NeonGameEngine {
    constructor(canvas, onGameOverCallback, onScoreUpdateCallback) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.onGameOver = onGameOverCallback;
      this.onScoreUpdate = onScoreUpdateCallback;

      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;

      this.particles = new ParticlePool(300);
      this.floatingTexts = [];

      this.rng = new window.NFRandom(Date.now());
      this.isDaily = false;
      this.friendChallenge = null;

      // Game State
      this.isRunning = false;
      this.isPaused = false;
      this.score = 0;
      this.coinsCollected = 0;
      this.flipsCount = 0;
      this.nearMissCount = 0;
      this.comboStreak = 0;
      this.comboTimer = 0;
      this.obstaclesPassed = 0;
      this.gameStartTime = 0;
      this.hasUsedRevive = false;

      // Player Entity
      this.player = {
        x: 90,
        y: VIRTUAL_HEIGHT - FLOOR_HEIGHT - BALL_RADIUS,
        vy: 0,
        radius: BALL_RADIUS,
        gravityDir: 1, // 1 = down (floor), -1 = up (ceiling)
        isGrounded: true,
        angle: 0,
        angularVelocity: 0,
        squishX: 1,
        squishY: 1,
        skin: 'neon_cyan',
        invulnerableTimer: 0,
        shieldActive: false,
        magnetActive: false,
        multiplierActive: false,
        slowMoActive: false,
        powerUpTimers: {
          shield: 0,
          magnet: 0,
          multiplier: 0,
          slowMo: 0
        }
      };

      // World state
      this.worldSpeed = 340;
      this.baseSpeed = 340;
      this.traveledDistance = 0;
      this.obstacles = [];
      this.coins = [];
      this.powerUps = [];
      this.nextObstacleDistance = 380;

      // Screen Shake
      this.shakeIntensity = 0;
      this.shakeDuration = 0;

      // Quality setting cache
      this.quality = 'high';
      this.lastFrameTime = 0;
      this.animationId = null;

      // Input debounce
      this.lastFlipTime = 0;

      this.handleResize();
      window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;

      // Fit virtual 380x640 within viewport maintaining aspect ratio
      const scaleX = containerWidth / VIRTUAL_WIDTH;
      const scaleY = containerHeight / VIRTUAL_HEIGHT;
      this.scale = Math.min(scaleX, scaleY);

      this.canvas.width = containerWidth * dpr;
      this.canvas.height = containerHeight * dpr;
      this.canvas.style.width = `${containerWidth}px`;
      this.canvas.style.height = `${containerHeight}px`;

      this.offsetX = (containerWidth - VIRTUAL_WIDTH * this.scale) / 2;
      this.offsetY = (containerHeight - VIRTUAL_HEIGHT * this.scale) / 2;

      this.ctx.imageSmoothingEnabled = true;
    }

    startNewGame({ isDaily = false, seed = null, friendChallenge = null } = {}) {
      this.isDaily = isDaily;
      this.friendChallenge = friendChallenge;

      if (isDaily && window.NFChallenges) {
        this.rng = new window.NFRandom(window.NFChallenges.getDailySeed());
      } else if (seed !== null) {
        this.rng = new window.NFRandom(seed);
      } else {
        this.rng = new window.NFRandom(Math.floor(Math.random() * 2147483647));
      }

      const settings = window.NFStorage ? window.NFStorage.get('settings') : null;
      this.quality = settings ? settings.quality : 'high';

      const equippedSkin = window.NFStorage ? window.NFStorage.get('equippedSkin') : 'neon_cyan';

      this.isRunning = true;
      this.isPaused = false;
      this.score = 0;
      this.coinsCollected = 0;
      this.flipsCount = 0;
      this.nearMissCount = 0;
      this.comboStreak = 0;
      this.comboTimer = 0;
      this.obstaclesPassed = 0;
      this.gameStartTime = Date.now();
      this.hasUsedRevive = false;

      this.baseSpeed = 340;
      if (isDaily && window.NFChallenges) {
        const mod = window.NFChallenges.getDailyModifier();
        if (mod && mod.speedMult) this.baseSpeed *= mod.speedMult;
      }
      this.worldSpeed = this.baseSpeed;
      this.traveledDistance = 0;

      this.player.x = 90;
      this.player.y = VIRTUAL_HEIGHT - FLOOR_HEIGHT - BALL_RADIUS;
      this.player.vy = 0;
      this.player.gravityDir = 1;
      this.player.isGrounded = true;
      this.player.angle = 0;
      this.player.angularVelocity = 0;
      this.player.squishX = 1;
      this.player.squishY = 1;
      this.player.skin = equippedSkin;
      this.player.invulnerableTimer = 0.5; // Brief safe spawn
      this.player.shieldActive = false;
      this.player.magnetActive = false;
      this.player.multiplierActive = false;
      this.player.slowMoActive = false;
      this.player.powerUpTimers = { shield: 0, magnet: 0, multiplier: 0, slowMo: 0 };

      this.obstacles = [];
      this.coins = [];
      this.powerUps = [];
      this.floatingTexts = [];
      this.particles.clear();
      this.nextObstacleDistance = 400;

      this.shakeIntensity = 0;
      this.shakeDuration = 0;

      if (window.NFSound) {
        window.NFSound.startMusic();
      }

      this.lastFrameTime = performance.now();
      if (!this.animationId) {
        this.loop = this.loop.bind(this);
        this.animationId = requestAnimationFrame(this.loop);
      }
    }

    /**
     * Primary action: Invert gravity (Floor <-> Ceiling)
     */
    flipGravity() {
      if (!this.isRunning || this.isPaused) return;

      const now = performance.now();
      if (now - this.lastFlipTime < 70) return; // Debounce double tap
      this.lastFlipTime = now;

      this.player.gravityDir *= -1;
      this.player.isGrounded = false;
      this.player.vy = this.player.gravityDir * JUMP_IMPULSE;
      this.player.angularVelocity = this.player.gravityDir * 12;

      // Squish vertically when launching
      this.player.squishX = 0.75;
      this.player.squishY = 1.35;

      this.flipsCount++;

      if (window.NFSound) {
        window.NFSound.playFlip(this.player.gravityDir === -1);
      }

      // Trail burst particles
      const skin = window.NFSkins ? window.NFSkins.getById(this.player.skin) : null;
      const color = skin ? skin.color : '#00f3ff';
      const particleCount = this.quality === 'low' ? 3 : 8;
      for (let i = 0; i < particleCount; i++) {
        this.particles.spawn(
          this.player.x,
          this.player.y,
          (this.rng.next() - 0.5) * 80 - 60,
          -this.player.gravityDir * (60 + this.rng.next() * 100),
          this.rng.range(2, 4),
          color,
          0.05
        );
      }
    }

    revivePlayer() {
      this.isRunning = true;
      this.hasUsedRevive = true;
      this.player.y = VIRTUAL_HEIGHT / 2;
      this.player.vy = 0;
      this.player.invulnerableTimer = 3.0; // 3 seconds invulnerability
      this.player.shieldActive = true;
      this.player.powerUpTimers.shield = 3.0;

      // Clear obstacles immediately in front
      this.obstacles = this.obstacles.filter(o => o.x > this.player.x + 300);

      this.addFloatingText('REVIVED! SHIELD ACTIVE', this.player.x, this.player.y - 30, '#00ff66', 22);

      if (window.NFSound) {
        window.NFSound.playFanfare();
        window.NFSound.startMusic();
      }

      this.lastFrameTime = performance.now();
      if (!this.animationId) {
        this.animationId = requestAnimationFrame(this.loop);
      }
    }

    pauseGame() {
      this.isPaused = true;
    }

    resumeGame() {
      if (this.isPaused) {
        this.isPaused = false;
        this.lastFrameTime = performance.now();
      }
    }

    /* -------------------------------------------------------------
       PROCEDURAL OBSTACLE & REWARD GENERATION
       ------------------------------------------------------------- */

    spawnObstacleChunk() {
      const obstacleTypes = ['pillar', 'laser_gate', 'plasma_mine', 'moving_spike', 'double_saw'];
      const chosenType = this.rng.choice(obstacleTypes);

      const spawnX = VIRTUAL_WIDTH + 80;
      const playHeight = VIRTUAL_HEIGHT - FLOOR_HEIGHT - CEILING_HEIGHT;

      // Progressive gap difficulty
      const minGap = Math.max(110, 190 - Math.floor(this.score / 250) * 12);

      switch (chosenType) {
        case 'pillar': {
          // Top or Bottom Pillar Spike
          const isTop = this.rng.next() > 0.5;
          const height = this.rng.range(80, 160);
          const width = 36;
          const y = isTop ? CEILING_HEIGHT : VIRTUAL_HEIGHT - FLOOR_HEIGHT - height;

          this.obstacles.push({
            type: 'pillar',
            x: spawnX,
            y: y,
            width: width,
            height: height,
            isTop: isTop,
            nearMissChecked: false,
            color: '#00f3ff'
          });

          // Spawn a coin on opposite side
          const coinY = isTop ? VIRTUAL_HEIGHT - FLOOR_HEIGHT - 35 : CEILING_HEIGHT + 35;
          this.spawnCoin(spawnX, coinY);
          break;
        }

        case 'laser_gate': {
          // Blinking laser gate that cycles on/off
          const gateHeight = this.rng.range(120, 180);
          const gateY = CEILING_HEIGHT + this.rng.range(30, playHeight - gateHeight - 30);
          this.obstacles.push({
            type: 'laser_gate',
            x: spawnX,
            y: gateY,
            width: 22,
            height: gateHeight,
            timer: 0,
            cycleDuration: 1.8,
            isActive: true,
            nearMissChecked: false,
            color: '#ff0055'
          });

          // Chance to spawn a power-up behind it
          if (this.rng.next() < 0.25) {
            this.spawnPowerUp(spawnX + 60, gateY + gateHeight / 2);
          }
          break;
        }

        case 'plasma_mine': {
          // Bobbing sinusoidal mine
          const centerY = CEILING_HEIGHT + playHeight / 2 + this.rng.range(-40, 40);
          this.obstacles.push({
            type: 'plasma_mine',
            x: spawnX,
            y: centerY,
            baseY: centerY,
            radius: 18,
            amplitude: this.rng.range(35, 75),
            speed: this.rng.range(2.5, 4.5),
            timer: this.rng.next() * Math.PI * 2,
            nearMissChecked: false,
            color: '#b026ff'
          });

          this.spawnCoinArc(spawnX - 30, spawnX + 80, centerY);
          break;
        }

        case 'moving_spike': {
          // Piston moving up/down
          const fromTop = this.rng.next() > 0.5;
          this.obstacles.push({
            type: 'moving_spike',
            x: spawnX,
            y: fromTop ? CEILING_HEIGHT : VIRTUAL_HEIGHT - FLOOR_HEIGHT - 120,
            width: 32,
            height: 120,
            fromTop: fromTop,
            progress: 0,
            moveSpeed: 1.8,
            nearMissChecked: false,
            color: '#ffd700'
          });
          break;
        }

        case 'double_saw': {
          // Upper & lower constriction
          const gapY = CEILING_HEIGHT + this.rng.range(80, playHeight - minGap - 80);
          // Top saw
          this.obstacles.push({
            type: 'pillar',
            x: spawnX,
            y: CEILING_HEIGHT,
            width: 32,
            height: gapY - CEILING_HEIGHT,
            isTop: true,
            nearMissChecked: false,
            color: '#00f3ff'
          });
          // Bottom saw
          this.obstacles.push({
            type: 'pillar',
            x: spawnX,
            y: gapY + minGap,
            width: 32,
            height: (VIRTUAL_HEIGHT - FLOOR_HEIGHT) - (gapY + minGap),
            isTop: false,
            nearMissChecked: false,
            color: '#00f3ff'
          });

          this.spawnCoin(spawnX, gapY + minGap / 2);
          break;
        }
      }

      // Next obstacle distance based on speed
      const baseGap = Math.max(220, 360 - Math.min(130, this.score * 0.15));
      this.nextObstacleDistance = this.traveledDistance + baseGap + this.rng.range(20, 60);
    }

    spawnCoin(x, y) {
      this.coins.push({
        x: x,
        y: y,
        radius: 11,
        collected: false,
        angle: 0
      });
    }

    spawnCoinArc(startX, endX, midY) {
      const count = 4;
      const step = (endX - startX) / count;
      for (let i = 0; i <= count; i++) {
        const cx = startX + i * step;
        const cy = midY + Math.sin((i / count) * Math.PI) * -35;
        this.spawnCoin(cx, cy);
      }
    }

    spawnPowerUp(x, y) {
      const types = ['shield', 'magnet', 'multiplier', 'slowMo', 'emp'];
      const type = this.rng.choice(types);
      this.powerUps.push({
        x: x,
        y: y,
        type: type,
        radius: 15,
        angle: 0
      });
    }

    addFloatingText(text, x, y, color = '#00f3ff', size = 16) {
      this.floatingTexts.push({
        text, x, y, color, size, alpha: 1, vy: -50, life: 1.0
      });
    }

    triggerEmpBlast() {
      // Screen shake
      this.shakeIntensity = 12;
      this.shakeDuration = 0.4;

      // Disintegrate all visible obstacles
      const clearedCount = this.obstacles.length;
      for (let o of this.obstacles) {
        for (let i = 0; i < 12; i++) {
          this.particles.spawn(
            o.x + (o.width || 20) / 2,
            o.y + (o.height || 20) / 2,
            (this.rng.next() - 0.5) * 200,
            (this.rng.next() - 0.5) * 200,
            this.rng.range(3, 6),
            '#00f3ff',
            0.04
          );
        }
      }
      this.obstacles = [];

      const bonusPoints = clearedCount * 40;
      this.score += bonusPoints;
      this.addFloatingText(`EMP BLAST! +${bonusPoints}`, this.player.x, this.player.y - 40, '#00f3ff', 24);

      if (window.NFSound) {
        window.NFSound.playExplosion();
      }
    }

    /* -------------------------------------------------------------
       COLLISION & NEAR MISS LOGIC
       ------------------------------------------------------------- */

    checkCollisions() {
      if (this.player.invulnerableTimer > 0) return;

      const px = this.player.x;
      const py = this.player.y;
      const pr = this.player.radius;

      // Floor and Ceiling bounds
      if (py - pr <= CEILING_HEIGHT && this.player.gravityDir === 1) {
        // Safe contact with ceiling when gravity is flipped
      }

      for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];
        let collided = false;
        let isNearMiss = false;

        if (obs.type === 'pillar' || obs.type === 'moving_spike') {
          // Circle vs Box
          const closestX = Math.max(obs.x, Math.min(px, obs.x + obs.width));
          const closestY = Math.max(obs.y, Math.min(py, obs.y + obs.height));
          const distX = px - closestX;
          const distY = py - closestY;
          const distanceSq = distX * distX + distY * distY;

          if (distanceSq < pr * pr) {
            collided = true;
          } else if (distanceSq < (pr + 20) * (pr + 20) && !obs.nearMissChecked && px > obs.x) {
            isNearMiss = true;
          }
        } else if (obs.type === 'plasma_mine') {
          // Circle vs Circle
          const dx = px - obs.x;
          const dy = py - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < pr + obs.radius) {
            collided = true;
          } else if (dist < pr + obs.radius + 24 && !obs.nearMissChecked && px > obs.x) {
            isNearMiss = true;
          }
        } else if (obs.type === 'laser_gate') {
          if (obs.isActive) {
            // Circle vs Laser segment
            const closestX = Math.max(obs.x, Math.min(px, obs.x + obs.width));
            const closestY = Math.max(obs.y, Math.min(py, obs.y + obs.height));
            const distX = px - closestX;
            const distY = py - closestY;
            if (distX * distX + distY * distY < pr * pr) {
              collided = true;
            } else if (distX * distX + distY * distY < (pr + 22) * (pr + 22) && !obs.nearMissChecked && px > obs.x) {
              isNearMiss = true;
            }
          }
        }

        // Handle Near Miss Combo
        if (isNearMiss) {
          obs.nearMissChecked = true;
          this.triggerNearMiss(px, py);
        }

        // Handle Fatal Collision
        if (collided) {
          if (this.player.shieldActive) {
            // Shield absorbs fatal impact!
            this.player.shieldActive = false;
            this.player.powerUpTimers.shield = 0;
            this.player.invulnerableTimer = 1.6; // temporary invulnerability

            this.shakeIntensity = 8;
            this.shakeDuration = 0.3;

            this.addFloatingText('SHIELD SAVED!', px, py - 35, '#00f3ff', 20);
            if (window.NFSound) {
              window.NFSound.playShieldDeflect();
            }

            // Burst shield fragments
            for (let k = 0; k < 18; k++) {
              this.particles.spawn(
                px, py,
                (this.rng.next() - 0.5) * 180,
                (this.rng.next() - 0.5) * 180,
                this.rng.range(3, 5),
                '#00f3ff',
                0.04
              );
            }
            return;
          }

          // Player Death
          this.handlePlayerDeath();
          return;
        }
      }
    }

    triggerNearMiss(px, py) {
      this.nearMissCount++;
      this.comboStreak++;
      this.comboTimer = 2.5;

      const bonus = 50 * Math.min(this.comboStreak, 5);
      this.score += bonus;

      this.addFloatingText(`+${bonus} NEAR MISS!`, px + 20, py - 25, '#ff007f', 18);

      if (window.NFSound) {
        window.NFSound.playNearMiss();
      }

      // Sparkle burst
      for (let i = 0; i < 8; i++) {
        this.particles.spawn(
          px, py,
          (this.rng.next() - 0.5) * 100,
          (this.rng.next() - 0.5) * 100,
          this.rng.range(2, 4),
          '#ff007f',
          0.05
        );
      }
    }

    handlePlayerDeath() {
      this.isRunning = false;

      // Screen shake & shockwave
      this.shakeIntensity = 18;
      this.shakeDuration = 0.5;

      if (window.NFSound) {
        window.NFSound.playExplosion();
        window.NFSound.stopMusic();
      }

      // Massive particle burst
      const skin = window.NFSkins ? window.NFSkins.getById(this.player.skin) : null;
      const skinColor = skin ? skin.color : '#00f3ff';
      const particleCount = this.quality === 'low' ? 30 : 75;

      for (let i = 0; i < particleCount; i++) {
        const speed = this.rng.range(80, 320);
        const a = this.rng.next() * Math.PI * 2;
        this.particles.spawn(
          this.player.x,
          this.player.y,
          Math.cos(a) * speed,
          Math.sin(a) * speed,
          this.rng.range(3, 7),
          i % 2 === 0 ? skinColor : '#ffffff',
          0.03,
          i % 3 === 0 ? 'rect' : 'circle'
        );
      }

      // Notify controller
      const runDurationMs = Date.now() - this.gameStartTime;
      const signature = window.NFStorage ? window.NFStorage.generateScoreSignature(
        this.score, runDurationMs, this.flipsCount, this.obstaclesPassed
      ) : '';

      if (typeof this.onGameOver === 'function') {
        setTimeout(() => {
          this.onGameOver({
            score: this.score,
            flips: this.flipsCount,
            coins: this.coinsCollected,
            nearMisses: this.nearMissCount,
            durationMs: runDurationMs,
            obstaclesPassed: this.obstaclesPassed,
            signature: signature,
            canRevive: !this.hasUsedRevive,
            isDaily: this.isDaily
          });
        }, 600);
      }
    }

    /* -------------------------------------------------------------
       MAIN GAME LOOP (PHYSICS & RENDERING)
       ------------------------------------------------------------- */

    loop(currentTime) {
      if (!this.isRunning && this.particles.active.length === 0 && this.floatingTexts.length === 0) {
        this.animationId = null;
        return;
      }

      const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.05); // Cap to 50ms to prevent spiral of death
      this.lastFrameTime = currentTime;

      if (!this.isPaused) {
        this.update(dt);
      }

      this.render();

      this.animationId = requestAnimationFrame(this.loop);
    }

    update(dt) {
      // Bullet-time slow motion modifier
      const speedModifier = this.player.slowMoActive ? 0.55 : 1.0;
      const effectiveDt = dt * speedModifier;

      // 1. Difficulty progression: speed scales with score
      this.worldSpeed = this.baseSpeed + Math.min(420, this.score * 0.45);
      const stepDist = this.worldSpeed * effectiveDt;
      this.traveledDistance += stepDist;

      // Incremental score by distance
      if (this.isRunning) {
        this.score += Math.round(stepDist * 0.1 * (this.player.multiplierActive ? 2 : 1));
        if (typeof this.onScoreUpdate === 'function') {
          this.onScoreUpdate(this.score, this.coinsCollected, this.comboStreak);
        }
      }

      // 2. Invulnerability & Power-up timers
      if (this.player.invulnerableTimer > 0) {
        this.player.invulnerableTimer -= dt;
      }

      // Power-up durations
      const timers = this.player.powerUpTimers;
      ['shield', 'magnet', 'multiplier', 'slowMo'].forEach(type => {
        if (timers[type] > 0) {
          timers[type] -= dt;
          if (timers[type] <= 0) {
            this.player[`${type}Active`] = false;
          }
        }
      });

      // Combo streak timer decay
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.comboStreak = 0;
        }
      }

      // Screen shake decay
      if (this.shakeDuration > 0) {
        this.shakeDuration -= dt;
        if (this.shakeDuration <= 0) {
          this.shakeIntensity = 0;
        }
      }

      // 3. Player Physics
      if (this.isRunning) {
        // Vertical movement
        this.player.vy += this.player.gravityDir * BASE_GRAVITY * effectiveDt;
        this.player.y += this.player.vy * effectiveDt;
        this.player.angle += this.player.angularVelocity * effectiveDt;

        // Ground / Ceiling Landing Checks
        const floorY = VIRTUAL_HEIGHT - FLOOR_HEIGHT - this.player.radius;
        const ceilingY = CEILING_HEIGHT + this.player.radius;

        // Floor collision
        if (this.player.y >= floorY) {
          this.player.y = floorY;
          this.player.vy = 0;
          this.player.isGrounded = true;
          this.player.angularVelocity = 0;
          // Squash on landing
          this.player.squishX = 1.35;
          this.player.squishY = 0.7;
        }
        // Ceiling collision
        else if (this.player.y <= ceilingY) {
          this.player.y = ceilingY;
          this.player.vy = 0;
          this.player.isGrounded = true;
          this.player.angularVelocity = 0;
          // Squash on landing
          this.player.squishX = 1.35;
          this.player.squishY = 0.7;
        }

        // Recover squish smoothly to 1.0
        this.player.squishX += (1 - this.player.squishX) * (dt * 15);
        this.player.squishY += (1 - this.player.squishY) * (dt * 15);

        // Player trail particles
        if (this.quality !== 'low' && Math.random() < 0.65) {
          const skin = window.NFSkins ? window.NFSkins.getById(this.player.skin) : null;
          const color = skin ? skin.color : '#00f3ff';
          this.particles.spawn(
            this.player.x - this.player.radius * 0.7,
            this.player.y + (this.rng.next() - 0.5) * 6,
            -this.worldSpeed * 0.3,
            (this.rng.next() - 0.5) * 30,
            this.rng.range(2, 4),
            color,
            0.06
          );
        }
      }

      // 4. Spawn new obstacles
      if (this.traveledDistance >= this.nextObstacleDistance && this.isRunning) {
        this.spawnObstacleChunk();
      }

      // 5. Update Obstacles
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.x -= stepDist;

        // Dynamic behaviors
        if (obs.type === 'plasma_mine') {
          obs.timer += effectiveDt * obs.speed;
          obs.y = obs.baseY + Math.sin(obs.timer) * obs.amplitude;
        } else if (obs.type === 'moving_spike') {
          obs.progress += effectiveDt * obs.moveSpeed;
          const offset = Math.sin(obs.progress) * 45;
          obs.y = (obs.fromTop ? CEILING_HEIGHT : VIRTUAL_HEIGHT - FLOOR_HEIGHT - obs.height) + offset;
        } else if (obs.type === 'laser_gate') {
          obs.timer = (obs.timer + effectiveDt) % obs.cycleDuration;
          obs.isActive = obs.timer < obs.cycleDuration * 0.65;
        }

        // Passed obstacle counter
        if (!obs.passed && obs.x + (obs.width || 30) < this.player.x) {
          obs.passed = true;
          this.obstaclesPassed++;
        }

        // Remove offscreen
        if (obs.x < -100) {
          this.obstacles.splice(i, 1);
        }
      }

      // 6. Update Coins & Magnet Pull
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const c = this.coins[i];
        c.x -= stepDist;
        c.angle += effectiveDt * 4;

        // Magnet attraction
        if (this.player.magnetActive && this.isRunning) {
          const dx = this.player.x - c.x;
          const dy = this.player.y - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const pullSpeed = 420;
            c.x += (dx / dist) * pullSpeed * effectiveDt;
            c.y += (dy / dist) * pullSpeed * effectiveDt;
          }
        }

        // Coin Collection Check
        const distToPlayer = Math.hypot(this.player.x - c.x, this.player.y - c.y);
        if (distToPlayer < this.player.radius + c.radius && this.isRunning) {
          const earned = this.player.multiplierActive ? 2 : 1;
          this.coinsCollected += earned;
          this.score += 25 * earned;

          if (window.NFSound) {
            window.NFSound.playCoin(this.coinsCollected);
          }

          this.addFloatingText(`+${earned}`, c.x, c.y - 15, '#ffd700', 16);

          // Coin sparkle particles
          for (let p = 0; p < (this.quality === 'low' ? 3 : 8); p++) {
            this.particles.spawn(
              c.x, c.y,
              (this.rng.next() - 0.5) * 120,
              (this.rng.next() - 0.5) * 120 - 40,
              this.rng.range(2, 4),
              '#ffd700',
              0.05
            );
          }

          this.coins.splice(i, 1);
          continue;
        }

        if (c.x < -40) {
          this.coins.splice(i, 1);
        }
      }

      // 7. Update Power-ups
      for (let i = this.powerUps.length - 1; i >= 0; i--) {
        const pu = this.powerUps[i];
        pu.x -= stepDist;
        pu.angle += effectiveDt * 3;

        const dist = Math.hypot(this.player.x - pu.x, this.player.y - pu.y);
        if (dist < this.player.radius + pu.radius && this.isRunning) {
          this.activatePowerUp(pu.type);
          this.powerUps.splice(i, 1);
          continue;
        }

        if (pu.x < -40) {
          this.powerUps.splice(i, 1);
        }
      }

      // 8. Collisions
      if (this.isRunning) {
        this.checkCollisions();
      }

      // 9. Particles and Floating text
      this.particles.update(effectiveDt);

      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.life -= dt;
        ft.alpha = Math.max(0, ft.life);
        if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }

    activatePowerUp(type) {
      if (type === 'emp') {
        this.triggerEmpBlast();
        return;
      }

      const duration = 8.0;
      this.player[`${type}Active`] = true;
      this.player.powerUpTimers[type] = duration;

      const titles = {
        shield: 'ENERGY SHIELD!',
        magnet: 'NEON MAGNET!',
        multiplier: '2X MULTIPLIER!',
        slowMo: 'QUANTUM SLOW-MO!'
      };

      const colors = {
        shield: '#00f3ff',
        magnet: '#ff007f',
        multiplier: '#ffd700',
        slowMo: '#b026ff'
      };

      this.addFloatingText(titles[type] || 'POWER UP!', this.player.x, this.player.y - 30, colors[type] || '#00f3ff', 20);

      if (window.NFSound) {
        window.NFSound.playPowerUp(type);
      }
    }

    /* -------------------------------------------------------------
       RENDERING
       ------------------------------------------------------------- */

    render() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.save();

      // Clear full canvas
      ctx.fillStyle = '#06040d';
      ctx.fillRect(0, 0, w, h);

      // Letterbox/Pillarbox translation
      ctx.translate(this.offsetX, this.offsetY);
      ctx.scale(this.scale, this.scale);

      // Clip to virtual playfield
      ctx.beginPath();
      ctx.rect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      ctx.clip();

      // Screen shake translation
      if (this.shakeIntensity > 0) {
        const sx = (Math.random() - 0.5) * this.shakeIntensity;
        const sy = (Math.random() - 0.5) * this.shakeIntensity;
        ctx.translate(sx, sy);
      }

      // 1. Cyber Synthwave Background
      this.drawBackground(ctx);

      // 2. Obstacles
      this.drawObstacles(ctx);

      // 3. Collectibles
      this.drawCoinsAndPowerUps(ctx);

      // 4. Particles
      this.particles.draw(ctx);

      // 5. Player
      if (this.isRunning) {
        this.drawPlayer(ctx);
      }

      // 6. Floating texts
      this.drawFloatingTexts(ctx);

      // 7. Floor and Ceiling Neon Rails
      this.drawRails(ctx);

      ctx.restore();
    }

    drawBackground(ctx) {
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
      grad.addColorStop(0, '#0a0518');
      grad.addColorStop(0.5, '#040716');
      grad.addColorStop(1, '#020208');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

      // Moving retro perspective grid at bottom and top
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
      ctx.lineWidth = 1;
      const gridOffset = (this.traveledDistance * 0.4) % 40;

      // Vertical moving grid lines
      for (let x = -gridOffset; x <= VIRTUAL_WIDTH + 40; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, CEILING_HEIGHT);
        ctx.lineTo(x, VIRTUAL_HEIGHT - FLOOR_HEIGHT);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let y = CEILING_HEIGHT; y <= VIRTUAL_HEIGHT - FLOOR_HEIGHT; y += 45) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(VIRTUAL_WIDTH, y);
        ctx.stroke();
      }
    }

    drawRails(ctx) {
      // Top Ceiling Rail
      ctx.fillStyle = '#0d091e';
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, CEILING_HEIGHT);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = this.quality === 'low' ? 0 : 12;
      ctx.beginPath();
      ctx.moveTo(0, CEILING_HEIGHT);
      ctx.lineTo(VIRTUAL_WIDTH, CEILING_HEIGHT);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Bottom Floor Rail
      ctx.fillStyle = '#0d091e';
      ctx.fillRect(0, VIRTUAL_HEIGHT - FLOOR_HEIGHT, VIRTUAL_WIDTH, FLOOR_HEIGHT);
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = this.quality === 'low' ? 0 : 12;
      ctx.beginPath();
      ctx.moveTo(0, VIRTUAL_HEIGHT - FLOOR_HEIGHT);
      ctx.lineTo(VIRTUAL_WIDTH, VIRTUAL_HEIGHT - FLOOR_HEIGHT);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    drawObstacles(ctx) {
      for (let obs of this.obstacles) {
        ctx.save();
        if (obs.type === 'pillar' || obs.type === 'moving_spike') {
          // Futuristic Neon Spires
          ctx.fillStyle = '#140f28';
          ctx.strokeStyle = obs.color || '#00f3ff';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = obs.color || '#00f3ff';
          ctx.shadowBlur = this.quality === 'low' ? 0 : 10;

          ctx.beginPath();
          if (obs.isTop || obs.fromTop) {
            // Pointing downwards
            ctx.moveTo(obs.x, obs.y);
            ctx.lineTo(obs.x + obs.width, obs.y);
            ctx.lineTo(obs.x + obs.width * 0.8, obs.y + obs.height - 12);
            ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width * 0.2, obs.y + obs.height - 12);
          } else {
            // Pointing upwards
            ctx.moveTo(obs.x, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width * 0.8, obs.y + 12);
            ctx.lineTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width * 0.2, obs.y + 12);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (obs.type === 'plasma_mine') {
          // Pulsing plasma mine
          ctx.translate(obs.x, obs.y);
          ctx.fillStyle = '#1a0d33';
          ctx.strokeStyle = '#b026ff';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#b026ff';
          ctx.shadowBlur = this.quality === 'low' ? 0 : 12;

          ctx.beginPath();
          ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Spikes protruding
          for (let s = 0; s < 6; s++) {
            const a = obs.timer * 2 + (s * Math.PI * 2) / 6;
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * obs.radius, Math.sin(a) * obs.radius);
            ctx.lineTo(Math.cos(a) * (obs.radius + 7), Math.sin(a) * (obs.radius + 7));
            ctx.stroke();
          }
        } else if (obs.type === 'laser_gate') {
          // Laser emitters and beam
          if (obs.isActive) {
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = this.quality === 'low' ? 0 : 15;
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height);
            ctx.stroke();

            // White core beam
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height);
            ctx.stroke();
          } else {
            // Charging warning dashed beam
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Top/bottom emitter nodes
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(obs.x + obs.width / 2 - 5, obs.y - 4, 10, 8);
          ctx.fillRect(obs.x + obs.width / 2 - 5, obs.y + obs.height - 4, 10, 8);
        }
        ctx.restore();
      }
    }

    drawCoinsAndPowerUps(ctx) {
      // Coins
      for (let c of this.coins) {
        ctx.save();
        ctx.translate(c.x, c.y);

        // 3D perspective spin simulation
        const scaleX = Math.cos(c.angle);
        ctx.scale(scaleX, 1);

        ctx.fillStyle = '#ffe066';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = this.quality === 'low' ? 0 : 10;

        ctx.beginPath();
        ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner star
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, c.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Power-ups
      const puColors = {
        shield: '#00f3ff',
        magnet: '#ff007f',
        multiplier: '#ffd700',
        slowMo: '#b026ff',
        emp: '#ffffff'
      };

      for (let pu of this.powerUps) {
        ctx.save();
        ctx.translate(pu.x, pu.y);

        const color = puColors[pu.type] || '#00f3ff';
        ctx.fillStyle = '#110a24';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = this.quality === 'low' ? 0 : 14;

        ctx.beginPath();
        ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Power-up symbol
        ctx.fillStyle = color;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const symbol = pu.type === 'shield' ? '🛡️' : (pu.type === 'magnet' ? '🧲' : (pu.type === 'multiplier' ? '2X' : (pu.type === 'emp' ? '⚡' : '⏱️')));
        ctx.fillText(symbol, 0, 1);

        ctx.restore();
      }
    }

    drawPlayer(ctx) {
      const p = this.player;
      ctx.save();

      // Invulnerability flicker
      if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer * 20) % 2 === 0) {
        ctx.globalAlpha = 0.45;
      }

      // Active Shield Bubble
      if (p.shieldActive) {
        ctx.save();
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 243, 255, 0.12)';
        ctx.fill();
        ctx.restore();
      }

      // Active Magnet Aura
      if (p.magnetActive) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 1.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Squish & Stretch transform
      ctx.translate(p.x, p.y);
      ctx.scale(p.squishX, p.squishY);
      ctx.translate(-p.x, -p.y);

      // Render custom skin
      const skin = window.NFSkins ? window.NFSkins.getById(p.skin) : null;
      if (skin && skin.draw) {
        ctx.shadowColor = skin.glowColor || '#00f3ff';
        ctx.shadowBlur = this.quality === 'low' ? 0 : 16;
        skin.draw(ctx, p.x, p.y, p.radius, p.angle, performance.now() / 1000);
      }

      ctx.restore();
    }

    drawFloatingTexts(ctx) {
      for (let ft of this.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }
    }
  }

  window.NeonGameEngine = NeonGameEngine;
})(window);
