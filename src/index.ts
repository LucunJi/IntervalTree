import * as $ from 'jquery';

import {PlotBoard} from './plotboard';
import {StateManager} from './statemanager';
import {TreeBoard} from './treeboard';

$(() => {
    const algoState = new StateManager();

    const plotboard = new PlotBoard('plotboard');
    const populateForm = $('#populate');

    const algoBtn = {
        all: $('#algo-buttons button'),
        start: $('#algo-start'),
        recurse: $('#algo-recurse'),
        undoRecurse: $('#algo-undo-recurse'),
        finishSubtree: $('#algo-finish-subtree')
    }

    let treeboard: TreeBoard | undefined = undefined;

    plotboard.onNewSegment(() => algoBtn.start.prop('disabled', false));
    // populate with random segments
    populateForm.on('submit', event => {
        plotboard.populateSegments(parseInt($('#populate-count').val() as string));
        event.preventDefault();
    });

    // stop accepting changes to the segments
    algoState.onChange(newState => {
        if (newState !== 'add') {
            plotboard.stopAcceptingChanges();
            populateForm.find(':input').prop('disabled', true);
        }
    });

    // disable all algorithmic buttons initially
    algoBtn.all.prop('disabled', true);

    // action of #algo-start
    algoBtn.start.on('click', () => {
        if (algoState.state === 'add' && plotboard.getSegments().length === 0) return;
        if (algoState.state !== 'query') algoState.next();
        else window.location.reload();
    });
    // toggle state of #algo-start
    algoState.onChange(newState => {
        switch (newState) {
            case 'add':
                algoBtn.start.html('Start Building');
                algoBtn.start.removeClass('btn-outline-danger');
                algoBtn.start.addClass('btn-outline-primary"');
                break;
            case 'build':
                algoBtn.start.html('Start Query');
                algoBtn.start.removeClass('btn-outline-danger');
                algoBtn.start.addClass('btn-outline-primary"');
                break;
            case 'query':
                algoBtn.start.html('Reset');
                algoBtn.start.removeClass('btn-outline-primary"');
                algoBtn.start.addClass('btn-outline-danger');
                break;
        }
    });

    algoState.onChange(newState => {
        if (newState === 'build' && treeboard === undefined)
            treeboard = new TreeBoard('treeboard', plotboard.getSegments());
    });
});
