import paper from "paper";

import {makeComponent} from './componentFactory';
import {LogicComponent} from './LogicComponent';
import {Switch} from './Switch';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';
import {GLOBAL_SCOPE, AND_PATH, PIN_PATH, NOT_PIN_PATH} from '../Constants';
import {clearShapeCache} from '../util/shapeCache';

function make(type: PartType, subtype: number): LogicComponent {
  return makeComponent({type, subtype: subtype as GateType, scope: GLOBAL_SCOPE});
}

/** A pin trimmed to a body, the way LogicPin builds one before its path data is cached. */
function clipped(pinPath: string, rotation: number, at: paper.Point) {
  const {CompoundPath, Path, Point} = GLOBAL_SCOPE;
  const body = new CompoundPath(AND_PATH);
  const pin = pinPath === NOT_PIN_PATH ? new CompoundPath(pinPath) : new Path(pinPath);

  pin.pivot = new Point(0, 0);
  pin.rotate(rotation);
  pin.translate(at);

  const result = pin.subtract(body as paper.PathItem);
  pin.remove();

  return result;
}

/**
 * The cache holds path data rather than paper items, so that one cache serves every board's scope.
 * Everything below rests on a path rebuilt from that data being the same shape as the boolean
 * result it was taken from.
 */
describe('rebuilding a clipped pin from its path data', () => {
  const cases = [
    {name: 'a plain pin', path: PIN_PATH},
    {name: 'a negated pin, whose bubble makes it a compound path', path: NOT_PIN_PATH},
  ];

  for (const {name, path} of cases) {
    test(`gives ${name} the same extent`, () => {
      const original = clipped(path, 0, new GLOBAL_SCOPE.Point(32, 16));
      const d = (original.exportSVG() as SVGElement).getAttribute('d') ?? "";

      const rebuilt = new GLOBAL_SCOPE.CompoundPath(d);

      expect(rebuilt.bounds.width).toBeCloseTo(original.bounds.width);
      expect(rebuilt.bounds.height).toBeCloseTo(original.bounds.height);
      expect(rebuilt.bounds.x).toBeCloseTo(original.bounds.x);
      expect(rebuilt.bounds.y).toBeCloseTo(original.bounds.y);
    });

    test(`answers the same as ${name} about what it covers`, () => {
      const original = clipped(path, 0, new GLOBAL_SCOPE.Point(32, 16));
      const d = (original.exportSVG() as SVGElement).getAttribute('d') ?? "";
      const rebuilt = new GLOBAL_SCOPE.CompoundPath(d);

      // Across the whole area the pin could occupy, so the sweep passes through the clipped-away
      // end, the surviving stem, and the space around both.
      const box = original.bounds;
      let compared = 0;
      for (let x = box.x - 4; x <= box.x + box.width + 4; x += 1) {
        for (let y = box.y - 4; y <= box.y + box.height + 4; y += 1) {
          const point = new GLOBAL_SCOPE.Point(x, y);
          expect(rebuilt.contains(point)).toBe(original.contains(point));
          compared++;
        }
      }
      expect(compared).toBeGreaterThan(100);
    });
  }
});

describe('geometry keyed by shape', () => {
  beforeEach(() => clearShapeCache());

  test('gives components of the same kind and size the same body', () => {
    expect(make(PartType.GATE, GateType.AND).d).toBe(make(PartType.GATE, GateType.AND).d);
  });

  test('tells different kinds of component apart', () => {
    expect(make(PartType.GATE, GateType.AND).d).not.toBe(make(PartType.GATE, GateType.OR).d);
  });

  test('tells sizes apart', () => {
    const narrow = make(PartType.INPUT, 1);
    const wide = make(PartType.INPUT, 1);
    wide.width = 4;

    expect(wide.d).not.toBe(narrow.d);
  });

  test('tells apart components built at different sizes', () => {
    // A component's width fields are assigned after updateGeometry returns, and hold -1 until then,
    // so a key read from the fields rather than from the parameters files every component built —
    // whatever its size — under one key.
    const narrow = new Switch({subtype: 1 as GateType, scope: GLOBAL_SCOPE, width: 1});
    const wide = new Switch({subtype: 1 as GateType, scope: GLOBAL_SCOPE, width: 4});

    expect(wide.d).not.toBe(narrow.d);
  });

  test('gives a component the same body whatever sizes it passed through', () => {
    const wandered = make(PartType.INPUT, 1);
    wandered.width = 4;
    wandered.width = 8;

    const direct = make(PartType.INPUT, 1);
    direct.width = 8;

    expect(direct.d).toBe(wandered.d);
  });

  test('does not serve a merged component the shape it had unmerged', () => {
    const first = make(PartType.INPUT, 1);
    first.width = 4;
    const unmerged = first.d;

    first.isMerged = true;

    expect(make(PartType.INPUT, 1).d).not.toBe(unmerged);
  });
});

describe('a pin', () => {
  beforeEach(() => clearShapeCache());

  test('carries the path data it is drawn from', () => {
    const [pin] = make(PartType.GATE, GateType.AND).pins();

    expect(pin.d).toMatch(/^[Mm]/);
  });

  test('is drawn as the shape it is hit-tested against', () => {
    const [pin] = make(PartType.GATE, GateType.AND).pins();

    const drawn = new GLOBAL_SCOPE.CompoundPath(pin.d);
    expect(drawn.bounds.width).toBeCloseTo(pin.geometry!.bounds.width);
    expect(drawn.bounds.height).toBeCloseTo(pin.geometry!.bounds.height);
  });

  test('keeps the body out of itself, so a drop on the body is not a drop on the pin', () => {
    const gate = make(PartType.GATE, GateType.AND);
    const [pin] = gate.pins();

    expect(pin.covers(gate.body.bounds.center)).toBe(false);
  });

  test('sits where it was placed, not where another pin of the same component was', () => {
    // Pins along one edge differ only in where they sit, so placement has to be part of what
    // identifies the shape or they all come back as whichever was cut first.
    const gate = make(PartType.GATE, GateType.AND);
    const [first, second] = gate.pins();

    expect(second.pos.y).not.toBeCloseTo(first.pos.y);
    expect(second.geometry!.bounds.y).not.toBeCloseTo(first.geometry!.bounds.y);
  });

  test('has the point a wire attaches to sitting on it', () => {
    // The anchor is measured from the pin's position, which paper reads through the pivot. A path
    // rebuilt from path data has no pivot and falls back to the middle of its bounds, which moves
    // the anchor off the end of the pin and every wire with it.
    const gate = make(PartType.GATE, GateType.AND);
    const [pin] = gate.pins();
    const [anchor] = pin.anchor;

    expect(pin.covers(anchor)).toBe(true);
  });
});
