/**
 * NEON FLIP – Google AdMob Integration & Monetization Controller
 * Manages Banners, Rewarded Video Ads, Interstitials, and VIP "Remove Ads" pass.
 * Compliant with Google AdMob placement policies.
 */

(function (window) {
  'use strict';

  // Official Google AdMob Test Ad Unit IDs
  const ADMOB_CONFIG = {
    testBannerId: 'ca-app-pub-3940256099942544/6300978111',
    testInterstitialId: 'ca-app-pub-3940256099942544/1033173712',
    testRewardedId: 'ca-app-pub-3940256099942544/5224354917'
  };

  class AdMobController {
    constructor() {
      this.isVip = false;
      this.rewardedCallback = null;
      this.countdownTimer = null;
      this.loadVipStatus();
    }

    loadVipStatus() {
      if (window.NFStorage) {
        this.isVip = !!window.NFStorage.get('vipPass');
      }
    }

    setVipStatus(active) {
      this.isVip = active;
      if (window.NFStorage) {
        window.NFStorage.set('vipPass', active);
        if (active) {
          window.NFStorage.unlockSkin('vip_master');
        }
      }
      this.updateBannerVisibility();
    }

    updateBannerVisibility() {
      const bannerEl = document.getElementById('admob-banner');
      if (!bannerEl) return;
      if (this.isVip) {
        bannerEl.style.display = 'none';
      } else {
        bannerEl.style.display = 'flex';
      }
    }

    /**
     * Shows interactive rewarded video ad modal with timer and reward delivery.
     * @param {'revive' | 'double_coins'} rewardType
     * @param {Function} onRewardGranted
     */
    showRewardedVideo(rewardType, onRewardGranted) {
      // If VIP, instantly grant without watching ad!
      if (this.isVip) {
        if (typeof onRewardGranted === 'function') onRewardGranted();
        return;
      }

      this.rewardedCallback = onRewardGranted;
      const modal = document.getElementById('admob-rewarded-modal');
      const timerText = document.getElementById('ad-timer-count');
      const progressBar = document.getElementById('ad-progress-bar');
      const closeBtn = document.getElementById('ad-close-btn');
      const adRewardTitle = document.getElementById('ad-reward-title');

      if (!modal) {
        // Fallback: grant directly if DOM missing
        if (typeof onRewardGranted === 'function') onRewardGranted();
        return;
      }

      modal.classList.remove('hidden');
      closeBtn.disabled = true;
      closeBtn.classList.add('disabled');
      closeBtn.textContent = 'Skip in 5s';

      if (adRewardTitle) {
        adRewardTitle.textContent = rewardType === 'revive' ? 'WATCH TO REVIVE NOW' : 'WATCH TO DOUBLE YOUR RUN COINS';
      }

      let timeLeft = 5;
      timerText.textContent = timeLeft;
      progressBar.style.width = '0%';

      if (this.countdownTimer) clearInterval(this.countdownTimer);

      const totalDuration = 5;
      let elapsed = 0;

      this.countdownTimer = setInterval(() => {
        elapsed += 0.5;
        const progress = Math.min(100, (elapsed / totalDuration) * 100);
        progressBar.style.width = `${progress}%`;

        const curSeconds = Math.max(0, Math.ceil(totalDuration - elapsed));
        timerText.textContent = curSeconds;

        if (curSeconds <= 0) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
          closeBtn.disabled = false;
          closeBtn.classList.remove('disabled');
          closeBtn.textContent = 'CLAIM REWARD ✕';
          closeBtn.classList.add('pulse-glow');
        } else {
          closeBtn.textContent = `Skip in ${curSeconds}s`;
        }
      }, 500);
    }

    closeRewardedModal(claimReward = true) {
      const modal = document.getElementById('admob-rewarded-modal');
      if (modal) modal.classList.add('hidden');
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }

      if (claimReward && typeof this.rewardedCallback === 'function') {
        const cb = this.rewardedCallback;
        this.rewardedCallback = null;
        cb();
      }
    }

    /**
     * Checks run counter and triggers an interstitial ad every 4 runs.
     */
    checkInterstitial() {
      if (this.isVip) return;
      const runs = window.NFStorage ? window.NFStorage.get('interstitialCounter') || 0 : 0;
      if (runs > 0 && runs % 4 === 0) {
        this.showInterstitial();
      }
    }

    showInterstitial() {
      if (this.isVip) return;
      const modal = document.getElementById('admob-interstitial-modal');
      if (!modal) return;

      modal.classList.remove('hidden');
      const closeBtn = document.getElementById('interstitial-close-btn');
      closeBtn.textContent = 'Close (3)';
      closeBtn.disabled = true;

      let count = 3;
      const timer = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(timer);
          closeBtn.disabled = false;
          closeBtn.textContent = 'Continue ✕';
        } else {
          closeBtn.textContent = `Close (${count})`;
        }
      }, 1000);
    }

    closeInterstitial() {
      const modal = document.getElementById('admob-interstitial-modal');
      if (modal) modal.classList.add('hidden');
    }
  }

  window.NFAdMob = new AdMobController();
})(window);
