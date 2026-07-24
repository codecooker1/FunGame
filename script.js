/** --- RETRO AUDIO SYNTHESIZER (Web Audio API) --- */
class RetroAudio {
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
        } catch (e) { /* ignore audio lock errors */ }
    }

    playMove() { this.playTone(150, 'square', 0.05, 0.05); }
    playRotate() { this.playTone(300, 'square', 0.08, 0.08); }
    playDrop() { this.playTone(80, 'sawtooth', 0.12, 0.1); }
    
    playClear() {
        if (!this.enabled || !this.ctx) return;
        [261, 329, 392, 523].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'square', 0.1, 0.1), i * 60);
        });
    }

    playGameOver() {
        if (!this.enabled || !this.ctx) return;
        [200, 150, 100, 50].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sawtooth', 0.2, 0.15), i * 120);
        });
    }
}

const audio = new RetroAudio();

/** --- CONSTANTS & CONFIG --- */
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const COLORS = [
    null,
    '#00f3ff', // I - Cyan
    '#0033ff', // J - Dark Blue
    '#ffaa00', // L - Orange
    '#ffe600', // O - Yellow
    '#00ff66', // S - Green
    '#cc00ff', // T - Purple
    '#ff0055'  // Z - Red/Pink
];

const SHAPES = [
    [],
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    [[2,0,0], [2,2,2], [0,0,0]],
    [[0,0,3], [3,3,3], [0,0,0]],
    [[4,4], [4,4]],
    [[0,5,5], [5,5,0], [0,0,0]],
    [[0,6,0], [6,6,6], [0,0,0]],
    [[7,7,0], [0,7,7], [0,0,0]]
];

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

    clearLines() {
        let linesCleared = 0;
        this.grid = this.grid.filter(row => {
            if (row.every(value => value > 0)) {
                linesCleared++;
                return false;
            }
            return true;
        });

        while (this.grid.length < ROWS) {
            this.grid.unshift(Array(COLS).fill(0));
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
                    this.drawRetroBlock(x, y, COLORS[value]);
                }
            });
        });
    }

    drawRetroBlock(x, y, color, opacity = 1) {
        this.ctx.globalAlpha = opacity;
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x * BLOCK_SIZE + 3, y * BLOCK_SIZE + 3, BLOCK_SIZE - 6, BLOCK_SIZE - 6);

        this.ctx.globalAlpha = 1;
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
                    board.drawRetroBlock(this.x + x, ghostY + y, this.color, 0.2);
                    board.drawRetroBlock(this.x + x, this.y + y, this.color, 1);
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
        
        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.startBtn = document.getElementById('start-btn');
        this.soundBtn = document.getElementById('sound-btn');
        
        this.bag = [];
        this.holdPieceId = null;
        this.canHold = true;

        this.initControls();
        this.startBtn.addEventListener('click', () => {
            audio.init();
            this.start();
        });

        this.soundBtn.addEventListener('click', () => {
            audio.enabled = !audio.enabled;
            this.soundBtn.innerText = `SOUND: ${audio.enabled ? 'ON' : 'OFF'}`;
        });

        this.loadHighScore();
        this.reset();
        this.board.draw();
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

    // Official 7-Bag Randomizer Algorithm
    getRandomPieceId() {
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
        this.isGameOver = false;
        this.isPaused = false;
        this.dropInterval = 1000;
        this.lastTime = 0;
        this.dropCounter = 0;

        this.bag = [];
        this.holdPieceId = null;
        this.canHold = true;

        this.updateStats();
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
            this.canHold = true; // Allow hold again after piece is locked
            
            const linesCleared = this.board.clearLines();
            
            if (linesCleared > 0) {
                audio.playClear();
                
                // Screen shake on 4-line Tetris clear!
                if (linesCleared === 4) {
                    const wrapper = document.getElementById('game-wrapper');
                    wrapper.classList.add('shake');
                    setTimeout(() => wrapper.classList.remove('shake'), 400);
                }

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
        this.score += lineScores[linesCleared] * this.level;
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

        if (this.dropCounter > this.dropInterval) {
            this.drop();
        }

        this.board.draw();
        this.piece.draw(this.board);

        this.animationId = requestAnimationFrame(this.update.bind(this));
    }

    initControls() {
        document.addEventListener('keydown', (event) => {
            if (this.isGameOver) return;

            if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyC", "ShiftLeft", "ShiftRight"].includes(event.code)) {
                event.preventDefault();
            }

            if (event.key.toLowerCase() === 'p') {
                this.pause();
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
                                                                                          