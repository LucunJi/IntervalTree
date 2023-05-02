import {Board, JSXGraph} from 'jsxgraph';

import {AlgorithmState, StateManager} from './statemanager';
import {IntervalTree} from './intervaltree';
import {PlotBoard} from './plotboard';

const TREE_XMIN = -10, TREE_XMAX = 10,
    TREE_YMIN = -10, TREE_YMAX = 10;
export class TreeBoard {
    board: Board;
    tree?: IntervalTree;

    constructor(name: string,
                private readonly plotboard: PlotBoard,
                private readonly algoState: StateManager) {
        this.board = JSXGraph.initBoard(name, {
            boundingbox: [TREE_XMIN, TREE_YMAX, TREE_XMAX, TREE_YMIN],
            showCopyright: false
        })

        this.algoState.addListener((newState, oldState) =>
            this.onStateUpdate(newState, oldState));
    }

    onStateUpdate(newState: AlgorithmState, oldState: AlgorithmState) {
        if (oldState === 'add') {
            let lines = this.plotboard.getLines();
            this.tree = new IntervalTree(lines);
        }
    }
}