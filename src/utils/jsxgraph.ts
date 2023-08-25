import { Board, Point, Segment } from 'jsxgraph';

/**
 * Update board(s) after all operations to speed up the process
 */
export function batchUpdate(board: Board | Board[], callbackFn: () => void) {
    if (!Array.isArray(board)) board = [board];
    board = board as Board[];
    board.forEach((b) => b.suspendUpdate());
    callbackFn();
    board.forEach((b) => b.unsuspendUpdate());
}

/**
 * Returns endpoints of a line segment, ordered from left to right
 * @param line
 */
export function endpoints(line: Segment): [Point, Point] {
    return line.point1.coords.usrCoords[1] < line.point2.coords.usrCoords[1]
        ? [line.point1, line.point2]
        : [line.point2, line.point1];
}

/**
 * Returns the numerical horizontal range of a line segment
 */
export function hrange(seg: Segment) {
    const [lp, rp] = endpoints(seg);
    return {
        left: lp.coords.usrCoords[1],
        right: rp.coords.usrCoords[1],
        range: rp.coords.usrCoords[1] - lp.coords.usrCoords[1],
    };
}

/**
 * Returns -1, 0, 1 when the segment is to the left of, intersect with, or to the right of x
 */
export function horizontalRelation(line: Segment, x: number) {
    const { left, right } = hrange(line);
    if (x > right) return -1;
    else if (x < left) return 1;
    else return 0;
}
