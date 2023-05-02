import {Board, JSXGraph, Line, Point} from 'jsxgraph';

import {ListCoords, random} from './utils';

const PLOT_XMIN = -10, PLOT_XMAX = 10,
    PLOT_YMIN = -10, PLOT_YMAX = 10;

type SegmentListener = (p1: Readonly<Point>, p2: Readonly<Point>, l: Readonly<Line>) => void;

export class PlotBoard {
    board: Board;
    private acceptChanges: boolean = true; // prevents adding/changing segments
    private segments: Line[] = [];

    private newSegmentListeners: SegmentListener[] = [];

    private creatingLine?: { p1: Point, p2: Point, l: Line }; // line currently creating

    private startAddingSegmentFunction = (event: PointerEvent) => {
        if (this.board.getAllObjectsUnderMouse(event).length > 0) return;

        let coords = this.board.getUsrCoordsOfMouse(event);
        this.creatingLine = this.newSegment(coords, coords);
    };

    private moveEndpointWhenAddingFunction = (event: PointerEvent) => {
        if (this.creatingLine !== undefined) {
            const coords = this.board.getUsrCoordsOfMouse(event);
            this.creatingLine.p1.setPosition(JXG.COORDS_BY_USER,
                [this.creatingLine.p1.coords.usrCoords[1], coords[1]]);
            this.creatingLine.p2.setPosition(JXG.COORDS_BY_USER, coords);
            this.board.update();
        }
    };
    private releaseAddingSegmentFunction = () => {
        this.creatingLine = undefined;
    };

    constructor(name: string) {
        this.board = JSXGraph.initBoard(name, {
            boundingbox: [PLOT_XMIN, PLOT_YMAX, PLOT_XMAX, PLOT_YMIN],
            showCopyright: false,
            // navigation buttons can interfere with user inputs
            showNavigation: false,
            pan: {enabled: false},
            zoom: {wheel: false}
        });

        this.board.on('down', this.startAddingSegmentFunction);
        this.board.on('move', this.moveEndpointWhenAddingFunction);
        this.board.on('up', this.releaseAddingSegmentFunction);
    }

    stopAcceptingChanges() {
        this.acceptChanges = false;

        this.board.off('down', this.startAddingSegmentFunction);
        this.board.off('move', this.moveEndpointWhenAddingFunction);
        this.board.off('up', this.releaseAddingSegmentFunction);

        for (let obj of this.board.objectsList as any[])
            if (obj.getType() === 'line' || obj.getType() === 'point') obj.isDraggable = false;
    }

    newSegment(coords1: ListCoords, coords2: ListCoords) {
        if (!this.acceptChanges) throw new Error('Board is frozen, new segments are not accepted.');

        let p1 = this.board.create('point', coords1, {withLabel: false}),
            p2 = this.board.create('point', coords2, {withLabel: false}),
            l = this.board.create('line', [p1, p2], {straightFirst: false, straightLast: false});

        // make lines still horizontal when adjusting
        p1.on('drag', () =>
            p2.setPosition(JXG.COORDS_BY_USER, [p2.coords.usrCoords[1], p1.coords.usrCoords[2]])
        );
        p2.on('drag', () =>
            p1.setPosition(JXG.COORDS_BY_USER, [p1.coords.usrCoords[1], p2.coords.usrCoords[2]])
        );

        this.segments.push(l);

        for (let listener of this.newSegmentListeners)
            listener(p1, p2, l);
        return {p1: p1, p2: p2, l: l};
    }

    onNewSegment(listener: SegmentListener) {
        this.newSegmentListeners.push(listener);
    }

    getSegments() {
        return this.segments;
    }

    populateSegments(n: number) {
        const xrange = (PLOT_XMAX - PLOT_XMIN) * 0.95,
            xmin = PLOT_XMIN + (PLOT_XMAX - PLOT_XMIN - xrange) / 2,
            xmax = xmin + xrange,
            yrange = (PLOT_YMAX - PLOT_YMIN) * 0.9,
            ystep = yrange / (n - 1),
            ymin = PLOT_YMIN + (PLOT_YMAX - PLOT_YMIN - yrange) / 2,
            minlength = xrange * 0.04;

        for (let i = 0; i < n; i++) {
            let x1 = random(xmin, xmax - minlength),
                x2 = random(x1 + minlength, xmax),
                y = ymin + ystep * i;
            this.newSegment([x1, y], [x2, y]);
        }
    }
}