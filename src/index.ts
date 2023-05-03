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

    plotboard.onNewSegment(() => algoBtn.start.prop('disabled', false));
    // populate with random segments
    populateForm.on('submit', event => {
        plotboard.populateSegments(parseInt($('#populate-count').val() as string));
        event.preventDefault();
    });

    // stop accepting changes to the segments
    algoState.onChange(newState => {
        if (newState !== 'add') {
            plotboard.finalizeChanges();
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

    plotboard.setSortingEnd($('[name=sort-endpoint]:checked').val() as ('left' | 'right'));
    $('[name=sort-endpoint]').each((idx, ele) => {
        $(ele).on('change', event => {
            plotboard.setSortingEnd($(event.target).val() as ('left' | 'right'))
        })
    });

    function updateRecursionStatus(board: TreeBoard) {
        algoBtn.recurse.prop('disabled', !board.canRecurse());
        algoBtn.undoRecurse.prop('disabled', !board.canUndoRecurse());
        algoBtn.finishSubtree.prop('disabled', !board.canFinishSubtree());

        for (let node of board.tree.nodes) {
            if (node === undefined) continue;
            plotboard.setMedianVisibility(node.median, board.graphNode(node)!.getAttribute('visible'));
        }
    }

    let treeboard: TreeBoard | undefined = undefined;
    algoState.onChange(newState => {
        if (newState === 'build' && treeboard === undefined) {
            // setup treeboard
            let treeboard = new TreeBoard('treeboard', plotboard.getSegments()) as TreeBoard;

            algoState.onChange(newState => {
                if (newState !== 'add') treeboard?.setSimulationMode(newState);
            })

            for (let n of treeboard.tree.nodes) {
                if (n === undefined) continue;
                plotboard.addMedian(n.median, n.segmentsLeftSorted,
                    treeboard.graphNode(n)!.getAttribute('color'));
            }

            treeboard.onHoverNode(event => {
                if (event.prevNode !== undefined) plotboard.removeMedian('hover');
                if (event.node !== undefined) {
                    plotboard.addMedian(event.node.median, event.node.segmentsLeftSorted,
                        treeboard.graphNode(event.node)!.getAttribute('highlightFillColor'),
                        true, 'hover')
                }
            });

            treeboard.onRecursionUpdate(() => updateRecursionStatus(treeboard));

            algoBtn.recurse.on('click', () => treeboard.recurse());
            algoBtn.undoRecurse.on('click', () => treeboard.undoRecurse());
            algoBtn.finishSubtree.on('click', () => treeboard.finishSubtree());

            updateRecursionStatus(treeboard);
        }
    });
});