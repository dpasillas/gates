import * as paper from 'paper';

import {GLOBAL_SCOPE} from '../Constants';
import {PinOrientation, PinType} from './LogicPin';
import {CornerMark, PackageDivider, PackageGroup, PackageShape} from '../enums/Packaging';
import {PackageComponent} from './PackageComponent';

/** How far apart pins sit, and how much is kept between the outermost and what its run ends at. */
const PIN_SPACING = 12;
const EDGE_MARGIN = 6;
const MIN_BODY = 32;

function pkg(name = 'p'): PackageComponent {
  return new PackageComponent({scope: GLOBAL_SCOPE, name});
}

/** A package with the given number of pins on one edge. */
function on(side: PinOrientation, count: number): PackageComponent {
  const made = pkg();
  for (let i = 0; i < count; i++) {
    made.declarePin({label: `p${i}`, pinType: PinType.INPUT, orientation: side});
  }

  return made;
}

/** The body's size, read off the drawing rather than off any field. */
function size(made: PackageComponent): {width: number, height: number} {
  const {width, height} = made.body.bounds;

  return {width, height};
}

/** Where each pin meets the body. */
function places(made: PackageComponent): {x: number, y: number}[] {
  return made.declared.map(pin => ({x: pin.pos.x, y: pin.pos.y}));
}

describe('how big a package comes out', () => {
  test('never smaller than a gate, whatever is on it', () => {
    expect(size(on(PinOrientation.LEFT, 1))).toEqual({width: MIN_BODY, height: MIN_BODY});
  });

  test('grows for the pins down a side, keeping their spacing and padding', () => {
    // Six pins leave five gaps plus a margin at each end.
    expect(size(on(PinOrientation.LEFT, 6)).height).toBe(2 * EDGE_MARGIN + 5 * PIN_SPACING);
  });

  test('grows only in the direction the pins are on, keeping no proportion', () => {
    expect(size(on(PinOrientation.LEFT, 6)).width).toBe(MIN_BODY);
  });

  test('is sized by the busier of two facing edges', () => {
    const made = on(PinOrientation.LEFT, 6);
    made.declarePin({label: 'q', pinType: PinType.OUTPUT});

    expect(size(made).height).toBe(72);
  });
});

describe('where the pins go', () => {
  test('one pin sits at the middle of its edge', () => {
    expect(places(on(PinOrientation.LEFT, 1))[0].y).toBe(MIN_BODY / 2);
  });

  test('a run is centred rather than pushed to one end', () => {
    expect(places(on(PinOrientation.LEFT, 2)).map(at => at.y)).toEqual([10, 22]);
  });

  test('are spaced far enough apart that their hit circles do not meet', () => {
    const ys = places(on(PinOrientation.LEFT, 4)).map(at => at.y);

    expect(ys.map((y, i) => y - ys[i - 1]).slice(1))
        .toEqual([PIN_SPACING, PIN_SPACING, PIN_SPACING]);
  });

  test('attach to the edge they were declared on', () => {
    const made = pkg();
    [PinOrientation.LEFT, PinOrientation.RIGHT, PinOrientation.UP, PinOrientation.DOWN]
        .forEach((side, i) => made.declarePin(
            {label: `p${i}`, pinType: PinType.INPUT, orientation: side}));
    const {width, height} = size(made);

    expect(places(made)).toEqual([
      {x: 0, y: height / 2},
      {x: width, y: height / 2},
      {x: width / 2, y: 0},
      {x: width / 2, y: height},
    ]);
  });

  test('are trimmed where they meet the body rather than drawn back inside it', () => {
    const made = on(PinOrientation.LEFT, 1);

    // The shared pin shape reaches past where it attaches; a left-hand pin would otherwise be
    // drawn back over a body starting at zero.
    expect(made.declared[0].d).not.toBe('');
    expect(made.declared[0].d).not.toMatch(/L\s*[1-9]/);
  });
});

describe('a trapezoid', () => {
  function trapezoid(facing = PinOrientation.RIGHT): PackageComponent {
    const made = pkg('t');
    made.shape = PackageShape.TRAPEZOID;
    made.facing = facing;
    made.rebuild();

    return made;
  }

  /** The corners of the drawn body, taken from the path rather than parsed back out of it. */
  function corners(made: PackageComponent): number[][] {
    return (made.body as paper.Path).segments.map(segment => [segment.point.x, segment.point.y]);
  }

  test('starts at the smallest one the two edge minimums allow', () => {
    const made = trapezoid();
    const [tl, tr, br, bl] = corners(made);

    expect(Math.hypot(bl[0] - tl[0], bl[1] - tl[1])).toBeGreaterThanOrEqual(MIN_BODY);
    expect(Math.hypot(br[0] - tr[0], br[1] - tr[1])).toBeGreaterThanOrEqual(16);
  });

  test('slants at the angle asked for, whichever way it points', () => {
    const [tl, tr] = corners(trapezoid());
    const slant = Math.atan2(tr[1] - tl[1], tr[0] - tl[0]) * 180 / Math.PI;

    expect(90 - slant).toBeCloseTo(60);
  });

  test('grows across the body for pins on a slant, measured along the cardinal direction', () => {
    const spare = trapezoid();
    const busy = trapezoid();
    for (let i = 0; i < 4; i++) {
      busy.declarePin({label: `u${i}`, pinType: PinType.INPUT, orientation: PinOrientation.UP});
    }

    expect(size(busy).width).toBeGreaterThan(size(spare).width);
    expect(size(busy).width).toBe(2 * EDGE_MARGIN + 3 * PIN_SPACING);
  });

  test('is not offered a divider, which its edges are not parallel enough for', () => {
    const made = trapezoid();
    made.divider = PackageDivider.VERTICAL;
    made.rebuild();

    expect(made.isDivided(PinOrientation.UP)).toBe(false);
  });
});

describe('a divider', () => {
  /** A rectangle divided the given way. */
  function divided(divider: PackageDivider): PackageComponent {
    const made = pkg();
    made.divider = divider;
    made.rebuild();

    return made;
  }

  test('splits the two edges it crosses, and only those', () => {
    const down = divided(PackageDivider.VERTICAL);

    expect(down.isDivided(PinOrientation.UP)).toBe(true);
    expect(down.isDivided(PinOrientation.DOWN)).toBe(true);
    expect(down.isDivided(PinOrientation.LEFT)).toBe(false);
  });

  test('puts a pin on the side of the line it belongs to', () => {
    const made = divided(PackageDivider.VERTICAL);
    made.declarePin({label: 'a', pinType: PinType.INPUT, orientation: PinOrientation.UP,
                     group: PackageGroup.FIRST});
    made.declarePin({label: 'b', pinType: PinType.INPUT, orientation: PinOrientation.UP,
                     group: PackageGroup.SECOND});

    const [first, second] = places(made);
    expect(first.x).toBeLessThan(size(made).width / 2);
    expect(second.x).toBeGreaterThan(size(made).width / 2);
  });

  test('is an edge as far as padding goes, so a run is centred inside its own share', () => {
    const made = divided(PackageDivider.VERTICAL);
    made.declarePin({label: 'a', pinType: PinType.INPUT, orientation: PinOrientation.UP});

    // One run, half a thirty-two body wide, so its single pin sits a quarter of the way across.
    expect(places(made)[0].x).toBe(8);
  });

  test('grows the body so both runs keep their spacing', () => {
    const made = divided(PackageDivider.VERTICAL);
    for (let i = 0; i < 4; i++) {
      made.declarePin({label: `a${i}`, pinType: PinType.INPUT, orientation: PinOrientation.UP});
    }

    // Four in the first run, and the second still gets its minimum beside them.
    expect(size(made).width).toBe(2 * EDGE_MARGIN + 3 * PIN_SPACING + 2 * EDGE_MARGIN);
  });

  test('leaves room for whichever crossed edge needs more, not just one of them', () => {
    // One line crosses both edges. Sizing each edge to its own two runs let a busy run on one edge
    // push the line past where a busy run on the other still needed it, and the pins spilled out.
    const made = divided(PackageDivider.HORIZONTAL);
    ['a', 'b'].forEach(label => made.declarePin(
        {label, pinType: PinType.INPUT, orientation: PinOrientation.LEFT,
         group: PackageGroup.SECOND}));
    ['y', 'z'].forEach(label => made.declarePin(
        {label, pinType: PinType.OUTPUT, orientation: PinOrientation.RIGHT,
         group: PackageGroup.FIRST}));
    made.declarePin({label: 'w', pinType: PinType.OUTPUT, orientation: PinOrientation.RIGHT,
                     group: PackageGroup.SECOND});

    // Two on one side of the line and two on the other, so the body has to hold both runs whole.
    expect(size(made).height).toBe(2 * (2 * EDGE_MARGIN + PIN_SPACING));

    const {height} = size(made);
    places(made).forEach(at => {
      expect(at.y).toBeGreaterThanOrEqual(0);
      expect(at.y).toBeLessThanOrEqual(height);
    });
  });
});

describe('what a package says about itself', () => {
  test('nothing is wrong once every pin is named', () => {
    const made = pkg();
    made.declarePin({label: 'a', pinType: PinType.INPUT});

    expect(made.problems).toEqual([]);
  });

  test('a pin with no label, counted', () => {
    const made = pkg();
    made.declarePin({pinType: PinType.INPUT});

    expect(made.problems).toEqual(['1 pin still needs a label']);
  });

  test('two pins under one name, which a binding could not tell apart', () => {
    const made = pkg();
    made.declarePin({label: 'a', pinType: PinType.INPUT});
    made.declarePin({label: 'a', pinType: PinType.OUTPUT});

    expect(made.problems).toContain('Two pins are both called "a"');
  });

  test('no pins at all, which is a drawing rather than a contract', () => {
    expect(pkg().problems).toContain('A package needs at least one pin');
  });
});

describe('the interface hash', () => {
  function reg(): PackageComponent {
    const made = pkg('reg8');
    made.declarePin({label: 'D', pinType: PinType.INPUT, width: 8});
    made.declarePin({label: 'Q', pinType: PinType.OUTPUT, width: 8});

    return made;
  }

  test('is the same for two packages built the same way', () => {
    expect(reg().interfaceHash).toBe(reg().interfaceHash);
  });

  test('ignores which package it is, and which pins these are', () => {
    const other = reg();
    other.uuid = 'a-different-package';
    other.declared.forEach(pin => {pin.uuid = `${pin.label}-elsewhere`});

    expect(other.interfaceHash).toBe(reg().interfaceHash);
  });

  test.each([
    ['the name', (made: PackageComponent) => {made.name = 'reg16'}],
    ['a label', (made: PackageComponent) => {made.declared[0].label = 'DIN'}],
    ['a width', (made: PackageComponent) => {made.declared[0].width = 16}],
    ['a role', (made: PackageComponent) => {made.declared[0].pinType = PinType.OUTPUT}],
    ['an edge', (made: PackageComponent) => {made.declared[0].orientation = PinOrientation.UP}],
    ['a bubble', (made: PackageComponent) => {made.declared[0].not = true}],
    ['the clock', (made: PackageComponent) => made.setClockPin(made.declared[0])],
    ['a hidden label', (made: PackageComponent) => {made.declared[0].showLabel = false}],
    ['a heavier label', (made: PackageComponent) => {made.declared[0].labelBold = true}],
    ['a group', (made: PackageComponent) => {made.declared[0].group = PackageGroup.SECOND}],
    ['the outline', (made: PackageComponent) => {made.shape = PackageShape.TRAPEZOID}],
    ['which way it points', (made: PackageComponent) => {made.facing = PinOrientation.LEFT}],
    ['the divider', (made: PackageComponent) => {made.divider = PackageDivider.VERTICAL}],
    ['the corner mark', (made: PackageComponent) => {made.cornerMark = CornerMark.TOP_LEFT}],
    ['a pin being added', (made: PackageComponent) =>
        made.declarePin({label: 'E', pinType: PinType.INPUT})],
  ])('changes with %s', (_, change) => {
    const changed = reg();
    change(changed);

    expect(changed.interfaceHash).not.toBe(reg().interfaceHash);
  });

  test('is eight hex digits however long the package is', () => {
    const long = reg();
    long.name = 'x'.repeat(500);

    expect(long.interfaceHash).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('the clock mark', () => {
  test('moves rather than multiplying, a part having one clock', () => {
    const made = pkg();
    made.declarePin({label: 'a', pinType: PinType.INPUT});
    made.declarePin({label: 'b', pinType: PinType.INPUT});

    made.setClockPin(made.declared[0]);
    made.setClockPin(made.declared[1]);

    expect(made.declared.filter(pin => pin.clock).map(pin => pin.label)).toEqual(['b']);
  });

  test('can be taken off entirely', () => {
    const made = pkg();
    made.declarePin({label: 'a', pinType: PinType.INPUT, clock: true});

    made.setClockPin(undefined);

    expect(made.clockPin).toBeUndefined();
  });
});
