import * as $ from 'jquery';

import { PlotBoard } from './components/plotboard';
import { IntervalTreeSimulator } from './model/simulator';
import { TreeBoard } from './components/treeboard';
import { TreeNode } from './model/intervaltree';
import { Segment } from 'jsxgraph';
import { Palette } from './utils/palette';

$(() => {
    const simulator = new IntervalTreeSimulator();

    const plotboard = new PlotBoard('plotboard');
    let treeboard: TreeBoard | undefined = undefined;

    const populateForm = $('#populate');
    populateForm.on('submit', (event) => {
        plotboard.populateSegments(parseInt($('#populate-count').val() as string));
        event.preventDefault();
    });

    const algoBtn = {
        all: $('#algo-buttons button'),
        start: $('#algo-start'),
        recurse: $('#algo-recurse'),
        undoRecurse: $('#algo-undo-recurse'),
        finishSubtree: $('#algo-finish-subtree'),
    };

    algoBtn.recurse.on('click', () => simulator.simulate('recurse'));
    algoBtn.undoRecurse.on('click', () => simulator.simulate('undoRecurse'));
    algoBtn.finishSubtree.on('click', () => simulator.simulate('finishSubtree'));

    function updateAlgoBtn() {
        algoBtn.recurse.prop('disabled', !simulator.canSimulate('recurse'));
        algoBtn.undoRecurse.prop('disabled', !simulator.canSimulate('undoRecurse'));
        algoBtn.finishSubtree.prop('disabled', !simulator.canSimulate('finishSubtree'));
    }

    simulator.on('stateChange', (e) => {
        if (e.state !== 'add') {
            populateForm.find(':input').prop('disabled', true);
            $('[name=sort-endpoint]').prop('disabled', false);
            treeboard?.setSimulationMode(e.state);
        }
        if (e.state === 'build') plotboard.finalizeChanges();
        if (e.state === 'query') {
            simulator.tree?.nodes.forEach((n) => {
                if (n !== undefined) plotboard.setMedianVisible(n.median, false);
            });
            plotboard.showQueryLine();
        }
    });

    simulator.on('algorithmReset', (e) => {
        updateAlgoBtn();
        switch (e.simState) {
            case 'build':
                {
                    const palette = new Palette();
                    e.tree.bfs((n) => {
                        const color = treeboard?.graphNode(n)!.getAttribute('strokeColor') ?? palette.get();
                        plotboard.addMedian(n.median, n.segmentsLeftSorted, color);
                    });

                    plotboard.setMedianVisible(e.algoState.treeNode.median, true);
                }
                break;
            case 'query':
                {
                    const palette = new Palette();
                    setOrDelDelQueryMedian(e.algoState.treeNode, e.algoState.involvedSegs, true);
                }
                break;
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
        updateAlgoBtn();
        switch (simulator.getState()) {
            case 'build':
                treeboard?.board.suspendUpdate();

                treeboard?.focusNode(e.currState.treeNode);
                e.addedTreeNodesSegs.forEach((s, n) => setTreeNodeDisplay(n, true));
                e.removedTreeNodesSegs.forEach((s, n) => setTreeNodeDisplay(n, false));

                treeboard?.board.unsuspendUpdate();
                break;
            case 'query':
                e.addedTreeNodesSegs.forEach((s, n) => setOrDelDelQueryMedian(n, s, true));
                e.removedTreeNodesSegs.forEach((s, n) => setOrDelDelQueryMedian(n, s, false));
                treeboard?.focusNode(e.currState.treeNode);
                break;
        }
    });

    plotboard.on('newSegment', () => algoBtn.start.prop('disabled', false));

    plotboard.on('queryLineChange', (x) => {
        simulator.tree?.nodes.forEach((node) => {
            if (node !== undefined) plotboard.removeMedian(node.median + 'query');
        });
        simulator.query(x);
    });

    // disable all algorithmic buttons initially
    algoBtn.all.prop('disabled', true);

    // action of #algo-start
    algoBtn.start.on('click', () => {
        switch (simulator.getState()) {
            case 'add':
                if (plotboard.getSegments().length > 0) simulator.build(plotboard.getSegments());
                break;
            case 'build':
                simulator.query(plotboard.getQuery());
                break;
            case 'query':
                window.location.reload();
                break;
        }
    });

    // toggle state of #algo-start
    simulator.on('stateChange', (e) => {
        switch (e.state) {
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

    plotboard.setSortingEnd($('[name=sort-endpoint]:checked').val() as 'left' | 'right');
    $('[name=sort-endpoint]')
        .each((idx, ele) => {
            $(ele).on('change', (event) => {
                plotboard.setSortingEnd($(event.target).val() as 'left' | 'right');
            });
        })
        .prop('disabled', true);

    simulator.on('stateChange', (e) => {
        if (e.state === 'build' && treeboard === undefined) {
            // setup treeboard
            treeboard = new TreeBoard('treeboard', plotboard.getSegments());

            treeboard.on('hoverNode', (event) => {
                if (event.prevNode !== undefined) plotboard.removeMedian('hover');
                if (event.node !== undefined) {
                    plotboard.addMedian(
                        event.node.median,
                        event.node.segmentsLeftSorted,
                        treeboard!.graphNode(event.node)!.getAttribute('highlightFillColor'),
                        true,
                        'hover'
                    );
                }
            });
        }
    });
});
