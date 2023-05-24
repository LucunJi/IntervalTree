import { Board, JSXGraph, Line, Point, Segment } from 'jsxgraph';

import { ArrayCoords, linspace, random, resizeRange } from '../utils/math';
import { LinkList } from 'js-sdsl';
import { BUS } from '../index';
import * as $ from 'jquery';
import { batchUpdate, hrange } from '../utils/jsxgraph';
import { enumerate, range } from '../utils/utils';

const PLOT_XMIN = -10,
    PLOT_XMAX = 10,
    PLOT_YMIN = -10,
    PLOT_YMAX = 10;
const QUERY_INIT = (PLOT_XMAX + PLOT_XMIN) / 2;

const SEGMENT_COLOR = '#0072b2',
    SEGMENT_ENDPOINT_COLOR = '#c25010',
    SEGMENT_ENDPOINT_SIZE = 3,
    SEGMENT_COLOR_FIXED = '#1f1f1f',
    SEGMENT_ENDPOINT_COLOR_FIXED = '#1f1f1f',
    SEGMENT_ENDPOINT_SIZE_FIXED = 1.5;

export type NewSegmentEvent = {
    p1: Readonly<Point>;
    p2: Readonly<Point>;
    l: Readonly<Line>;
};
export type QueryLineChangeEvent = number;

/**
 * Board for drawing and displaying segments,
 * together with the button for randomly populating segments.
 */
export class PlotBoard {
    board: Board;
    private populatingBtn;
    private setSortedEndRadios;

    private acceptChanges = true; // prevents adding/changing segments
    segments: Segment[] = [];

    private sortingEnd: 'left' | 'right' = 'left';

    private medians = new Map<number | string | symbol, { line: Line; relatedSegments: Segment[]; color: string }>();
    // medians visible on each segment (id)
    private segmentVisibleMedians = new Map<string, LinkList<number | string | symbol>>();

    private creatingLine?: { p1: Point; p2: Point; l: Line }; // line currently creating
    private queryLine: Line;

    private startAddingSegmentFunction = (event: PointerEvent) => {
        if (this.board.getAllObjectsUnderMouse(event).length > 0) return;

        const coords = this.board.getUsrCoordsOfMouse(event);
        this.creatingLine = this.newSegment(coords, coords);
    };

    private moveEndpointWhenAddingFunction = (event: PointerEvent) => {
        if (this.creatingLine !== undefined) {
            const coords = this.board.getUsrCoordsOfMouse(event);
            this.creatingLine.p1.setPosition(JXG.COORDS_BY_USER, [this.creatingLine.p1.coords.usrCoords[1], coords[1]]);
            this.creatingLine.p2.setPosition(JXG.COORDS_BY_USER, coords);
            this.board.update();
        }
    };
    private releaseAddingSegmentFunction = () => {
        this.creatingLine = undefined;
    };

    constructor(name: string) {
        this.populatingBtn = $('#populate :input');
        this.populatingBtn.prop('disabled', false);
        $('#populate').on('submit', (e) => {
            this.populateSegments(parseInt($('#populate-count').val() as string));
            e.preventDefault();
        });

        this.setSortedEndRadios = $('[name=sort-endpoint]')
            // events of changing sorted end are self-managed
            .each((_, ele) => {
                $(ele).on('change', (event) => this.setSortedEnd($(event.target).val() as 'left' | 'right'));
            })
            .prop('disabled', true); // make them initially disabled
        // synchronize initial value
        this.setSortedEnd($('[name=sort-endpoint]:checked').val() as 'left' | 'right');

        this.board = JSXGraph.initBoard(name, {
            boundingbox: [PLOT_XMIN, PLOT_YMAX, PLOT_XMAX, PLOT_YMIN],
            showCopyright: false,
            // navigation buttons can interfere with user inputs
            showNavigation: false,
            pan: { enabled: false },
            zoom: { wheel: false },
        });

        // events of creating segments are self-managed
        this.board.on('down', this.startAddingSegmentFunction);
        this.board.on('move', this.moveEndpointWhenAddingFunction);
        this.board.on('up', this.releaseAddingSegmentFunction);

        this.queryLine = this.board.create(
            'line',
            [
                [QUERY_INIT, 0],
                [QUERY_INIT, 1],
            ],
            {
                visible: false,
                fixed: false,
                strokeColor: '#000',
                dragToTopOfLayer: true,
                strokeOpacity: 0.5,
                strokeWidth: 3,
            }
        );
        this.queryLine.on('up', () => BUS.emit('queryLineChange', this.queryLine.point1.coords.usrCoords[1]));
    }

    private newSegment(coords1: ArrayCoords, coords2: ArrayCoords) {
        if (!this.acceptChanges) throw new Error('Board is frozen, new segments are not accepted.');

        const p1 = this.board.create('point', coords1, {
                withLabel: false,
                color: SEGMENT_ENDPOINT_COLOR,
                size: SEGMENT_ENDPOINT_SIZE,
            }),
            p2 = this.board.create('point', coords2, {
                withLabel: false,
                color: SEGMENT_ENDPOINT_COLOR,
                size: SEGMENT_ENDPOINT_SIZE,
            }),
            l = this.board.create('segment', [p1, p2], {
                strokeColor: SEGMENT_COLOR,
            });
        // make segments still horizontal when adjusting
        p1.on('drag', () => p2.setPosition(JXG.COORDS_BY_USER, [p2.coords.usrCoords[1], p1.coords.usrCoords[2]]));
        p2.on('drag', () => p1.setPosition(JXG.COORDS_BY_USER, [p1.coords.usrCoords[1], p2.coords.usrCoords[2]]));
        this.segments.push(l);
        this.segmentVisibleMedians.set(l.id, new LinkList());
        BUS.emit('newSegment', { p1, p2, l });
        return { p1, p2, l };
    }

    private sortSegments() {
        const segIndices = [...range(0, this.segments.length)];
        if (this.sortingEnd === 'left') {
            segIndices.sort((i, j) => hrange(this.segments[i]).left - hrange(this.segments[j]).left);
        } else {
            segIndices.sort((i, j) => hrange(this.segments[j]).right - hrange(this.segments[i]).right);
        }
        const [ymin, ymax] = resizeRange(PLOT_YMIN, PLOT_YMAX, 0.9);
        for (const [i, y] of enumerate(linspace(ymax, ymin, this.segments.length, false, false))) {
            const seg = this.segments[segIndices[i]];
            seg.point1.moveTo([seg.point1.coords.usrCoords[1], y], 400);
            seg.point2.moveTo([seg.point2.coords.usrCoords[1], y], 400);
        }
    }

    finalizeChanges() {
        if (!this.acceptChanges) return;
        this.acceptChanges = false;

        this.populatingBtn.prop('disabled', true);
        this.setSortedEndRadios.prop('disabled', false);

        this.board.off('down', this.startAddingSegmentFunction);
        this.board.off('move', this.moveEndpointWhenAddingFunction);
        this.board.off('up', this.releaseAddingSegmentFunction);

        batchUpdate(this.board, () => {
            for (let i = 0; i < this.segments.length; i++) {
                const seg = this.segments[i];
                seg.setAttribute({ strokeColor: SEGMENT_COLOR_FIXED, fixed: true });
                seg.point1.setAttribute({
                    color: SEGMENT_ENDPOINT_COLOR_FIXED,
                    fixed: true,
                    size: SEGMENT_ENDPOINT_SIZE_FIXED,
                });
                seg.point2.setAttribute({
                    color: SEGMENT_ENDPOINT_COLOR_FIXED,
                    fixed: true,
                    size: SEGMENT_ENDPOINT_SIZE_FIXED,
                });
            }
        });

        this.sortSegments();
    }

    private populateSegments(n: number) {
        const [xmin, xmax] = resizeRange(PLOT_XMIN, PLOT_XMAX, 0.95);
        const minlength = (xmax - xmin) * 0.04;
        const [ymin, ymax] = resizeRange(PLOT_YMIN, PLOT_YMAX, 0.9);

        for (const y of linspace(ymin, ymax, n, false, false)) {
            let x1: number, x2: number;
            do {
                x1 = random(xmin, xmax);
                x2 = random(xmin, xmax);
            } while (Math.abs(x1 - x2) < minlength);
            this.newSegment([x1, y], [x2, y]);
        }
    }

    addMedian(val: number, segments: Segment[], color: string, visible = false, key: number | string | symbol = val) {
        if (this.medians.has(key)) return false;
        const line: Line = this.board.create(
            'line',
            [
                [val, 0],
                [val, 1],
            ],
            { strokeColor: color, dash: 2, visible: false, fixed: true }
        );
        this.medians.set(key, { line, relatedSegments: segments, color: color });

        this.setMedianVisible(key, visible);
        return true;
    }

    removeMedian(key: number | string | symbol) {
        const median = this.medians.get(key);
        if (median === undefined) return false;
        this.setMedianVisible(key, false);
        this.board.removeObject(median.line);
        this.medians.delete(key);

        return true;
    }

    setMedianVisible(key: number | string | symbol, visible: boolean) {
        const median = this.medians.get(key);
        if (median === undefined || median.line.getAttribute('visible') === visible) return;

        median.line.setAttribute({ visible: visible });
        for (const seg of median.relatedSegments) {
            const newlist = this.segmentVisibleMedians.get(seg.id)!;

            if (visible) newlist.pushBack(key);
            else newlist.eraseElementByValue(key);

            let segColor = this.acceptChanges ? SEGMENT_COLOR : SEGMENT_COLOR_FIXED,
                endColor = this.acceptChanges ? SEGMENT_ENDPOINT_COLOR : SEGMENT_ENDPOINT_COLOR_FIXED;
            const lastMedian = newlist.back();
            if (lastMedian !== undefined) segColor = endColor = this.medians.get(lastMedian)!.color;

            seg.setAttribute({ strokeColor: segColor });
            seg.point1.setAttribute({ color: endColor });
            seg.point2.setAttribute({ color: endColor });
        }
    }

    private setSortedEnd(end: 'left' | 'right') {
        if (this.sortingEnd !== end) {
            this.sortingEnd = end;
            if (!this.acceptChanges) this.sortSegments();
        }
    }

    showQueryLine() {
        this.queryLine.setAttribute({ visible: true });
    }

    getQuery() {
        return this.queryLine.point1.coords.usrCoords[1];
    }
}
