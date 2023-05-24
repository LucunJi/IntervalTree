export type ArrayCoords = [number, number];

/**
 * a small number to fix inaccuracy of floating point arithmetic
 */
export const EPSILON = 1e-12;

/**
 * a random floating point number in a range
 */
export function random(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

/**
 * Similar to the function in Numpy with the same name
 */
export function linspace(start: number, stop: number, num: number, startpoint = true, endpoint = true): number[] {
    if (num === 0) return [];
    if (num === 1) return [startpoint ? start : endpoint ? stop : (start + stop) / 2];
    const step = (stop - start) / (endpoint && startpoint ? num - 1 : endpoint || startpoint ? num : num + 1);
    const ret: number[] = [];
    let val = startpoint ? start : start + step;
    for (let i = 0; i < num; i++) {
        ret.push(val);
        val += step;
    }
    return ret;
}

/**
 * Resize a range by a factor
 */
export function resizeRange(lower: number, upper: number, factor: number): [number, number] {
    const range = (upper - lower) * factor;
    const u = upper - (upper - lower - range) / 2;
    return [u - range, u];
}
