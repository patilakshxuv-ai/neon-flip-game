/**
 * NEON FLIP – Main Game & UI Controller
 * Orchestrates screens, shop, achievements, daily rewards, social sharing, and inputs.
 */

(function (window) {
  'use strict';

  const ACHIEVEMENTS_LIST = [
    { id: 'first_flip', name: 'Quantum Leap', desc: 'Flip gravity for the first time.', reward: 50, req: (s) => s.totalFlips >= 1 },
    { id: 'score_250', name: 'High Flyer', desc: 'Reach a score of 250 points.', reward: 100, req: (s) => s.highScore >= 250 },
    { id: 'score_500', name: 'Cyber Speedster', desc: 'Reach a score of 500 points.', reward: 200, req: (s) => s.highScore >= 500 },
    { id: 'score_1000', name: 'Neon Legend', desc: 'Reach a score of 1,000 points.', reward: 500, req: (s) => s.highScore >= 1000 },
    { id: 'score_2000', name: 'Singularity God', desc: 'Reach a score of 2,000 points.', reward: 1000, req: (s) => s.highScore >= 2000 },
    { id: 'near_miss_5', name: 'Living on Edge', desc: 'Perform 5 near-miss dodges.', reward: 100, req: (s) => s.totalNearMisses >= 5 },
    { id: 'near_miss_25', name: 'Bullet Time Master', desc: 'Perform 25 near-miss dodges.', reward: 300, req: (s) => s.totalNearMisses >= 25 },
    { id: 'coins_50', name: 'Crypto Miner', desc: 'Collect 50 lifetime coins.', reward: 150, req: (s) => s.totalCoinsEarned >= 50 },
    { id: 'coins_250', name: 'Neon Millionaire', desc: 'Collect 250 lifetime coins.', reward: 400, req: (s) => s.totalCoinsEarned >= 250 },
    { id: 'skins_3', name: 'Fashion Protocol', desc: 'Unlock 3 distinct ball skins.', reward: 500, req: (s) => s.unlockedSkins.length >= 3 }
  ];

  const DAILY_REWARDS_TABLE = [
    { day: 1, reward: 50, label: '50 Coins' },
    { day: 2, reward: 100, label: '100 Coins' },
    { day: 3, reward: 150, label: '150 Coins' },
    { day: 4, reward: 200, label: '200 Coins' },
    { day: 5, reward: 350, label: '350 Coins' },
    { day: 6, reward: 500, label: '500 Coins' },
    { day: 7, reward: 1000, label: '1000 Coins + VIP Flare' }
  ];

  class MainApp {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.engine = null;
      this.currentScreen = 'splash';
      this.lastRunStats = null;
      this.activeTab = 'global';

      this.init();
    }

    init() {
      // 1. Initialize Engine
      this.engine = new window.NeonGameEngine(
        this.canvas,
        this.handleGameOver.bind(this),
        this.handleScoreUpdate.bind(this)
      );

      // 2. Setup AdMob banner
      if (window.NFAdMob) {
        window.NFAdMob.updateBannerVisibility();
      }

      // 3. Bind UI & Modals
      this.bindInputs();
      this.bindUIButtons();
      this.bindSettings();
      this.checkFriendChallengeBanner();
      this.updateHeaderStats();

      // 4. Start splash screen
      setTimeout(() => {
        const splashTap = document.getElementById('splash-tap');
        if (splashTap) splashTap.classList.remove('hidden');
      }, 600);
    }

    showScreen(screenId) {
      this.currentScreen = screenId;
      document.querySelectorAll('.game-screen').forEach(el => el.classList.add('hidden'));

      const target = document.getElementById(screenId);
      if (target) target.classList.remove('hidden');

      if (screenId === 'menu-screen') {
        this.updateHeaderStats();
        this.checkAchievements();
      }
    }

    openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('hidden');
    }

    closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('hidden');
    }

    updateHeaderStats() {
      const coins = window.NFStorage ? window.NFStorage.get('coins') : 0;
      const highScore = window.NFStorage ? window.NFStorage.get('highScore') : 0;

      document.querySelectorAll('.stat-coins-val').forEach(el => el.textContent = coins.toLocaleString());
      document.querySelectorAll('.stat-highscore-val').forEach(el => el.textContent = highScore.toLocaleString());

      const vipBadge = document.getElementById('vip-user-badge');
      if (vipBadge && window.NFStorage && window.NFStorage.get('vipPass')) {
        vipBadge.classList.remove('hidden');
      }
    }

    /* -------------------------------------------------------------
       INPUT BINDINGS (TOUCH, KEYBOARD, POINTER)
       ------------------------------------------------------------- */

    bindInputs() {
      const handleTapAction = (e) => {
        // Prevent default zoom or scroll on mobile
        if (e && e.cancelable && e.type !== 'keydown') {
          // Only prevent default on game canvas
          if (e.target === this.canvas || e.target.closest('#hud-tap-zone')) {
            e.preventDefault();
          }
        }

        // Resume audio on any user interaction
        if (window.NFSound) {
          window.NFSound.resume();
        }

        if (this.currentScreen === 'splash-screen') {
          this.showScreen('menu-screen');
          if (window.NFSound) window.NFSound.playClick();
          return;
        }

        if (this.currentScreen === 'gameplay-screen' && this.engine && this.engine.isRunning && !this.engine.isPaused) {
          this.engine.flipGravity();
        }
      };

      // Pointer / Touch
      window.addEventListener('pointerdown', (e) => {
        // Ignore if clicking UI button or inside a modal
        if (e.target.closest('button') || e.target.closest('.modal-content') || e.target.closest('.interactive-ui')) {
          return;
        }
        handleTapAction(e);
      }, { passive: false });

      // Spacebar & Arrow Up for desktop
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ') {
          if (e.target.tagName !== 'INPUT') {
            e.preventDefault();
            handleTapAction(e);
          }
        } else if (e.code === 'Escape' || e.key === 'p' || e.key === 'P') {
          if (this.currentScreen === 'gameplay-screen') {
            this.togglePause();
          }
        }
      });
    }

    bindUIButtons() {
      // Splash Tap
      const splashScreen = document.getElementById('splash-screen');
      if (splashScreen) {
        splashScreen.addEventListener('click', () => {
          this.showScreen('menu-screen');
          if (window.NFSound) window.NFSound.playClick();
        });
      }

      // Play Button
      const btnPlay = document.getElementById('btn-play');
      if (btnPlay) {
        btnPlay.addEventListener('click', () => {
          if (window.NFSound) window.NFSound.playClick();
          this.startPlaySession(false);
        });
      }

      // Daily Challenge Button
      const btnDaily = document.getElementById('btn-daily-challenge');
      if (btnDaily) {
        btnDaily.addEventListener('click', () => {
          if (window.NFSound) window.NFSound.playClick();
          this.startPlaySession(true);
        });
      }

      // Pause Button
      const btnPause = document.getElementById('btn-pause');
      if (btnPause) {
        btnPause.addEventListener('click', (e) => {
          e.stopPropagation();
          this.togglePause();
        });
      }

      // Resume Button
      const btnResume = document.getElementById('btn-resume');
      if (btnResume) {
        btnResume.addEventListener('click', () => {
          this.togglePause();
        });
      }

      // Pause Restart
      const btnPauseRestart = document.getElementById('btn-pause-restart');
      if (btnPauseRestart) {
        btnPauseRestart.addEventListener('click', () => {
          this.closeModal('pause-modal');
          this.startPlaySession(this.engine.isDaily);
        });
      }

      // Pause Quit
      const btnPauseQuit = document.getElementById('btn-pause-quit');
      if (btnPauseQuit) {
        btnPauseQuit.addEventListener('click', () => {
          this.closeModal('pause-modal');
          if (this.engine) this.engine.isRunning = false;
          if (window.NFSound) window.NFSound.stopMusic();
          this.showScreen('menu-screen');
        });
      }

      // Game Over: Instant Restart
      const btnRestart = document.getElementById('btn-gameover-restart');
      if (btnRestart) {
        btnRestart.addEventListener('click', () => {
          if (window.NFSound) window.NFSound.playClick();
          this.startPlaySession(this.lastRunStats ? this.lastRunStats.isDaily : false);
        });
      }

      // Game Over: Watch Rewarded Ad to Revive
      const btnReviveAd = document.getElementById('btn-revive-ad');
      if (btnReviveAd) {
        btnReviveAd.addEventListener('click', () => {
          if (window.NFAdMob) {
            window.NFAdMob.showRewardedVideo('revive', () => {
              this.showScreen('gameplay-screen');
              if (this.engine) {
                this.engine.revivePlayer();
              }
            });
          }
        });
      }

      // Game Over: Watch Ad for 2x Coins
      const btnDoubleCoins = document.getElementById('btn-double-coins');
      if (btnDoubleCoins) {
        btnDoubleCoins.addEventListener('click', () => {
          if (window.NFAdMob && this.lastRunStats) {
            window.NFAdMob.showRewardedVideo('double_coins', () => {
              const extra = window.NFStorage.addCoins(this.lastRunStats.coins);
              btnDoubleCoins.style.display = 'none';
              this.updateHeaderStats();
              alert(`🎉 Rewarded Ad Bonus! Claimed +${extra} extra coins!`);
            });
          }
        });
      }

      // Game Over: Share Scorecard
      const btnShareScore = document.getElementById('btn-share-scorecard');
      if (btnShareScore) {
        btnShareScore.addEventListener('click', () => {
          this.openShareCardModal();
        });
      }

      // Game Over: Back to Menu
      const btnGameOverMenu = document.getElementById('btn-gameover-menu');
      if (btnGameOverMenu) {
        btnGameOverMenu.addEventListener('click', () => {
          if (window.NFSound) window.NFSound.playClick();
          this.showScreen('menu-screen');
        });
      }

      // Modals Open Buttons
      const btnOpenShop = document.getElementById('btn-open-shop');
      if (btnOpenShop) btnOpenShop.addEventListener('click', () => this.openSkinsShop());

      const btnOpenLeaderboard = document.getElementById('btn-open-leaderboard');
      if (btnOpenLeaderboard) btnOpenLeaderboard.addEventListener('click', () => this.openLeaderboard());

      const btnOpenDaily = document.getElementById('btn-open-daily-rewards');
      if (btnOpenDaily) btnOpenDaily.addEventListener('click', () => this.openDailyRewards());

      const btnOpenAchievements = document.getElementById('btn-open-achievements');
      if (btnOpenAchievements) btnOpenAchievements.addEventListener('click', () => this.openAchievements());

      const btnOpenSettings = document.getElementById('btn-open-settings');
      if (btnOpenSettings) btnOpenSettings.addEventListener('click', () => this.openModal('settings-modal'));

      const btnOpenVip = document.getElementById('btn-open-vip');
      if (btnOpenVip) btnOpenVip.addEventListener('click', () => this.openVipOffer());

      // Close buttons for modals
      document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const modal = e.target.closest('.modal-overlay');
          if (modal) modal.classList.add('hidden');
          if (window.NFSound) window.NFSound.playClick();
        });
      });

      // Rewarded Ad Close Button
      const adCloseBtn = document.getElementById('ad-close-btn');
      if (adCloseBtn) {
        adCloseBtn.addEventListener('click', () => {
          if (window.NFAdMob) window.NFAdMob.closeRewardedModal(true);
        });
      }

      // Interstitial Ad Close Button
      const interstitialCloseBtn = document.getElementById('interstitial-close-btn');
      if (interstitialCloseBtn) {
        interstitialCloseBtn.addEventListener('click', () => {
          if (window.NFAdMob) window.NFAdMob.closeInterstitial();
        });
      }
    }

    startPlaySession(isDaily = false) {
      this.showScreen('gameplay-screen');

      // Update challenge HUD bar if applicable
      const challengeHud = document.getElementById('hud-challenge-banner');
      if (window.NFChallenges && window.NFChallenges.activeFriendChallenge) {
        const c = window.NFChallenges.activeFriendChallenge;
        challengeHud.textContent = `🎯 BEAT ${c.challenger}: ${c.targetScore}`;
        challengeHud.classList.remove('hidden');
      } else if (isDaily && window.NFChallenges) {
        const mod = window.NFChallenges.getDailyModifier();
        challengeHud.textContent = `🌟 TODAY: ${mod.name} (${mod.desc})`;
        challengeHud.classList.remove('hidden');
      } else {
        challengeHud.classList.add('hidden');
      }

      this.engine.startNewGame({
        isDaily: isDaily,
        friendChallenge: window.NFChallenges ? window.NFChallenges.activeFriendChallenge : null
      });
    }

    togglePause() {
      if (this.currentScreen !== 'gameplay-screen') return;
      if (!this.engine.isPaused) {
        this.engine.pauseGame();
        this.openModal('pause-modal');
      } else {
        this.closeModal('pause-modal');
        this.engine.resumeGame();
      }
    }

    handleScoreUpdate(score, coins, combo) {
      const hudScore = document.getElementById('hud-score');
      const hudCoins = document.getElementById('hud-coins');
      const hudCombo = document.getElementById('hud-combo');

      if (hudScore) hudScore.textContent = score.toLocaleString();
      if (hudCoins) hudCoins.textContent = coins.toString();

      if (hudCombo) {
        if (combo > 1) {
          hudCombo.textContent = `${combo}x COMBO!`;
          hudCombo.classList.remove('hidden');
        } else {
          hudCombo.classList.add('hidden');
        }
      }

      // Check friend challenge during run
      if (window.NFChallenges && window.NFChallenges.activeFriendChallenge) {
        const c = window.NFChallenges.activeFriendChallenge;
        if (!c.isBeaten && score >= c.targetScore) {
          c.isBeaten = true;
          this.engine.addFloatingText(`🏆 CHALLENGE BEATEN!`, this.engine.player.x, this.engine.player.y - 50, '#ffd700', 26);
          if (window.NFSound) window.NFSound.playFanfare();
        }
      }
    }

    handleGameOver(stats) {
      this.lastRunStats = stats;
      this.showScreen('gameover-screen');

      // Save to storage
      let recordResult = { isNewHighScore: false, highScore: stats.score };
      if (window.NFStorage) {
        recordResult = window.NFStorage.recordRun({
          score: stats.score,
          flips: stats.flips,
          coins: stats.coins,
          nearMisses: stats.nearMisses,
          isDaily: stats.isDaily
        });
        window.NFStorage.addCoins(stats.coins);
      }

      // Submit to Leaderboard with signature
      if (window.NFLeaderboard) {
        window.NFLeaderboard.submitScore({
          playerName: 'CyberRider',
          score: stats.score,
          flips: stats.flips,
          durationMs: stats.durationMs,
          obstaclesPassed: stats.obstaclesPassed,
          signature: stats.signature,
          isDaily: stats.isDaily
        });
      }

      // Populate Game Over elements
      const scoreVal = document.getElementById('go-score-val');
      const bestVal = document.getElementById('go-best-val');
      const coinsEarned = document.getElementById('go-coins-val');
      const nearMissesVal = document.getElementById('go-nearmiss-val');
      const newHighBadge = document.getElementById('go-new-high-badge');
      const btnReviveAd = document.getElementById('btn-revive-ad');
      const btnDoubleCoins = document.getElementById('btn-double-coins');

      if (scoreVal) scoreVal.textContent = stats.score.toLocaleString();
      if (bestVal) bestVal.textContent = recordResult.highScore.toLocaleString();
      if (coinsEarned) coinsEarned.textContent = `+${stats.coins}`;
      if (nearMissesVal) nearMissesVal.textContent = stats.nearMisses;

      if (newHighBadge) {
        if (recordResult.isNewHighScore && stats.score > 0) {
          newHighBadge.classList.remove('hidden');
          if (window.NFSound) window.NFSound.playFanfare();
        } else {
          newHighBadge.classList.add('hidden');
        }
      }

      // Revive button availability
      if (btnReviveAd) {
        btnReviveAd.style.display = stats.canRevive ? 'flex' : 'none';
      }

      // Double coins button reset
      if (btnDoubleCoins) {
        btnDoubleCoins.style.display = stats.coins > 0 ? 'flex' : 'none';
      }

      this.updateHeaderStats();
      this.checkAchievements();

      // Check interstitial frequency
      if (window.NFAdMob) {
        window.NFAdMob.checkInterstitial();
      }
    }

    /* -------------------------------------------------------------
       SKINS SHOP & CUSTOMIZATION
       ------------------------------------------------------------- */

    openSkinsShop() {
      this.openModal('skins-modal');
      this.renderSkinsGrid();
    }

    renderSkinsGrid() {
      const container = document.getElementById('skins-grid-container');
      if (!container || !window.NFSkins) return;

      container.innerHTML = '';
      const allSkins = window.NFSkins.getAll();
      const unlocked = window.NFStorage ? window.NFStorage.get('unlockedSkins') : ['neon_cyan'];
      const equipped = window.NFStorage ? window.NFStorage.get('equippedSkin') : 'neon_cyan';
      const playerCoins = window.NFStorage ? window.NFStorage.get('coins') : 0;

      allSkins.forEach(skin => {
        const isUnlocked = unlocked.includes(skin.id);
        const isEquipped = equipped === skin.id;

        const card = document.createElement('div');
        card.className = `skin-card ${isEquipped ? 'equipped' : ''} ${!isUnlocked ? 'locked' : ''}`;

        // Skin mini canvas preview
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 90;
        previewCanvas.height = 90;
        const pctx = previewCanvas.getContext('2d');
        skin.draw(pctx, 45, 45, 26, Math.PI / 4, 1.2);

        const title = document.createElement('div');
        title.className = 'skin-title';
        title.textContent = skin.name;

        const rarity = document.createElement('div');
        rarity.className = `skin-rarity rarity-${skin.rarity.toLowerCase()}`;
        rarity.textContent = skin.rarity;

        const actionBtn = document.createElement('button');
        actionBtn.className = 'btn-skin-action';

        if (isEquipped) {
          actionBtn.textContent = 'EQUIPPED';
          actionBtn.disabled = true;
          actionBtn.classList.add('btn-equipped');
        } else if (isUnlocked) {
          actionBtn.textContent = 'EQUIP';
          actionBtn.addEventListener('click', () => {
            window.NFStorage.equipSkin(skin.id);
            if (window.NFSound) window.NFSound.playClick();
            this.renderSkinsGrid();
            this.updateHeaderStats();
          });
        } else {
          actionBtn.textContent = `${skin.cost} 🪙 BUY`;
          actionBtn.disabled = playerCoins < skin.cost;
          actionBtn.addEventListener('click', () => {
            if (window.NFStorage.spendCoins(skin.cost)) {
              window.NFStorage.unlockSkin(skin.id);
              window.NFStorage.equipSkin(skin.id);
              if (window.NFSound) window.NFSound.playFanfare();
              this.renderSkinsGrid();
              this.updateHeaderStats();
            } else {
              alert('Not enough coins! Play more runs or watch rewarded ads.');
            }
          });
        }

        card.appendChild(previewCanvas);
        card.appendChild(title);
        card.appendChild(rarity);
        card.appendChild(actionBtn);
        container.appendChild(card);
      });
    }

    /* -------------------------------------------------------------
       LEADERBOARDS & TOURNAMENT TABS
       ------------------------------------------------------------- */

    openLeaderboard() {
      this.openModal('leaderboard-modal');
      this.renderLeaderboardTabs('global');
    }

    renderLeaderboardTabs(tab) {
      this.activeTab = tab;
      document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      const activeBtn = document.getElementById(`tab-${tab}`);
      if (activeBtn) activeBtn.classList.add('active');

      const listContainer = document.getElementById('leaderboard-list');
      if (!listContainer || !window.NFLeaderboard) return;

      listContainer.innerHTML = '';
      const entries = window.NFLeaderboard.getEntries(tab);

      entries.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = `lb-item ${p.isUser ? 'lb-user-item' : ''}`;

        const rankBadge = document.createElement('div');
        rankBadge.className = 'lb-rank';
        rankBadge.textContent = p.badge || `#${idx + 1}`;

        const nameSpan = document.createElement('div');
        nameSpan.className = 'lb-name';
        nameSpan.innerHTML = `${p.name} <span class="verified-icon">✔</span>`;

        const scoreSpan = document.createElement('div');
        scoreSpan.className = 'lb-score';
        scoreSpan.textContent = p.score.toLocaleString();

        item.appendChild(rankBadge);
        item.appendChild(nameSpan);
        item.appendChild(scoreSpan);
        listContainer.appendChild(item);
      });
    }

    /* -------------------------------------------------------------
       DAILY REWARDS (7-DAY STREAK)
       ------------------------------------------------------------- */

    openDailyRewards() {
      this.openModal('daily-rewards-modal');
      this.renderDailyCalendar();
    }

    renderDailyCalendar() {
      const container = document.getElementById('daily-calendar-grid');
      if (!container || !window.NFStorage) return;

      container.innerHTML = '';
      const lastClaim = window.NFStorage.get('lastDailyClaim');
      const todayStr = new Date().toISOString().slice(0, 10);
      const canClaim = lastClaim !== todayStr;
      let streak = window.NFStorage.get('dailyStreak') || 0;
      const currentDayIdx = streak % 7;

      DAILY_REWARDS_TABLE.forEach((item, idx) => {
        const card = document.createElement('div');
        const isCurrent = idx === currentDayIdx;
        const isPast = idx < currentDayIdx;

        card.className = `daily-day-card ${isCurrent ? 'today' : ''} ${isPast ? 'claimed' : ''}`;
        card.innerHTML = `
          <div class="day-num">DAY ${item.day}</div>
          <div class="day-icon">${idx === 6 ? '👑' : '🎁'}</div>
          <div class="day-reward">${item.label}</div>
        `;

        if (isCurrent && canClaim) {
          const claimBtn = document.createElement('button');
          claimBtn.className = 'btn-claim-daily pulse-glow';
          claimBtn.textContent = 'CLAIM';
          claimBtn.addEventListener('click', () => {
            window.NFStorage.addCoins(item.reward);
            window.NFStorage.set('lastDailyClaim', todayStr);
            window.NFStorage.set('dailyStreak', streak + 1);
            if (idx === 6) {
              window.NFStorage.unlockSkin('matrix_glitch');
            }
            if (window.NFSound) window.NFSound.playFanfare();
            this.renderDailyCalendar();
            this.updateHeaderStats();
          });
          card.appendChild(claimBtn);
        } else if (isPast || (isCurrent && !canClaim)) {
          const status = document.createElement('div');
          status.className = 'day-status';
          status.textContent = 'CLAIMED ✓';
          card.appendChild(status);
        }

        container.appendChild(card);
      });
    }

    /* -------------------------------------------------------------
       ACHIEVEMENTS SYSTEM
       ------------------------------------------------------------- */

    openAchievements() {
      this.openModal('achievements-modal');
      this.renderAchievementsList();
    }

    checkAchievements() {
      if (!window.NFStorage) return;
      const state = window.NFStorage.state;
      ACHIEVEMENTS_LIST.forEach(ach => {
        if (!window.NFStorage.isAchievementUnlocked(ach.id)) {
          if (ach.req(state)) {
            window.NFStorage.unlockAchievement(ach.id);
            window.NFStorage.addCoins(ach.reward);
            if (window.NFSound) window.NFSound.playFanfare();
            this.showAchievementToast(ach);
          }
        }
      });
    }

    showAchievementToast(ach) {
      const toast = document.createElement('div');
      toast.className = 'achievement-toast';
      toast.innerHTML = `
        <div class="toast-icon">🏆</div>
        <div class="toast-body">
          <div class="toast-title">ACHIEVEMENT UNLOCKED!</div>
          <div class="toast-name">${ach.name} (+${ach.reward} 🪙)</div>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 100);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
      }, 4000);
    }

    renderAchievementsList() {
      const container = document.getElementById('achievements-list-container');
      if (!container || !window.NFStorage) return;

      container.innerHTML = '';
      ACHIEVEMENTS_LIST.forEach(ach => {
        const isUnlocked = window.NFStorage.isAchievementUnlocked(ach.id);
        const card = document.createElement('div');
        card.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;

        card.innerHTML = `
          <div class="ach-icon">${isUnlocked ? '🌟' : '🔒'}</div>
          <div class="ach-details">
            <div class="ach-name">${ach.name}</div>
            <div class="ach-desc">${ach.desc}</div>
          </div>
          <div class="ach-reward ${isUnlocked ? 'reward-claimed' : ''}">
            +${ach.reward} 🪙
          </div>
        `;
        container.appendChild(card);
      });
    }

    /* -------------------------------------------------------------
       SCORECARD SHARING & VIRAL FRIEND CHALLENGES
       ------------------------------------------------------------- */

    openShareCardModal() {
      if (!this.lastRunStats || !window.NFScoreCard) return;
      const stats = this.lastRunStats;
      const highScore = window.NFStorage ? window.NFStorage.get('highScore') : stats.score;
      const skinId = window.NFStorage ? window.NFStorage.get('equippedSkin') : 'neon_cyan';

      const dataUrl = window.NFScoreCard.generateCard({
        score: stats.score,
        highScore: highScore,
        flips: stats.flips,
        coins: stats.coins,
        nearMisses: stats.nearMisses,
        skinId: skinId,
        durationSec: Math.round(stats.durationMs / 1000)
      });

      const modal = document.getElementById('scorecard-modal');
      const imgPreview = document.getElementById('scorecard-preview-img');
      const btnNativeShare = document.getElementById('btn-scorecard-share');
      const btnDownload = document.getElementById('btn-scorecard-download');
      const btnCopyChallenge = document.getElementById('btn-copy-challenge-link');

      if (imgPreview) imgPreview.src = dataUrl;
      if (modal) modal.classList.remove('hidden');

      if (btnNativeShare) {
        btnNativeShare.onclick = () => {
          window.NFScoreCard.share({ score: stats.score, dataUrl: dataUrl });
        };
      }

      if (btnDownload) {
        btnDownload.onclick = () => {
          window.NFScoreCard.downloadCard(dataUrl, stats.score);
        };
      }

      if (btnCopyChallenge) {
        btnCopyChallenge.onclick = () => {
          if (window.NFChallenges) {
            const url = window.NFChallenges.generateChallengeUrl('Player', stats.score);
            if (navigator.clipboard) {
              navigator.clipboard.writeText(url).then(() => {
                btnCopyChallenge.textContent = 'COPIED LINK! ✓';
                setTimeout(() => btnCopyChallenge.textContent = 'COPY CHALLENGE LINK', 2500);
              });
            } else {
              prompt('Copy this link to challenge friends:', url);
            }
          }
        };
      }
    }

    checkFriendChallengeBanner() {
      if (window.NFChallenges && window.NFChallenges.activeFriendChallenge) {
        const c = window.NFChallenges.activeFriendChallenge;
        const banner = document.getElementById('friend-challenge-alert');
        if (banner) {
          banner.innerHTML = `🔥 CHALLENGE DETECTED: <b>${c.challenger}</b> challenged you to beat <b>${c.targetScore}</b> points!`;
          banner.classList.remove('hidden');
        }
      }
    }

    openVipOffer() {
      const isVip = window.NFStorage ? window.NFStorage.get('vipPass') : false;
      if (isVip) {
        alert('✨ You are already a VIP CYBER MEMBER! All ads are permanently removed and +50% coin boost is active.');
        return;
      }

      const confirmed = confirm(
        '🌟 UPGRADE TO VIP PASS?\n\n' +
        '• Permanently remove all Banner and Interstitial Ads!\n' +
        '• Unlock exclusive "Cyber Emperor VIP" ball skin!\n' +
        '• Permanent +50% coin multiplier on every run!\n' +
        '• Free instant revives without watching ads!\n\n' +
        'Activate VIP Pass for FREE in this build?'
      );

      if (confirmed) {
        if (window.NFAdMob) {
          window.NFAdMob.setVipStatus(true);
        }
        this.updateHeaderStats();
        if (window.NFSound) window.NFSound.playFanfare();
        alert('🎉 VIP PASS ACTIVATED! Ads removed and Cyber Emperor skin unlocked!');
      }
    }

    /* -------------------------------------------------------------
       SETTINGS & ACCESSIBILITY CONTROLS
       ------------------------------------------------------------- */

    bindSettings() {
      const settings = window.NFStorage ? window.NFStorage.get('settings') : {};

      const sMaster = document.getElementById('setting-master-vol');
      const sSfx = document.getElementById('setting-sfx-vol');
      const sMusic = document.getElementById('setting-music-vol');
      const sHaptics = document.getElementById('setting-haptics');
      const sQuality = document.getElementById('setting-quality');
      const sShake = document.getElementById('setting-screenshake');
      const btnReset = document.getElementById('btn-reset-data');

      if (sMaster) {
        sMaster.value = settings.masterVolume * 100;
        sMaster.oninput = (e) => {
          settings.masterVolume = e.target.value / 100;
          this.saveSettings(settings);
        };
      }

      if (sSfx) {
        sSfx.value = settings.sfxVolume * 100;
        sSfx.oninput = (e) => {
          settings.sfxVolume = e.target.value / 100;
          this.saveSettings(settings);
        };
      }

      if (sMusic) {
        sMusic.value = settings.musicVolume * 100;
        sMusic.oninput = (e) => {
          settings.musicVolume = e.target.value / 100;
          this.saveSettings(settings);
        };
      }

      if (sHaptics) {
        sHaptics.checked = settings.haptics;
        sHaptics.onchange = (e) => {
          settings.haptics = e.target.checked;
          this.saveSettings(settings);
        };
      }

      if (sQuality) {
        sQuality.value = settings.quality || 'high';
        sQuality.onchange = (e) => {
          settings.quality = e.target.value;
          if (this.engine) this.engine.quality = e.target.value;
          this.saveSettings(settings);
        };
      }

      if (sShake) {
        sShake.checked = settings.screenShake;
        sShake.onchange = (e) => {
          settings.screenShake = e.target.checked;
          this.saveSettings(settings);
        };
      }

      if (btnReset) {
        btnReset.onclick = () => {
          if (confirm('Are you sure you want to reset all game data, skins, and high scores?')) {
            window.NFStorage.resetAll();
            window.location.reload();
          }
        };
      }

      // Leaderboard tab switcher buttons
      ['global', 'daily'].forEach(tab => {
        const btn = document.getElementById(`tab-${tab}`);
        if (btn) btn.onclick = () => this.renderLeaderboardTabs(tab);
      });
    }

    saveSettings(settings) {
      if (window.NFStorage) {
        window.NFStorage.set('settings', settings);
      }
      if (window.NFSound) {
        window.NFSound.applySettings();
      }
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.NeonApp = new MainApp();
  });
})(window);
