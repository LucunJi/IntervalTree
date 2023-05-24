import { AbstractFSM, EventBus, State } from './utils/patterns';
import { PlotBoard } from './components/plotboard';
import { capitalize } from './utils/utils';
import { TreeBoard } from './components/treeboard';
import { IntervalTree } from './model/intervaltree';
import { BuildingSimulator } from './model/simulator';
import { BUS } from './index';

/**
 * more strict, but also more verbose
 */
// export type IntervalTreeEventBus = EventBus<{
//     mouseOverNode: HoverNodeEvent;
//     newSegmentEvent: NewSegmentEvent;
//     queryLineChangeEvent: QueryLineChangeEvent;
// }>;
//
// type IntervalTreeState = EventBusSubscriberState<IntervalTreeEventBus, IntervalTreeFSM>;
//
// export class DrawState implements IntervalTreeState {
// ...
// }
//
// export class IntervalTreeFSM extends AbstractFSM<IntervalTreeState> {
//     getGenericEventHandler(name: keyof EventBusAcceptable<IntervalTreeEventBus>) {
//         return (event: EventBusAcceptable<typeof name>) =>
//             this.state[`handle${capitalize(name)}Event`].apply(this.state, [this, event]);
//     }
// }

interface IntervalTreeState extends State {
    readonly stateName: 'draw' | 'build' | 'query';
}

export class DrawState implements IntervalTreeState {
    readonly stateName = 'draw';
    private readonly plotboard: PlotBoard = new PlotBoard('plotboard');

    onEnter(context: IntervalTreeFSM): void {}

    // noinspection JSUnusedGlobalSymbols
    handlePopulateSegmentEvent(ctx: IntervalTreeFSM, e: { count: number }) {
        this.plotboard.populateSegments(e.count);
    }

    // noinspection JSUnusedGlobalSymbols
    handleAlgoStartButtonPressedEvent(ctx: IntervalTreeFSM) {
        if (this.plotboard.getSegments().length === 0) return;
        ctx.transit(new BuildState(this.plotboard, new IntervalTree(this.plotboard.getSegments())));
    }

    onExit(): void {
        this.plotboard.finalizeChanges();
    }
}

export class BuildState implements IntervalTreeState {
    readonly stateName = 'build';
    private readonly simulator: BuildingSimulator;
    private readonly plotboard: PlotBoard;
    private readonly treeboard: TreeBoard;

    constructor(plotBoard: PlotBoard, tree: IntervalTree) {
        this.simulator = new BuildingSimulator(tree);
        this.plotboard = plotBoard;
        this.treeboard = new TreeBoard('treeboard', tree);
    }

    onEnter(context: IntervalTreeFSM) {}

    onExit() {}
}

export type StateChangeEvent = { state: IntervalTreeState['stateName']; prevState: IntervalTreeState['stateName'] };

export class IntervalTreeFSM extends AbstractFSM<IntervalTreeState> {
    constructor() {
        super(new DrawState());
    }

    transit(state: IntervalTreeState) {
        const prevState = this.state.stateName;
        super.transit(state);
        BUS.emit('stateChange', { state: this.state.stateName, prevState });
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
