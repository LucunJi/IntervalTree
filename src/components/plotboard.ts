import { Board, JSXGraph, Line, Point, Segment } from 'jsxgraph';

import { ArrayCoords, hrange, random } from '../utils/math';
import { AbstractEventGenerator } from '../utils/patterns';

const PLOT_XMIN = -10,
    PLOT_XMAX = 10,
    PLOT_YMIN = -10,
    PLOT_YMAX = 10;

const SEGMENT_COLOR = '#0072b2',
    SEGMENT_ENDPOINT_COLOR = '#c25010',
    SEGMENT_COLOR_FIXED = '#1f1f1f',
    SEGMENT_ENDPOINT_COLOR_FIXED = '#1f1f1f';

type NewSegmentEvent = {
    p1: Readonly<Point>;
    p2: Readonly<Point>;
    l: Readonly<Line>;
};
type QueryLineChangeEvent = number;

type Events = {
    newSegment: NewSegmentEvent;
    queryLineChange: QueryLineChangeEvent;
};

export class PlotBoard extends AbstractEventGenerator<Events> {
    board: Board;
    private acceptChanges = true; // prevents adding/changing segments
    private segments: Segment[] = [];

    private sortingEnd: 'left' | 'right' = 'left';

    private medians: {
        [key: number | string | symbol]: { line: Line; relatedSegments: Segment[]; color: string };
    } = {};
    // medians visible on each segment (id)
    private segmentVisibleMedians: { [key: string]: (number | string | symbol)[] } = {};

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
        super();

        this.board = JSXGraph.initBoard(name, {
            boundingbox: [PLOT_XMIN, PLOT_YMAX, PLOT_XMAX, PLOT_YMIN],
            showCopyright: false,
            // navigation buttons can interfere with user inputs
            showNavigation: false,
            pan: { enabled: false },
            zoom: { wheel: false },
        });

        this.board.on('down', this.startAddingSegmentFunction);
        this.board.on('move', this.moveEndpointWhenAddingFunction);
        this.board.on('up', this.releaseAddingSegmentFunction);

        const initX = (PLOT_XMAX + PLOT_XMIN) / 2;
        this.queryLine = this.board.create(
            'line',
            [
                [initX, 0],
                [initX, 1],
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
        this.queryLine.on('up', () => this.notify('queryLineChange', this.queryLine.point1.coords.usrCoords[1]));
    }

    private newSegment(coords1: ArrayCoords, coords2: ArrayCoords) {
        if (!this.acceptChanges) throw new Error('Board is frozen, new segments are not accepted.');

        const p1 = this.board.create('point', coords1, {
                withLabel: false,
                color: SEGMENT_ENDPOINT_COLOR,
            }),
            p2 = this.board.create('point', coords2, {
                withLabel: false,
                color: SEGMENT_ENDPOINT_COLOR,
            }),
            l = this.board.create('segment', [p1, p2], {
                strokeColor: SEGMENT_COLOR,
            });
        // make segments still horizontal when adjusting
        p1.on('drag', () => p2.setPosition(JXG.COORDS_BY_USER, [p2.coords.usrCoords[1], p1.coords.usrCoords[2]]));
        p2.on('drag', () => p1.setPosition(JXG.COORDS_BY_USER, [p1.coords.usrCoords[1], p2.coords.usrCoords[2]]));
        this.segments.push(l);
        this.segmentVisibleMedians[l.id] = [];
        this.notify('newSegment', { p1, p2, l });
        return { p1: p1, p2: p2, l: l };
    }

    private sortSegments() {
        if (this.segments.length === 1) {
            const seg = this.segments[0],
                y = (PLOT_YMAX + PLOT_YMIN) / 2;
            seg.point1.moveTo([seg.point1.coords.usrCoords[1], y], 400);
            seg.point2.moveTo([seg.point2.coords.usrCoords[1], y], 400);
            return;
        }

        const segIndices = [],
            segOrder = [];
        for (let i = 0; i < this.segments.length; i++) segIndices.push(i);
        if (this.sortingEnd === 'left') {
            segIndices.sort((i, j) => hrange(this.segments[i]).left - hrange(this.segments[j]).left);
        } else {
            segIndices.sort((i, j) => hrange(this.segments[j]).right - hrange(this.segments[i]).right);
        }
        for (let i = 0; i < this.segments.length; i++) segOrder[segIndices[i]] = i;

        const yrange = (PLOT_YMAX - PLOT_YMIN) * 0.9,
            ystep = yrange / (this.segments.length - 1),
            ymin = PLOT_YMIN + (PLOT_YMAX - PLOT_YMIN - yrange) / 2,
            ymax = ymin + yrange;

        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            const y = ymax - ystep * segOrder[i];
            seg.point1.moveTo([seg.point1.coords.usrCoords[1], y], 400);
            seg.point2.moveTo([seg.point2.coords.usrCoords[1], y], 400);
        }
    }

    finalizeChanges() {
        if (!this.acceptChanges) return;
        this.acceptChanges = false;

        this.board.off('down', this.startAddingSegmentFunction);
        this.board.off('move', this.moveEndpointWhenAddingFunction);
        this.board.off('up', this.releaseAddingSegmentFunction);

        this.board.suspendUpdate();
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            seg.setAttribute({ strokeColor: SEGMENT_COLOR_FIXED, fixed: true });
            seg.point1.setAttribute({
                color: SEGMENT_ENDPOINT_COLOR_FIXED,
                fixed: true,
            });
            seg.point2.setAttribute({
                color: SEGMENT_ENDPOINT_COLOR_FIXED,
                fixed: true,
            });
        }
        this.board.unsuspendUpdate();

        this.sortSegments();
    }

    getSegments() {
        return this.segments;
    }

    populateSegments(n: number) {
        const xrange = (PLOT_XMAX - PLOT_XMIN) * 0.95,
            xmin = PLOT_XMIN + (PLOT_XMAX - PLOT_XMIN - xrange) / 2,
            xmax = xmin + xrange,
            minlength = xrange * 0.04;

        if (n === 1) {
            const y = (PLOT_YMAX + PLOT_YMIN) / 2;
            let x1: number, x2: number;
            do {
                x1 = random(xmin, xmax);
                x2 = random(xmin, xmax);
            } while (Math.abs(x1 - x2) < minlength);
            this.newSegment([x1, y], [x2, y]);
            return;
        }

        const yrange = (PLOT_YMAX - PLOT_YMIN) * 0.9,
            ystep = yrange / (n - 1),
            ymin = PLOT_YMIN + (PLOT_YMAX - PLOT_YMIN - yrange) / 2;

        for (let i = 0; i < n; i++) {
            const y = ymin + ystep * i;
            let x1: number, x2: number;
            do {
                x1 = random(xmin, xmax);
                x2 = random(xmin, xmax);
            } while (Math.abs(x1 - x2) < minlength);
            this.newSegment([x1, y], [x2, y]);
        }
    }

    addMedian(val: number, segments: Segment[], color: string, visible = false, key: number | string | symbol = val) {
        if (this.medians[key] !== undefined) return false;
        this.medians[key] = {
            line: this.board.create(
                'line',
                [
                    [val, 0],
                    [val, 1],
                ],
                {
                    strokeColor: color,
                    dash: 2,
                    visible: false,
                    fixed: true,
                }
            ),
            relatedSegments: segments,
            color: color,
        };
        this.setMedianVisible(key, visible);
        return true;
    }

    removeMedian(key: number | string | symbol) {
        if (this.medians[key] === undefined) return false;
        this.setMedianVisible(key, false);
        this.board.removeObject(this.medians[key].line);
        delete this.medians[key];
        return true;
    }

    setMedianVisible(key: number | string | symbol, visible: boolean) {
        const median = this.medians[key];
        if (median === undefined || this.medians[key].line.getAttribute('visible') === visible) return;

        this.board.suspendUpdate();
        median.line.setAttribute({ visible: visible });
        for (const seg of median.relatedSegments) {
            if (visible) this.segmentVisibleMedians[seg.id].push(key);
            else this.segmentVisibleMedians[seg.id] = this.segmentVisibleMedians[seg.id].filter((val) => val !== key);

            const newlist = this.segmentVisibleMedians[seg.id];
            let segColor = this.acceptChanges ? SEGMENT_COLOR : SEGMENT_COLOR_FIXED,
                endColor = this.acceptChanges ? SEGMENT_ENDPOINT_COLOR : SEGMENT_ENDPOINT_COLOR_FIXED;
            if (newlist.length > 0) segColor = endColor = this.medians[newlist[newlist.length - 1]].color;

            seg.setAttribute({ strokeColor: segColor });
            seg.point1.setAttribute({ color: endColor });
            seg.point2.setAttribute({ color: endColor });
        }
        this.board.unsuspendUpdate();
    }

    setSortingEnd(end: 'left' | 'right') {
        if (this.sortingEnd !== end) {
            this.sortingEnd = end;
            if (!this.acceptChanges) this.sortSegments();
        }
    }

    showQueryLine() {
        this.queryLine.setAttribute({ visible: true });
        this.notify('queryLineChange', this.queryLine.point1.coords.usrCoords[1]);
    }
}
