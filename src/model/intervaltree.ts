import { Segment } from 'jsxgraph';
import { endpoints, horizontalRelation } from '../utils/math';
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
        const segmentsLeftSorted = segments.slice(),
            segmentsRightSorted = segments.slice();
        segmentsLeftSorted.sort(
            (l1, l2) => endpoints(l1).left.coords.usrCoords[1] - endpoints(l2).left.coords.usrCoords[1]
        );
        segmentsRightSorted.sort(
            (l1, l2) => endpoints(l2).right.coords.usrCoords[1] - endpoints(l1).right.coords.usrCoords[1]
        );
        this.root = this.makeNode(undefined, segmentsLeftSorted, segmentsRightSorted, 0) as TreeNode;
        this.height = this.root.height;
    }

    private makeNode(
        parent: TreeNode | undefined,
        linesLeftSorted: Segment[],
        linesRightSorted: Segment[],
        peerIdx: number
    ) {
        const n = linesLeftSorted.length;

        if (n === 0) return undefined; // base case

        const v: TreeNode = {
            parent: parent,
            childLeft: undefined,
            childRight: undefined,
            depth: parent === undefined ? 0 : parent.depth + 1,
            height: 1,
            peerIdx: peerIdx,
            median: 0,
            segmentsLeftSorted: [],
            segmentsRightSorted: [],
        };

        // find median
        let il = 0,
            ir = n - 1,
            cnt = 0;
        while (cnt < n) {
            const xl = il >= n ? undefined : endpoints(linesLeftSorted[il]).left.coords.usrCoords[1],
                xr = ir < 0 ? undefined : endpoints(linesRightSorted[ir]).right.coords.usrCoords[1];
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
        const ll: Segment[] = [],
            lr: Segment[] = [],
            rl: Segment[] = [],
            rr: Segment[] = [];
        for (const l of linesLeftSorted) {
            const r = horizontalRelation(l, v.median);
            (r < 0 ? ll : r > 0 ? rl : v.segmentsLeftSorted).push(l);
        }
        for (const l of linesRightSorted) {
            const r = horizontalRelation(l, v.median);
            (r < 0 ? lr : r > 0 ? rr : v.segmentsRightSorted).push(l);
        }

        // do recursion
        v.childLeft = this.makeNode(v, ll, lr, peerIdx * 2);
        v.childRight = this.makeNode(v, rl, rr, peerIdx * 2 + 1);

        if (v.childLeft !== undefined) v.height = v.childLeft.height + 1;
        if (v.childRight !== undefined) v.height = Math.max(v.height, v.childRight.height + 1);

        this.nodes[(1 << v.depth) - 1 + v.peerIdx] = v;

        return v;
    }

    bfs(callbackFn: (treeNode: TreeNode) => void) {
        const queue = new Queue<TreeNode>();
        queue.push(this.root);
        while (queue.size() > 0) {
            const node = queue.pop()!;
            if (node.childLeft !== undefined) queue.push(node.childLeft);
            if (node.childRight !== undefined) queue.push(node.childRight);
            callbackFn(node);
        }
    }
}
