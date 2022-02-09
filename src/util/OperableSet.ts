
class OperableSet<T> extends Set<T> {
  addAll(other: Iterable<T>) {
    for (let value of other) {
      this.add(value)
    }
  }

  union(other: Set<T>): OperableSet<T> {
    let result = new OperableSet<T>();
    for (let value of this) {
      result.add(value)
    }

    for (let value of other) {
      result.add(value)
    }

    return result
  }

  intersection(other: Set<T>): OperableSet<T> {
    let result = new OperableSet<T>();
    for (let value of this) {
      if (other.has(value)) {
        result.add(value)
      }
    }

    return result
  }

  xor(other: Set<T>): OperableSet<T> {
    return this.symmetricDifference(other);
  }

  symmetricDifference(other: Set<T>): OperableSet<T> {
    let result = new OperableSet<T>();
    for (let value of this) {
      if (!other.has(value)) {
        result.add(value)
      }
    }

    for (let value of other) {
      if (!this.has(value)) {
        result.add(value)
      }
    }

    return result
  }
}


export default OperableSet;