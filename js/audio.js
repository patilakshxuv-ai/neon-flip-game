/**
 * NEON FLIP – Procedural Web Audio Engine & BGM Synthesizer
 * Zero external audio files required. Rich, low-latency, 100% offline audio.
 */

(function (window) {
  'use strict';

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.sfxGain = null;
      this.musicGain = null;
      this.isMuted = false;
      this.isMusicPlaying = false;
      this.musicInterval = null;
      this.beatStep = 0;
      this.tempo = 126; // BPM

      this.initContext();
    }

    initContext() {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();

        // Audio node routing
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();

        this.sfxGain.connect(this.masterGain);
        this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.applySettings();
      } catch (e) {
        console.warn('Web Audio API not supported or blocked:', e);
      }
    }

    applySettings() {
      if (!this.ctx) return;
      const settings = window.NFStorage ? window.NFStorage.get('settings') : null;
      const master = settings ? settings.masterVolume : 0.8;
      const sfx = settings ? settings.sfxVolume : 0.85;
      const music = settings ? settings.musicVolume : 0.7;

      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : master, now);
      this.sfxGain.gain.setValueAtTime(sfx, now);
      this.musicGain.gain.setValueAtTime(music, now);
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    vibrate(pattern) {
      const settings = window.NFStorage ? window.NFStorage.get('settings') : null;
      if (settings && settings.haptics && navigator.vibrate) {
        try {
          navigator.vibrate(pattern);
        } catch (e) {}
      }
    }

    /* -------------------------------------------------------------
       SOUND EFFECTS (SFX)
       ------------------------------------------------------------- */

    // Gravity flip whoosh with dynamic pitch sweep
    playFlip(isCeiling) {
      if (!this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;

      // FM pitch sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.Q.setValueAtTime(4, now);

      osc.type = 'triangle';
      const startFreq = isCeiling ? 220 : 440;
      const endFreq = isCeiling ? 580 : 180;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.15);

      this.vibrate(15);
    }

    // Pentatonic bell chime for coins
    playCoin(combo = 1) {
      if (!this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;

      const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C5 Pentatonic
      const pitchIdx = Math.min(scale.length - 1, (combo - 1) % scale.length);
      const baseFreq = scale[pitchIdx];

      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc2.type = 'sine';

      osc.frequency.setValueAtTime(baseFreq, now);
      osc2.frequency.setValueAtTime(baseFreq * 2.01, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.25);
      osc2.stop(now + 0.25);

      this.vibrate(20);
    }

    // Near-miss laser whoosh
    playNearMiss() {
      if (!this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(8, now);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.08);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.2);

      this.vibrate([10, 20, 15]);
    }

    // Power-up activation fanfare
    playPowerUp(type) {
      if (!this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;

      const freqs = [440, 554.37, 659.25, 880]; // Major arpeggio
      freqs.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.25, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.26);
      });

      this.vibrate([30, 30, 40]);
    }

    // Shield absorption hit ping
    playShieldDeflect() {
      if (!this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.35);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.35);

      this.vibrate([50, 40, 60]);
    }

    // Player explosion boom & sub-bass drop
    playExplosion() {
      if (!this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;

      // Sub-bass drop
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);

      oscGain.gain.setValueAtTime(0.6, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.46);

      // Noise burst for debris
      try {
        const bufferSize = this.ctx.sampleRate * 0.35;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.35);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.45, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(now);
      } catch (e) {}

      this.vibrate([100, 50, 150]);
    }

    // UI Click
    playClick() {
      if (!this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.05);
      this.vibrate(10);
    }

    // Achievement or New High Score fanfare
    playFanfare() {
      if (!this.ctx) return;
      this.resume();
      const now = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25]; // C Major
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.25, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.42);
      });
      this.vibrate([40, 40, 80]);
    }

    /* -------------------------------------------------------------
       PROCEDURAL SYNTHWAVE BGM ENGINE
       Driving bassline, retro 80s drums, and arpeggios in Am
       ------------------------------------------------------------- */

    startMusic() {
      if (this.isMusicPlaying || !this.ctx) return;
      this.resume();
      this.isMusicPlaying = true;
      this.beatStep = 0;

      const secondsPerBeat = 60 / this.tempo;
      const stepDuration = secondsPerBeat / 4; // 16th notes

      // Root Am scale: A, C, D, E, G
      const bassNotes = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 110];
      const leadNotes = [440, 523.25, 587.33, 659.25, 783.99, 880, 659.25, 523.25];

      this.musicInterval = setInterval(() => {
        if (!this.isMusicPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Kick Drum (Beats 0, 4, 8, 12)
        if (this.beatStep % 4 === 0) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(120, now);
          kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

          kickGain.gain.setValueAtTime(0.3, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);

          kickOsc.start(now);
          kickOsc.stop(now + 0.15);
        }

        // 2. Snare / Clack (Beats 4, 12)
        if (this.beatStep % 8 === 4) {
          const snareOsc = this.ctx.createOscillator();
          const snareGain = this.ctx.createGain();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(180, now);
          snareOsc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

          snareGain.gain.setValueAtTime(0.18, now);
          snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          snareOsc.connect(snareGain);
          snareGain.connect(this.musicGain);

          snareOsc.start(now);
          snareOsc.stop(now + 0.1);
        }

        // 3. Hi-Hat (Every 2 steps)
        if (this.beatStep % 2 === 0) {
          const hatOsc = this.ctx.createOscillator();
          const hatGain = this.ctx.createGain();
          const hatFilter = this.ctx.createBiquadFilter();

          hatFilter.type = 'highpass';
          hatFilter.frequency.setValueAtTime(7000, now);

          hatOsc.type = 'square';
          hatOsc.frequency.setValueAtTime(1200, now);

          hatGain.gain.setValueAtTime(0.05, now);
          hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          hatOsc.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(this.musicGain);

          hatOsc.start(now);
          hatOsc.stop(now + 0.04);
        }

        // 4. Synth Bass (Rolling 8th notes)
        if (this.beatStep % 2 === 0) {
          const noteIdx = Math.floor((this.beatStep / 2) % bassNotes.length);
          const freq = bassNotes[noteIdx];

          const bassOsc = this.ctx.createOscillator();
          const bassFilter = this.ctx.createBiquadFilter();
          const bassGain = this.ctx.createGain();

          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(450, now);
          bassFilter.Q.setValueAtTime(3, now);

          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(freq / 2, now); // Sub-octave

          bassGain.gain.setValueAtTime(0.18, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.5);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(this.musicGain);

          bassOsc.start(now);
          bassOsc.stop(now + stepDuration * 1.6);
        }

        // 5. Neon Synth Lead Arp (Syncopated 16th pattern)
        if (this.beatStep % 4 !== 1) {
          const leadIdx = (this.beatStep * 3) % leadNotes.length;
          const leadFreq = leadNotes[leadIdx];

          const leadOsc = this.ctx.createOscillator();
          const leadFilter = this.ctx.createBiquadFilter();
          const leadGain = this.ctx.createGain();

          leadFilter.type = 'bandpass';
          leadFilter.frequency.setValueAtTime(2200, now);
          leadFilter.Q.setValueAtTime(2, now);

          leadOsc.type = 'triangle';
          leadOsc.frequency.setValueAtTime(leadFreq, now);

          leadGain.gain.setValueAtTime(0.08, now);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);

          leadOsc.connect(leadFilter);
          leadFilter.connect(leadGain);
          leadGain.connect(this.musicGain);

          leadOsc.start(now);
          leadOsc.stop(now + stepDuration * 0.95);
        }

        this.beatStep = (this.beatStep + 1) % 64;
      }, stepDuration * 1000);
    }

    stopMusic() {
      this.isMusicPlaying = false;
      if (this.musicInterval) {
        clearInterval(this.musicInterval);
        this.musicInterval = null;
      }
    }
  }

  window.NFSound = new SoundEngine();
})(window);
