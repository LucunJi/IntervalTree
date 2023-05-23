import * as $ from 'jquery';

import { PlotBoard } from './components/plotboard';
import { IntervalTreeSimulator } from './model/simulator';
import { TreeBoard } from './components/treeboard';
import { TreeNode } from './model/intervaltree';
import { Segment } from 'jsxgraph';
import { Palette } from './utils/palette';
import { batchUpdate } from './utils/utils';

$(() => {
    const simulator = new IntervalTreeSimulator();

    const plotboard = new PlotBoard('plotboard');
    let treeboard: TreeBoard | undefined = undefined;

    function configurePopulateSegmentsForm() {
        const form = $('#populate').on('submit', (event) => {
            plotboard.populateSegments(parseInt($('#populate-count').val() as string));
            event.preventDefault();
        });
        simulator.on('stateChange', (e) => form.find(':input').prop('disabled', e.state !== 'draw'));
    }

    configurePopulateSegmentsForm();

    function configureSortingEndpointRadios() {
        const radios = $('[name=sort-endpoint]')
            // on changing value
            .each((idx, ele) => {
                $(ele).on('change', (event) => plotboard.setSortingEnd($(event.target).val() as 'left' | 'right'));
            })
            // make them initially disabled
            .prop('disabled', true);
        // give plotboard the correct initial value
        plotboard.setSortingEnd(radios.find(':checked').val() as 'left' | 'right');
        // enable/disable when state changes
        simulator.on('stateChange', (e) => {
            radios.prop('disabled', e.state !== 'draw');
        });
    }

    configureSortingEndpointRadios();

    function configureAlgoButtons() {
        const algoBtn = {
            all: $('#algo-buttons button'),
            start: $('#algo-start'),
            recurse: $('#algo-recurse'),
            undoRecurse: $('#algo-undo-recurse'),
            finishSubtree: $('#algo-finish-subtree'),
        };

        // enable/disable buttons
        // disable all algorithmic buttons initially
        algoBtn.all.prop('disabled', true);
        plotboard.on('newSegment', () => algoBtn.start.prop('disabled', false));

        function updateAlgoBtn() {
            algoBtn.recurse.prop('disabled', !simulator.canSimulate('recurse'));
            algoBtn.undoRecurse.prop('disabled', !simulator.canSimulate('undoRecurse'));
            algoBtn.finishSubtree.prop('disabled', !simulator.canSimulate('finishSubtree'));
        }

        simulator.on('algorithmReset', updateAlgoBtn);
        simulator.on('algorithmStateChange', updateAlgoBtn);

        // update text and style of start button
        simulator.on('stateChange', (e) => {
            switch (e.state) {
                case 'draw':
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

        // handle click events
        algoBtn.start.on('click', () => {
            const state = simulator.getState();
            if (state === 'draw' && plotboard.getSegments().length > 0) simulator.build(plotboard.getSegments());
            else if (state === 'build') simulator.query(plotboard.getQuery());
            else window.location.reload();
        });
        algoBtn.recurse.on('click', () => simulator.simulate('recurse'));
        algoBtn.undoRecurse.on('click', () => simulator.simulate('undoRecurse'));
        algoBtn.finishSubtree.on('click', () => simulator.simulate('finishSubtree'));
    }

    configureAlgoButtons();

    // configure the two boards
    // TODO: decouple the dependency of plotboard's color on treeboard, in order to separate configuration of two boards
    // TODO: rewrite drawing process of tree
    simulator.on('stateChange', (e) => {
        if (e.state === 'build') {
            plotboard.finalizeChanges();

            if (treeboard === undefined) {
                treeboard = new TreeBoard('treeboard', simulator.tree!);

                treeboard.on('hoverNode', (event) => {
                    batchUpdate(plotboard.board, () => {
                        if (event.prevNode !== undefined) plotboard.removeMedian('hover');
                        if (event.node !== undefined) {
                            const color = treeboard!.graphNode(event.node)!.getAttribute('highlightFillColor');
                            plotboard.addMedian(event.node.median, event.node.segmentsLeftSorted, color, true, 'hover');
                        }
                    });
                });
            }
            batchUpdate(treeboard!.board, () => {
                treeboard?.setSubtreeVisible(simulator.tree!.root, false);
                treeboard?.setNodeVisible(simulator.tree!.root, true);
            });
        } else if (e.state === 'query') {
            batchUpdate(plotboard.board, () => {
                for (const n of simulator.tree!.bfs()) plotboard.setMedianVisible(n.median, false);
            });
            plotboard.showQueryLine();

            batchUpdate(treeboard!.board, () => treeboard!.setSubtreeVisible(simulator.tree!.root, true));
        }
    });

    simulator.on('algorithmReset', (e) => {
        if (e.simState === 'build') {
            const palette = new Palette();
            for (const n of e.tree.bfs()) {
                const color = treeboard?.graphNode(n)!.getAttribute('strokeColor') ?? palette.get();
                plotboard.addMedian(n.median, n.segmentsLeftSorted, color);
            }
            batchUpdate(plotboard.board, () => plotboard.setMedianVisible(e.algoState.treeNode.median, true));

            treeboard?.focusNode(e.algoState.treeNode);
        } else if (e.simState === 'query') {
            batchUpdate(plotboard.board, () => {
                for (const n of e.tree.bfs()) setOrDelDelQueryMedian(n, [], false);
                setOrDelDelQueryMedian(e.algoState.treeNode, e.algoState.involvedSegs, true);
            });
        }
    });

    function setTreeNodeDisplay(node: TreeNode, visible: boolean) {
        plotboard.setMedianVisible(node.median, visible);
        treeboard?.setNodeVisible(node, visible);
    }

    function setOrDelDelQueryMedian(node: TreeNode, segs: Segment[], setOrDel: boolean) {
        const color = treeboard!.graphNode(node)!.getAttribute('strokeColor');
        if (setOrDel) plotboard.addMedian(node.median, segs, color, true, node.median + 'query');
        else plotboard.removeMedian(node.median + 'query');
    }

    simulator.on('algorithmStateChange', (e) => {
        switch (simulator.getState()) {
            case 'build':
                batchUpdate([treeboard!.board, plotboard.board], () => {
                    treeboard!.focusNode(e.currState.treeNode);
                    e.addedTreeNodesSegs.forEach((s, n) => setTreeNodeDisplay(n, true));
                    e.removedTreeNodesSegs.forEach((s, n) => setTreeNodeDisplay(n, false));
                });
                break;
            case 'query':
                batchUpdate(plotboard.board, () => {
                    e.addedTreeNodesSegs.forEach((s, n) => setOrDelDelQueryMedian(n, s, true));
                    e.removedTreeNodesSegs.forEach((s, n) => setOrDelDelQueryMedian(n, s, false));
                });
                treeboard!.focusNode(e.currState.treeNode);
                break;
        }
    });

    plotboard.on('queryLineChange', (x) => simulator.query(x));
});
