import { IntervalTree, TreeNode } from './intervaltree';
import { AbstractEventGenerator } from '../utils/patterns';
import { Segment } from 'jsxgraph';
import { hrange } from '../utils/math';

/**
 * A simulator has functions for executing user actions and checking feasibility
 */
interface Simulator<Actions extends string> {
    canSimulate(action: Actions): boolean;

    simulate(action: Actions): void;
}

type SimulationNode<Actions extends string> = {
    actionIdx: Partial<Record<Actions, number>>;
};

/**
 * Simulates a single task (e.g. build, query) using a graph of finite states
 */
abstract class AbstractGraphSimulator<Actions extends string, GraphNode extends SimulationNode<Actions>>
    implements Simulator<Actions>
{
    protected constructor(readonly graph: Readonly<GraphNode>[], public index: number) {}

    canSimulate(action: Actions): boolean {
        return this.graph[this.index].actionIdx[action] !== undefined;
    }

    simulate(action: Actions): void {
        if (this.canSimulate(action)) this.index = this.graph[this.index].actionIdx[action]!;
    }

    currentNode(): Readonly<GraphNode> {
        return this.graph[this.index];
    }
}

/**
 * Actual implementation
 */
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

/**
 * Suitable for the building process of any binary tree
 */
class BuildingSimulator extends AbstractGraphSimulator<Actions, IntervalTreeSimulationNode> {
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

class QuerySimulator extends AbstractGraphSimulator<Actions, IntervalTreeSimulationNode> {
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

type States = 'add' | 'build' | 'query';

type StateChangeEvent<S> = { state: S; prevState: S };
type AlgorithmResetEvent = { simState: States; algoState: IntervalTreeSimulationNode; tree: IntervalTree };
type AlgorithmStateChangeEvent = {
    currState: IntervalTreeSimulationNode;
    addedTreeNodesSegs: Map<Readonly<TreeNode>, Segment[]>;
    removedTreeNodesSegs: Map<Readonly<TreeNode>, Segment[]>;
};
type Events = {
    stateChange: StateChangeEvent<States>;
    algorithmReset: AlgorithmResetEvent;
    algorithmStateChange: AlgorithmStateChangeEvent;
};

/**
 * Implementation of simulator for interval tree,
 * as a composition of a building simulator and a query simulator
 */
export class IntervalTreeSimulator extends AbstractEventGenerator<Events> implements Simulator<Actions> {
    private state: States = 'add';
    tree?: IntervalTree;
    private simulator?: BuildingSimulator | QuerySimulator;

    /**
     * Set state and notify update
     */
    private setState(state: States) {
        if (this.state === state) return;

        const prevState = this.state;
        this.state = state;
        this.notify('stateChange', { state, prevState });
    }

    private notifyAlgoReset(simulator: Exclude<typeof this.simulator, undefined>, tree: IntervalTree) {
        this.notify('algorithmReset', { simState: this.state, algoState: simulator.currentNode(), tree });
    }

    getState() {
        return this.state;
    }

    build(segments: Segment[]) {
        this.tree = new IntervalTree(segments);
        this.simulator = new BuildingSimulator(this.tree);

        this.setState('build');
        this.notifyAlgoReset(this.simulator, this.tree);
    }

    query(query: number) {
        if (this.tree === undefined) throw new Error('Tree is not built before query');
        this.simulator = new QuerySimulator(this.tree, query);

        this.setState('query');
        this.notifyAlgoReset(this.simulator, this.tree);
    }

    canSimulate(action: Actions): boolean {
        return this.simulator !== undefined && this.simulator.canSimulate(action);
    }

    simulate(action: Actions): void {
        if (!this.canSimulate(action)) return;
        const simulator = this.simulator!;

        const oldIdx = simulator.index;
        simulator.simulate(action);
        const newIdx = simulator.index;

        const nodes = new Map<Readonly<TreeNode>, Segment[]>();
        for (let i = Math.min(oldIdx, newIdx) + 1; i <= Math.max(oldIdx, newIdx); i++)
            nodes.set(simulator.graph[i].treeNode, simulator.graph[i].involvedSegs);

        this.notify('algorithmStateChange', {
            currState: simulator.currentNode(),
            addedTreeNodesSegs: newIdx < oldIdx ? new Map() : nodes,
            removedTreeNodesSegs: newIdx < oldIdx ? nodes : new Map(),
        });
    }
}
