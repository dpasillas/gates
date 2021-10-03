
/** Functional interface that returns 0 when values are equal, <0 when a < b, and >0 when a > b **/
interface Comparator<T> {
  (a: T, b: T): number;
}

interface NodeParams<T> {
  data: T;
}

class BinarySearchTreeNode<T> {
  data: T;
  left: BinarySearchTreeNode<T> | null = null;
  right: BinarySearchTreeNode<T> | null = null;
  weight: number = 1;
  max_depth: number = 1;

  constructor(params: NodeParams<T>) {
    this.data = params.data;
  }

  private rotateLeft(): BinarySearchTreeNode<T> {
    if (!this.right) {
      throw Error("Impossible rotation")
    }

    let ret = this.right;
    let side = ret.left;
    this.right = side;
    this.weight -= ret.weight;
    this.weight += side?.weight || 0;
    ret.left = this;
    ret.weight -= side?.weight || 0;
    ret.weight += this.weight;

    this.max_depth = Math.max(this.left?.max_depth || 0, this.right?.max_depth || 0) + 1
    ret.max_depth = Math.max(ret.left.max_depth, ret.right?.max_depth || 0) + 1

    return ret;
  }

  private rotateRight(): BinarySearchTreeNode<T> {
    if (!this.left) {
      throw Error("Impossible rotation")
    }

    let ret = this.left;
    let side = ret.right;
    this.left = side;
    this.weight -= ret.weight;
    this.weight += side?.weight || 0;
    ret.right = this;
    ret.weight -= side?.weight || 0;
    ret.weight += this.weight;

    this.max_depth = Math.max(this.left?.max_depth || 0, this.right?.max_depth || 0) + 1
    ret.max_depth = Math.max(ret.left?.max_depth || 0, ret.right.max_depth) + 1

    return ret;
  }

  private slant(): number {
    let l = this.left?.max_depth || 0;
    let r = this.right?.max_depth || 0;
    return r - l;
  }

  private balance(): BinarySearchTreeNode<T> {
    let slant = this.slant();
    if (slant < -1 && this.left) {
      let side_slant = this.left.slant();
      if (side_slant >= 1) {
        this.left = this.left.rotateLeft();
      }
      return this.rotateRight();
    } else if (slant > 1 && this.right) {
      let side_slant = this.right.slant();
      if (side_slant <= -1) {
        this.right = this.right.rotateRight();
      }
      return this.rotateLeft();
    } else {
      return this
    }
  }

  insert(t: T, cmp: Comparator<T>): [BinarySearchTreeNode<T>, boolean] {
    let result = cmp(t, this.data)
    let added: boolean = false;
    if (result < 0) {
      if (this.left) {
        [this.left, added] = this.left.insert(t, cmp)
      } else {
        this.left = new BinarySearchTreeNode<T>({data: t});
        added = true;
      }
    } else if (result > 0) {
      if (this.right) {
        [this.right, added] = this.right.insert(t, cmp);
      } else {
        this.right = new BinarySearchTreeNode<T>({data: t});
        added = true;
      }
    } else {
      this.data = t;
      return [this, false];
    }

    let ret: BinarySearchTreeNode<T> = this;
    if (added) {
      this.weight += 1;
      this.max_depth = Math.max(this.left?.max_depth || 0, this.right?.max_depth || 0) + 1;
      ret = this.balance();
    }
    return [ret, added];
  }

  find(t: T, cmp: Comparator<T>): T | null {
    let result = cmp(t, this.data)
    if (result < 0) {
      return this.left && this.left.find(t, cmp);
    } else if (result > 0) {
      return this.right && this.right.find(t, cmp);
    } else {
      return this.data;
    }
  }

  popFirst(): [BinarySearchTreeNode<T> | null, T] {
    if (!this.left) {
      return [this.right, this.data];
    } else {
      let [node, val] = this.left.popFirst();
      this.left = node;

      this.weight -= 1;
      this.max_depth = Math.max(node?.max_depth || 0, this.right?.max_depth || 0) + 1

      return [this.balance(), val]
    }
  }

  popLast(): [BinarySearchTreeNode<T> | null, T] {
    if (!this.right) {
      return [this.left, this.data];
    } else {
      let [node, val] = this.right.popFirst();
      this.right = node;

      this.weight -= 1;
      this.max_depth = Math.max(node?.max_depth || 0, this.left?.max_depth || 0) + 1

      return [this.balance(), val]
    }
  }

  remove(t: T, cmp: Comparator<T>): [BinarySearchTreeNode<T> | null, boolean] {
    let result = cmp(t, this.data)
    let removed: boolean;
    let ret: BinarySearchTreeNode<T> | null = this;
    if (result < 0) {
      if (this.left) {
        [this.left, removed] = this.left.remove(t, cmp)
      } else {
        removed = false;
      }
    } else if (result > 0) {
      if (this.right) {
        [this.right, removed] = this.right.remove(t, cmp);
      } else {
        removed = false;
      }
    } else {
      if (this.left) {
        [this.left, this.data] = this.left.popLast();
      } else if (this.right) {
        [this.right, this.data] = this.right.popFirst();
      } else {
        return [null, true];
      }
      removed = true;
    }

    if (removed) {
      this.weight -= 1;
      this.max_depth = Math.max(this.left?.max_depth || 0, this.right?.max_depth || 0) + 1;
      ret = this.balance();
    }
    return [ret, removed];
  }

  clear() {
    if (this.left) {
      this.left.clear();
      this.left = null;
    }
    if (this.right) {
      this.right.clear();
      this.right = null;
    }

  }

}

export default BinarySearchTreeNode;