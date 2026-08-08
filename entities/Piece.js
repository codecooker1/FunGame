import {COLORS, COLS, SHAPES} from "../Config.js";

export class Piece {
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