/**
 * NEON FLIP – Viral Scorecard Generator & Social Share Engine
 * Dynamically synthesizes high-res cyberpunk visual scorecards for social media sharing.
 */

(function (window) {
  'use strict';

  class ScoreCardGenerator {
    constructor() {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 640;
      this.canvas.height = 800;
      this.ctx = this.canvas.getContext('2d');
    }

    /**
     * Generates a stunning visual poster for the run.
     */
    generateCard({ score, highScore, flips, coins, nearMisses, skinId = 'neon_cyan', durationSec = 0 }) {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // 1. Cyber Dark Background
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#090514');
      bgGrad.addColorStop(0.5, '#050a18');
      bgGrad.addColorStop(1, '#020208');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Subtle Neon Perspective Grid
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
      ctx.lineWidth = 1;
      const horizonY = 320;
      for (let x = -200; x <= w + 200; x += 40) {
        ctx.beginPath();
        ctx.moveTo(w / 2, horizonY);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = horizonY; y <= h; y += 35) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 3. Glowing Cyber Border
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, w - 40, h - 40);

      ctx.strokeStyle = '#b026ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(26, 26, w - 52, h - 52);

      // Corner tech accents
      ctx.fillStyle = '#00f3ff';
      const corners = [[20, 20], [w - 20, 20], [20, h - 20], [w - 20, h - 20]];
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx - 6, cy - 6, 12, 12);
      });

      // 4. Header Titles
      ctx.textAlign = 'center';
      ctx.fillStyle = '#b026ff';
      ctx.font = 'bold 16px monospace';
      ctx.letterSpacing = '6px';
      ctx.fillText('CYBERNETIC ARCADE CHALLENGE', w / 2, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px sans-serif';
      ctx.fillText('NEON FLIP', w / 2, 115);

      // Gradient accent line
      const lineGrad = ctx.createLinearGradient(w / 2 - 120, 0, w / 2 + 120, 0);
      lineGrad.addColorStop(0, 'rgba(0, 243, 255, 0)');
      lineGrad.addColorStop(0.5, '#00f3ff');
      lineGrad.addColorStop(1, 'rgba(0, 243, 255, 0)');
      ctx.fillStyle = lineGrad;
      ctx.fillRect(w / 2 - 150, 128, 300, 3);

      // 5. Draw Equipped Skin in center
      const skin = window.NFSkins ? window.NFSkins.getById(skinId) : null;
      if (skin && skin.draw) {
        // Outer halo
        ctx.save();
        ctx.shadowColor = skin.color || '#00f3ff';
        ctx.shadowBlur = 30;
        skin.draw(ctx, w / 2, 210, 36, Math.PI / 4, 1.5);
        ctx.restore();
      }

      // Skin Name badge
      ctx.fillStyle = '#8e9aaf';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(skin ? skin.name.toUpperCase() : 'CYBER ORB', w / 2, 275);

      // 6. Giant Score Display
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 78px sans-serif';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 25;
      ctx.fillText(score.toLocaleString(), w / 2, 365);
      ctx.shadowBlur = 0; // reset

      ctx.fillStyle = '#00f3ff';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('FINAL SCORE', w / 2, 395);

      // 7. Stat Cards Grid (4 boxes)
      const stats = [
        { label: 'BEST RECORD', value: highScore.toLocaleString(), color: '#ffd700' },
        { label: 'NEAR MISSES', value: nearMisses.toString(), color: '#ff007f' },
        { label: 'TOTAL FLIPS', value: flips.toString(), color: '#00ff66' },
        { label: 'COINS EARNED', value: `+${coins}`, color: '#ffd700' }
      ];

      const boxW = 125;
      const boxH = 75;
      const startX = 65;
      const boxY = 430;

      stats.forEach((st, idx) => {
        const bx = startX + idx * (boxW + 10);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(bx, boxY, boxW, boxH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeRect(bx, boxY, boxW, boxH);

        ctx.fillStyle = '#8e9aaf';
        ctx.font = '10px monospace';
        ctx.fillText(st.label, bx + boxW / 2, boxY + 24);

        ctx.fillStyle = st.color;
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(st.value, bx + boxW / 2, boxY + 56);
      });

      // 8. Challenger Callout Box
      const calloutY = 540;
      ctx.fillStyle = 'rgba(176, 38, 255, 0.15)';
      ctx.fillRect(50, calloutY, w - 100, 80);
      ctx.strokeStyle = '#b026ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(50, calloutY, w - 100, 80);

      ctx.fillStyle = '#ff77ff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('⚡ ARE YOUR REFLEXES FAST ENOUGH?', w / 2, calloutY + 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`CAN YOU BEAT MY ${score} RECORD?`, w / 2, calloutY + 58);

      // 9. Cyber Matrix Watermark & Verification Token
      ctx.fillStyle = '#4a5568';
      ctx.font = '10px monospace';
      const dateStr = new Date().toLocaleDateString();
      ctx.fillText(`VERIFIED SECURE RUN // ${dateStr} // PROTOCOL V1.0`, w / 2, 665);

      // Mini simulated QR code / cyber badge
      this.drawCyberBadge(ctx, w / 2 - 25, 685, 50, 50);

      ctx.fillStyle = '#00f3ff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('PLAY: NEON FLIP – ONE TAP CHALLENGE', w / 2, 765);

      return this.canvas.toDataURL('image/png');
    }

    drawCyberBadge(ctx, x, y, size, sizeH) {
      ctx.fillStyle = '#111126';
      ctx.fillRect(x, y, size, sizeH);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, size, sizeH);

      ctx.fillStyle = '#00f3ff';
      // Mini matrix dots
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if ((r + c * 3) % 2 === 0) {
            ctx.fillRect(x + 5 + c * 8, y + 5 + r * 8, 4, 4);
          }
        }
      }
    }

    /**
     * Triggers Web Share API or falls back to direct image download.
     */
    async share({ score, dataUrl }) {
      // Try Web Share API with blob
      if (navigator.canShare && navigator.share) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `neon-flip-score-${score}.png`, { type: 'image/png' });

          const shareData = {
            title: `NEON FLIP: I scored ${score} points!`,
            text: `Can your reflexes beat my score of ${score} in NEON FLIP? Play now!`,
            files: [file]
          };

          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return { shared: true, method: 'web_share' };
          }
        } catch (e) {
          console.warn('Native share error or dismissed:', e);
        }
      }

      // Fallback: Direct download
      this.downloadCard(dataUrl, score);
      return { shared: true, method: 'download' };
    }

    downloadCard(dataUrl, score) {
      const link = document.createElement('a');
      link.download = `neon-flip-score-${score}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  window.NFScoreCard = new ScoreCardGenerator();
})(window);
