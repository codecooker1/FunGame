import {BLOCK_SIZE, COLORS, COLS, ROWS} from "../Config.js";
import audio from "../Audio.js";
import {Particle} from "../effects/Particle.js";

export class Board {
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
                            particles.push(new Particle(
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
                            particles.push(new Particle(
                                c * BLOCK_SIZE + Math.random() * BLOCK_SIZE,
                                r * BLOCK_SIZE + Math.random() * BLOCK_SIZE,
                                COLORS[this.grid[r][c]]
                            ));
                        }
                    }
                }
            }
        }

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