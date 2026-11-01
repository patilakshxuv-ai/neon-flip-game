/**
 * NEON FLIP – Leaderboard System with Anti-Cheat Signature Verification
 * Global, Daily Challenge, and Weekly Tournament leaderboards.
 */

(function (window) {
  'use strict';

  const MOCK_GLOBAL_PLAYERS = [
    { name: 'Kitsune_99', score: 3840, skin: 'vip_master', badge: '👑 #1' },
    { name: 'ZeroCool_NEO', score: 3210, skin: 'dark_matter', badge: '🥈 #2' },
    { name: 'VaporGhost', score: 2890, skin: 'cyber_shuriken', badge: '🥉 #3' },
    { name: 'ApexPulse', score: 2450, skin: 'golden_sun', badge: 'TOP 10' },
    { name: 'GlitchQueen', score: 2180, skin: 'matrix_glitch', badge: 'TOP 10' },
    { name: 'HyperDrive', score: 1920, skin: 'rainbow_prism', badge: 'TOP 10' },
    { name: 'NeonSamurai', score: 1740, skin: 'plasma_orb', badge: 'TOP 10' },
    { name: 'ShadowByte', score: 1530, skin: 'neon_cyan', badge: 'PRO' },
    { name: 'QuantumRex', score: 1390, skin: 'neon_cyan', badge: 'PRO' },
    { name: 'Synthia_88', score: 1120, skin: 'plasma_orb', badge: 'PRO' }
  ];

  const MOCK_DAILY_PLAYERS = [
    { name: 'CircuitBreaker', score: 1650, badge: '👑 #1' },
    { name: 'GhostInTheHex', score: 1420, badge: '🥈 #2' },
    { name: 'Vortex_X', score: 1290, badge: '🥉 #3' },
    { name: 'SubZero_Run', score: 980, badge: 'TOP 10' },
    { name: 'PixelFury', score: 850, badge: 'TOP 10' }
  ];

  class LeaderboardManager {
    constructor() {
      this.currentTab = 'global';
      this.cachedGlobal = this.loadOrInit('nf_lb_global', MOCK_GLOBAL_PLAYERS);
      this.cachedDaily = this.loadOrInit('nf_lb_daily', MOCK_DAILY_PLAYERS);
    }

    loadOrInit(storageKey, defaults) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      return [...defaults];
    }

    save(storageKey, list) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(list));
      } catch (e) {}
    }

    /**
     * Submits a score with anti-cheat cryptographic verification token.
     */
    submitScore({ playerName, score, flips, durationMs, obstaclesPassed, signature, isDaily = false }) {
      // 1. Backend validation simulation
      if (window.NFStorage) {
        const isValid = window.NFStorage.verifyScoreSignature(score, durationMs, flips, obstaclesPassed, signature);
        if (!isValid) {
          console.warn('Anti-Cheat: Signature validation rejected score payload.');
          return { success: false, reason: 'CHECKSUM_FAILED' };
        }
      }

      const cleanName = (playerName || 'Player').trim().slice(0, 14);
      const equippedSkin = window.NFStorage ? window.NFStorage.get('equippedSkin') : 'neon_cyan';
      const targetList = isDaily ? this.cachedDaily : this.cachedGlobal;
      const targetKey = isDaily ? 'nf_lb_daily' : 'nf_lb_global';

      // Check existing entry
      const existingIdx = targetList.findIndex(p => p.name === cleanName);
      if (existingIdx !== -1) {
        if (score > targetList[existingIdx].score) {
          targetList[existingIdx].score = score;
          targetList[existingIdx].skin = equippedSkin;
        }
      } else {
        targetList.push({
          name: cleanName,
          score: score,
          skin: equippedSkin,
          badge: 'YOU',
          isUser: true
        });
      }

      // Sort descending
      targetList.sort((a, b) => b.score - a.score);

      // Re-assign ranks
      targetList.forEach((p, idx) => {
        if (idx === 0) p.badge = '👑 #1';
        else if (idx === 1) p.badge = '🥈 #2';
        else if (idx === 2) p.badge = '🥉 #3';
        else if (idx < 10) p.badge = 'TOP 10';
        else p.badge = `#${idx + 1}`;
      });

      this.save(targetKey, targetList);
      return { success: true, rank: targetList.findIndex(p => p.name === cleanName) + 1 };
    }

    getEntries(tab = 'global') {
      const isDaily = tab === 'daily';
      const list = isDaily ? this.cachedDaily : this.cachedGlobal;
      const userHighScore = window.NFStorage ? (isDaily ? window.NFStorage.get('dailyHighScore') : window.NFStorage.get('highScore')) : 0;

      // Ensure user is in list if they have a score
      let foundUser = list.some(e => e.isUser);
      if (!foundUser && userHighScore > 0) {
        list.push({
          name: 'You (Local)',
          score: userHighScore,
          skin: window.NFStorage ? window.NFStorage.get('equippedSkin') : 'neon_cyan',
          badge: 'YOU',
          isUser: true
        });
        list.sort((a, b) => b.score - a.score);
      }

      return list.slice(0, 25);
    }
  }

  window.NFLeaderboard = new LeaderboardManager();
})(window);
