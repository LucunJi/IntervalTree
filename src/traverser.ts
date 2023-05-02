import {IntervalTree, TreeNode} from './intervaltree';

/**
 * it traverses the tree,
 * can be used to simulate building and querying.
 *
 * it always traverses to the left child first
 */
export interface Traverser {
    canRecurse(): boolean;

    /**
     * move to the left or right child if possible
     */
    recurse(): void;

    // canUndoRecurse(): boolean;
    // undoRecurse(): void;

    // canFinishSubtree(): boolean;
    /**
     * finish the current subtree and move to the first unfinished parent or the root
     */
    // finishSubtree(): void;
}

export class BuildingTraverser implements Traverser {
    private currNode: TreeNode;
    private prevNode?: TreeNode;

    constructor(private readonly tree: IntervalTree) {
        this.currNode = tree.root;
    }

    canRecurse() {
        if (this.prevNode === undefined || this.prevNode === this.currNode.parent) {
            return this.currNode.childLeft !== undefined || this.currNode.childRight !== undefined;
        } else if (this.prevNode === this.currNode.childLeft) {
            return this.currNode.childRight !== undefined;
        } else { // then it must be on the right child and finishing the subtree
            return false;
        }
    }

    recurse(): void {
        if (!this.canRecurse()) return;

        this.prevNode = this.currNode;
        if (this.prevNode === undefined || this.prevNode === this.currNode.parent) {
            this.currNode = this.currNode.childLeft !== undefined ?
                this.currNode.childLeft : this.currNode.childRight!;
        } else {
            this.currNode = this.currNode.childRight!;
        }
    }
}