import * as $ from 'jquery';

import { NewSegmentEvent, QueryLineChangeEvent } from './components/plotboard';
import { SimulationUpdateEvent } from './model/simulator';
import { HoverNodeEvent } from './components/treeboard';
import { EmptyEvent, EventBus, EventBusAcceptable, EventBusImpl } from './utils/patterns';
import { IntervalTreeFSM } from './states';

// register all events transmitted on event bus
export const BUS: EventBus<{
    // general events
    algoTransitButtonPressed: EmptyEvent;

    // draw stage events
    newSegment: NewSegmentEvent;

    // build/query state events
    algoRecurseButtonPressed: EmptyEvent;
    algoUndoRecurseButtonPressed: EmptyEvent;
    algoFinishSubtreeButtonPressed: EmptyEvent;
    simulationUpdate: SimulationUpdateEvent;
    mouseOverNode: HoverNodeEvent;

    // query state events
    queryLineChange: QueryLineChangeEvent;
}> = new EventBusImpl<never>();

$(() => {
    const FSM: IntervalTreeFSM = new IntervalTreeFSM();

    // route from event bus to FSM
    (
        [
            'algoTransitButtonPressed',
            'newSegment',
            'algoRecurseButtonPressed',
            'algoUndoRecurseButtonPressed',
            'algoFinishSubtreeButtonPressed',
            'simulationUpdate',
            'mouseOverNode',
            'queryLineChange',
        ] as (keyof EventBusAcceptable<typeof BUS>)[]
    ).forEach((event) => BUS.on(event, FSM.getGenericEventHandler(event)));
});
