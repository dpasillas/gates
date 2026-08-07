import {
  DIGIT_HEIGHT,
  digitOverhang,
  DIGIT_WIDTH,
  SegmentCount,
  segmentNames,
  segmentPaths,
  SLANT,
} from './segments';

/** Every coordinate pair in a path's data. */
function points(d: string): Array<[number, number]> {
  return [...d.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
}

const LAYOUTS: SegmentCount[] = [7, 14, 16];

describe('segment layouts', () => {
  test.each(LAYOUTS)('a %i-segment display has that many segments', count => {
    expect(segmentNames(count)).toHaveLength(count);
    expect(segmentPaths(count)).toHaveLength(count);
  });

  test.each(LAYOUTS)('%i segment names are distinct', count => {
    expect(new Set(segmentNames(count)).size).toBe(count);
  });

  test('14 segments splits the middle bar and adds the star', () => {
    const seven = segmentNames(7);
    const fourteen = segmentNames(14);

    expect(seven).toContain('g');
    expect(fourteen).not.toContain('g');
    expect(fourteen).toEqual(expect.arrayContaining(['g1', 'g2', 'h', 'i', 'j', 'k', 'l', 'm']));
  });

  test('16 segments splits the top and bottom bars as well', () => {
    const sixteen = segmentNames(16);

    expect(sixteen).not.toContain('a');
    expect(sixteen).not.toContain('d');
    expect(sixteen).toEqual(expect.arrayContaining(['a1', 'a2', 'd1', 'd2']));
  });
});

describe('segment shapes', () => {
  test.each(LAYOUTS)('every %i-segment bar is a closed six-sided figure', count => {
    for (const d of segmentPaths(count)) {
      expect(d.endsWith('Z')).toBe(true);
      expect(points(d)).toHaveLength(6);
    }
  });

  test.each(LAYOUTS)('every %i-segment bar stays within the digit', count => {
    // The digit box describes the centrelines the bars run along, so a bar reaches past it by the
    // declared overhang and no further. The component relies on that to size its body.
    const overhang = digitOverhang(count);

    for (const d of segmentPaths(count)) {
      for (const [x, y] of points(d)) {
        expect(x).toBeGreaterThanOrEqual(-overhang.x);
        expect(x).toBeLessThanOrEqual(DIGIT_WIDTH + overhang.x);
        expect(y).toBeGreaterThanOrEqual(-overhang.y);
        expect(y).toBeLessThanOrEqual(DIGIT_HEIGHT + overhang.y);
      }
    }
  });

  test.each(LAYOUTS)('no two segments of a %i-segment display share a shape', count => {
    // Two identical paths would mean two bits lighting the same bar, which no layout intends.
    expect(new Set(segmentPaths(count)).size).toBe(count);
  });

  test('bars have room for a straight run between their tapered ends', () => {
    // The shortest bar is a half-width one, and it still has to read as a bar rather than collapse
    // into a diamond once the ends are pulled back and tapered.
    const shortest = segmentPaths(16)
      .map(d => points(d))
      .map(p => Math.max(...p.map(([x]) => x)) - Math.min(...p.map(([x]) => x)));

    expect(Math.min(...shortest)).toBeGreaterThan(0);
  });

  test('segments that share a node meet at a point', () => {
    // The bars of a real display mitre against each other at the corners rather than standing off,
    // so a shared node has to come out as the same coordinate in both paths.
    const names = segmentNames(7);
    const paths = segmentPaths(7);
    const pointsOf = (name: string) =>
      new Set(points(paths[names.indexOf(name)]).map(p => p.join()));

    // Path data is rounded, so the node has to be compared at the same precision.
    const at = (node: [number, number]) => node.map(n => Math.round(n * 100) / 100).join();
    const shares = (a: string, b: string, node: [number, number]) =>
      pointsOf(a).has(at(node)) && pointsOf(b).has(at(node));

    const lean = SLANT * (DIGIT_HEIGHT / 2);
    // a and f meet at the top left, b and g at the middle right.
    expect(shares('a', 'f', [lean, 0])).toBe(true);
    expect(shares('b', 'g', [DIGIT_WIDTH, DIGIT_HEIGHT / 2])).toBe(true);
  });

  test('a 14-segment centre vertical reaches the bar it runs into', () => {
    // Nothing ends at the middle of the unbroken top bar, so the vertical below it has no node to
    // mitre against. Its tip is left to overlap: the wedge it covers is the notch the display this
    // copies carved out by hand, and the star is drawn after the ring, so the result is the same.
    const names = segmentNames(14);
    const paths = segmentPaths(14);
    const topOf = (name: string) =>
      Math.min(...points(paths[names.indexOf(name)]).map(([, y]) => y));
    const bottomOf = (name: string) =>
      Math.max(...points(paths[names.indexOf(name)]).map(([, y]) => y));

    // The tip stops on the bar's centreline, so it covers exactly its lower half.
    expect(topOf('i')).toBe(0);
    expect(bottomOf('a')).toBeGreaterThan(0);
    expect(bottomOf('l')).toBe(DIGIT_HEIGHT);
    expect(topOf('d')).toBeLessThan(DIGIT_HEIGHT);

    // Drawn later, so the overlap resolves in the vertical's favour rather than the bar's.
    expect(names.indexOf('i')).toBeGreaterThan(names.indexOf('a'));
    expect(names.indexOf('l')).toBeGreaterThan(names.indexOf('d'));
  });

  test.each([[7, 'g', 0.26], [14, 'g1', 0.115], [16, 'g1', 0.115]] as const)(
    'a %i-segment bar is as thick a fraction of the digit as the display it copies',
    (count, middle, ratio) => {
      // The middle bar runs horizontally, so the height of its path is the bar thickness.
      const names = segmentNames(count);
      const ys = points(segmentPaths(count)[names.indexOf(middle)]).map(([, y]) => y);

      expect((Math.max(...ys) - Math.min(...ys)) / DIGIT_WIDTH).toBeCloseTo(ratio, 2);
    });

  test('the dense layouts use thinner bars than the plain one', () => {
    // Sixteen bars of the 7-segment weight would leave a fully lit digit a solid block.
    expect(digitOverhang(16).y).toBeLessThan(digitOverhang(7).y);
  });

  test('the digit leans to the right', () => {
    // The top bar sits above the centre and the bottom bar below it, so a rightward lean puts the
    // top one further right.
    const [top] = segmentPaths(7);
    const bottom = segmentPaths(7)[3];

    const centreX = (ps: Array<[number, number]>) =>
      ps.reduce((sum, [x]) => sum + x, 0) / ps.length;

    expect(centreX(points(top))).toBeGreaterThan(centreX(points(bottom)));
  });
});
