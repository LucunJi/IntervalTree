import { Segment } from 'jsxgraph';
import { endpoints, horizontalRelation, hrange } from '../utils/math';
import { Queue } from 'js-sdsl';

export type TreeNode = {
    parent?: TreeNode;
    childLeft?: TreeNode;
    childRight?: TreeNode;
    depth: number;
    height: number;
    peerIdx: number;
    median: number;
    segmentsLeftSorted: Segment[];
    segmentsRightSorted: Segment[];
};

export class IntervalTree {
    readonly root: Readonly<TreeNode>;
    readonly nodes: (TreeNode | undefined)[] = []; // a sparse list of nodes
    readonly height: number;

    constructor(segments: Segment[]) {
        if (segments.length === 0) throw new Error('Input array is empty');

        const segmentsLeftSorted = segments.slice().sort((s1, s2) => hrange(s1).left - hrange(s2).left);
        const segmentsRightSorted = segments.slice().sort((s1, s2) => hrange(s2).right - hrange(s1).right);
        this.root = IntervalTree.makeNode(undefined, segmentsLeftSorted, segmentsRightSorted, 0) as TreeNode;

        this.height = this.root.height;
        for (const n of this.bfs()) this.nodes[(1 << n.depth) - 1 + n.peerIdx] = n;
    }

    private static makeNode(
        parent: TreeNode | undefined,
        linesLeftSorted: Segment[],
        linesRightSorted: Segment[],
        peerIdx: number
    ): TreeNode | undefined {
        const n = linesLeftSorted.length;

        if (n === 0) return undefined; // base case

        const median = IntervalTree.medianPoint(linesLeftSorted, linesRightSorted);
        const { l: ll, m: segmentsLeftSorted, r: rl } = IntervalTree.splitSegmentList(linesLeftSorted, median);
        const { l: lr, m: segmentsRightSorted, r: rr } = IntervalTree.splitSegmentList(linesRightSorted, median);
        const depth = parent === undefined ? 0 : parent.depth + 1;

        // height = 1 by default for the lowest layer of tree
        const v: TreeNode = { parent, depth, height: 1, peerIdx, median, segmentsLeftSorted, segmentsRightSorted };

        // do recursion
        v.childLeft = this.makeNode(v, ll, lr, peerIdx * 2);
        v.childRight = this.makeNode(v, rl, rr, peerIdx * 2 + 1);

        if (v.childLeft !== undefined) v.height = v.childLeft.height + 1;
        if (v.childRight !== undefined) v.height = Math.max(v.height, v.childRight.height + 1);

        return v;
    }

    private static medianPoint(leftSorted: Segment[], rightSorted: Segment[]): number {
        const n = leftSorted.length;
        let ret = 0,
            il = 0,
            ir = n - 1;
        for (let cnt = 0; cnt < n; cnt++) {
            const xl = il >= n ? undefined : endpoints(leftSorted[il]).left.coords.usrCoords[1],
                xr = ir < 0 ? undefined : endpoints(rightSorted[ir]).right.coords.usrCoords[1];
            if (xr === undefined || (xl as number) < xr) {
                ret = xl as number;
                il++;
            } else {
                ret = xr as number;
                ir--;
            }
        }

        return ret;
    }

    private static splitSegmentList(segments: Segment[], x: number) {
        const ret: Record<'l' | 'm' | 'r', Segment[]> = { l: [], m: [], r: [] };
        for (const s of segments) {
            const rel = horizontalRelation(s, x);
            (rel < 0 ? ret.l : rel === 0 ? ret.m : ret.r).push(s);
        }
        return ret;
    }

    *bfs() {
        const queue = new Queue<TreeNode>();
        queue.push(this.root);
        while (queue.size() > 0) {
            const node = queue.pop()!;
            if (node.childLeft !== undefined) queue.push(node.childLeft);
            if (node.childRight !== undefined) queue.push(node.childRight);
            yield node;
        }
    }
}
