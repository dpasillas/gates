import {bitMask} from "../util/bits";

interface IParams {
  v?: number; // non-error value
  x?: number; // unknown
  z?: number; // high-impedance
  w?: number; // driven weakly, as by a pull-up
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
  /**
   * Represents whether bits are driven weakly rather than strongly.
   *
   * Set means weak, so anything built without saying is strong — which is every component but the
   * pull resistors. A weak bit loses to a strong one when a line is worked out; Z needs no strength,
   * being the absence of drive at all.
   */
  w: number;

  constructor(params: IParams) {
    this.v = params.v ?? 0;
    this.x = params.x ?? 0;
    this.z = params.z ?? 0;
    this.w = params.w ?? 0;
  }

  eq(other: LogicState) {
    return (
        this.v === other.v &&
        this.x === other.x &&
        this.z === other.z &&
        this.w === other.w
    );
  }

  ne(other: LogicState) {
    return (
        this.v !== other.v ||
        this.x !== other.x ||
        this.z !== other.z ||
        this.w !== other.w
    );
  }

  /**
   * Returns a new negated the logical state while keeping only the specified number bits
   *
   * @example
   * // Creates logical state '01xz1'
   * let state = new LogicState({v: 0b01001, x: 0b00100, z: 0b00010})
   * // Negates logical state to '10xz1'
   * state.negate(5)
   * */
  negated(numBits: number) {
    const mask = bitMask(numBits)

    // Bits with corresponding errors should be masked out
    const v = ~this.v & ~this.x & ~this.z & mask;
    return new LogicState({
      v: v,
      x: this.x,
      z: this.z,
      w: this.w
    });
  }
}

export {LogicState};