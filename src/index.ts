import * as $ from 'jquery';

import {PlotBoard} from './plotboard';
import {StateManager} from './statemanager';
import {isInt} from './utils';
import Popper from 'popper.js';
import {TreeBoard} from './treeboard';

$(() => {
    const algoState = new StateManager();

    const plotboard = new PlotBoard('plotboard', algoState);
    const randomGenBtn = $('#random-generate');

    const algoStartBtn = $('#algo-start');
    const treeboard = new TreeBoard('treeboard', plotboard, algoState);


    randomGenBtn.on('click', () => {
        let inputBox = $('#random-number');
        let n = inputBox.val();
        if (!isInt(n) || (n as number) < 1 || (n as number) > 100) {
            inputBox.val(10);
        } else {
            plotboard.generateSegments(n as number);
        }
    });
    algoState.addListener(newState => {
        if (newState !== 'add') {
            randomGenBtn.prop('disabled', true);
            algoStartBtn.prop('disabled', true);
        }
    });

    plotboard.addNewSegmentListener(() =>
        algoStartBtn.prop('disabled', false)
    );
    algoStartBtn.on('click', () => algoState.finishAdding());
});
