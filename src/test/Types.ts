type SafeNumber<T> = T extends number ? T : never;
type Length<T extends any[]> = T extends {length: infer L} ? SafeNumber<L> : never;
export type Tuple<N, U = any, T extends U[] = []> = Length<T> extends N ? T : Tuple<N, U, [U, ...T]>;
export type Add<A extends number, B extends number> = Length<[...Tuple<A>, ...Tuple<B>]>;
// type Sub<A extends number, B extends number> = Tuple<A> extends [...Tuple<B>, ...infer U] ? Length<U> : never;
// type IteratedAdd<A extends number, I extends number, Sum extends number = 0> =
//     I extends 0 ? Sum : IteratedAdd<A, Sub<I, 1>, Add<Sum, A>>;
//
// type Multiply<A extends number, B extends number> = IteratedAdd<A, B>;

type Repeat<T extends string, N extends number, R extends unknown[] = [T], S extends string = `${T}`> =
  Length<R> extends N ? S : Repeat<T, N, [T, ...R], `${T}${S}`>

export type TruthValue = 'x' | 'z' | '0' | '1';
export type TruthEntry<W extends number> = Repeat<TruthValue, W>
export type TruthTableEntry<F extends number, W extends number> = [Tuple<F, TruthEntry<W>>, TruthEntry<W>];
export type TruthTable<F extends number, W extends number = 1> = TruthTableEntry<F, W>[];