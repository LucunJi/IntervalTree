import { IntervalTree, TreeNode } from './intervaltree';
import { AbstractEventGenerator } from '../utils/patterns';
import { Segment } from 'jsxgraph';

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

type IntervalTreeSimulationNode = SimulationNode<Actions> & {
    treeNode: Readonly<TreeNode>;
    // left/right subtree is finished
    leftFinished: boolean;
    rightFinished: boolean;
};

/**
 * Suitable for the building process of any binary tree
 */
class BuildingGraphSimulator extends AbstractGraphSimulator<Actions, IntervalTreeSimulationNode> {
    constructor(tree: IntervalTree) {
        super(BuildingGraphSimulator.buildGraph(tree.root), 0);
    }

    private static buildGraph(root: Readonly<TreeNode>) {
        const graph: IntervalTreeSimulationNode[] = [];
        BuildingGraphSimulator.buildGraphRecursive(graph, root)
            .slice(0, -1)
            .forEach((node) => (node.actionIdx.finishSubtree = graph.length - 1));
        return graph;
    }

    /**
     * returns all graph nodes of the tree node
     */
    private static buildGraphRecursive(
        graph: IntervalTreeSimulationNode[],
        root: Readonly<TreeNode>
    ): IntervalTreeSimulationNode[] {
        const graphNodes: IntervalTreeSimulationNode[] = [];

        const node1: IntervalTreeSimulationNode = {
            treeNode: root,
            leftFinished: false,
            rightFinished: false,
            actionIdx: {},
        };
        let lastIdx = graph.push(node1) - 1;
        graphNodes.push(node1);

        const leftOrRightChild = root.childLeft ?? root.childRight;
        if (leftOrRightChild !== undefined) {
            graph[lastIdx].actionIdx.recurse = graph.length;
            this.buildGraphRecursive(graph, leftOrRightChild).forEach((node) => {
                node.actionIdx.undoRecurse = lastIdx;
                node.actionIdx.finishSubtree = graph.length;
            });

            const node2: IntervalTreeSimulationNode = {
                treeNode: root,
                leftFinished: root.childLeft !== undefined,
                rightFinished: root.childLeft === undefined,
                actionIdx: {},
            };
            lastIdx = graph.push(node2) - 1;
            graphNodes.push(node2);
        }

        const hasBothChildren = root.childLeft !== undefined && root.childRight !== undefined;
        if (hasBothChildren) {
            graph[lastIdx].actionIdx.recurse = graph.length;
            this.buildGraphRecursive(graph, root.childRight).forEach((node) => {
                node.actionIdx.undoRecurse = lastIdx;
                node.actionIdx.finishSubtree = graph.length;
            });

            const node3: IntervalTreeSimulationNode = {
                treeNode: root,
                leftFinished: true,
                rightFinished: true,
                actionIdx: {},
            };
            lastIdx = graph.push(node3) - 1;
            graphNodes.push(node3);
        }

        return graphNodes;
    }
}

type States = 'add' | 'build' | 'query';
type Actions = 'recurse' | 'undoRecurse' | 'finishSubtree';

type StateChangeEvent<S> = { state: S; prevState: S };
type AlgorithmStateChangeEvent = {
    currState: IntervalTreeSimulationNode;
    addedTreeNodes: Set<Readonly<TreeNode>>;
    removedTreeNodes: Set<Readonly<TreeNode>>;
};
type Events = {
    stateChange: StateChangeEvent<States>;
    algorithmStateChange: AlgorithmStateChangeEvent;
};

/**
 * Implementation of simulator for interval tree,
 * as a composition of a building simulator and a query simulator
 */
export class IntervalTreeSimulator extends AbstractEventGenerator<Events> implements Simulator<Actions> {
    private state: States = 'add';
    tree?: IntervalTree;
    private simulator?: BuildingGraphSimulator;

    /**
     * Set state and notify update
     */
    private setState(state: States) {
        if (this.state === state) return;

        const prevState = this.state;
        this.state = state;
        this.notify('stateChange', { state, prevState });
    }

    getState() {
        return this.state;
    }

    build(segments: Segment[]) {
        this.tree = new IntervalTree(segments);
        this.simulator = new BuildingGraphSimulator(this.tree);

        this.setState('build');
    }

    next() {
        if (this.state === 'add') {
            this.setState('build');
        } else if (this.state === 'build') {
            this.setState('query');
        }
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

        const nodes = new Set<Readonly<TreeNode>>();
        for (let i = Math.min(oldIdx, newIdx) + 1; i <= Math.max(oldIdx, newIdx); i++)
            nodes.add(simulator.graph[i].treeNode);

        this.notify('algorithmStateChange', {
            currState: simulator.currentNode(),
            addedTreeNodes: newIdx < oldIdx ? new Set() : nodes,
            removedTreeNodes: newIdx < oldIdx ? nodes : new Set(),
        });
    }
}
