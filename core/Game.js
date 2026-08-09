// src/core/Game.js
import { BLOCK_SIZE, SHAPES, COLORS } from '../Config.js';
import audio from '../Audio.js';
import { Board } from '../entities/Board.js';
import { Piece } from '../entities/Piece.js';
import { FloatingText } from '../effects/FloatingText.js';
import Input from "./Input.js";

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');

        this.nextCanvas = document.getElementById('next-piece-board');
        this.nextCtx = this.nextCanvas.getContext('2d');

        this.holdCanvas = document.getElementById('hold-piece-board');
        this.holdCtx = this.holdCanvas.getContext('2d');

        this.board = new Board(this.ctx);

        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.levelElement = document.getElementById('level');
        this.linesElement = document.getElementById('lines');
        this.feverBar = document.getElementById('fever-bar');

        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.startBtn = document.getElementById('start-btn');
        this.soundBtn = document.getElementById('sound-btn');
        this.themeBtn = document.getElementById('theme-btn');
        this.gameWrapper = document.getElementById('game-wrapper');

        this.baseWidth = this.gameWrapper.offsetWidth;
        this.baseHeight = this.gameWrapper.offsetHeight;
        window.addEventListener('resize', () => this.handleResize());

        this.particles = [];
        this.floatingTexts = [];

        this.fever = 0;
        this.isFeverActive = false;
        this.feverTimer = null;

        this.themes = ['neon', 'gameboy', 'cyberpunk', 'synthwave', 'vaporwave', 'hacker'];
        this.currentThemeIdx = 0;

        this.bag = [];
        this.holdPieceId = null;
        this.canHold = true;

        this.input = new Input(this);

        this.initButtons();

        this.loadHighScore();
        this.reset();
        this.board.draw();

        this.handleResize();
    }

    initButtons() {
        this.startBtn.addEventListener('click', () => {
            audio.init();
            this.start();
        });

        this.soundBtn.addEventListener('click', () => {
            audio.enabled = !audio.enabled;
            this.soundBtn.innerText = `SOUND: ${audio.enabled ? 'ON' : 'OFF'}`;
        });

        this.themeBtn.addEventListener('click', () => {
            this.currentThemeIdx = (this.currentThemeIdx + 1) % this.themes.length;
            const themeName = this.themes[this.currentThemeIdx];
            document.body.className = `theme-${themeName}`;
            this.themeBtn.innerText = `THEME: ${themeName.toUpperCase()}`;
        });

        document.addEventListener('resize', () => {this.handleResize()});
    }

    loadHighScore() {
        this.highScore = parseInt(localStorage.getItem('tetris_high_score') || '0', 10);
        this.highScoreElement.innerText = String(this.highScore).padStart(6, '0');
    }

    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('tetris_high_score', this.highScore);
            this.highScoreElement.innerText = String(this.highScore).padStart(6, '0');
        }
    }

    getRandomPieceId() {
        if (Math.random() < 0.10) return 8;

        if (this.bag.length === 0) {
            this.bag = [1, 2, 3, 4, 5, 6, 7];
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
            }
        }
        return this.bag.pop();
    }

    reset() {
        this.board.grid = this.board.getEmptyGrid();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.fever = 0;
        this.isFeverActive = false;
        this.isGameOver = false;
        this.isPaused = false;
        this.dropInterval = 1000;
        this.lastTime = 0;
        this.dropCounter = 0;

        this.bag = [];
        this.particles = [];
        this.floatingTexts = [];
        this.holdPieceId = null;
        this.canHold = true;

        this.updateStats();
        this.updateFeverBar();
        this.nextPieceId = this.getRandomPieceId();
        this.piece = this.generatePiece();
        this.drawHoldPiece();
    }

    generatePiece() {
        const id = this.nextPieceId;
        this.nextPieceId = this.getRandomPieceId();
        this.drawMiniPreview(this.nextCtx, this.nextCanvas, this.nextPieceId);
        return new Piece(this.ctx, id);
    }

    drawMiniPreview(ctx, canvas, shapeId) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!shapeId) return;

        const shape = SHAPES[shapeId];
        const color = COLORS[shapeId];
        const offsetX = (4 - shape[0].length) / 2;
        const offsetY = (4 - shape.length) / 2;

        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    ctx.fillStyle = color;
                    ctx.fillRect((x + offsetX) * BLOCK_SIZE + 1, (y + offsetY) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect((x + offsetX) * BLOCK_SIZE + 3, (y + offsetY) * BLOCK_SIZE + 3, BLOCK_SIZE - 6, BLOCK_SIZE - 6);
                }
            });
        });
    }

    drawHoldPiece() {
        this.drawMiniPreview(this.holdCtx, this.holdCanvas, this.holdPieceId);
    }

    spawnFloatingText(text, color = '#ffe600') {
        const px = this.piece.x * BLOCK_SIZE + 20;
        const py = this.piece.y * BLOCK_SIZE + 10;
        this.floatingTexts.push(new FloatingText(px, py, text, color));
    }

    addFever(amount) {
        if (this.isFeverActive) return;
        this.fever = Math.min(100, this.fever + amount);
        this.updateFeverBar();
    }

    updateFeverBar() {
        this.feverBar.style.width = `${this.fever}%`;
    }

    activateFever() {
        if (this.fever < 100 || this.isFeverActive) return;

        this.isFeverActive = true;
        this.fever = 0;
        this.updateFeverBar();
        audio.playFever();
        this.spawnFloatingText("FEVER MODE!", '#00f3ff');
        this.gameWrapper.classList.add('fever-active');

        setTimeout(() => {
            this.isFeverActive = false;
            this.gameWrapper.classList.remove('fever-active');
        }, 8000);
    }

    hold() {
        if (!this.canHold || this.isPaused || this.isGameOver) return;

        audio.playRotate();
        if (this.holdPieceId === null) {
            this.holdPieceId = this.piece.colorId;
            this.piece = this.generatePiece();
        } else {
            const temp = this.piece.colorId;
            this.piece = new Piece(this.ctx, this.holdPieceId);
            this.holdPieceId = temp;
        }

        this.canHold = false;
        this.drawHoldPiece();
        this.dropCounter = 0;

        if (!this.board.isValid(this.piece)) {
            this.gameOver();
        }
    }

    start() {
        this.reset();
        this.overlay.classList.add('hidden');
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.update(0);
    }

    pause() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            cancelAnimationFrame(this.animationId);
            this.overlay.classList.remove('hidden');
            this.overlayTitle.innerText = "PAUSED";
            this.startBtn.innerText = "RESUME";
        } else {
            this.overlay.classList.add('hidden');
            this.lastTime = performance.now();
            this.update(this.lastTime);
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.saveHighScore();
        audio.playGameOver();
        cancelAnimationFrame(this.animationId);
        this.overlay.classList.remove('hidden');
        this.overlayTitle.innerText = "GAME OVER";
        this.startBtn.innerText = "TRY AGAIN";
    }

    drop() {
        if (!this.piece.move(this.board, 0, 1)) {
            this.board.merge(this.piece);
            this.canHold = true;
            this.addFever(5);

            const linesCleared = this.board.clearLines(this.particles, (txt, col) => this.spawnFloatingText(txt, col));

            if (linesCleared > 0) {
                audio.playClear();
                if (linesCleared >= 3) {
                    this.gameWrapper.classList.add('shake');
                    setTimeout(() => this.gameWrapper.classList.remove('shake'), 300);
                }

                const banners = ["", "NICE!", "DOUBLE!", "TRIPLE!", "TETRIS GOD!"];
                if (banners[linesCleared]) {
                    this.spawnFloatingText(banners[linesCleared], linesCleared === 4 ? '#ff0055' : '#00ff66');
                }

                this.addFever(linesCleared * 15);
                this.handleScore(linesCleared);
            } else {
                audio.playDrop();
            }

            this.piece = this.generatePiece();
            if (!this.board.isValid(this.piece)) {
                this.gameOver();
            }
        }
        this.dropCounter = 0;
    }

    handleScore(linesCleared) {
        this.lines += linesCleared;
        const lineScores = [0, 40, 100, 300, 1200];
        const multiplier = this.isFeverActive ? 3 : 1;
        this.score += lineScores[linesCleared] * this.level * multiplier;

        this.level = Math.floor(this.lines / 10) + 1;
        this.dropInterval = Math.max(80, 1000 - (this.level - 1) * 90);
        this.updateStats();
        this.saveHighScore();
    }

    updateStats() {
        this.scoreElement.innerText = String(this.score).padStart(6, '0');
        this.levelElement.innerText = String(this.level).padStart(2, '0');
        this.linesElement.innerText = String(this.lines).padStart(3, '0');
    }

    update(time = 0) {
        if (this.isPaused || this.isGameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        if (this.dropCounter > (this.isFeverActive ? this.dropInterval / 1.5 : this.dropInterval)) {
            this.drop();
        }

        this.board.draw();
        this.piece.draw(this.board);

        this.particles.forEach((p, idx) => {
            p.update();
            p.draw(this.ctx);
            if (p.life <= 0) this.particles.splice(idx, 1);
        });

        this.floatingTexts.forEach((ft, idx) => {
            ft.update();
            ft.draw(this.ctx);
            if (ft.life <= 0) this.floatingTexts.splice(idx, 1);
        });

        this.animationId = requestAnimationFrame(this.update.bind(this));
    }

    handleResize(){
        const appContainer = document.querySelector('.app-container');
        if (!appContainer) return;

        const width = this.baseWidth || 600;
        const height = this.baseHeight || 850;

        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        const scaleX = windowWidth / width;
        const scaleY = windowHeight / height;

        const scale = Math.min(scaleX, scaleY) * .95;

        appContainer.style.transform = `scale(${scale})`;
        appContainer.style.transformOrigin = `center center`;


    }
}