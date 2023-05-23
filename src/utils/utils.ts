import { Board } from 'jsxgraph';

export function batchUpdate(board: Board | Board[], callbackFn: () => void) {
    if (!Array.isArray(board)) board = [board];
    board = board as Board[];
    board.forEach((b) => b.suspendUpdate());
    callbackFn();
    board.forEach((b) => b.unsuspendUpdate());
}
