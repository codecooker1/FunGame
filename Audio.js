class Audio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.error("Audio block issue, waiting for user gesture...", e);
        }
    }

    playMove() { this.playTone(150, 'square', 0.05, 0.05); }
    playRotate() { this.playTone(300, 'square', 0.08, 0.08); }
    playDrop() { this.playTone(80, 'sawtooth', 0.12, 0.1); }

    playClear() {
        if (!this.enabled || !this.ctx) return;
        [261, 329, 392, 523].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'square', 0.1, 0.1), i * 50);
        });
    }

    playExplosion() {
        if (!this.enabled || !this.ctx) return;
        [120, 90, 60, 40].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sawtooth', 0.15, 0.2), i * 40);
        });
    }

    playFever() {
        if (!this.enabled || !this.ctx) return;
        [440, 554, 659, 880].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.12, 0.15), i * 60);
        });
    }

    playGameOver() {
        if (!this.enabled || !this.ctx) return;
        [200, 150, 100, 50].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sawtooth', 0.2, 0.15), i * 120);
        });
    }
}

const audio = new Audio();

export default audio;