/**
 * A mask with the low `numBits` bits set.
 *
 * Shift counts in JavaScript are taken modulo 32, so a full-width mask cannot be reached by
 * shifting: `~0 << 32` is `~0 << 0`. The full-width case is therefore written out, as the same
 * all-ones value the shifting form builds towards.
 *
 * The result is a signed int32, which is what every bitwise operator produces and therefore the
 * representation the rest of the simulation already uses. At a full 32 bits that reads as -1; the
 * bits are all ones either way, and staying in one representation is what lets two states holding
 * the same pattern compare equal.
 */
function bitMask(numBits: number): number {
  return numBits >= 32 ? ~0 : ~(~0 << numBits);
}

export {bitMask};
