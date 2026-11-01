/**
 * NEON FLIP – Skins & Visual Customization System
 * Defines ball skins, visual characteristics, rendering routines, and shop pricing.
 */

(function (window) {
  'use strict';

  const SKINS = [
    {
      id: 'neon_cyan',
      name: 'Cyber Classic',
      rarity: 'Common',
      color: '#00f3ff',
      glowColor: 'rgba(0, 243, 255, 0.6)',
      secondaryColor: '#ffffff',
      cost: 0,
      description: 'The standard issue cybernetic pulse core. Crisp, clean, and deadly accurate.',
      unlockedByDefault: true,
      draw: function (ctx, x, y, radius, angle, time) {
        // Outer glow circle
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Gradient ball
        const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.6, '#00f3ff');
        grad.addColorStop(1, '#0066aa');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Neon ring
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    },
    {
      id: 'plasma_orb',
      name: 'Plasma Core',
      rarity: 'Rare',
      color: '#b026ff',
      glowColor: 'rgba(176, 38, 255, 0.7)',
      secondaryColor: '#ff007f',
      cost: 250,
      description: 'Superheated ionised plasma encased in a magnetic stabilization field.',
      unlockedByDefault: false,
      draw: function (ctx, x, y, radius, angle, time) {
        ctx.save();
        ctx.translate(x, y);

        // Pulsing core
        const pulse = Math.sin(time * 8) * 1.5;
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, radius + pulse);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#ff007f');
        grad.addColorStop(0.9, '#b026ff');
        grad.addColorStop(1, 'rgba(176, 38, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Mini orbiting plasma dots
        for (let i = 0; i < 3; i++) {
          const orbitAngle = time * 5 + (i * Math.PI * 2) / 3;
          const ox = Math.cos(orbitAngle) * (radius * 1.2);
          const oy = Math.sin(orbitAngle) * (radius * 1.2);
          ctx.fillStyle = '#ff77ff';
          ctx.beginPath();
          ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    },
    {
      id: 'cyber_shuriken',
      name: 'Cyber Shuriken',
      rarity: 'Rare',
      color: '#ff0055',
      glowColor: 'rgba(255, 0, 85, 0.7)',
      secondaryColor: '#ff9900',
      cost: 500,
      description: 'Aerodynamic carbon-fibre throwing blade infused with high-frequency thermal edges.',
      unlockedByDefault: false,
      draw: function (ctx, x, y, radius, angle, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle * 2.5); // Spin fast

        // Draw 4-point ninja star
        ctx.fillStyle = '#111122';
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          const ax = Math.cos(a) * (radius * 1.3);
          const ay = Math.sin(a) * (radius * 1.3);
          const midA = a + Math.PI / 4;
          const mx = Math.cos(midA) * (radius * 0.45);
          const my = Math.sin(midA) * (radius * 0.45);

          if (i === 0) ctx.moveTo(ax, ay);
          else ctx.lineTo(ax, ay);
          ctx.lineTo(mx, my);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Center glowing amber jewel
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    },
    {
      id: 'matrix_glitch',
      name: 'Matrix Glitch',
      rarity: 'Epic',
      color: '#00ff66',
      glowColor: 'rgba(0, 255, 102, 0.7)',
      secondaryColor: '#003311',
      cost: 750,
      description: 'An unstable quantum digital anomaly that leaves binary ghost fragments in spacetime.',
      unlockedByDefault: false,
      draw: function (ctx, x, y, radius, angle, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Wireframe octagon
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sides = 8;
        for (let i = 0; i < sides; i++) {
          const a = (i * 2 * Math.PI) / sides;
          const px = Math.cos(a) * radius;
          const py = Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Digital crosshair
        ctx.strokeStyle = '#66ff99';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.7, 0);
        ctx.lineTo(radius * 0.7, 0);
        ctx.moveTo(0, -radius * 0.7);
        ctx.lineTo(0, radius * 0.7);
        ctx.stroke();

        // Glowing center byte
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2.5, -2.5, 5, 5);

        ctx.restore();
      }
    },
    {
      id: 'golden_sun',
      name: 'Golden Solar',
      rarity: 'Epic',
      color: '#ffd700',
      glowColor: 'rgba(255, 215, 0, 0.8)',
      secondaryColor: '#ff8800',
      cost: 1200,
      description: 'A miniature star forged in stellar nurseries. Radiant solar prominence flares radiate outwards.',
      unlockedByDefault: false,
      draw: function (ctx, x, y, radius, angle, time) {
        ctx.save();
        ctx.translate(x, y);

        // Blazing rays
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 2;
        const rayCount = 10;
        for (let i = 0; i < rayCount; i++) {
          const a = angle + (i * 2 * Math.PI) / rayCount;
          const rayLen = radius * 1.3 + Math.sin(time * 12 + i) * 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * radius * 0.6, Math.sin(a) * radius * 0.6);
          ctx.lineTo(Math.cos(a) * rayLen, Math.sin(a) * rayLen);
          ctx.stroke();
        }

        // Inner molten gold
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#ffe066');
        grad.addColorStop(0.8, '#ff9900');
        grad.addColorStop(1, '#cc6600');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    },
    {
      id: 'dark_matter',
      name: 'Dark Singularity',
      rarity: 'Legendary',
      color: '#7b00ff',
      glowColor: 'rgba(123, 0, 255, 0.85)',
      secondaryColor: '#00ffff',
      cost: 1800,
      description: 'A collapsed micro black hole bending light and space into a breathtaking accretion disk.',
      unlockedByDefault: false,
      draw: function (ctx, x, y, radius, angle, time) {
        ctx.save();
        ctx.translate(x, y);

        // Swirling accretion disk
        ctx.save();
        ctx.scale(1.4, 0.6);
        ctx.rotate(angle * 1.8);
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Event Horizon: Pure Black
        ctx.fillStyle = '#05030a';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Violet photon sphere ring
        ctx.strokeStyle = '#b026ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    },
    {
      id: 'rainbow_prism',
      name: 'Hyper Prism',
      rarity: 'Legendary',
      color: '#ff3399',
      glowColor: 'rgba(255, 51, 153, 0.8)',
      secondaryColor: '#33ffff',
      cost: 2500,
      description: 'Prismatic crystal orb shifting through the full visible light spectrum at hyper velocities.',
      unlockedByDefault: false,
      draw: function (ctx, x, y, radius, angle, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        const hue = (time * 120) % 360;
        const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, `hsl(${hue}, 100%, 60%)`);
        grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 100%, 40%)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Diamond facets
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.7, 0);
        ctx.lineTo(0, -radius * 0.7);
        ctx.lineTo(radius * 0.7, 0);
        ctx.lineTo(0, radius * 0.7);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
      }
    },
    {
      id: 'vip_master',
      name: 'Cyber Emperor VIP',
      rarity: 'Exclusive',
      color: '#ffd700',
      glowColor: 'rgba(255, 215, 0, 0.95)',
      secondaryColor: '#00f3ff',
      cost: 3500,
      description: 'The pinnacle of cybernetic royalty. Twin orbital defence satellites protect the imperial core.',
      unlockedByDefault: false,
      draw: function (ctx, x, y, radius, angle, time) {
        ctx.save();
        ctx.translate(x, y);

        // Twin orbital drones
        for (let i = 0; i < 2; i++) {
          const droneAngle = time * 4 + i * Math.PI;
          const dx = Math.cos(droneAngle) * (radius * 1.55);
          const dy = Math.sin(droneAngle) * (radius * 1.55);

          ctx.fillStyle = '#00f3ff';
          ctx.beginPath();
          ctx.arc(dx, dy, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(dx, dy);
          ctx.stroke();
        }

        // Royal Core
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#fff280');
        grad.addColorStop(0.8, '#d4af37');
        grad.addColorStop(1, '#855b00');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Crown glyph in center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-5, 4);
        ctx.lineTo(-6, -2);
        ctx.lineTo(-2, 0);
        ctx.lineTo(0, -5);
        ctx.lineTo(2, 0);
        ctx.lineTo(6, -2);
        ctx.lineTo(5, 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }
  ];

  class SkinManager {
    constructor() {
      this.skins = SKINS;
    }

    getAll() {
      return this.skins;
    }

    getById(id) {
      return this.skins.find(s => s.id === id) || this.skins[0];
    }

    getEquipped() {
      const equippedId = window.NFStorage ? window.NFStorage.get('equippedSkin') : 'neon_cyan';
      return this.getById(equippedId);
    }
  }

  window.NFSkins = new SkinManager();
})(window);
