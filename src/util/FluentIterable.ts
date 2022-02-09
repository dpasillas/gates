
type Predicate<T> = (t: T) => boolean;
type Consumer<T> = (t: T) => any;
type Mapping<T, U> = (t: T) => U;
type Reducer<T, U> = (prev: U, current: T) => U


class Filterator<T> implements Iterator<T> {
  private readonly iterator: Iterator<T>;
  private readonly predicate: Predicate<T>;

  constructor(iterator: Iterator<T>, predicate: Predicate<T>) {
    this.iterator = iterator;
    this.predicate = predicate;
  }

  next(value?: any): IteratorResult<T> {
    let ret = this.iterator.next()

    while (!ret.done && !this.predicate(ret.value)) {
      ret = this.iterator.next()
    }

    return ret
  }

}


class Mapperator<T, U> implements Iterator<U> {
  private iterator: Iterator<T>;
  private callback: Mapping<T, U>;

  constructor(iterator: Iterator<T>, callback: Mapping<T, U>) {
    this.iterator = iterator;
    this.callback = callback;
  }

  next(value?: any): IteratorResult<U> {
    let ret = this.iterator.next()

    if (ret.done) {
      return ret
    }

    return {
      value: this.callback(ret.value)
    };
  }
}


class FluentIterable<T> {
  private iterator: Iterator<T>

  private constructor(iterator: Iterator<T>) {
    this.iterator = iterator;
  }

  static from<T>(iterable: Iterable<T>): FluentIterable<T> {
    let iterator = iterable[Symbol.iterator]();
    return new FluentIterable<T>(iterator)
  }

  map<U>(callback: (t: T) => U): FluentIterable<U> {
    let mappedIterator = new Mapperator(this.iterator, callback);
    return new FluentIterable<U>(mappedIterator);
  }

  filter(predicate: Predicate<T>): FluentIterable<T> {
    this.iterator = new Filterator(this.iterator, predicate)
    return this;
  }

  [Symbol.iterator](): Iterator<T> {
    return this.iterator;
  }

  forEach(consumer: Consumer<T>) {
    for (let value of this) {
      consumer(value);
    }
  }

  reduce<U>(reducer: Reducer<T, U>, initialValue: U) {
    let prev = initialValue;
    for (let value of this) {
      prev = reducer(prev, value);
    }

    return prev;
  }

}

export default FluentIterable;