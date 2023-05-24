/**
 * Capitalize the first letter of a string
 */
export function capitalize<T extends string>(s: T): Capitalize<T> {
    return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<T>;
}

/**
 * A lazy function similar to Python's enumerate
 */
export function* enumerate<T>(iterable: Iterable<T>, start = 0) {
    let i = start;
    for (const elem of iterable) yield [i++, elem] as [number, T];
}

/**
 * A lazy function similar to Python's range
 */
export function range(start: number, stop: number, step: number): Generator<number, void>;
export function range(start: number, stop: number): Generator<number, void>;
export function range(stop: number): Generator<number, void>;
export function* range(...args: [number] | [number, number] | [number, number, number]): Generator<number, void> {
    switch (args.length) {
        case 1:
            for (let i = 0; i < args[0]; i++) yield i;
            return;
        case 2:
            for (let i = args[0]; i < args[1]; i++) yield i;
            return;
        case 3:
            for (let i = args[0]; i < args[1]; i += args[2]) yield i;
            return;
    }
}

/**
 * A lazy function similar to Python's zip
 * @param iter
 */
export function zip<T>(iter: Iterable<T>): Generator<[T], void>;
export function zip<T1, T2>(iter1: Iterable<T1>, iter2: Iterable<T2>): Generator<[T1, T2], void>;
export function zip<T1, T2, T3>(
    iter1: Iterable<T1>,
    iter2: Iterable<T2>,
    iter3: Iterable<T3>
): Generator<[T1, T2, T3], void>;
export function zip(...iterables: Iterable<unknown>[]): Generator<unknown[], void>;
/**
 * https://stackoverflow.com/questions/4856717#48293566
 */
export function* zip(...iterables: Iterable<unknown>[]) {
    const iterators = iterables.map((i) => i[Symbol.iterator]());
    while (true) {
        const results = iterators.map((i) => i.next());
        if (results.some((i) => i.done)) return;
        else yield results.map((i) => i.value);
    }
}

/**
 * A lazy function similar to Python's map.
 *
 * It accepts an iterable, so not to confuse it with JS's native map function.
 */
export function* imap<T, U>(iter: Iterable<T>, func: (x: T) => U) {
    for (const val of iter) yield func(val);
}

// prettier-ignore
const PALETTE = [
    '#bc0101',
    '#ffd700',
    '#ea5f94',
    '#ff7300',
    '#11b716',
    '#10d5a8',
    '#0000ff',
    '#9d02d7'
];

export function* palette() {
    for (let i = 0; ; i++) yield PALETTE[i % PALETTE.length];
}
