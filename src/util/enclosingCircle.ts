/**
 * The smallest circle enclosing a set of points.
 *
 * Welzl's algorithm, in the incremental form: each point that falls outside the circle built so far
 * must lie on the boundary of the answer, which fixes one degree of freedom and leaves a smaller
 * problem of the same shape. Shuffling first is what makes that cheap — a point is unlikely to fall
 * outside a circle already covering the ones before it, so the rebuilds are rare and the expected
 * running time is linear in the number of points.
 */

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Circle {
  readonly centre: Point;
  readonly radius: number;
}

/** Slack for the boundary test, since points on the rim are found by arithmetic that rounds. */
const EPSILON = 1e-9;

const EMPTY: Circle = {centre: {x: 0, y: 0}, radius: 0};

function contains(circle: Circle, point: Point): boolean {
  return Math.hypot(point.x - circle.centre.x, point.y - circle.centre.y)
    <= circle.radius * (1 + EPSILON) + EPSILON;
}

/** The circle with the two points at opposite ends of a diameter. */
function through2(a: Point, b: Point): Circle {
  return {
    centre: {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2},
    radius: Math.hypot(a.x - b.x, a.y - b.y) / 2,
  };
}

/**
 * The circle passing through all three points.
 *
 * Computed relative to the first point, which keeps the intermediate magnitudes near the size of
 * the triangle rather than the size of the coordinates. Three points on a line have no such circle;
 * the caller's own candidates cover that case.
 */
function through3(a: Point, b: Point, c: Point): Circle | undefined {
  const bx = b.x - a.x;
  const by = b.y - a.y;
  const cx = c.x - a.x;
  const cy = c.y - a.y;

  const d = 2 * (bx * cy - by * cx);
  if (Math.abs(d) < EPSILON) {
    return undefined;
  }

  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  const ux = (cy * b2 - by * c2) / d;
  const uy = (bx * c2 - cx * b2) / d;

  return {centre: {x: a.x + ux, y: a.y + uy}, radius: Math.hypot(ux, uy)};
}

/** The smallest circle through two known boundary points that also covers the rest. */
function withTwoOnBoundary(points: Point[], p: Point, q: Point): Circle {
  let circle = through2(p, q);

  for (const point of points) {
    if (contains(circle, point)) {
      continue;
    }
    // Three points on the boundary determine the circle outright.
    const candidate = through3(p, q, point);
    if (candidate) {
      circle = candidate;
    }
  }

  return circle;
}

/** The smallest circle through one known boundary point that also covers the rest. */
function withOneOnBoundary(points: Point[], p: Point): Circle {
  let circle: Circle = {centre: p, radius: 0};

  for (let i = 0; i < points.length; i++) {
    if (contains(circle, points[i])) {
      continue;
    }
    circle = withTwoOnBoundary(points.slice(0, i), p, points[i]);
  }

  return circle;
}

/** Fisher-Yates, on a copy, so the caller's array is left alone. */
function shuffled(points: readonly Point[]): Point[] {
  const copy = [...points];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

/**
 * The smallest circle containing every one of the given points.
 *
 * The answer is unique, so it does not depend on the shuffle; only the work taken to reach it does.
 */
function smallestEnclosingCircle(points: readonly Point[]): Circle {
  if (points.length === 0) {
    return EMPTY;
  }

  const order = shuffled(points);
  let circle: Circle = {centre: order[0], radius: 0};

  for (let i = 1; i < order.length; i++) {
    if (contains(circle, order[i])) {
      continue;
    }
    circle = withOneOnBoundary(order.slice(0, i), order[i]);
  }

  return circle;
}

export {smallestEnclosingCircle};
export type {Circle, Point};
