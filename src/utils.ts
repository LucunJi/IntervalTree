import { Line, Segment } from 'jsxgraph';

export type ArrayCoords = [number, number];

// a small number to fix inaccuracy of floating point arithmetic
export const EPSILON = 1e-12;

export type EventListener<Event> = (e: Readonly<Event>) => void;

/**
 * a random floating point number in a range
 */
export function random(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export function endpoints(line: Line) {
    return line.point1.coords.usrCoords[1] < line.point2.coords.usrCoords[1]
        ? { left: line.point1, right: line.point2 }
        : { left: line.point2, right: line.point1 };
}

export function hrange(seg: Segment) {
    const ends = endpoints(seg);
    return {
        left: ends.left.coords.usrCoords[1],
        right: ends.right.coords.usrCoords[1],
        range: ends.right.coords.usrCoords[1] - ends.left.coords.usrCoords[1],
    };
}

/**
 * Returns -1, 0, 1 when line is to the left of, intersect with, or to the right of x
 */
export function horizontalRelation(line: Line, x: number) {
    const ps = endpoints(line),
        x1 = ps.left.coords.usrCoords[1],
        x2 = ps.right.coords.usrCoords[1];
    if (x > x2) return -1;
    else if (x < x1) return 1;
    else return 0;
}

export class Palette {
    private static readonly PALETTE: string[] = [
        '#bc0101',
        '#ffd700',
        '#ea5f94',
        '#ff7300',
        '#11b716',
        '#10d5a8',
        '#0000ff',
        '#9d02d7',
    ];
    private paletteIdx = 0;

    get() {
        const ret = Palette.PALETTE[this.paletteIdx % Palette.PALETTE.length];
        this.paletteIdx++;
        return ret;
    }
}
