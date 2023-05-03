import {Board, JSXGraph, Line, Point} from 'jsxgraph';

import {IntervalTree} from './intervaltree';

const TREE_XMIN = -10, TREE_XMAX = 10,
    TREE_YMIN = -10, TREE_YMAX = 10;
const NODE_SIZE = 0.5;

export class TreeBoard {
    board: Board;
    tree: IntervalTree;
    nodes: (Point | undefined)[] = []; // sparse list
    edges: (Line | undefined)[] = []; // sparse list, edge[i] connects nodes[i] and its parent

    constructor(name: string, segments: Line[]) {
        this.board = JSXGraph.initBoard(name, {
            boundingbox: [TREE_XMIN, TREE_YMAX, TREE_XMAX, TREE_YMIN],
            showCopyright: false,
            drag: {enabled: false}, pan: {enabled: true, needShift: false, needTwoFingers: false},
            zoom: {wheel: true, needShift: false}
        });
        this.tree = new IntervalTree(segments);
        this.drawTree();
    }

    drawTree() {
        const xrange = (TREE_XMAX - TREE_XMIN) * 0.95,
            xmin = TREE_XMIN + (TREE_XMAX - TREE_XMIN - xrange) / 2,
            yrange = (TREE_YMAX - TREE_YMIN) * 0.8,
            ymax = TREE_YMAX - (TREE_YMAX - TREE_YMIN - yrange) / 2,
            ystep = yrange / (this.tree.height - 1);

        for (let d = 0; d < this.tree.height; d++) {

            const y = ymax - d * ystep,
                numNodes = (1 << d),
                xstep = xrange / (numNodes + 1);

            for (let i = 0; i < numNodes; i++) {

                let idx = numNodes - 1 + i, coords = [xmin + xstep * (i + 1), y];

                if (this.tree.nodes[idx] !== undefined) {
                    this.nodes[idx] = this.board.create('point', coords, {
                        size: NODE_SIZE, sizeUnit: 'user', withLabel: false
                    });
                    // connect to parent node
                    if (idx > 0)
                        this.edges[idx] = this.board.create('line',
                            [this.nodes[idx], this.nodes[(idx - 1) >>> 1]],
                            {straightFirst: false, straightLast: false})
                }
            }
        }
    }
}