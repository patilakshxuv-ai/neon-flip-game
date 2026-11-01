/**
 * NEON FLIP – Storage & State Management
 * Persistent offline data storage with versioning and anti-cheat validation.
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'neon_flip_save_v1';
  const SECRET_SALT = 'NF_CYBER_2026_SALT_SECURE_TOKEN_#77!';

  const DEFAULT_STATE = {
    version: 1,
    coins: 100, // Starting bonus
    highScore: 0,
    dailyHighScore: 0,
    dailyDate: '',
    totalFlips: 0,
    totalGames: 0,
    totalCoinsEarned: 100,
    totalNearMisses: 0,
    equippedSkin: 'neon_cyan',
    unlockedSkins: ['neon_cyan'],
    achievements: {},
    dailyStreak: 0,
    lastDailyClaim: '',
    vipPass: false,
    settings: {
      masterVolume: 0.8,
      sfxVolume: 0.85,
      musicVolume: 0.7,
      haptics: true,
      quality: 'high', // 'low', 'medium', 'high'
      screenShake: true,
      particles: true
    },
    tournamentPoints: 0,
    interstitialCounter: 0
  };

  class StorageManager {
    constructor() {
      this.state = this.load();
      this.sanitize();
    }

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_STATE };
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
          unlockedSkins: Array.isArray(parsed.unlockedSkins) ? parsed.unlockedSkins : ['neon_cyan']
        };
      } catch (e) {
        console.warn('Storage read error, using defaults:', e);
        return { ...DEFAULT_STATE };
      }
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Storage write failed:', e);
      }
    }

    sanitize() {
      if (!this.state.unlockedSkins.includes('neon_cyan')) {
        this.state.unlockedSkins.push('neon_cyan');
      }
      if (!this.state.equippedSkin) {
        this.state.equippedSkin = 'neon_cyan';
      }
    }

    get(key, fallback = null) {
      return this.state[key] !== undefined ? this.state[key] : fallback;
    }

    set(key, val) {
      this.state[key] = val;
      this.save();
    }

    addCoins(amount) {
      const mult = this.state.vipPass ? 1.5 : 1.0;
      const finalAmount = Math.round(amount * mult);
      this.state.coins = (this.state.coins || 0) + finalAmount;
      this.state.totalCoinsEarned = (this.state.totalCoinsEarned || 0) + finalAmount;
      this.save();
      return finalAmount;
    }

    spendCoins(amount) {
      if ((this.state.coins || 0) >= amount) {
        this.state.coins -= amount;
        this.save();
        return true;
      }
      return false;
    }

    recordRun({ score, flips, coins, nearMisses, isDaily = false }) {
      this.state.totalGames = (this.state.totalGames || 0) + 1;
      this.state.totalFlips = (this.state.totalFlips || 0) + flips;
      this.state.totalNearMisses = (this.state.totalNearMisses || 0) + nearMisses;
      this.state.interstitialCounter = (this.state.interstitialCounter || 0) + 1;

      let isNewHighScore = false;
      if (score > (this.state.highScore || 0)) {
        this.state.highScore = score;
        isNewHighScore = true;
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      if (isDaily) {
        if (this.state.dailyDate !== todayStr) {
          this.state.dailyDate = todayStr;
          this.state.dailyHighScore = score;
        } else if (score > this.state.dailyHighScore) {
          this.state.dailyHighScore = score;
        }
      }

      this.save();
      return { isNewHighScore, highScore: this.state.highScore };
    }

    unlockSkin(skinId) {
      if (!this.state.unlockedSkins.includes(skinId)) {
        this.state.unlockedSkins.push(skinId);
        this.save();
        return true;
      }
      return false;
    }

    equipSkin(skinId) {
      if (this.state.unlockedSkins.includes(skinId)) {
        this.state.equippedSkin = skinId;
        this.save();
        return true;
      }
      return false;
    }

    unlockAchievement(id) {
      if (!this.state.achievements[id]) {
        this.state.achievements[id] = {
          unlockedAt: Date.now()
        };
        this.save();
        return true;
      }
      return false;
    }

    isAchievementUnlocked(id) {
      return !!this.state.achievements[id];
    }

    /**
     * Generates a tamper-evident cryptographic checksum for score submission.
     */
    generateScoreSignature(score, runDurationMs, flips, obstaclesPassed) {
      const payload = `${score}:${runDurationMs}:${flips}:${obstaclesPassed}:${SECRET_SALT}`;
      // DJB2 + FNV-1a hash hybrid
      let hash1 = 5381;
      let hash2 = 2166136261;
      for (let i = 0; i < payload.length; i++) {
        const char = payload.charCodeAt(i);
        hash1 = ((hash1 << 5) + hash1) ^ char;
        hash2 = (hash2 ^ char) * 16777619;
      }
      return Math.abs(hash1).toString(16) + '-' + Math.abs(hash2).toString(16);
    }

    verifyScoreSignature(score, runDurationMs, flips, obstaclesPassed, signature) {
      const expected = this.generateScoreSignature(score, runDurationMs, flips, obstaclesPassed);
      return expected === signature;
    }

    resetAll() {
      this.state = { ...DEFAULT_STATE };
      this.save();
    }
  }

  window.NFStorage = new StorageManager();
})(window);
