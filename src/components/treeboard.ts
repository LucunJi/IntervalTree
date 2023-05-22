import { Board, JSXGraph, Line, Point, Segment } from 'jsxgraph';

import { IntervalTree, TreeNode } from '../model/intervaltree';
import { AbstractEventGenerator } from '../utils/patterns';
import { Palette } from '../utils/palette';

const TREE_XMIN = -10,
    TREE_XMAX = 10,
    TREE_YMIN = -10,
    TREE_YMAX = 10;
const NODE_SIZE = 0.5;

type SimulationMode = 'build' | 'query';
type HoverNodeEvent = { node?: TreeNode; prevNode?: TreeNode };
type Events = {
    hoverNode: HoverNodeEvent;
};

export class TreeBoard extends AbstractEventGenerator<Events> {
    board: Board;
    tree: IntervalTree;
    nodes: (Point | undefined)[] = []; // sparse list
    edges: (Line | undefined)[] = []; // sparse list, edge[i] connects nodes[i] and its parent
    queryLocation?: number;

    private simulationMode: SimulationMode = 'build';
    private currNode: TreeNode;
    private prevNode?: TreeNode;
    private focusedNode?: TreeNode;

    private hoveringNode?: TreeNode;

    constructor(name: string, segments: Segment[]) {
        super();

        this.board = JSXGraph.initBoard(name, {
            boundingbox: [TREE_XMIN, TREE_YMAX, TREE_XMAX, TREE_YMIN],
            showCopyright: false,
            drag: { enabled: false },
            pan: { enabled: true, needShift: false, needTwoFingers: false },
            zoom: { wheel: true, needShift: false },
        });
        this.tree = new IntervalTree(segments);
        this.drawTree();

        this.initSimulation();

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
                this.notify('hoverNode', { node: this.hoveringNode, prevNode: prevHovering });
            }
        });
    }

    private drawTree() {
        if (this.tree.height === 1) {
            const coords = [(TREE_XMAX + TREE_XMIN) / 2, (TREE_YMAX + TREE_YMIN) / 2];
            this.nodes[0] = this.board.create('point', coords, {
                size: NODE_SIZE,
                sizeUnit: 'user',
                withLabel: false,
                strokeWidth: 4,
                color: new Palette().get(),
            }) as Point;
            return;
        }

        const xrange = (TREE_XMAX - TREE_XMIN) * 0.95,
            xmin = TREE_XMIN + (TREE_XMAX - TREE_XMIN - xrange) / 2,
            yrange = (TREE_YMAX - TREE_YMIN) * 0.8,
            ymax = TREE_YMAX - (TREE_YMAX - TREE_YMIN - yrange) / 2,
            ystep = yrange / (this.tree.height - 1);

        const nodesIdxSorted = this.tree.nodes
            .map((n, i) => (n === undefined ? undefined : i))
            .filter((i) => i !== undefined)
            .sort((i, j) => this.tree.nodes[i!]!.median - this.tree.nodes[j!]!.median) as number[];
        const nodeColors: (string | undefined)[] = [],
            palette = new Palette();
        for (const i of nodesIdxSorted) nodeColors[i] = palette.get();

        for (let d = 0; d < this.tree.height; d++) {
            const y = ymax - d * ystep;
            const numNodes = 1 << d;
            const xstep = xrange / (numNodes + 1);

            for (let i = 0; i < numNodes; i++) {
                const idx = numNodes - 1 + i,
                    coords = [xmin + xstep * (i + 1), y];

                if (this.tree.nodes[idx] !== undefined) {
                    this.nodes[idx] = this.board.create('point', coords, {
                        size: NODE_SIZE,
                        sizeUnit: 'user',
                        withLabel: false,
                        strokeWidth: 4,
                        color: nodeColors[idx],
                    });
                    // connect to parent node
                    if (idx > 0)
                        this.edges[idx] = this.board.create('line', [this.nodes[idx], this.nodes[(idx - 1) >>> 1]], {
                            straightFirst: false,
                            straightLast: false,
                        });
                }
            }
        }
    }

    private initSimulation() {
        if (this.simulationMode === 'build') {
            this.setNodeAncestorsVisible(this.tree.root, true);
            this.setChildrenVisible(this.tree.root, false);

            this.prevNode = undefined;
            this.currNode = this.tree.root;
            this.focusNode(this.currNode);
        } else if (this.simulationMode === 'query') {
            this.setSubtreeVisible(this.tree.root, true);
        }
    }

    setNodeVisible(node: TreeNode, visible: boolean) {
        const idx = (1 << node.depth) - 1 + node.peerIdx;
        this.nodes[idx]?.setAttribute({ visible: visible });
        this.edges[idx]?.setAttribute({ visible: visible });
    }

    setNodeAncestorsVisible(node: TreeNode | undefined, visible: boolean) {
        while (node !== undefined) {
            const idx = (1 << node.depth) - 1 + node.peerIdx;
            this.nodes[idx]?.setAttribute({ visible: visible });
            this.edges[idx]?.setAttribute({ visible: visible });
            node = node.parent;
        }
    }

    setChildrenVisible(node: TreeNode | undefined, visible: boolean) {
        this.setSubtreeVisible(node?.childLeft, visible);
        this.setSubtreeVisible(node?.childRight, visible);
    }

    setSubtreeVisible(node: TreeNode | undefined, visible: boolean) {
        if (node === undefined) return;

        const idx = (1 << node.depth) - 1 + node.peerIdx;
        this.nodes[idx]?.setAttribute({ visible: visible });
        this.edges[idx]?.setAttribute({ visible: visible });

        this.setSubtreeVisible(node.childLeft, visible);
        this.setSubtreeVisible(node.childRight, visible);
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

    setSimulationMode(mode: SimulationMode) {
        if (mode === this.simulationMode) return;
        this.simulationMode = mode;
        this.initSimulation();
    }

    getMode() {
        return this.simulationMode;
    }
}
