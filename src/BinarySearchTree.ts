import BinarySearchTreeNode from "./BinarySearchTreeNode";

interface Comparator<T> {
    (a: T, b: T): number;
}

interface IParams<T> {
    cmp: Comparator<T>;
}

class BinarySearchTree<T extends Object> {
    private readonly cmp: Comparator<T>;
    root: BinarySearchTreeNode<T> | null = null;

    constructor(params: IParams<T>) {
        this.cmp = params.cmp;
    }

    insert(t: T) {
        if (!this.root) {
            this.root = new BinarySearchTreeNode<T>({data: t})
        } else {
            [this.root, ] = this.root.insert(t, this.cmp);
        }
    }

    remove(t: T): boolean {
        if (!this.root) {
            return false;
        }

        let ret;
        [this.root, ret] = this.root.remove(t, this.cmp);
        return ret;
    }

    /** Removes all elements **/
    clear(): void {
        if (!this.root) {
            console.log("No Root!")
            return;
        }

        console.log("clearing root!")
        this.root.clear();
        console.log("Nulling root!")
        this.root = null;
        console.log("nulled root!")
    }

    find(t: T, cmp: Comparator<T> | null = null): T | null {
        cmp = cmp || this.cmp
        if (!this.root) {
            return null;
        }

        return this.root.find(t, cmp) || null;
    }

    first(): T | null {
        if (!this.root) {
            return null;
        }

        let node = this.root;
        while(node.left) {
            node = node.left;
        }

        return node.data;
    }

    popFirst(): T | null {
        if (!this.root) {
            return null;
        }

        let [node, val] = this.root.popFirst();
        this.root = node;
        return val;
    }

    size(): number {
        return this.root?.weight || 0;
    }

    [Symbol.iterator]() {
        return inOrderIterator(this);
    }
}


function* inOrderIterator<T>(bst: BinarySearchTree<T>): Generator<T> {
    if (bst.root === null) {
        return;
    }

    let stack = [];
    let current: BinarySearchTreeNode<T> | null = bst.root;

    while (current || stack.length) {
        while (current) {
            stack.push(current);
            current = current.left;
        }

        // @ts-ignore
        let ret: BinarySearchTreeNode<T> = stack.pop();
        yield ret.data;
        if (ret.right) {
            current = ret.right;
        }
    }

    return;
}

export default BinarySearchTree;