export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30;

export const COLORS = [
    null,
    '#00f3ff', // 1: I
    '#0033ff', // 2: J
    '#ffaa00', // 3: L
    '#ffe600', // 4: O
    '#00ff66', // 5: S
    '#cc00ff', // 6: T
    '#ff0055', // 7: Z
    '#ff2200'  // 8: BOMB BLOCK
];

export const SHAPES = [
    [],
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    [[2,0,0], [2,2,2], [0,0,0]],
    [[0,0,3], [3,3,3], [0,0,0]],
    [[4,4], [4,4]],
    [[0,5,5], [5,5,0], [0,0,0]],
    [[0,6,0], [6,6,6], [0,0,0]],
    [[7,7,0], [0,7,7], [0,0,0]],
    [[8]] // Bomb piece (1x1 block)
];