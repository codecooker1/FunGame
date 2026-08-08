import audio from '../Audio.js';

export default class Input {
    constructor(game) {
        this.game = game;
        this.initControls();
    }

    initControls(){

        document.addEventListener('keydown', (event) => {
            if(this.game.isGameOver) return;

            if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyC", "KeyF", "ShiftLeft", "ShiftRight"].includes(event.code)) {
                event.preventDefault();
            }

            if (event.key.toLowerCase() === 'p'){
                this.game.pause();
                return;
            }

            if (event.key.toLowerCase() === 'f'){
                this.game.activateFever();
                return;
            }

            if (event.key.toLowerCase() === 'c' || event.key === 'Shift'){
                this.game.hold();
                return;
            }

            if (this.game.isPaused) return;

            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    if (this.game.piece.rotate(this.game.board)) audio.playRotate();
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    if (this.game.piece.move(this.game.board, 0, 1)) audio.playMove();
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    if (this.game.piece.move(this.game.board, -1, 0)) audio.playMove();
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    if (this.game.piece.move(this.game.board, 1, 0)) audio.playMove();
                    break;
                case 'Space':
                    this.game.piece.hardDrop(this.game.board);
                    this.game.drop();
                    break;

            }

        })


    }
}

