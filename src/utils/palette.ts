/**
 * A round-robin color Palette with a set of pre-defined colors
 */
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
