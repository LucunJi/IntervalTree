import {Board, JSXGraph, Line, Point} from 'jsxgraph';

import {ListCoords, random} from './utils';
import {AlgorithmState, StateManager} from './statemanager';

const PLOT_XMIN = -10, PLOT_XMAX = 10,
    PLOT_YMIN = -10, PLOT_YMAX = 10;

type SegmentListener = (p1: Point, p2: Point, l: Line) => void;

export class PlotBoard {
    board: Board;
    creatingLine?: { p1: Point, p2: Point, l: Line };
    newSegmentListener: SegmentListener[] = []

    constructor(name: string,
                private readonly algoState: StateManager) {
        this.board = JSXGraph.initBoard(name, {
            boundingbox: [PLOT_XMIN, PLOT_YMAX, PLOT_XMAX, PLOT_YMIN],
            showCopyright: false,
            // navigation buttons can interfere with user inputs
            showNavigation: false,
            pan: {enabled: false},
            zoom: {wheel: false}
        });

        this.board.on('down', event => this.addSegment(event));
        this.board.on('move', event => this.moveEndpointWhenAdding(event));
        this.board.on('up', () => this.finishAddSegment());

        this.algoState.addListener((newState, oldState) =>
            this.onStateUpdate(newState, oldState));
    }

    private onStateUpdate(newState: AlgorithmState, oldState: AlgorithmState) {
        if (newState !== 'add') {
            for (let obj of this.board.objectsList as any[])
                if (obj.getType() === 'line' || obj.getType() === 'point') obj.isDraggable = false;
        }
    }

    addNewSegmentListener(listener: SegmentListener) {
        this.newSegmentListener.push(listener);
    }

    getLines() {
        let lines = [];
        for (let obj of this.board.objectsList as any[])
            if (obj.getType() === 'line') lines.push(obj);
        return lines;
    }

    newSegment(coords1: ListCoords, coords2: ListCoords) {
        let p1 = this.board.create('point', coords1, {withLabel: false}),
            p2 = this.board.create('point', coords2, {withLabel: false}),
            l = this.board.create('line', [p1, p2], {straightFirst: false, straightLast: false});
        for (let listener of this.newSegmentListener)
            listener(p1, p2, l);
        return {p1: p1, p2: p2, l: l};
    }

    /**
     * create a line by dragging
     */
    addSegment(event: PointerEvent) {
        if (!this.algoState.isAdding()) return;

        if (this.board.getAllObjectsUnderMouse(event).length > 0) return;

        let coords = this.board.getUsrCoordsOfMouse(event);
        this.creatingLine = this.newSegment(coords, coords);
        let p1 = this.creatingLine.p1, p2 = this.creatingLine.p2;

        // make lines still horizontal after adjusting
        p1.on('drag', () =>
            p2.setPosition(JXG.COORDS_BY_USER, [p2.coords.usrCoords[1], p1.coords.usrCoords[2]])
        );
        p2.on('drag', () =>
            p1.setPosition(JXG.COORDS_BY_USER, [p1.coords.usrCoords[1], p2.coords.usrCoords[2]])
        );
    }

    finishAddSegment() {
        if (!this.algoState.isAdding()) return;

        this.creatingLine = undefined;
    }

    /**
     * handle dragging when creating a line
     */
    moveEndpointWhenAdding(event: PointerEvent) {
        if (!this.algoState.isAdding()) return;

        if (this.creatingLine !== undefined) {
            const coords = this.board.getUsrCoordsOfMouse(event);
            this.creatingLine.p1.setPosition(JXG.COORDS_BY_USER,
                [this.creatingLine.p1.coords.usrCoords[1], coords[1]]);
            this.creatingLine.p2.setPosition(JXG.COORDS_BY_USER, coords);
            this.board.update();
        }
    }

    generateSegments(n: number) {
        const xrange = (PLOT_XMAX - PLOT_XMIN) * 0.95,
            xmin = PLOT_XMIN + (PLOT_XMAX - PLOT_XMIN - xrange) / 2,
            xmax = xmin + xrange,
            yrange = (PLOT_YMAX - PLOT_YMIN) * 0.95,
            ystep = yrange / n,
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