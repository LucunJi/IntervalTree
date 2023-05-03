import {Line} from 'jsxgraph';
import {endpoints, horizontalRelation} from './utils';

export type TreeNode = {
    parent?: TreeNode, childLeft?: TreeNode, childRight?: TreeNode,
    depth: number, height: number, peerIdx: number,
    median: number, linesLeftSorted: Line[], linesRightSorted: Line[]
}

export class IntervalTree {
    readonly root: Readonly<TreeNode>;
    readonly nodes: (TreeNode | undefined)[] = []; // a list of nodes, some positions might be undefined
    readonly height: number;

    constructor(lines: Line[]) {
        let linesLeftSorted = lines.slice(),
            linesRightSorted = lines.slice();
        linesLeftSorted.sort((l1, l2) =>
            endpoints(l1).left.coords.usrCoords[1] - endpoints(l2).left.coords.usrCoords[1]);
        linesRightSorted.sort((l1, l2) =>
            endpoints(l2).right.coords.usrCoords[1] - endpoints(l1).right.coords.usrCoords[1]);
        this.root = this.makeNode(undefined, linesLeftSorted, linesRightSorted, 0) as TreeNode;
        this.height = this.root.height;
    }

    private makeNode(parent: TreeNode | undefined, linesLeftSorted: Line[], linesRightSorted: Line[], peerIdx: number) {
        const n = linesLeftSorted.length;

        if (n === 0) return undefined; // base case

        let v: TreeNode = {
            parent: parent, childLeft: undefined, childRight: undefined,
            depth: parent === undefined ? 0 : parent.depth + 1, height: 1, peerIdx: peerIdx,
            median: 0, linesLeftSorted: [], linesRightSorted: []
        }

        // find median
        let il = 0, ir = n - 1, cnt = 0;
        while (cnt < n) {
            let xl = il >= n ?
                    undefined : endpoints(linesLeftSorted[il]).left.coords.usrCoords[1],
                xr = ir < 0 ?
                    undefined : endpoints(linesRightSorted[ir]).right.coords.usrCoords[1];
            if (xr === undefined || (xl as number) < xr) {
                v.median = xl as number;
                il++;
            } else {
                v.median = xr as number;
                ir--;
            }
            cnt++;
        }

        // split two sorted lists according to relation to the median into 2 parts
        let ll: Line[] = [], lr: Line[] = [], rl: Line[] = [], rr: Line[] = [];
        for (let l of linesLeftSorted) {
            let r = horizontalRelation(l, v.median);
            (r < 0 ? ll : (r > 0 ? rl : v.linesLeftSorted)).push(l)
        }
        for (let l of linesRightSorted) {
            let r = horizontalRelation(l, v.median);
            (r < 0 ? lr : (r > 0 ? rr : v.linesRightSorted)).push(l)
        }

        // do recursion
        v.childLeft = this.makeNode(v, ll, lr, peerIdx * 2);
        v.childRight = this.makeNode(v, rl, rr, peerIdx * 2 + 1);

        if (v.childLeft !== undefined) v.height = v.childLeft.height + 1;
        if (v.childRight !== undefined) v.height = Math.max(v.height, v.childRight.height + 1);

        this.nodes[(1 << v.depth) - 1 + v.peerIdx] = v;

        return v;
    }
}