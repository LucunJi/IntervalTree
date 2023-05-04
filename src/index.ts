import * as $ from 'jquery';

import {PlotBoard} from './plotboard';
import {StateManager} from './statemanager';
import {TreeBoard} from './treeboard';
import {TreeNode} from './intervaltree';
import {Segment} from 'jsxgraph';
import {hrange} from './utils';

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
            plotboard.finalizeChanges();
            populateForm.find(':input').prop('disabled', true);
        }
    });

    // disable all algorithmic buttons initially
    algoBtn.all.prop('disabled', true);

    // action of #algo-start
    algoBtn.start.on('click', () => {
        if (algoState.state === 'add' && plotboard.getSegments().length === 0) return;
        $('[name=sort-endpoint]').prop('disabled', false);
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
    }).prop('disabled', true);

    function updateRecursionStatus(board: TreeBoard, currNode: TreeNode) {
        algoBtn.recurse.prop('disabled', !board.canRecurse());
        algoBtn.undoRecurse.prop('disabled', !board.canUndoRecurse());
        algoBtn.finishSubtree.prop('disabled', !board.canFinishSubtree());

        if (board.getMode() === 'build') {
            for (let node of board.tree.nodes) {
                if (node === undefined) continue;
                plotboard.setMedianVisible(node.median, board.graphNode(node)!.getAttribute('visible'));
            }
        } else {
            // show the median for the current node and its ancestors
            for (let node: TreeNode | undefined = currNode;
                 node !== undefined; node = node.parent) {

                let intersections: Segment[] = [];
                const x = board.queryLocation!;
                if (x < currNode.median) {
                    intersections = node.segmentsLeftSorted.filter(s => hrange(s).left <= x);
                } else if (x > currNode.median) {
                    intersections = node.segmentsLeftSorted.filter(s => hrange(s).right >= x);
                } else {
                    intersections = node.segmentsLeftSorted.slice();
                }
                plotboard.addMedian(node.median, intersections,
                    board.graphNode(node)!.getAttribute('strokeColor'),
                    true, node.median + 'query');
            }

            // remove medians for the siblings in case of undoing recursion
            for (let i = (1 << currNode.depth) - 1 + currNode.peerIdx + 1;
                 i < board.tree.nodes.length; i++) {
                let node = board.tree.nodes[i];
                if (node !== undefined) plotboard.removeMedian(node.median + 'query');
            }
        }
    }

    algoState.onChange(newState => {
        if (newState === 'build' && treeboard === undefined) {
            // setup treeboard
            treeboard = new TreeBoard('treeboard', plotboard.getSegments());

            for (let n of treeboard.tree.nodes) {
                if (n === undefined) continue;
                plotboard.addMedian(n.median, n.segmentsLeftSorted,
                    treeboard.graphNode(n)!.getAttribute('color'));
            }
            plotboard.onQueryLineChange(n => {
                for (let node of treeboard!.tree.nodes) {
                    if (node === undefined) continue;
                    plotboard.removeMedian(node.median + 'query');
                }
                treeboard?.simulateQuery(n);
            });

            algoState.onChange(newState => {
                if (newState !== 'add') treeboard?.setSimulationMode(newState);
                if (newState === 'query') plotboard.showQueryLine();
            });

            treeboard.onHoverNode(event => {
                if (event.prevNode !== undefined) plotboard.removeMedian('hover');
                if (event.node !== undefined) {
                    plotboard.addMedian(event.node.median, event.node.segmentsLeftSorted,
                        treeboard!.graphNode(event.node)!.getAttribute('highlightFillColor'),
                        true, 'hover')
                }
            });

            treeboard.onRecursionUpdate(event =>
                updateRecursionStatus(treeboard!, event.currNode));

            algoBtn.recurse.on('click', () => treeboard!.recurse());
            algoBtn.undoRecurse.on('click', () => treeboard!.undoRecurse());
            algoBtn.finishSubtree.on('click', () => treeboard!.finishSubtree());

            updateRecursionStatus(treeboard, treeboard.tree.root);
        } else if (newState === 'query' && treeboard !== undefined) {
            for (let n of treeboard.tree.nodes) {
                if (n === undefined) continue;
                plotboard.setMedianVisible(n.median, false);
            }
        }
    });
});