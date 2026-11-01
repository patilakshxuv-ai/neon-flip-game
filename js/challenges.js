/**
 * NEON FLIP – Challenges, Daily Seeds & Tournament Engine
 * Handles daily seeded runs, shareable friend challenge links, and weekly tournaments.
 */

(function (window) {
  'use strict';

  // Seeded Linear Congruential PRNG
  class SeededRNG {
    constructor(seed) {
      this.seed = seed % 2147483647;
      if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
      this.seed = (this.seed * 16807) % 2147483647;
      return (this.seed - 1) / 2147483646;
    }

    range(min, max) {
      return min + this.next() * (max - min);
    }

    choice(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    }
  }

  const DAILY_MODIFIERS = [
    { id: 'hyperspeed', name: 'HYPER VELOCITY', desc: 'Base speed +20%, 2x Coin Drop Rate!', speedMult: 1.2, coinMult: 2.0 },
    { id: 'coin_storm', name: 'NEON RAIN', desc: 'Double coin clusters and magnetic pull!', speedMult: 1.0, coinMult: 2.5, magnetBoost: true },
    { id: 'laser_grid', name: 'LASER LOCKDOWN', desc: 'Denser laser gates, 2x Near-Miss points!', speedMult: 1.05, nearMissMult: 2.0 },
    { id: 'quantum_matrix', name: 'QUANTUM MATRIX', desc: 'Slow-motion powerups spawn 3x more often!', speedMult: 0.95, slowMoBoost: true },
    { id: 'gravity_surge', name: 'GRAVITY SURGE', desc: 'Instant snappy flips, high risk, 1.5x score!', speedMult: 1.15, scoreMult: 1.5 }
  ];

  class ChallengeManager {
    constructor() {
      this.activeFriendChallenge = null;
      this.parseUrlChallenge();
    }

    // Returns date string YYYY-MM-DD
    getTodayKey() {
      return new Date().toISOString().slice(0, 10);
    }

    // Daily integer seed
    getDailySeed() {
      const key = this.getTodayKey();
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    }

    getDailyModifier() {
      const seed = this.getDailySeed();
      const idx = seed % DAILY_MODIFIERS.length;
      return DAILY_MODIFIERS[idx];
    }

    getTimeUntilNextDaily() {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diffMs = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    isDailyCompleted() {
      const lastClaim = window.NFStorage ? window.NFStorage.get('dailyDate') : '';
      return lastClaim === this.getTodayKey();
    }

    // Friend Challenge URL Parser
    parseUrlChallenge() {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('challenge') === '1') {
          const challenger = params.get('challenger') || 'CyberGhost';
          const target = parseInt(params.get('target'), 10) || 500;
          const seed = parseInt(params.get('seed'), 10) || Math.floor(Math.random() * 100000);

          this.activeFriendChallenge = {
            challenger: decodeURIComponent(challenger).slice(0, 16),
            targetScore: target,
            seed: seed,
            isBeaten: false
          };
        }
      } catch (e) {
        console.warn('Failed parsing challenge params:', e);
      }
    }

    generateChallengeUrl(challengerName, targetScore) {
      const cleanName = encodeURIComponent(challengerName.trim() || 'NeonRunner');
      const seed = Math.floor(Math.random() * 999999);
      const url = new URL(window.location.href);
      url.searchParams.set('challenge', '1');
      url.searchParams.set('challenger', cleanName);
      url.searchParams.set('target', targetScore.toString());
      url.searchParams.set('seed', seed.toString());
      return url.toString();
    }

    // Weekly Tournament Season Information
    getTournamentInfo() {
      const now = new Date();
      // Day of week (0 is Sunday)
      const day = now.getUTCDay();
      const daysLeft = (7 - day) % 7 || 7;
      const hoursLeft = 23 - now.getUTCHours();
      const points = window.NFStorage ? (window.NFStorage.get('tournamentPoints') || 0) : 0;

      let tier = 'Bronze III';
      let tierColor = '#cd7f32';
      if (points >= 10000) { tier = 'CYBER EMPEROR'; tierColor = '#ffd700'; }
      else if (points >= 6000) { tier = 'Diamond I'; tierColor = '#00f3ff'; }
      else if (points >= 3500) { tier = 'Platinum II'; tierColor = '#b026ff'; }
      else if (points >= 1800) { tier = 'Gold I'; tierColor = '#ffd700'; }
      else if (points >= 800) { tier = 'Silver II'; tierColor = '#c0c0c0'; }

      return {
        season: `Season 14: Cyber Grid`,
        timeRemaining: `${daysLeft}d ${hoursLeft}h`,
        points,
        tier,
        tierColor
      };
    }
  }

  window.NFChallenges = new ChallengeManager();
  window.NFRandom = SeededRNG;
})(window);
