import { Board } from 'jsxgraph';

export function batchUpdate(board: Board | Board[], callbackFn: () => void) {
    if (!Array.isArray(board)) board = [board];
    board = board as Board[];
    board.forEach((b) => b.suspendUpdate());
    callbackFn();
    board.forEach((b) => b.unsuspendUpdate());
}

export function capitalize<T extends string>(s: T): Capitalize<T> {
    return s.charAt(0).toUpperCase() + s.slice(1) as Capitalize<T>
}
