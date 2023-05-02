import {Line} from 'jsxgraph';
import {getPointsOrdered, horizontalRelation} from './utils';

export type TreeNode = {
    parent?: TreeNode,
    childLeft?: TreeNode,
    childRight?: TreeNode,

    depth: number,
    height: number,
    npeer: number,

    median: number,
    linesLeftSorted: Line[],
    linesRightSorted: Line[]
}

export class IntervalTree {
    readonly root: Readonly<TreeNode>;
    readonly height: number;

    constructor(lines: Line[]) {
        let linesLeftSorted = lines.slice(),
            linesRightSorted = lines.slice();
        linesLeftSorted.sort((l1, l2) =>
            getPointsOrdered(l1)[0].coords.usrCoords[1] - getPointsOrdered(l2)[0].coords.usrCoords[1]);
        linesRightSorted.sort((l1, l2) =>
            getPointsOrdered(l2)[1].coords.usrCoords[1] - getPointsOrdered(l1)[1].coords.usrCoords[1]);
        this.root = this.makeNode(undefined, linesLeftSorted, linesRightSorted, 1) as TreeNode;
        this.height = this.root.height;
    }

    private makeNode(parent: TreeNode | undefined, linesLeftSorted: Line[], linesRightSorted: Line[], npeer: number) {
        const n = linesLeftSorted.length;

        // base case
        if (n === 0) return undefined;

        // node
        let v: TreeNode = {
            parent: parent,
            childLeft: undefined,
            childRight: undefined,

            depth: parent === undefined ? 0 : parent.depth + 1,
            height: 1,
            npeer: npeer,

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
        let ll = [], lr = [], rl = [], rr = [];
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

        // do recursion
        v.childLeft = this.makeNode(v, ll, lr, npeer * 2 - 1);
        v.childRight = this.makeNode(v, rl, rr, npeer * 2);

        if (v.childLeft !== undefined) v.height = v.childLeft.height + 1;
        if (v.childRight !== undefined) v.height = Math.max(v.height, v.childRight.height + 1);

        return v;
    }
}