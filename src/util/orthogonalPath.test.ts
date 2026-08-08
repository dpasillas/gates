import {orthogonalRoute, diagonalRoute, pathData, routePoints, cardinal, STUB, Vec} from './orthogonalPath';

const DIRECTIONS: Array<[string, Vec]> = [
  ['right', {x: 1, y: 0}],
  ['left', {x: -1, y: 0}],
  ['down', {x: 0, y: 1}],
  ['up', {x: 0, y: -1}],
];

/** Relative placements of the far pin, including the ones that line the two up exactly. */
const OFFSETS = [-72, -40, -24, 0, 24, 40, 72];

/** Every direction pair at every offset, as the routing has to hold for all of them. */
function everyConfiguration() {
  const cases = [];
  for (const [fromName, fromDirection] of DIRECTIONS) {
    for (const [toName, toDirection] of DIRECTIONS) {
      for (const dx of OFFSETS) {
        for (const dy of OFFSETS) {
          if (dx === 0 && dy === 0) {
            // Two pins never occupy the same point.
            continue;
          }
          cases.push({
            name: `${fromName} -> ${toName} at (${dx}, ${dy})`,
            from: {point: {x: 0, y: 0}, direction: fromDirection},
            to: {point: {x: dx, y: dy}, direction: toDirection},
          });
        }
      }
    }
  }

  return cases;
}

/** The straight runs of a route, as direction vectors. */
function segments(points: Vec[]) {
  return points.slice(1).map((point, i) => ({
    dx: point.x - points[i].x,
    dy: point.y - points[i].y,
  }));
}

describe('orthogonal routing', () => {
  const configurations = everyConfiguration();

  test('every segment runs along an axis', () => {
    const bent = configurations.filter(c =>
      segments(routePoints(orthogonalRoute(c.from, c.to))).some(s => s.dx !== 0 && s.dy !== 0));

    expect(bent.map(c => c.name)).toEqual([]);
  });

  test('no segment has zero length', () => {
    const empty = configurations.filter(c =>
      segments(routePoints(orthogonalRoute(c.from, c.to))).some(s => s.dx === 0 && s.dy === 0));

    expect(empty.map(c => c.name)).toEqual([]);
  });

  test('the wire leaves and enters each pin along the pin', () => {
    const wrong = configurations.filter(c => {
      const runs = segments(routePoints(orthogonalRoute(c.from, c.to)));
      const first = runs[0];
      const last = runs[runs.length - 1];
      const out = cardinal(c.from.direction);
      const back = cardinal(c.to.direction);

      return Math.sign(first.dx) !== out.x || Math.sign(first.dy) !== out.y
          || Math.sign(last.dx) !== -back.x || Math.sign(last.dy) !== -back.y;
    });

    expect(wrong.map(c => c.name)).toEqual([]);
  });

  test('the only wires that run back over a stub are the exactly-aligned parallel ones', () => {
    // Turning straight back on the stub just laid, or running out past the far pin to come back at
    // it, drags the wire across whatever the pin is attached to. It is unavoidable for two pins
    // pointing the same way on one line: every route between them is that line.
    const doubled = configurations.filter(c => {
      const runs = segments(routePoints(orthogonalRoute(c.from, c.to)));
      const out = cardinal(c.from.direction);
      const back = cardinal(c.to.direction);
      const afterStub = runs[1];
      const beforeStub = runs[runs.length - 2];

      return (Math.sign(afterStub.dx) === -out.x && Math.sign(afterStub.dy) === -out.y)
          || (Math.sign(beforeStub.dx) === back.x && Math.sign(beforeStub.dy) === back.y);
    });

    for (const c of doubled) {
      const out = cardinal(c.from.direction);
      const back = cardinal(c.to.direction);
      const across = out.x !== 0 ? c.to.point.y - c.from.point.y : c.to.point.x - c.from.point.x;

      expect(`${c.name} parallel=${out.x === back.x && out.y === back.y} across=${across}`)
        .toBe(`${c.name} parallel=true across=0`);
    }

    // Four directions, six aligned offsets each.
    expect(doubled).toHaveLength(24);
  });

  test('takes at most two turns between the stubs', () => {
    const winding = configurations.filter(c =>
      routePoints(orthogonalRoute(c.from, c.to)).length - 2 > 4);

    expect(winding.map(c => c.name)).toEqual([]);
  });
});

describe('diagonal routing', () => {
  const configurations = everyConfiguration();

  /** The turn taken at each corner, in degrees, over the whole route. */
  function turns(points: Vec[]): number[] {
    const runs = segments(points);

    return runs.slice(1).map((run, i) => {
      const before = runs[i];
      const dot = before.dx * run.dx + before.dy * run.dy;
      const lengths = Math.hypot(before.dx, before.dy) * Math.hypot(run.dx, run.dy);

      return Math.acos(Math.min(1, Math.max(-1, dot / lengths))) * 180 / Math.PI;
    });
  }

  /**
   * The pins point the same way and sit on one line.
   *
   * The wire has to run out along that line and come back, which is a reversal no amount of corner
   * cutting can soften. Every other arrangement has somewhere to turn.
   */
  function alignedParallel(c: typeof configurations[number]): boolean {
    const out = cardinal(c.from.direction);
    const back = cardinal(c.to.direction);
    const across = out.x !== 0 ? c.to.point.y - c.from.point.y : c.to.point.x - c.from.point.x;

    return out.x === back.x && out.y === back.y && across === 0;
  }

  test('never turns more sharply than a right angle', () => {
    const sharp = configurations.filter(c =>
      turns(routePoints(diagonalRoute(c.from, c.to))).some(turn => turn > 90 + 1e-6));

    expect(sharp.map(c => c.name)).toEqual(configurations.filter(alignedParallel).map(c => c.name));
    expect(sharp).toHaveLength(24);
  });

  test('only ever runs on, turns a corner, or cuts one', () => {
    // Nothing in between: a wire carries straight on, squares a right angle where it had no room to
    // cut one, or takes a corner as two forty-five degree turns.
    const allowed = [0, 45, 90];
    const odd = configurations.filter(c =>
      !alignedParallel(c) && turns(routePoints(diagonalRoute(c.from, c.to)))
        .some(turn => !allowed.some(a => Math.abs(turn - a) < 1e-6)));

    expect(odd.map(c => c.name)).toEqual([]);
  });

  test('still leaves and enters each pin along the pin', () => {
    // Corners are only cut between the stub ends, so the stubs themselves are untouched.
    const wrong = configurations.filter(c => {
      const runs = segments(routePoints(diagonalRoute(c.from, c.to)));
      const first = runs[0];
      const last = runs[runs.length - 1];
      const out = cardinal(c.from.direction);
      const back = cardinal(c.to.direction);

      return Math.sign(first.dx) !== out.x || Math.sign(first.dy) !== out.y
          || Math.sign(last.dx) !== -back.x || Math.sign(last.dy) !== -back.y;
    });

    expect(wrong.map(c => c.name)).toEqual([]);
  });

  test('runs a dog-leg as one diagonal rather than two cuts and a stub between', () => {
    // The two cuts of a Z meet exactly in the middle, so they merge into a single run.
    const route = routePoints(diagonalRoute(
      {point: {x: 0, y: 0}, direction: {x: 1, y: 0}},
      {point: {x: 100, y: 40}, direction: {x: -1, y: 0}}));

    expect(route).toEqual([
      {x: 0, y: 0}, {x: 12, y: 0}, {x: 30, y: 0},
      {x: 70, y: 40}, {x: 88, y: 40}, {x: 100, y: 40},
    ]);
  });

  test('a corner becomes one diagonal across it', () => {
    const route = routePoints(diagonalRoute(
      {point: {x: 0, y: 0}, direction: {x: 1, y: 0}},
      {point: {x: 60, y: -40}, direction: {x: 0, y: 1}}));

    // Out along the pin, across the corner, then in along the far pin.
    expect(route).toEqual(
      [{x: 0, y: 0}, {x: 12, y: 0}, {x: 32, y: 0}, {x: 60, y: -28}, {x: 60, y: -40}]);
  });

  test('leaves a straight wire straight', () => {
    const route = routePoints(diagonalRoute(
      {point: {x: 0, y: 0}, direction: {x: 1, y: 0}},
      {point: {x: 100, y: 0}, direction: {x: -1, y: 0}}));

    expect(route).toEqual([{x: 0, y: 0}, {x: 12, y: 0}, {x: 88, y: 0}, {x: 100, y: 0}]);
  });

  test('differs from the square route wherever there is a corner to cut', () => {
    // Five points is a stub, a corner between the stub ends, and a stub. Fewer means the wire runs
    // straight between the stubs and there is nothing to cut.
    const cornered = configurations.filter(c =>
      routePoints(orthogonalRoute(c.from, c.to)).length >= 5);
    const changed = cornered.filter(c =>
      JSON.stringify(routePoints(diagonalRoute(c.from, c.to)))
        !== JSON.stringify(routePoints(orthogonalRoute(c.from, c.to))));

    expect(changed.length).toBe(cornered.length);
  });
});

describe('routing shapes', () => {
  const at = (x: number, y: number, dx: number, dy: number) =>
    ({point: {x, y}, direction: {x: dx, y: dy}});

  test('facing each other across an offset gives a Z split down the middle', () => {
    // Stub ends are 12 and 88, so the crossbar sits at 50.
    const route = routePoints(orthogonalRoute(at(0, 0, 1, 0), at(100, 40, -1, 0)));

    expect(route).toEqual([
      {x: 0, y: 0}, {x: 12, y: 0}, {x: 50, y: 0},
      {x: 50, y: 40}, {x: 88, y: 40}, {x: 100, y: 40},
    ]);
  });

  test('facing each other head on gives a straight wire', () => {
    const route = routePoints(orthogonalRoute(at(0, 0, 1, 0), at(100, 0, -1, 0)));

    expect(route).toEqual([{x: 0, y: 0}, {x: 12, y: 0}, {x: 88, y: 0}, {x: 100, y: 0}]);
  });

  test('at right angles and facing, the two runs simply meet', () => {
    const route = routePoints(orthogonalRoute(at(0, 0, 1, 0), at(60, -40, 0, 1)));

    expect(route).toEqual(
      [{x: 0, y: 0}, {x: 12, y: 0}, {x: 60, y: 0}, {x: 60, y: -28}, {x: 60, y: -40}]);
  });

  test('at right angles with one looking away, the wire splits the difference', () => {
    const route = routePoints(orthogonalRoute(at(0, 0, 1, 0), at(60, 40, 0, 1)));

    expect(route).toEqual([
      {x: 0, y: 0}, {x: 12, y: 0}, {x: 36, y: 0},
      {x: 36, y: 52}, {x: 60, y: 52}, {x: 60, y: 40},
    ]);
  });

  test('both facing away, the wire steps out sideways first', () => {
    // Pointing apart along x, offset in y: neither can start along its own axis, so both turn off
    // sideways and meet on a shared row.
    const runs = segments(routePoints(orthogonalRoute(at(0, 0, -1, 0), at(60, 40, 1, 0))));

    expect(runs[1].dx).toBe(0);
    expect(runs[1].dy).not.toBe(0);
  });
});

describe('stubs on turned pins', () => {
  /** A pin at the given angle in degrees, measured from pointing right. */
  const turned = (degrees: number) => ({
    point: {x: 0, y: 0},
    direction: {x: Math.cos(degrees * Math.PI / 180), y: Math.sin(degrees * Math.PI / 180)},
  });

  const facing = {point: {x: 200, y: 60}, direction: {x: -1, y: 0}};

  test('a pin already on an axis gets a straight stub', () => {
    const [first] = orthogonalRoute(turned(0), facing).steps;

    expect(first.kind).toBe('line');
    expect(first.to).toEqual({x: STUB, y: 0});
  });

  test.each([5, 20, 30, 44])('a pin turned %i degrees gets an arc', degrees => {
    const [first] = orthogonalRoute(turned(degrees), facing).steps;

    expect(first.kind).toBe('arc');
  });

  test('the arc still carries the wire a stub clear of the pin', () => {
    // It advances the full stub length along the cardinal, and leaves the axis by however much the
    // turn demands — the end cannot stay on the axis, or the arc would have to overshoot it.
    const [first] = orthogonalRoute(turned(30), facing).steps;

    expect(first.to.x).toBeCloseTo(STUB);
    expect(first.to.y).toBeGreaterThan(0);
  });

  test('the arc is tangent to the pin at one end and to the wire at the other', () => {
    // A circular arc's chord makes equal angles with the tangents at its two ends, so checking that
    // is checking tangency. Here they are the pin's own direction and the cardinal the wire runs
    // on, which is what makes the stub meet both without a kink.
    for (const degrees of [5, 20, 30, 44, -20, -44]) {
      const pin = turned(degrees);
      const [first] = orthogonalRoute(pin, facing).steps;
      const chord = Math.atan2(first.to.y, first.to.x);

      const fromPin = Math.abs(chord - Math.atan2(pin.direction.y, pin.direction.x));
      const toCardinal = Math.abs(chord);

      expect(fromPin).toBeCloseTo(toCardinal);
    }
  });

  test('the arc turns towards the axis, whichever side the pin is on', () => {
    const below = orthogonalRoute(turned(30), facing).steps[0];
    const above = orthogonalRoute(turned(-30), facing).steps[0];

    expect(below.kind === 'arc' && below.sweep).toBe(0);
    expect(above.kind === 'arc' && above.sweep).toBe(1);
  });

  /** The cardinal a stub curved onto, read off which axis it advanced a full stub along. */
  function curvedOnto(from: {point: Vec, direction: Vec}, to: {point: Vec, direction: Vec}) {
    const [first] = orthogonalRoute(from, to).steps;
    const named: Array<[string, number]> = [
      ['right', first.to.x - from.point.x], ['left', from.point.x - first.to.x],
      ['down', first.to.y - from.point.y], ['up', from.point.y - first.to.y],
    ];

    return named.find(([, advance]) => Math.abs(advance - STUB) < 1e-6)?.[0];
  }

  test('curves towards the far end rather than to whichever cardinal is closest', () => {
    // A pin tilted a little below the horizontal, with the other end straight below it. Rounding to
    // the nearest cardinal would send the stub off to the right, away from where the wire is going.
    const pin = turned(40);
    const below = {point: {x: 0, y: 200}, direction: {x: 0, y: -1}};

    expect(cardinal(pin.direction)).toEqual({x: 1, y: 0});
    expect(curvedOnto(pin, below)).toBe('down');
  });

  test('curves along the pin when that is what heads towards the far end', () => {
    // The same tilt, but the other end is up and to the right, so the horizontal is the way to go.
    const upAndRight = {point: {x: 110, y: -45}, direction: {x: -1, y: 0}};

    expect(curvedOnto(turned(30), upAndRight)).toBe('right');
  });

  test('never curves onto a cardinal the pin does not already point along', () => {
    // Turning more than a right angle would swing the wire back across the pin it just left.
    for (const degrees of [5, 30, 44, 60, 89, -30, -89]) {
      const pin = turned(degrees);
      const around = [{x: 300, y: 0}, {x: -300, y: 0}, {x: 0, y: 300}, {x: 0, y: -300}];

      for (const point of around) {
        const [first] = orthogonalRoute(pin, {point, direction: {x: -1, y: 0}}).steps;
        const travelled = Math.atan2(first.to.y - pin.point.y, first.to.x - pin.point.x);
        const along = Math.atan2(pin.direction.y, pin.direction.x);
        // The chord bisects the turn, so it leans by half of it.
        expect(Math.abs(travelled - along)).toBeLessThanOrEqual(Math.PI / 4 + 1e-9);
      }
    }
  });

  test('a pin on an axis keeps its stub straight wherever the far end is', () => {
    for (const point of [{x: 300, y: 0}, {x: -300, y: 200}, {x: 0, y: 300}]) {
      const [first] = orthogonalRoute(turned(0), {point, direction: {x: -1, y: 0}}).steps;

      expect(first.kind).toBe('line');
    }
  });

  test('a sharper turn curves more tightly', () => {
    const gentle = orthogonalRoute(turned(10), facing).steps[0];
    const sharp = orthogonalRoute(turned(40), facing).steps[0];

    expect(gentle.kind === 'arc' && sharp.kind === 'arc' && gentle.radius > sharp.radius).toBe(true);
  });

  test('draws the arc as an arc, and the rest as lines', () => {
    const d = pathData(orthogonalRoute(turned(30), facing));

    expect(d.startsWith('M 0 0 A ')).toBe(true);
    expect(d).toContain(' L ');
  });
});
