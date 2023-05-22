import * as $ from 'jquery';

import { PlotBoard } from './components/plotboard';
import { IntervalTreeSimulator } from './model/simulator';
import { TreeBoard } from './components/treeboard';
import { TreeNode } from './model/intervaltree';
import { Segment } from 'jsxgraph';
import { hrange } from './utils/math';
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
        updateAlgoBtn();
        if (e.state === 'build') {
            plotboard.finalizeChanges();
            const palette = new Palette();
            // FIXME: correct color
            simulator.tree!.bfs((node) => plotboard.addMedian(node.median, node.segmentsLeftSorted, palette.get()));
            plotboard.setMedianVisible(simulator.tree!.root.median, true);
            populateForm.find(':input').prop('disabled', true);
        }
    });

    function setTreeNodeDisplay(node: TreeNode, visible: boolean) {
        plotboard.setMedianVisible(node.median, visible);
        treeboard?.setNodeVisible(node, visible);
    }

    simulator.on('algorithmStateChange', (event) => {
        updateAlgoBtn();
        if (simulator.getState() === 'build') {
            treeboard?.board.suspendUpdate();

            treeboard?.focusNode(event.currState.treeNode);
            event.addedTreeNodes.forEach((node) => setTreeNodeDisplay(node, true));
            event.removedTreeNodes.forEach((node) => setTreeNodeDisplay(node, false));

            treeboard?.board.unsuspendUpdate();
        }
    });

    plotboard.on('newSegment', () => algoBtn.start.prop('disabled', false));

    // disable all algorithmic buttons initially
    algoBtn.all.prop('disabled', true);

    // action of #algo-start
    algoBtn.start.on('click', () => {
        if (simulator.getState() === 'add' && plotboard.getSegments().length === 0) return;
        $('[name=sort-endpoint]').prop('disabled', false);
        if (simulator.getState() === 'add') simulator.build(plotboard.getSegments());
        else if (simulator.getState() !== 'query') simulator.next();
        else window.location.reload();
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

    function updateRecursionStatus(board: TreeBoard, currNode: TreeNode) {
        if (simulator.getState() === 'query') {
            algoBtn.recurse.prop('disabled', !board.canRecurse());
            algoBtn.undoRecurse.prop('disabled', !board.canUndoRecurse());
            algoBtn.finishSubtree.prop('disabled', !board.canFinishSubtree());
        }

        if (board.getMode() === 'build') {
            //
        } else {
            // show the median for the current node and its ancestors
            for (let node: TreeNode | undefined = currNode; node !== undefined; node = node.parent) {
                let intersections: Segment[] = [];
                const x = board.queryLocation!;
                if (x < currNode.median) {
                    intersections = node.segmentsLeftSorted.filter((s) => hrange(s).left <= x);
                } else if (x > currNode.median) {
                    intersections = node.segmentsLeftSorted.filter((s) => hrange(s).right >= x);
                } else {
                    intersections = node.segmentsLeftSorted.slice();
                }
                plotboard.addMedian(
                    node.median,
                    intersections,
                    board.graphNode(node)!.getAttribute('strokeColor'),
                    true,
                    node.median + 'query'
                );
            }

            // remove medians for the siblings in case of undoing recursion
            for (let i = (1 << currNode.depth) - 1 + currNode.peerIdx + 1; i < board.tree.nodes.length; i++) {
                const node = board.tree.nodes[i];
                if (node !== undefined) plotboard.removeMedian(node.median + 'query');
            }
        }
    }

    simulator.on('stateChange', (e) => {
        if (e.state === 'build' && treeboard === undefined) {
            // setup treeboard
            treeboard = new TreeBoard('treeboard', plotboard.getSegments());

            // plotboard.onQueryLineChange((n) => {
            plotboard.on('queryLineChange', (n) => {
                for (const node of treeboard!.tree.nodes) {
                    if (node === undefined) continue;
                    plotboard.removeMedian(node.median + 'query');
                }
                treeboard?.simulateQuery(n);
            });

            simulator.on('stateChange', (e) => {
                if (e.state !== 'add') treeboard?.setSimulationMode(e.state);
                if (e.state === 'query') plotboard.showQueryLine();
            });

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

            treeboard.on('recursionUpdate', (event) => updateRecursionStatus(treeboard!, event.currNode));

            algoBtn.recurse.on('click', () => {
                if (simulator.getState() === 'query') treeboard!.recurse();
            });
            algoBtn.undoRecurse.on('click', () => {
                if (simulator.getState() === 'query') treeboard!.undoRecurse();
            });
            algoBtn.finishSubtree.on('click', () => {
                if (simulator.getState() === 'query') treeboard!.finishSubtree();
            });

            updateRecursionStatus(treeboard, treeboard.tree.root);
        } else if (e.state === 'query' && treeboard !== undefined) {
            for (const n of treeboard.tree.nodes) {
                if (n === undefined) continue;
                plotboard.setMedianVisible(n.median, false);
            }
        }
    });
});
