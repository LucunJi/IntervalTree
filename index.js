// in user coordinates
const PLOT_XRANGE = [-10, 10];
const PLOT_YRANGE = [-10, 10];
const TREE_XRANGE = [-10, 10];
const TREE_YRANGE = [-10, 10];
// a small number to fix inaccuracy of floating point arithmetic
const EPSILON = 1e-12;

$().ready(() => {
    let plotboard = JXG.JSXGraph.initBoard('plotboard', {
        boundingbox: [PLOT_XRANGE[0], PLOT_YRANGE[1], PLOT_XRANGE[1], PLOT_YRANGE[0]],
        showCopyright: false,
        // navigation buttons can interfere with user inputs
        showNavigation: false,
        pan: {enabled: false},
        zoom: {wheel: false}
    });

    plotboard.on('down', event => addSegment(event, plotboard));
    plotboard.on('move', event => moveEndpointWhenAdding(event, plotboard));
    plotboard.on('up', finishAddSegment);

    $('#random-generate').on('click', () => generateSegments(plotboard));


    let treeboard = JXG.JSXGraph.initBoard('treeboard', {
        boundingbox: [TREE_XRANGE[0], TREE_YRANGE[1], TREE_XRANGE[1], TREE_YRANGE[0]],
        showCopyright: false
    });

    $('#algo-start').on('click', () => beginAlgorithm(plotboard, treeboard));
});

/**
 * Create a new segment in Board
 * @param plotboard
 * @param coords1 coordinates in [x, y] format
 * @param coords2 coordinates in [x, y] format
 */
function newSegment(plotboard, coords1, coords2) {
    let p1 = plotboard.create('point', coords1, {withLabel: false}),
        p2 = plotboard.create('point', coords2, {withLabel: false}),
        l = plotboard.create('line', [p1, p2], {straightFirst: false, straightLast: false});
    return {p1: p1, p2: p2, l: l};
}

/**
 * a random floating point number in a range
 */
function random(min, max) {
    return Math.random() * (max - min) + min;
}

let creatingLine = undefined;

/**
 * create a line by dragging
 */
function addSegment(event, plotboard) {
    if (runningAlgorithm) return;
    if (plotboard.getAllObjectsUnderMouse(event).length > 0) return;

    let coords = plotboard.getUsrCoordsOfMouse(event);
    creatingLine = newSegment(plotboard, coords, coords);
    let p1 = creatingLine.p1, p2 = creatingLine.p2, l = creatingLine.l;

    // make lines still horizontal after adjusting
    p1.on('drag', () =>
        p2.setPosition(JXG.COORDS_BY_USER, [p2.coords.usrCoords[1], p1.coords.usrCoords[2]])
    );
    p2.on('drag', () =>
        p1.setPosition(JXG.COORDS_BY_USER, [p1.coords.usrCoords[1], p2.coords.usrCoords[2]])
    );
}

function finishAddSegment() {
    if (runningAlgorithm) return;

    creatingLine = undefined;
}

/**
 * handle dragging when creating a line
 */
function moveEndpointWhenAdding(event, plotboard) {
    if (runningAlgorithm) return;

    if (creatingLine !== undefined) {
        const coords = plotboard.getUsrCoordsOfMouse(event);
        creatingLine.p1.setPosition(JXG.COORDS_BY_USER,
            [creatingLine.p1.coords.usrCoords[1], coords[1]]);
        creatingLine.p2.setPosition(JXG.COORDS_BY_USER, coords);
        plotboard.update();
    }
}

function generateSegments(plotboard) {
    let inputBox = $('#random-number');
    let n = inputBox.val();
    if (isNaN(n) || n < 1 || n > 100) {
        inputBox.val(10);
        return;
    }

    const xrange = (PLOT_XRANGE[1] - PLOT_XRANGE[0]) * 0.95,
        xmin = PLOT_XRANGE[0] + (PLOT_XRANGE[1] - PLOT_XRANGE[0] - xrange) / 2,
        xmax = xmin + xrange,
        yrange = (PLOT_YRANGE[1] - PLOT_YRANGE[0]) * 0.95,
        ystep = yrange / n,
        ymin = PLOT_YRANGE[0] + (PLOT_YRANGE[1] - PLOT_YRANGE[0] - yrange) / 2,
        ymax = ymin + yrange;
    const minlength = xrange * 0.04;

    for (let y = ymin; y < ymax + EPSILON; y += ystep) {
        let x1 = random(xmin, xmax - minlength),
            x2 = random(x1 + minlength, xmax);
        newSegment(plotboard, [x1, y], [x2, y]);
    }
}
