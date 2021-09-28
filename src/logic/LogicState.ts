
interface IParams {
  v?: number; // non-error value
  x?: number; // unknown
  z?: number; // high-impedance
}

/**
 * An arbitrary-width logical state with logical value, and error states.
 *
 * For every logical bit at a given position n, at most one of v, x, or z should be set for bit n.
 *
 * @example
 * // Returns logical state '01xz1'
 * new LogicState({v: 0b01001, x: 0b00100, z: 0b00010})
 * */
class LogicState {
  /** Represents whether bits are on or off */
  v: number;
  /** Represents whether bits are in an unknown state */
  x: number;
  /** Represents whether bits are disconnected from an input source */
  z: number;

  constructor(params: IParams) {
    this.v = params.v ?? 0;
    this.x = params.x ?? 0;
    this.z = params.z ?? 0;
  }

  eq(other: LogicState) {
    return (
        this.v === other.v &&
        this.x === other.x &&
        this.z === other.z
    );
  }

  ne(other: LogicState) {
    return (
        this.v !== other.v ||
        this.x !== other.x ||
        this.z !== other.z
    );
  }

  /**
   * Negates the logical state while keeping only the specified number bits
   *
   * @example
   * // Creates logical state '01xz1'
   * let state = new LogicState({v: 0b01001, x: 0b00100, z: 0b00010})
   * // Negates logical state to '10xz1'
   * state.negate(5)
   * */
  negate(numBits: number) {
    // (2^n) - 1 will result in a mask with the lower n bits set.
    let mask = (1 << numBits) - 1

    // Bits with corresponding errors should be masked out
    this.v = ~this.v & ~this.x & ~this.z & mask;
  }
}

export default LogicState;