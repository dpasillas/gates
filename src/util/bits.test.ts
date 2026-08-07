import {bitMask} from './bits';
import {LogicState} from '../logic/LogicState';

/**
 * The mask the given width should produce, computed without 32-bit shift semantics and then read
 * the way a bitwise operator would read it.
 */
function expected(numBits: number): number {
  return Number(((1n << BigInt(numBits)) - 1n) & 0xFFFFFFFFn) | 0;
}

describe('bitMask', () => {
  test.each([0, 1, 2, 8, 16, 30, 31, 32])('is correct at a width of %i', numBits => {
    expect(bitMask(numBits)).toBe(expected(numBits));
  });

  test('reaches a full-width mask, which shifting cannot', () => {
    // `~0 << 32` is `~0 << 0`, so the shifting form would come back as zero here.
    expect(bitMask(32)).toBe(~0);
  });

  test('covers the top bit without overflowing into an invalid int32', () => {
    // `(1 << 31) - 1` produced -2147483649, which is not a representable int32 at all.
    expect(bitMask(31)).toBe(0x7FFFFFFF);
  });

  test('masks the bits it claims to', () => {
    expect((0xDEADBEEF & bitMask(8)) >>> 0).toBe(0xEF);
    expect((0xDEADBEEF & bitMask(16)) >>> 0).toBe(0xBEEF);
    expect((0xDEADBEEF & bitMask(32)) >>> 0).toBe(0xDEADBEEF);
  });

  test('is in the representation every bitwise operator produces', () => {
    // Masking with a full-width mask has to be an identity. It would not be if the mask were
    // carried in a different representation from the value it is applied to.
    for (const value of [0, 1, -1, 0x7FFFFFFF, ~0 << 31]) {
      expect(value & bitMask(32)).toBe(value);
    }
  });
});

describe('states holding the same bits', () => {
  test('compare equal however the bits were produced', () => {
    // States are compared field by field with ===, which is not a bitwise operator and so does not
    // reconcile representations itself. Every producer ends in a bitwise operation, which is what
    // keeps them consistent — a mask carried as unsigned would break that on its own.
    const fromMask = new LogicState({x: bitMask(32)});
    const fromOperators = new LogicState({x: ~0});
    const fromComplement = new LogicState({x: ~(0 & 0)});

    expect(fromMask.eq(fromOperators)).toBe(true);
    expect(fromMask.eq(fromComplement)).toBe(true);
    expect(fromMask.ne(fromOperators)).toBe(false);
  });

  test('a full-width state differs from a partial one', () => {
    expect(new LogicState({v: bitMask(32)}).eq(new LogicState({v: bitMask(31)}))).toBe(false);
  });
});
