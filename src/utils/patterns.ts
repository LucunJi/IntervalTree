export type EmptyEvent = Record<string, never>;

/**
 * An event bus using type Events as a mapping from event names to event objects,
 * so events must be registered before being used in the bus.
 */
export interface EventBus<Events extends Record<string, NonNullable<unknown>>> {
    on<Name extends keyof Events>(name: Name, listener: (event: Events[Name]) => void): void;

    emit<Name extends keyof Events>(eventName: Name, event: Events[Name]): void;
}

export type EventBusAcceptable<T> = T extends EventBus<infer E> ? E : never;

/**
 * A simple implementation of event bus.
 */
export class EventBusImpl<Events extends Record<string, NonNullable<unknown>>> implements EventBus<Events> {
    private eventListeners = new Map<keyof Events, Array<(event: Events[keyof Events]) => void>>();

    emit<Name extends keyof Events>(eventName: Name, event: Events[Name]): void {
        for (const listener of this.eventListeners.get(eventName) ?? []) listener(event);
    }

    on<Name extends keyof Events>(name: Name, listener: (event: Events[Name]) => void): void {
        const arr = this.eventListeners.get(name);
        if (arr === undefined) this.eventListeners.set(name, [listener]);
        else arr.push(listener);
    }
}

/**
 * A state in an FSM.
 */
export interface State {
    /**
     * A temporary state may transit when entering. Such a state is sometime useful for clarifying and reusing code.
     */
    onEnter(context: FSM<this>): void;

    /**
     * Transiting to other states when exiting is not preferred to reduce errors.
     */
    onExit(): void;
}

/**
 * A simple FSM interface
 *
 * Actions should be deferred to the current state by passing a context (FSM instance) and required parameters.
 *
 * Example:
 * <pre>
 * interface StateA extends State {
 *     doSomething(context: MyFSM, param1: any);
 * }
 *
 * class MyFSM implements FSM<StateA> {
 *     private state: StateA;
 *
 *     doSomething(param1: any) {
 *         this.state.doSomething(this, param1);
 *     }
 * }
 * </pre>
 *
 * @see <a href="https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=7cabc13a42e9f818c67e9196b221a8ee4d8caf3d">Sterkin, Asher. "State-oriented programming." 6th MPOOL Workshop, Cyprus. 2008.</a>
 */
export interface FSM<S extends State> {
    /**
     * Handles the transition of states, and calls onEnter() and onExit() methods of old and new states.ts.
     *
     * @param state Instance of the next state
     */
    transit(state: S): void;
}

/**
 * A basic FSM implementation.
 */
export abstract class AbstractFSM<S extends State> implements FSM<S> {
    protected state: S;

    protected constructor(initialState: S) {
        this.state = initialState;
        this.state.onEnter(this);
    }

    transit(state: S) {
        this.state.onExit();
        this.state = state;
        this.state.onEnter(this);
    }
}

/**
 * A simulator has functions for executing user actions and checking feasibility
 */
export interface Simulator<Actions extends string> {
    canSimulate(action: Actions): boolean;

    simulate(action: Actions): void;
}

export type SimulationNode<Actions extends string> = {
    /**
     * The index of the node to jump into when executing the action
     */
    actionIdx: Partial<Record<Actions, number>>;
};

/**
 * Simulates a single task (e.g. build, query) using a graph of finite states
 */
export abstract class AbstractGraphSimulator<Actions extends string, GraphNode extends SimulationNode<Actions>>
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
