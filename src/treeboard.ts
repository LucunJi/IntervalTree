import {Board, JSXGraph, Line} from 'jsxgraph';

import {IntervalTree} from './intervaltree';
import {BuildingTraverser, Traverser} from './traverser';
import {ListCoords} from './utils';

const TREE_XMIN = -10, TREE_XMAX = 10,
    TREE_YMIN = -10, TREE_YMAX = 10;

export class TreeBoard {
    board: Board;
    tree: IntervalTree;
    // nodePositions: ListCoords[][];
    // traverser: Traverser;

    constructor(name: string, segments: Line[]) {
        this.board = JSXGraph.initBoard(name, {
            boundingbox: [TREE_XMIN, TREE_YMAX, TREE_XMAX, TREE_YMIN],
            showCopyright: false
        });

        this.tree = new IntervalTree(segments);
    }

    // initialize(newState: AlgorithmState, oldState: AlgorithmState) {
            // let lines = this.plotboard.getSegments();
            // // precompute position of nodes
            // const xrange = (TREE_XMAX - TREE_XMIN) * 0.95,
            //     xmin = TREE_XMIN + (TREE_XMAX - TREE_XMIN - xrange) / 2,
            //     yrange = (TREE_YMAX - TREE_YMIN) * 0.8,
            //     ymax = TREE_YMAX - (TREE_YMAX - TREE_YMIN - yrange) / 2,
            //     ystep = yrange / (this.tree.height - 1);
            //
            // this.nodePositions = [];
            // for (let i = 0; i < this.tree.height; i++) {
            //     this.nodePositions.push([]);
            //     const y = ymax - i * ystep,
            //         xstep = xrange / ((1 << i) + 1);
            //     for (let j = 0; j < (1 << i); j++) {
            //         this.nodePositions[i].push([xmin + xstep * (j+1), y]);
            //     }
            // }
            //
            // this.traverser = new BuildingTraverser(this.tree);
            //
            // this.ready = true;
    // }
}