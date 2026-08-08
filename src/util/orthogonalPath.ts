/**
 * Wire routing along the cardinal directions.
 *
 * An alternative to the bezier the connections are drawn with. A wire leaves each pin along a short
 * stub in the pin's own direction, and the two stub ends are then joined by axis-aligned segments.
 *
 * A pin turned off the axes gets an arc for its stub instead of a straight one, curving from the
 * direction the pin actually points to the cardinal the rest of the wire runs on.
 */

interface Vec {
  readonly x: number;
  readonly y: number;
}

/** An end of a wire: where it attaches, and which way the pin points. */
interface Endpoint {
  readonly point: Vec;
  readonly direction: Vec;
}

/** A straight run to a point. */
interface Line {
  readonly kind: "line";
  readonly to: Vec;
}

/** A circular arc to a point, turning through less than a right angle. */
interface Arc {
  readonly kind: "arc";
  readonly to: Vec;
  readonly radius: number;
  /** SVG sweep flag: 1 turns one way around the circle, 0 the other. */
  readonly sweep: 0 | 1;
}

type Step = Line | Arc;

interface Route {
  readonly start: Vec;
  readonly steps: Step[];
}

type Axis = "x" | "y";

/** Length of the stub every wire leaves a pin with. */
const STUB = 12;

/**
 * Below this much of a turn a stub is drawn straight.
 *
 * The arc's radius grows without bound as the turn shrinks, and a fraction of a degree is not
 * visible anyway.
 */
const STRAIGHT_ENOUGH = 0.5 * Math.PI / 180;

function add(a: Vec, b: Vec): Vec {
  return {x: a.x + b.x, y: a.y + b.y};
}

function scale(v: Vec, k: number): Vec {
  return {x: v.x * k, y: v.y * k};
}

function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y;
}

function cross(a: Vec, b: Vec): number {
  return a.x * b.y - a.y * b.x;
}

function normalize(v: Vec): Vec {
  const length = Math.hypot(v.x, v.y);
  return length === 0 ? {x: 1, y: 0} : {x: v.x / length, y: v.y / length};
}

/**
 * Rounds a direction to the nearest cardinal.
 *
 * A tie goes to the horizontal, and a direction of nothing is treated as pointing right, so the
 * result is always a unit cardinal.
 */
function cardinal({x, y}: Vec): Vec {
  if (Math.abs(x) >= Math.abs(y)) {
    return {x: Math.sign(x) || 1, y: 0};
  }

  return {x: 0, y: Math.sign(y)};
}

const CARDINALS: Vec[] = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}];

/**
 * The cardinal a stub should curve onto.
 *
 * Of the cardinals the pin could turn onto without doubling back — the ones it still points along
 * at all — this picks whichever heads most directly at the far end, so the stub curves as though
 * drawn towards it. Rounding to the nearest cardinal instead ignores where the wire is going, and
 * a pin tilted a little past an axis would curve away from its target rather than towards it.
 *
 * A pin already on an axis has only that one cardinal ahead of it, so it keeps a straight stub.
 */
function curveTowards(direction: Vec, target: Vec): Vec {
  const ahead = CARDINALS.filter(c => dot(c, direction) > 0);
  const heading = normalize(target);

  if (ahead.length === 0 || (target.x === 0 && target.y === 0)) {
    return cardinal(direction);
  }

  return ahead.reduce((best, c) => dot(c, heading) > dot(best, heading) ? c : best);
}

/** The axis a cardinal direction lies on. */
function axisOf(direction: Vec): Axis {
  return direction.x !== 0 ? "x" : "y";
}

function other(axis: Axis): Axis {
  return axis === "x" ? "y" : "x";
}

/**
 * Whether the far end lies ahead of a pin rather than behind it.
 *
 * Zero counts as ahead: a pin looking straight across at the other has nothing to route around.
 */
function faces(from: Vec, to: Vec, direction: Vec): boolean {
  return dot({x: to.x - from.x, y: to.y - from.y}, direction) >= 0;
}

/**
 * The stub leaving a pin, and where it ends.
 *
 * For a pin already on an axis this is a straight run of the stub length. For one turned off it,
 * the stub is a circular arc that starts along the pin and finishes along the cardinal the wire
 * will follow, so the two meet smoothly rather than in a kink.
 *
 * The chord of such an arc lies along the bisector of its two tangents, which is what fixes the end
 * point: it cannot stay on the cardinal line, or the arc would have to overshoot and come back. The
 * length is chosen so the stub still advances a stub's worth along the cardinal.
 */
function stubOf(point: Vec, direction: Vec, towards: Vec, stub: number): {end: Vec, step: Step} {
  const turn = Math.atan2(cross(direction, towards), dot(direction, towards));

  if (Math.abs(turn) < STRAIGHT_ENOUGH) {
    const end = add(point, scale(towards, stub));
    return {end, step: {kind: "line", to: end}};
  }

  const bisector = normalize(add(direction, towards));
  const chord = stub / dot(bisector, towards);
  const end = add(point, scale(bisector, chord));

  return {
    end,
    step: {
      kind: "arc",
      to: end,
      radius: chord / (2 * Math.sin(Math.abs(turn) / 2)),
      sweep: turn > 0 ? 1 : 0,
    },
  };
}

function distance(a: Vec, b: Vec): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Whether three points lie on one line, at any angle rather than only along the axes. */
function collinear(a: Vec, b: Vec, c: Vec): boolean {
  const first = {x: b.x - a.x, y: b.y - a.y};
  const second = {x: c.x - b.x, y: c.y - b.y};
  const scale = Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y);

  return Math.abs(cross(first, second)) <= scale * 1e-9;
}

/** Removes points that repeat, or that sit in the middle of a straight run. */
function simplify(points: Vec[]): Vec[] {
  const kept: Vec[] = [];

  for (const point of points) {
    const last = kept[kept.length - 1];
    if (last && last.x === point.x && last.y === point.y) {
      continue;
    }
    const previous = kept[kept.length - 2];
    if (last && previous && collinear(previous, last, point)) {
      kept.pop();
    }
    kept.push(point);
  }

  return kept;
}

/** A point the given distance from `from` along the way to `to`. */
function towards(from: Vec, to: Vec, by: number): Vec {
  const length = distance(from, to);

  return length === 0 ? from : {
    x: from.x + (to.x - from.x) * by / length,
    y: from.y + (to.y - from.y) * by / length,
  };
}

/**
 * Cuts every corner off a path, replacing each with a diagonal across it.
 *
 * A right angle becomes two forty-five degree turns, so no corner is ever sharper than the square
 * one it replaced. Each corner takes as much of its two segments as it can without meeting the
 * corner at the other end — a segment with a corner at both ends is split between them — which is
 * what lets the two cuts of a dog-leg meet in the middle and merge into one long diagonal.
 *
 * The ends of the path are corners too when the caller says so, even though nothing is cut off
 * them: a cut that ran all the way back into a turn the wire had already taken would compound with
 * it into something sharper than the right angle it started as.
 */
function chamferCorners(points: Vec[], turnAtStart: boolean, turnAtEnd: boolean): Vec[] {
  const count = points.length;
  if (count < 3) {
    return points;
  }

  const turning = points.map((_, i) => {
    if (i === 0) {
      return turnAtStart;
    }
    if (i === count - 1) {
      return turnAtEnd;
    }

    return !collinear(points[i - 1], points[i], points[i + 1]);
  });

  const cut = points.map((_, i) => {
    // The ends count as corners when apportioning the segments beside them, but nothing is cut off
    // them: the wire has to keep leaving its pin the way the pin points.
    if (i === 0 || i === count - 1 || !turning[i]) {
      return 0;
    }
    const before = distance(points[i - 1], points[i]) / (turning[i - 1] ? 2 : 1);
    const after = distance(points[i], points[i + 1]) / (turning[i + 1] ? 2 : 1);

    return Math.min(before, after);
  });

  const cornered: Vec[] = [points[0]];
  for (let i = 1; i < count - 1; i++) {
    if (cut[i] <= 0) {
      cornered.push(points[i]);
      continue;
    }
    cornered.push(towards(points[i], points[i - 1], cut[i]),
                  towards(points[i], points[i + 1], cut[i]));
  }
  cornered.push(points[count - 1]);

  return simplify(cornered);
}

/**
 * The wire from one pin to the other.
 *
 * The route leaves each stub end on a chosen axis — the pin's own if it is looking at the far end,
 * and the orthogonal one if it is looking away, so that the wire never doubles back over the stub
 * it just came out of. When those two axes differ the route takes a single corner; when they agree
 * it takes two, split down the middle so the wire sits evenly between the pins.
 */
function buildRoute(from: Endpoint, to: Endpoint, stub: number, cutCorners: boolean): Route {
  const fromHeading = normalize(from.direction);
  const toHeading = normalize(to.direction);

  // Where the stubs would land if each just rounded to its nearest cardinal. Only used to find the
  // line between them, which is what each stub then curves towards; a stub's own end depends on
  // that choice, so it cannot be the thing the choice is made from.
  const roughStart = add(from.point, scale(cardinal(fromHeading), stub));
  const roughEnd = add(to.point, scale(cardinal(toHeading), stub));
  const between = {x: roughEnd.x - roughStart.x, y: roughEnd.y - roughStart.y};

  const fromDirection = curveTowards(fromHeading, between);
  const toDirection = curveTowards(toHeading, scale(between, -1));

  const first = stubOf(from.point, fromHeading, fromDirection, stub);
  const second = stubOf(to.point, toHeading, toDirection, stub);
  const start = first.end;
  const end = second.end;

  const leaving = faces(start, end, fromDirection)
    ? axisOf(fromDirection)
    : other(axisOf(fromDirection));
  const arriving = faces(end, start, toDirection)
    ? axisOf(toDirection)
    : other(axisOf(toDirection));

  const corners: Vec[] = [];

  if (leaving !== arriving) {
    // One turn: run out along the first axis, then in along the second.
    corners.push(leaving === "x" ? {x: end.x, y: start.y} : {x: start.x, y: end.y});
  } else {
    // Two turns, with the run between them halfway along, so the wire sits evenly between the pins.
    //
    // Where the ends already agree on that axis there is no midpoint to find and the route would
    // flatten into a single straight run. That is fine when the flattened run leaves each stub
    // sideways, but where a pin is looking away it would lay the wire back down its own stub, so
    // the route steps out by a stub's length to get around instead.
    const axis = leaving;
    const looksAway = leaving !== axisOf(fromDirection) || arriving !== axisOf(toDirection);
    const at = start[axis] === end[axis] && looksAway
      ? start[axis] + stub
      : (start[axis] + end[axis]) / 2;

    corners.push(
      axis === "x" ? {x: at, y: start.y} : {x: start.x, y: at},
      axis === "x" ? {x: at, y: end.y} : {x: end.x, y: at});
  }

  // Corners are cut only between the stub ends, so both stubs keep the shape that carries the wire
  // out along its pin.
  const square = simplify([start, ...corners, end]);
  const middle = cutCorners
    ? chamferCorners(square,
                     leaving !== axisOf(fromDirection),
                     arriving !== axisOf(toDirection))
    : square;
  const steps: Step[] = [
    first.step,
    ...middle.slice(1).map((to): Step => ({kind: "line", to})),
    // Traversed back towards the pin, which turns the arc the other way around its circle.
    second.step.kind === "arc"
      ? {...second.step, to: to.point, sweep: second.step.sweep === 1 ? 0 : 1}
      : {kind: "line", to: to.point},
  ];

  return {start: from.point, steps};
}

/** A wire running only along the cardinal directions. */
function orthogonalRoute(from: Endpoint, to: Endpoint, stub: number = STUB): Route {
  return buildRoute(from, to, stub, false);
}

/**
 * A wire allowed to run diagonally as well as along the cardinals.
 *
 * The same route, with its corners cut. Every turn it takes is forty-five degrees rather than
 * ninety, and where two cuts meet they merge into a single diagonal run.
 */
function diagonalRoute(from: Endpoint, to: Endpoint, stub: number = STUB): Route {
  return buildRoute(from, to, stub, true);
}

/** The corners of a route, ignoring how it curves between them. */
function routePoints(route: Route): Vec[] {
  return [route.start, ...route.steps.map(step => step.to)];
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** A route as SVG path data. */
function pathData(route: Route): string {
  const parts = [`M ${round(route.start.x)} ${round(route.start.y)}`];

  for (const step of route.steps) {
    parts.push(step.kind === "arc"
      ? `A ${round(step.radius)} ${round(step.radius)} 0 0 ${step.sweep} ` +
        `${round(step.to.x)} ${round(step.to.y)}`
      : `L ${round(step.to.x)} ${round(step.to.y)}`);
  }

  return parts.join(" ");
}

export {orthogonalRoute, diagonalRoute, pathData, routePoints, cardinal, STUB};
export type {Endpoint, Route, Step, Vec};
