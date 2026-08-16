/**
 * Path data for component bodies and pins, keyed by everything that decides their shape.
 *
 * Trimming a pin to its component's body is a boolean path operation and the most expensive step in
 * building a component — roughly 0.19 ms against 0.015 ms to rebuild the same path from its data.
 * Every AND gate of a given width is the same drawing, so the operation runs once per shape rather
 * than once per component.
 *
 * Data rather than paper items: a string belongs to no scope, so one cache serves every board.
 */

const shapes = new Map<string, string>();

function shapeFor(key: string, build: () => string): string {
  const held = shapes.get(key);
  if (held !== undefined) {
    return held;
  }

  const built = build();
  shapes.set(key, built);

  return built;
}

/** For tests that need the build to actually run. */
function clearShapeCache() {
  shapes.clear();
}

export {clearShapeCache, shapeFor};
