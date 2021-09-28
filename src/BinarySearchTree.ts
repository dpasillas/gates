import BinarySearchTreeNode from "./BinarySearchTreeNode";

interface Comparator<T> {
    (a: T, b: T): number;
}

interface IParams<T> {
    comp: Comparator<T>;
}

class BinarySearchTree<T extends Object> {
    private readonly comp: Comparator<T>;
    root: BinarySearchTreeNode<T> | null = null;

    constructor(params: IParams<T>) {
        this.comp = params.comp;
    }

    insert(t: T) {
        if (!this.root) {
            this.root = new BinarySearchTreeNode<T>({data: t})
        } else {
            [this.root, ] = this.root.insert(t, this.comp);
        }
    }

    remove(t: T): boolean {
        if (!this.root) {
            return false;
        }

        let ret;
        [this.root, ret] = this.root.remove(t, this.comp) ;
        return ret;
    }

    find(t: T, comp: Comparator<T> | null = null): T | null {
        comp = comp || this.comp
        if (!this.root) {
            return null;
        }

        return this.root.find(t, comp) || null;
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