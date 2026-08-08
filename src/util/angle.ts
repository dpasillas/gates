/**
 * An angle in degrees, brought into the range (-180, 180].
 *
 * Half a turn is reported as +180 rather than -180, so the range has one representative for every
 * orientation. Turning past either end comes out the other side, which is what lets an angle be
 * wound in either direction without stopping.
 */
function normalizeAngleOffset(degrees: number): number {
  const wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;

  return wrapped === -180 ? 180 : wrapped;
}

/**
 * An angle in degrees, brought into the range [0, 360).
 *
 * How far something has been turned, counted one way round from where it started, rather than the
 * shorter of the two ways there.
 */
function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export {normalizeAngleOffset, normalizeAngle};
