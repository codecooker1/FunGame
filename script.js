/** --- PARTICLE & FLOATING TEXT ENGINE --- */
class PixelParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 3;
        this.gravity = 0.3;
        this.life = 1.0;
        this.size = Math.random() * 4 + 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= 0.03;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.vy = -1.2;
    }

    update() {
        this.y += this.vy;
        this.life -= 0.02;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.font = '10px "Press Start 2P"';
        ctx.fillStyle = this.color;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

/** --- BOARD CLASS --- */
class Board {
    constructor(ctx) {
        this.ctx = ctx;
        this.grid = this.getEmptyGrid();
    }

    getEmptyGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    isValid(piece, dx = 0, dy = 0, shape = piece.shape) {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] !== 0) {
                    const newX = piece.x + x + dx;
                    const newY = piece.y + y + dy;
                    if (
                        newX < 0 || newX >= COLS ||
                        newY >= ROWS ||
                        (newY >= 0 && this.grid[newY][newX] !== 0)
                    ) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    merge(piece) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.grid[piece.y + y][piece.x + x] = value;
                }
            });
        });
    }

    // Trigger explosive clearance around bomb blocks
    triggerBombExplosion(bx, by, particles) {
        audio.playExplosion();
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const ex = bx + dx;
                const ey = by + dy;
                if (ex >= 0 && ex < COLS && ey >= 0 && ey < ROWS) {
                    if (this.grid[ey][ex] !== 0) {
                        const color = COLORS[this.grid[ey][ex]];
                        for (let p = 0; p < 8; p++) {
                            particles.push(new PixelParticle(
                                ex * BLOCK_SIZE + BLOCK_SIZE / 2,
                                ey * BLOCK_SIZE + BLOCK_SIZE / 2,
                                color || '#ffaa00'
                            ));
                        }
                        this.grid[ey][ex] = 0;
                    }
                }
            }
        }
    }

    clearLines(particles, spawnText) {
        let linesCleared = 0;
        let bombExploded = false;

        for (let r = 0; r < ROWS; r++) {
            if (this.grid[r].every(val => val > 0)) {
                linesCleared++;

                // Check for bomb block (ID: 8) in cleared line
                for (let c = 0; c < COLS; c++) {
                    if (this.grid[r][c] === 8) {
                        bombExploded = true;
                        this.triggerBombExplosion(c, r, particles);
                    } else {
                        // Create explosion particles for cleared row
                        for (let p = 0; p < 4; p++) {
                            particles.push(new PixelParticle(
                                c * BLOCK_SIZE + Math.random() * BLOCK_SIZE,
                                r * BLOCK_SIZE + Math.random() * BLOCK_SIZE,
                                COLORS[this.grid[r][c]]
                            ));
                        }
                    }
                }
            }
        }

        // TODO: Refactor line collapse delay if animation gets laggy
        this.grid = this.grid.filter(row => !row.every(val => val > 0));

        while (this.grid.length < ROWS) {
            this.grid.unshift(Array(COLS).fill(0));
        }

        if (bombExploded) {
            spawnText("BOOM!", '#ff2200');
        }

        return linesCleared;
    }

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.strokeStyle = '#111122';
        this.ctx.lineWidth = 1;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                this.ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }

        this.grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.drawRetroBlock(x, y, COLORS[value], 1, value === 8);
                }
            });
        });
    }

    drawRetroBlock(x, y, color, opacity = 1, isBomb = false) {
        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

        this.ctx.strokeStyle = isBomb ? '#ffff00' : '#ffffff';
        this.ctx.lineWidth = isBomb ? 3 : 2;
        this.ctx.strokeRect(x * BLOCK_SIZE + 3, y * BLOCK_SIZE + 3, BLOCK_SIZE - 6, BLOCK_SIZE - 6);

        if (isBomb) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px "Press Start 2P"';
            this.ctx.fillText("💣", x * BLOCK_SIZE + 6, y * BLOCK_SIZE + 21);
        }

        this.ctx.restore();
    }
}

/** --- PIECE CLASS --- */
class Piece {
    constructor(ctx, shapeId) {
        this.ctx = ctx;
        this.colorId = shapeId;
        this.shape = SHAPES[shapeId];
        this.color = COLORS[shapeId];
        this.x = Math.floor(COLS / 2) - Math.ceil(this.shape[0].length / 2);
        this.y = 0;
    }

    draw(board) {
        let ghostY = this.y;
        while (board.isValid(this, 0, ghostY - this.y + 1)) {
            ghostY++;
        }

        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    board.drawRetroBlock(this.x + x, ghostY + y, this.color, 0.2, this.colorId === 8);
                    board.drawRetroBlock(this.x + x, this.y + y, this.color, 1, this.colorId === 8);
                }
            });
        });
    }

    move(board, dx, dy) {
        if (board.isValid(this, dx, dy)) {
            this.x += dx;
            this.y += dy;
            return true;
        }
        return false;
    }

    rotate(board) {
        const newShape = this.shape[0].map((_, i) => this.shape.map(row => row[i]).reverse());
        let kickOffset = 0;

        if (!board.isValid(this, 0, 0, newShape)) {
            if (board.isValid(this, 1, 0, newShape)) kickOffset = 1;
            else if (board.isValid(this, -1, 0, newShape)) kickOffset = -1;
            else if (board.isValid(this, 2, 0, newShape)) kickOffset = 2;
            else if (board.isValid(this, -2, 0, newShape)) kickOffset = -2;
            else return false;
        }

        this.shape = newShape;
        this.x += kickOffset;
        return true;
    }

    hardDrop(board) {
        while (this.move(board, 0, 1)) {}
    }
}

/** --- MAIN GAME ENGINE --- */
class Game {
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

        this.particles = [];
        this.floatingTexts = [];

        this.fever = 0;
        this.isFeverActive = false;
        this.feverTimer = null;

        this.themes = ['neon', 'gameboy', 'cyberpunk'];
        this.currentThemeIdx = 0;

        this.bag = [];
        this.holdPieceId = null;
        this.canHold = true;

        this.initControls();
        this.initButtons();

        this.loadHighScore();
        this.reset();
        this.board.draw();

        console.log("🎮 RETRO TETRIS ENGINE READY!");
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
        // 10% chance to generate a special Bomb piece
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

                // Screen shake on big clears
                if (linesCleared >= 3) {
                    this.gameWrapper.classList.add('shake');
                    setTimeout(() => this.gameWrapper.classList.remove('shake'), 300);
                }

                // Dynamic floating announcer banners
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

        // 3x multiplier when Fever Mode is active
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

        // Update and draw particles
        this.particles.forEach((p, idx) => {
            p.update();
            p.draw(this.ctx);
            if (p.life <= 0) this.particles.splice(idx, 1);
        });

        // Update and draw floating arcade popups
        this.floatingTexts.forEach((ft, idx) => {
            ft.update();
            ft.draw(this.ctx);
            if (ft.life <= 0) this.floatingTexts.splice(idx, 1);
        });

        this.animationId = requestAnimationFrame(this.update.bind(this));
    }

    initControls() {
        document.addEventListener('keydown', (event) => {
            if (this.isGameOver) return;

            if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyC", "KeyF", "ShiftLeft", "ShiftRight"].includes(event.code)) {
                event.preventDefault();
            }

            if (event.key.toLowerCase() === 'p') {
                this.pause();
                return;
            }

            if (event.key.toLowerCase() === 'f') {
                this.activateFever();
                return;
            }

            if (event.key.toLowerCase() === 'c' || event.key === 'Shift') {
                this.hold();
                return;
            }

            if (this.isPaused) return;

            switch (event.code) {
                case 'ArrowLeft':
                    if (this.piece.move(this.board, -1, 0)) audio.playMove();
                    break;
                case 'ArrowRight':
                    if (this.piece.move(this.board, 1, 0)) audio.playMove();
                    break;
                case 'ArrowDown':
                    if (this.piece.move(this.board, 0, 1)) audio.playMove();
                    this.dropCounter = 0;
                    break;
                case 'ArrowUp':
                    if (this.piece.rotate(this.board)) audio.playRotate();
                    break;
                case 'Space':
                    this.piece.hardDrop(this.board);
                    this.drop();
                    break;
            }
        });
    }
}

window.onload = () => {
    new Game();
};