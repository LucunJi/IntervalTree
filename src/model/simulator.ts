import { IntervalTree, TreeNode } from './intervaltree';
import { Segment } from 'jsxgraph';
import { BUS } from '../index';
import { hrange } from '../utils/jsxgraph';
import { AbstractGraphSimulator, SimulationNode } from '../utils/patterns';

type Actions = 'recurse' | 'undoRecurse' | 'finishSubtree';

class IntervalTreeSimulationNode implements SimulationNode<Actions> {
    constructor(
        readonly treeNode: Readonly<TreeNode>,
        // left/right subtree is finished
        readonly leftFinished: boolean,
        readonly rightFinished: boolean,
        readonly actionIdx: SimulationNode<Actions>['actionIdx'] = {},
        readonly involvedSegs: Segment[] = treeNode.segmentsLeftSorted
    ) {}
}

export type SimulationUpdateEvent = {
    nodesReveal: Readonly<IntervalTreeSimulationNode>[];
    nodesHide: Readonly<IntervalTreeSimulationNode>[];
};

export abstract class IntervalTreeSimulator extends AbstractGraphSimulator<Actions, IntervalTreeSimulationNode> {
    simulate(action: Actions) {
        const lastIdx = this.index;
        super.simulate(action);
        const newIdx = this.index;
        if (newIdx !== lastIdx) {
            const event: SimulationUpdateEvent = { nodesReveal: [], nodesHide: [] };
            if (newIdx > lastIdx) {
                for (let i = lastIdx + 1; i <= newIdx; i++) event.nodesReveal.push(this.graph[i]);
            } else {
                for (let i = newIdx + 1; i <= lastIdx; i++) event.nodesHide.push(this.graph[i]);
            }
            BUS.emit('simulationUpdate', event);
        }
    }
}

/**
 * Suitable for the building process of any binary tree
 */
export class BuildingSimulator extends IntervalTreeSimulator {
    constructor(tree: IntervalTree) {
        super(BuildingSimulator.buildGraph(tree.root), 0);
    }

    private static buildGraph(root: Readonly<TreeNode>) {
        const graph: IntervalTreeSimulationNode[] = [];
        BuildingSimulator.buildGraphRecursive(graph, root)
            .slice(0, -1)
            .forEach((node) => (node.actionIdx.finishSubtree = graph.length - 1));
        return graph;
    }

    private static buildGraphRecursive(graph: IntervalTreeSimulationNode[], root: Readonly<TreeNode>) {
        const leftOrRightChild = root.childLeft ?? root.childRight;
        const hasLeftChild = root.childLeft !== undefined;
        const hasBothChildren = root.childLeft !== undefined && root.childRight !== undefined;

        const rootNodes: IntervalTreeSimulationNode[] = [new IntervalTreeSimulationNode(root, false, false)];
        const recursionTreeNode: TreeNode[] = [];

        rootNodes.push();
        if (leftOrRightChild !== undefined) {
            rootNodes.push(new IntervalTreeSimulationNode(root, hasLeftChild, !hasLeftChild));
            recursionTreeNode[1] = leftOrRightChild;
        }
        if (hasBothChildren) {
            rootNodes.push(new IntervalTreeSimulationNode(root, true, true));
            recursionTreeNode[2] = root.childRight;
        }

        let lastRootIdx = -1;
        rootNodes.forEach((rootNode, index) => {
            if (index > 0) {
                graph[lastRootIdx].actionIdx.recurse = graph.length; // recurse into the next (child) node
                this.buildGraphRecursive(graph, recursionTreeNode[index]).forEach((child) => {
                    child.actionIdx.undoRecurse = lastRootIdx; // return to the last parent when a child undoes
                    child.actionIdx.finishSubtree = graph.length; // proceeds to the next (parent) node when a subtree finishes
                });
            }
            lastRootIdx = graph.push(rootNode) - 1;
        });

        return rootNodes;
    }
}

export class QuerySimulator extends IntervalTreeSimulator {
    constructor(tree: IntervalTree, query: number) {
        super(QuerySimulator.buildGraph(tree.root, query), 0);
    }

    private static buildGraph(root: Readonly<TreeNode>, query: number) {
        const graph: IntervalTreeSimulationNode[] = [];
        let n: Readonly<TreeNode> | undefined = root;
        do {
            if (graph.length > 0) graph[graph.length - 1].actionIdx.recurse = graph.length;
            const undoRecurse = graph.length > 0 ? graph.length - 1 : undefined;

            let intersections: Segment[],
                next: Readonly<TreeNode> | undefined = undefined;
            if (query < n.median) {
                intersections = n.segmentsLeftSorted.filter((s) => hrange(s).left <= query);
                next = n.childLeft;
            } else if (query > n.median) {
                intersections = n.segmentsLeftSorted.filter((s) => hrange(s).right >= query);
                next = n.childRight;
            } else {
                intersections = n.segmentsLeftSorted.slice();
            }
            graph.push(new IntervalTreeSimulationNode(n, false, false, { undoRecurse }, intersections));

            n = next;
        } while (n !== undefined);
        return graph;
    }
}
