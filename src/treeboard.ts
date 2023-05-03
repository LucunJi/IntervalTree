import {Board, JSXGraph, Line, palette, Point, Segment} from 'jsxgraph';

import {IntervalTree, TreeNode} from './intervaltree';
import {EventListener, Palette} from './utils';
import * as inspector from 'inspector';
import {cssNumber} from 'jquery';

const TREE_XMIN = -10, TREE_XMAX = 10,
    TREE_YMIN = -10, TREE_YMAX = 10;
const NODE_SIZE = 0.5;

type SimulationMode = 'build' | 'query';
type HoverNodeEvent = { node?: TreeNode, prevNode?: TreeNode };

export class TreeBoard {
    board: Board;
    tree: IntervalTree;
    nodes: (Point | undefined)[] = []; // sparse list
    edges: (Line | undefined)[] = []; // sparse list, edge[i] connects nodes[i] and its parent

    private simulationMode: SimulationMode = 'build';
    private currNode: TreeNode;
    private prevNode?: TreeNode;
    private focusedNode?: TreeNode;

    private hoveringNode?: TreeNode;

    private hoverNodeEventListeners: EventListener<HoverNodeEvent>[] = [];
    private recursionUpdateListeners: EventListener<void>[] = [];

    constructor(name: string, segments: Segment[]) {
        this.board = JSXGraph.initBoard(name, {
            boundingbox: [TREE_XMIN, TREE_YMAX, TREE_XMAX, TREE_YMIN],
            showCopyright: false,
            drag: {enabled: false}, pan: {enabled: true, needShift: false, needTwoFingers: false},
            zoom: {wheel: true, needShift: false}
        });
        this.tree = new IntervalTree(segments);
        this.drawTree();

        this.initSimulation();

        this.board.on('move', event => {
            let prevHovering = this.hoveringNode;
            this.hoveringNode = undefined;
            let idx = undefined;
            for (let i = 0; i < this.nodes.length; i++) {
                let v = this.nodes[i];
                if (v !== undefined && (v as any).mouseover) {
                    this.hoveringNode = this.tree.nodes[i];
                    idx = i;
                    break;
                }
            }
            if (this.hoveringNode !== prevHovering) {
                this.notifyHoverNodeEvent({node: this.hoveringNode, prevNode: prevHovering});
            }
        });
    }


    private drawTree() {
        const xrange = (TREE_XMAX - TREE_XMIN) * 0.95,
            xmin = TREE_XMIN + (TREE_XMAX - TREE_XMIN - xrange) / 2,
            yrange = (TREE_YMAX - TREE_YMIN) * 0.8,
            ymax = TREE_YMAX - (TREE_YMAX - TREE_YMIN - yrange) / 2,
            ystep = yrange / (this.tree.height - 1);

        let nodesIdxSorted = this.tree.nodes
            .map((n, i) => n === undefined ? undefined : i)
            .filter(i => i !== undefined)
            .sort((i, j) =>
                this.tree.nodes[i!]!.median - this.tree.nodes[j!]!.median) as number[];
        let nodeColors: (string | undefined)[] = [], palette = new Palette();
        for (let i of nodesIdxSorted) nodeColors[i] = palette.get();

        for (let d = 0; d < this.tree.height; d++) {

            const y = ymax - d * ystep,
                numNodes = (1 << d),
                xstep = xrange / (numNodes + 1);

            for (let i = 0; i < numNodes; i++) {

                let idx = numNodes - 1 + i, coords = [xmin + xstep * (i + 1), y];

                if (this.tree.nodes[idx] !== undefined) {
                    this.nodes[idx] = this.board.create('point', coords, {
                        size: NODE_SIZE, sizeUnit: 'user', withLabel: false, strokeWidth: 4,
                        color: nodeColors[idx]
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
        this.notifyRecursionUpdate();
    }

    private setNodeAncestorsVisible(node: TreeNode | undefined, visible: boolean) {
        while (node !== undefined) {
            let idx = (1 << node.depth) - 1 + node.peerIdx;
            this.nodes[idx]?.setAttribute({visible: visible});
            this.edges[idx]?.setAttribute({visible: visible});
            node = node.parent;
        }
    }

    private setChildrenVisible(node: TreeNode | undefined, visible: boolean) {
        this.setSubtreeVisible(node?.childLeft, visible);
        this.setSubtreeVisible(node?.childRight, visible);
    }

    private setSubtreeVisible(node: TreeNode | undefined, visible: boolean) {
        if (node === undefined) return;

        const idx = (1 << node.depth) - 1 + node.peerIdx;
        this.nodes[idx]?.setAttribute({visible: visible});
        this.edges[idx]?.setAttribute({visible: visible});

        this.setSubtreeVisible(node.childLeft, visible);
        this.setSubtreeVisible(node.childRight, visible);
    }

    private setNodeHollow(node: TreeNode | undefined, hollow: boolean) {
        if (node === undefined) return;
        this.graphNode(node)?.setAttribute({fillOpacity: hollow ? 0 : 1});
    }

    private focusNode(node: TreeNode | undefined) {
        this.setNodeHollow(this.focusedNode, false);
        this.setNodeHollow(this.focusedNode = node, true);
    }

    graphNode(node: TreeNode) {
        return this.nodes[(1 << node.depth) - 1 + node.peerIdx];
    }

    setSimulationMode(mode: SimulationMode) {
        if (mode === this.simulationMode) return;
        this.simulationMode = mode;
        this.initSimulation();
    }

    /**
     * Possible when the previous is the current's parent,
     * then goes to the left child, or the right child when impossible
     */
    recurse() {
        if (!this.canRecurse()) return;

        if (this.simulationMode === 'build') {
            let temp = this.currNode;
            if (this.prevNode === undefined || this.prevNode === this.currNode.parent) {
                this.currNode = this.currNode.childLeft !== undefined ?
                    this.currNode.childLeft : this.currNode.childRight!;
            } else {
                this.currNode = this.currNode.childRight!;
            }
            this.prevNode = temp;

            this.focusNode(this.currNode);
            this.setNodeAncestorsVisible(this.currNode, true);
        }

        this.notifyRecursionUpdate();
    }

    canRecurse(): boolean {
        if (this.simulationMode === 'build') {
            if (this.prevNode === undefined || this.prevNode === this.currNode.parent) { // go down normally
                return this.currNode.childLeft !== undefined || this.currNode.childRight !== undefined;
            } else if (this.prevNode === this.currNode.childLeft) { // just finished the left subtree
                return this.currNode.childRight !== undefined;
            } else { // then it must be on the right child and finishing the subtree
                return false;
            }
        } else {
            return false;
        }
    }

    undoRecurse() {
        if (!this.canUndoRecurse()) return;

        if (this.simulationMode === 'build') {
            this.setSubtreeVisible(this.currNode, false);
            if (this.currNode === this.currNode.parent!.childRight
                && this.currNode.parent!.childRight !== undefined) {
                this.prevNode = this.currNode.parent!.childLeft;
            } else {
                this.prevNode = this.currNode.parent!.parent;
            }
            this.currNode = this.currNode.parent!;
            this.focusNode(this.currNode);
        }

        this.notifyRecursionUpdate();
    }

    canUndoRecurse(): boolean {
        if (this.simulationMode === 'build') {
            return this.currNode.parent !== undefined;
        } else {
            return false;
        }
    }

    /**
     * Finish the current subtree and return to the parent
     */
    finishSubtree() {
        if (!this.canFinishSubtree()) return;

        if (this.simulationMode === 'build') {
            this.setSubtreeVisible(this.currNode, true);
            if (this.currNode === this.tree.root) {
                this.prevNode = this.currNode.childRight !== undefined ?
                    this.currNode.childRight : this.currNode.childLeft;
                this.focusNode(undefined);
            } else {
                this.prevNode = this.currNode;
                this.currNode = this.currNode.parent!;
                this.focusNode(this.currNode);
            }
        }

        this.notifyRecursionUpdate();
    }

    canFinishSubtree(): boolean {
        if (this.simulationMode === 'build') {
            const finishRoot = this.currNode.parent === undefined
                && (this.prevNode === this.currNode.childLeft && this.currNode.childRight === undefined
                    || this.prevNode === this.currNode.childRight);
            return !finishRoot;
        } else {
            return false;
        }
    }

    onHoverNode(l: EventListener<HoverNodeEvent>) {
        this.hoverNodeEventListeners.push(l);
    }

    private notifyHoverNodeEvent(event: HoverNodeEvent) {
        for (let l of this.hoverNodeEventListeners) l(event);
    }

    onRecursionUpdate(l: EventListener<void>) {
        this.recursionUpdateListeners.push(l);
    }

    private notifyRecursionUpdate() {
        for (let l of this.recursionUpdateListeners) l();
    }
}