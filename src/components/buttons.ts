import * as $ from 'jquery';
import { BUS } from '../index';
import { IntervalTreeSimulator } from '../model/simulator';
import { Simulator } from '../utils/patterns';

export class SimulationButtons {
    readonly all;
    readonly transit;
    readonly recurse;
    readonly undoRecurse;
    readonly finishSubtree;

    private bindingSimulator?: Simulator<never>;
    private simulateFunc?: Simulator<never>['simulate'];

    constructor() {
        this.all = $('#algo-buttons button');
        this.transit = $('#algo-transit');
        this.recurse = $('#algo-recurse');
        this.undoRecurse = $('#algo-undo-recurse');
        this.finishSubtree = $('#algo-finish-subtree');

        this.all.prop('disabled', true);
        this.transit.on('click', () => BUS.emit('algoTransitButtonPressed', {}));
        this.recurse.on('click', () => BUS.emit('algoRecurseButtonPressed', {}));
        this.undoRecurse.on('click', () => BUS.emit('algoUndoRecurseButtonPressed', {}));
        this.finishSubtree.on('click', () => BUS.emit('algoFinishSubtreeButtonPressed', {}));
    }

    setTransitButtonStyle(style: 'build' | 'query' | 'reset') {
        switch (style) {
            case 'build':
                this.transit.html('Start Building');
                this.transit.removeClass('btn-outline-danger');
                this.transit.addClass('btn-outline-primary');
                break;
            case 'query':
                this.transit.html('Start Query');
                this.transit.removeClass('btn-outline-danger');
                this.transit.addClass('btn-outline-primary');
                break;
            case 'reset':
                this.transit.html('Reset');
                this.transit.removeClass('btn-outline-primary');
                this.transit.addClass('btn-outline-danger');
                break;
        }
    }

    /**
     * Insert syncing function into the simulate method of simulator, and add event listeners.
     *
     * This is more loosely coupled and simpler than extending simulator class and using event bus.
     */
    bindToSimulator(simulator: IntervalTreeSimulator) {
        // unbind the last simulator
        if (this.bindingSimulator !== undefined) {
            this.bindingSimulator.simulate = this.simulateFunc!.bind(this.bindingSimulator);
            this.recurse.off('click');
            this.undoRecurse.off('click');
            this.finishSubtree.off('click');
        }

        this.bindingSimulator = simulator;
        this.simulateFunc = simulator.simulate;
        simulator.simulate = (action) => {
            this.simulateFunc!.apply(simulator, [action]);
            this.syncWithSimulator(simulator);
        };
        this.recurse.on('click', () => simulator.simulate('recurse'));
        this.undoRecurse.on('click', () => simulator.simulate('undoRecurse'));
        this.finishSubtree.on('click', () => simulator.simulate('finishSubtree'));
        this.syncWithSimulator(simulator);
    }

    private syncWithSimulator(simulator: IntervalTreeSimulator) {
        this.recurse.prop('disabled', !simulator.canSimulate('recurse'));
        this.undoRecurse.prop('disabled', !simulator.canSimulate('undoRecurse'));
        this.finishSubtree.prop('disabled', !simulator.canSimulate('finishSubtree'));
    }
}
