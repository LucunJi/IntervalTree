let runningAlgorithm = false;

function getPointsOrdered(line) {
    let names = line.getParents();
    let p1 = line.ancestors[names[0]],
        p2 = line.ancestors[names[1]];
    return p1.coords.usrCoords[1] < p2.coords.usrCoords[1] ?
        [p1, p2] : [p2, p1];
}

/**
 * Returns -1, 0, 1 when line is to the left of, intersect with, or to the right of x
 */
function horizontalRelation(line, x) {
    let ps = getPointsOrdered(line),
        x1 = ps[0].coords.usrCoords[1],
        x2 = ps[1].coords.usrCoords[1];
    if (x > x2) return -1;
    else if (x < x1) return 1;
    else return 0;
}

function beginAlgorithm(plotboard, treeboard) {

    let lines = [];
    for (let obj of plotboard.objectsList)
        if (obj.getType() === 'line') lines.push(obj);

    if (lines.length < 1) {
        return;
    }

    // disable functionalities relating to adding and changing points
    for (let obj of plotboard.objectsList)
        if (obj.getType() === 'line' || obj.getType() === 'point') obj.isDraggable = false;
    $('#random-generate').attr('disabled', true);
    runningAlgorithm = true;

    let tree = makeTree(lines);
}

function makeTree(lines) {
    let linesLeftSorted = lines.slice(),
        linesRightSorted = lines.slice();
    linesLeftSorted.sort((l1, l2) =>
        getPointsOrdered(l1)[0].coords.usrCoords[1] - getPointsOrdered(l2)[0].coords.usrCoords[1]);
    linesRightSorted.sort((l1, l2) =>
        getPointsOrdered(l2)[1].coords.usrCoords[1] - getPointsOrdered(l1)[1].coords.usrCoords[1]);
    return makeNode(null, linesLeftSorted, linesRightSorted);
}

function makeNode(parent, linesLeftSorted, linesRightSorted) {
    const n = linesLeftSorted.length;

    // base case
    if (n === 0) return null;

    // node
    let v = {
        parent: parent,
        childLeft: undefined,
        childRight: undefined,
        median: 0,
        linesLeftSorted: [],
        linesRightSorted: []
    }

    // find median
    let il = 0, ir = n - 1, cnt = 0;
    while (cnt < n) {
        let xl = il >= n ?
                undefined : getPointsOrdered(linesLeftSorted[il])[0].coords.usrCoords[1],
            xr = ir < 0 ?
                undefined : getPointsOrdered(linesRightSorted[ir])[1].coords.usrCoords[1];
        if (xr === undefined || xl < xr) {
            v.median = xl;
            il++;
        } else {
            v.median = xr
            ir--;
        }
        cnt++;
    }

    // split two sorted lists according to relation to the median into 2 parts
    let ll = [], lr = [],
        rl = [], rr = [];
    for (let l of linesLeftSorted) {
        let r = horizontalRelation(l, v.median);
        if (r < 0) ll.push(l);
        else if (r === 0) v.linesLeftSorted.push(l);
        else rl.push(l);
    }
    for (let l of linesRightSorted) {
        let r = horizontalRelation(l, v.median);
        if (r < 0) lr.push(l);
        else if (r === 0) v.linesRightSorted.push(l);
        else rr.push(l);
    }

    console.log(n, ll.length, lr.length, v.linesLeftSorted.length, v.linesRightSorted.length, rl.length, rr.length)
    // do recursion
    v.childLeft = makeNode(v, ll, lr);
    v.childRight = makeNode(v, rl, rr);

    return v;
}
