import { Board, JSXGraph, Line, Point } from 'jsxgraph';

import { IntervalTree, TreeNode } from '../model/intervaltree';
import { linspace, resizeRange } from '../utils/math';
import { BUS } from '../index';
import { enumerate } from '../utils/utils';

const TREE_XMIN = -10,
    TREE_XMAX = 10,
    TREE_YMIN = -10,
    TREE_YMAX = 10;
const NODE_SIZE = 0.5;

export type HoverNodeEvent = { node?: TreeNode; prevNode?: TreeNode };

export class TreeBoard {
    board: Board;
    private tree: IntervalTree;
    nodes: (Point | undefined)[] = []; // sparse list
    edges: (Line | undefined)[] = []; // sparse list, edge[i] connects nodes[i] and its parent

    private focusedNode?: TreeNode;

    private hoveringNode?: TreeNode;

    constructor(name: string, tree: IntervalTree, colorCoding: Map<number, string>) {
        this.board = JSXGraph.initBoard(name, {
            boundingbox: [TREE_XMIN, TREE_YMAX, TREE_XMAX, TREE_YMIN],
            showCopyright: false,
            drag: { enabled: false },
            pan: { enabled: true, needShift: false, needTwoFingers: false },
            zoom: { wheel: true, needShift: false },
        });
        this.tree = tree;
        this.drawTree(colorCoding);
        this.focusNode(tree.root);

        this.board.on('move', () => {
            const prevHovering = this.hoveringNode;
            this.hoveringNode = undefined;
            for (let i = 0; i < this.nodes.length; i++) {
                const v = this.nodes[i];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (v !== undefined && (v as any).mouseover) {
                    this.hoveringNode = this.tree.nodes[i];
                    break;
                }
            }
            if (this.hoveringNode !== prevHovering) {
                BUS.emit('mouseOverNode', { node: this.hoveringNode, prevNode: prevHovering });
            }
        });
    }

    /**
     * Draw the tree layer by layer, without making it visible
     */
    private drawTree(colorCoding: Map<number, string>) {
        const [xmin, xmax] = resizeRange(TREE_XMIN, TREE_XMAX, 0.95);
        const [ymin, ymax] = resizeRange(TREE_YMIN, TREE_YMAX, 0.8);
        for (const [d, y] of enumerate(linspace(ymax, ymin, this.tree.height, false, false))) {
            const numNodes = 1 << d;
            for (const [i, x] of enumerate(linspace(xmin, xmax, numNodes, false, false))) {
                const idx = numNodes - 1 + i;
                if (this.tree.nodes[idx] !== undefined) {
                    this.nodes[idx] = this.board.create('point', [x, y], {
                        size: NODE_SIZE,
                        sizeUnit: 'user',
                        withLabel: false,
                        strokeWidth: 4,
                        color: colorCoding.get(this.tree.nodes[idx]!.median),
                        visible: idx === 0, // the root is initially visible
                    });
                    // connect to parent node
                    if (idx > 0)
                        this.edges[idx] = this.board.create('line', [this.nodes[idx], this.nodes[(idx - 1) >>> 1]], {
                            straightFirst: false,
                            straightLast: false,
                            visible: false, // all edges are not initially visible
                        });
                }
            }
        }
    }

    setNodeVisible(node: TreeNode, visible: boolean) {
        const idx = (1 << node.depth) - 1 + node.peerIdx;
        this.nodes[idx]?.setAttribute({ visible: visible });
        this.edges[idx]?.setAttribute({ visible: visible });
    }

    private setNodeHollow(node: TreeNode | undefined, hollow: boolean) {
        if (node === undefined) return;
        this.graphNode(node)?.setAttribute({ fillOpacity: hollow ? 0 : 1 });
    }

    focusNode(node: TreeNode | undefined) {
        this.setNodeHollow(this.focusedNode, false);
        this.setNodeHollow((this.focusedNode = node), true);
    }

    graphNode(node: TreeNode) {
        return this.nodes[(1 << node.depth) - 1 + node.peerIdx];
    }
}
