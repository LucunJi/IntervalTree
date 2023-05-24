import { AbstractFSM, State } from './utils/patterns';
import { PlotBoard } from './components/plotboard';
import { capitalize, imap, palette, zip } from './utils/utils';
import { HoverNodeEvent, TreeBoard } from './components/treeboard';
import { IntervalTree } from './model/intervaltree';
import { BuildingSimulator, QuerySimulator, SimulationUpdateEvent } from './model/simulator';
import { SimulationButtons } from './components/buttons';
import { batchUpdate } from './utils/jsxgraph';

interface IntervalTreeState extends State {
    readonly stateName: 'draw' | 'build' | 'query';
}

export class DrawState implements IntervalTreeState {
    readonly stateName = 'draw';
    private readonly plotboard: PlotBoard = new PlotBoard('plotboard');
    private readonly simButtons = new SimulationButtons();

    onEnter(_context: IntervalTreeFSM): void {
        this.simButtons.setTransitButtonStyle('build');
    }

    // noinspection JSUnusedGlobalSymbols
    handleNewSegmentEvent(_ctx: IntervalTreeFSM) {
        this.simButtons.transit.prop('disabled', this.plotboard.segments.length <= 0);
    }

    // noinspection JSUnusedGlobalSymbols
    handleAlgoTransitButtonPressedEvent(ctx: IntervalTreeFSM) {
        if (this.plotboard.segments.length === 0) return;
        ctx.transit(new BuildState(this.plotboard, new IntervalTree(this.plotboard.segments), this.simButtons));
    }

    onExit(): void {
        this.plotboard.finalizeChanges();
    }
}

export class BuildState implements IntervalTreeState {
    readonly stateName = 'build';
    private readonly tree;
    private readonly simulator: BuildingSimulator;
    private readonly plotboard: PlotBoard;
    private readonly treeboard: TreeBoard;
    private readonly simButtons: SimulationButtons;
    private readonly colorCoding: Map<number, string>; // color coding for tree nodes and medians in plotting board

    constructor(plotBoard: PlotBoard, tree: IntervalTree, simButtons: SimulationButtons) {
        this.tree = tree;
        this.simulator = new BuildingSimulator(tree);
        this.plotboard = plotBoard;
        this.simButtons = simButtons;
        // prettier-ignore
        this.colorCoding = new Map(zip(imap(tree.inorder(), (n) => n.median), palette()));
        this.treeboard = new TreeBoard('treeboard', tree, this.colorCoding);
    }

    onEnter(_context: IntervalTreeFSM) {
        for (const node of this.tree.inorder()) {
            const median = node.median;
            this.plotboard.addMedian(
                median,
                node.segmentsLeftSorted,
                this.colorCoding.get(median)!,
                false,
                'build_' + median
            );
        }

        this.simButtons.setTransitButtonStyle('query');
        this.simButtons.bindToSimulator(this.simulator);
    }

    // noinspection JSUnusedGlobalSymbols
    handleSimulationUpdateEvent(ctx: IntervalTreeFSM, e: SimulationUpdateEvent) {
        batchUpdate([this.plotboard.board, this.treeboard.board], () => {
            e.nodesReveal.forEach((node) => {
                this.plotboard.setMedianVisible('build_' + node.treeNode.median, true);
                this.treeboard.setNodeVisible(node.treeNode, true);
            });
            e.nodesHide.forEach((node) => {
                this.plotboard.setMedianVisible('build_' + node.treeNode.median, false);
                this.treeboard.setNodeVisible(node.treeNode, false);
            });
            this.treeboard.focusNode(this.simulator.currentNode().treeNode);
        });
    }

    // noinspection JSUnusedGlobalSymbols
    handleMouseOverNodeEvent(ctx: IntervalTreeFSM, e: HoverNodeEvent) {
        batchUpdate(this.plotboard.board, () => {
            if (e.prevNode !== undefined) this.plotboard.removeMedian('hover_' + e.prevNode.median);
            if (e.node !== undefined) {
                const median = e.node.median;
                const color = this.treeboard.graphNode(e.node)!.getAttribute('highlightFillColor');
                this.plotboard.addMedian(median, e.node.segmentsLeftSorted, color, true, 'hover_' + median);
            }
        });
    }

    // noinspection JSUnusedGlobalSymbols
    handleAlgoTransitButtonPressedEvent(ctx: IntervalTreeFSM) {
        ctx.transit(new QueryState(this.plotboard, this.treeboard, this.tree, this.simButtons, this.colorCoding));
    }

    onExit() {
        batchUpdate(this.plotboard.board, () => {
            for (const n of this.tree.bfs()) {
                this.plotboard.removeMedian('build_' + n.median);
            }
        });
    }
}

export class QueryState implements IntervalTreeState {
    readonly stateName: 'query';
    private simulator: QuerySimulator;
    private readonly plotboard: PlotBoard;
    private readonly treeboard: TreeBoard;
    private readonly simButtons: SimulationButtons;
    private readonly tree: IntervalTree;
    private colorCoding: Map<number, string>;

    constructor(
        plotBoard: PlotBoard,
        treeBoard: TreeBoard,
        tree: IntervalTree,
        simButtons: SimulationButtons,
        colorCoding: Map<number, string>
    ) {
        this.colorCoding = colorCoding;
        this.simulator = new QuerySimulator(tree, plotBoard.getQuery());
        this.plotboard = plotBoard;
        this.treeboard = treeBoard;
        this.tree = tree;
        this.simButtons = simButtons;
    }

    onEnter(_context: IntervalTreeFSM) {
        batchUpdate([this.plotboard.board, this.treeboard.board], () => {
            this.plotboard.showQueryLine();
            for (const node of this.tree.bfs()) this.treeboard.setNodeVisible(node, true);

            const node = this.simulator.currentNode();
            const median = node.treeNode.median;
            this.plotboard.addMedian(median, node.involvedSegs, this.colorCoding.get(median)!, true, 'query_' + median);
            this.treeboard.focusNode(node.treeNode);
        });

        this.simButtons.setTransitButtonStyle('reset');
        this.simButtons.bindToSimulator(this.simulator);
    }

    // noinspection JSUnusedGlobalSymbols
    handleSimulationUpdateEvent(ctx: IntervalTreeFSM, e: SimulationUpdateEvent) {
        batchUpdate([this.plotboard.board, this.treeboard.board], () => {
            for (const node of e.nodesHide) {
                this.plotboard.removeMedian('query_' + node.treeNode.median);
            }
            for (const node of e.nodesReveal) {
                const median = node.treeNode.median;
                this.plotboard.addMedian(
                    median,
                    node.involvedSegs,
                    this.colorCoding.get(median)!,
                    true,
                    'query_' + median
                );
            }
            this.treeboard.focusNode(this.simulator.currentNode().treeNode);
        });
    }

    // noinspection JSUnusedGlobalSymbols
    handleQueryLineChangeEvent(ctx: IntervalTreeFSM, query: number) {
        batchUpdate([this.plotboard.board, this.treeboard.board], () => {
            this.simulator.graph.forEach((node) => this.plotboard.removeMedian('query_' + node.treeNode.median));

            this.simulator = new QuerySimulator(this.tree, query);
            const node = this.simulator.currentNode();
            const median = node.treeNode.median;
            this.plotboard.addMedian(median, node.involvedSegs, this.colorCoding.get(median)!, true, 'query_' + median);
            this.treeboard.focusNode(node.treeNode);
        });
        this.simButtons.bindToSimulator(this.simulator);
    }

    // noinspection JSUnusedGlobalSymbols
    handleMouseOverNodeEvent(ctx: IntervalTreeFSM, e: HoverNodeEvent) {
        batchUpdate(this.plotboard.board, () => {
            if (e.prevNode !== undefined) this.plotboard.removeMedian('hover_' + e.prevNode.median);
            if (e.node !== undefined) {
                const median = e.node.median;
                const color = this.treeboard.graphNode(e.node)!.getAttribute('highlightFillColor');
                this.plotboard.addMedian(median, e.node.segmentsLeftSorted, color, true, 'hover_' + median);
            }
        });
    }

    // noinspection JSUnusedGlobalSymbols
    handleAlgoTransitButtonPressedEvent(_ctx: IntervalTreeFSM) {
        window.location.reload();
    }

    onExit() {}
}

export class IntervalTreeFSM extends AbstractFSM<IntervalTreeState> {
    constructor() {
        super(new DrawState());
    }

    /**
     * Allows the state to implement only part of the event handlers at the risk of a slight uncertainty and runtime overhead.
     */
    getGenericEventHandler<T>(name: string) {
        const funcName = `handle${capitalize(name)}Event`;
        return (event: T) => {
            const handler = (this.state as never)[funcName] as undefined | ((c: this, e: T) => void);
            handler?.apply(this.state, [this, event]);
        };
    }
}
