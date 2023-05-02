import {Board, Line} from 'jsxgraph';

export type ListCoords = [number, number];


// a small number to fix inaccuracy of floating point arithmetic
export const EPSILON = 1e-12;

/**
 * a random floating point number in a range
 */
export function random(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export function getPointsOrdered(line: Line | any) {
    let names = line.getParents();
    let p1 = line.ancestors[names[0]],
        p2 = line.ancestors[names[1]];
    return p1.coords.usrCoords[1] < p2.coords.usrCoords[1] ?
        [p1, p2] : [p2, p1];
}

/**
 * Returns -1, 0, 1 when line is to the left of, intersect with, or to the right of x
 */
export function horizontalRelation(line: Line, x: number) {
    let ps = getPointsOrdered(line),
        x1 = ps[0].coords.usrCoords[1],
        x2 = ps[1].coords.usrCoords[1];
    if (x > x2) return -1;
    else if (x < x1) return 1;
    else return 0;
}
