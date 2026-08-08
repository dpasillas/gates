import {smallestEnclosingCircle, Point} from './enclosingCircle';

/** Whether the circle covers every point, allowing for rounding on the rim. */
function covers(points: Point[], circle: {centre: Point, radius: number}): boolean {
  return points.every(p =>
    Math.hypot(p.x - circle.centre.x, p.y - circle.centre.y) <= circle.radius + 1e-6);
}

function randomPoints(count: number, spread = 500): Point[] {
  return Array.from({length: count}, () => ({
    x: (Math.random() - 0.5) * spread,
    y: (Math.random() - 0.5) * spread,
  }));
}

describe('smallestEnclosingCircle', () => {
  test('an empty set gives a circle of nothing', () => {
    expect(smallestEnclosingCircle([])).toEqual({centre: {x: 0, y: 0}, radius: 0});
  });

  test('one point is its own circle', () => {
    const circle = smallestEnclosingCircle([{x: 7, y: -3}]);

    expect(circle.centre).toEqual({x: 7, y: -3});
    expect(circle.radius).toBe(0);
  });

  test('two points span a diameter', () => {
    const circle = smallestEnclosingCircle([{x: 0, y: 0}, {x: 10, y: 0}]);

    expect(circle.centre.x).toBeCloseTo(5);
    expect(circle.centre.y).toBeCloseTo(0);
    expect(circle.radius).toBeCloseTo(5);
  });

  test('a point inside does not widen the circle', () => {
    // The third point is well within the span of the first two, so the answer is unchanged.
    const circle = smallestEnclosingCircle([{x: 0, y: 0}, {x: 10, y: 0}, {x: 5, y: 1}]);

    expect(circle.radius).toBeCloseTo(5);
  });

  test('a wide triangle is bounded by its longest side, not its corners', () => {
    // An obtuse triangle's smallest circle rests on two points, not all three.
    const circle = smallestEnclosingCircle([{x: 0, y: 0}, {x: 10, y: 0}, {x: 5, y: 0.5}]);

    expect(circle.radius).toBeCloseTo(5);
    expect(circle.centre.x).toBeCloseTo(5);
  });

  test('a tall triangle needs all three on the rim', () => {
    const points = [{x: 0, y: 0}, {x: 10, y: 0}, {x: 5, y: 10}];
    const circle = smallestEnclosingCircle(points);

    expect(covers(points, circle)).toBe(true);
    // Every corner sits exactly on the rim.
    for (const p of points) {
      expect(Math.hypot(p.x - circle.centre.x, p.y - circle.centre.y)).toBeCloseTo(circle.radius);
    }
  });

  test('collinear points are spanned end to end', () => {
    const points = [{x: 0, y: 0}, {x: 4, y: 4}, {x: 8, y: 8}, {x: 2, y: 2}];
    const circle = smallestEnclosingCircle(points);

    expect(covers(points, circle)).toBe(true);
    expect(circle.radius).toBeCloseTo(Math.hypot(8, 8) / 2);
  });

  test('duplicated points change nothing', () => {
    const circle = smallestEnclosingCircle(
      [{x: 0, y: 0}, {x: 0, y: 0}, {x: 10, y: 0}, {x: 10, y: 0}]);

    expect(circle.radius).toBeCloseTo(5);
  });

  test('covers every point of a random set, and none to spare', () => {
    for (let trial = 0; trial < 40; trial++) {
      const points = randomPoints(2 + Math.floor(Math.random() * 30));
      const circle = smallestEnclosingCircle(points);

      expect(covers(points, circle)).toBe(true);
      // Minimal: shrinking it by any margin must leave something outside.
      const shrunk = {centre: circle.centre, radius: circle.radius * 0.999 - 1e-9};
      expect(covers(points, shrunk)).toBe(false);
    }
  });

  test('does not depend on the order the points arrive in', () => {
    const points = randomPoints(25);
    const first = smallestEnclosingCircle(points);
    const second = smallestEnclosingCircle([...points].reverse());

    expect(second.centre.x).toBeCloseTo(first.centre.x, 6);
    expect(second.centre.y).toBeCloseTo(first.centre.y, 6);
    expect(second.radius).toBeCloseTo(first.radius, 6);
  });

  test('leaves the array it was given alone', () => {
    const points = randomPoints(10);
    const before = JSON.stringify(points);

    smallestEnclosingCircle(points);

    expect(JSON.stringify(points)).toBe(before);
  });

  test('handles a set large enough that a quadratic method would not', () => {
    const points = randomPoints(20000);
    const started = Date.now();
    const circle = smallestEnclosingCircle(points);

    expect(covers(points, circle)).toBe(true);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
