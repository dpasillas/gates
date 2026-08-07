import {dragImageHotspot, PREVIEW_PADDING} from './partPreview';
import {LogicComponent} from '../logic/LogicComponent';
import {LogicGate} from '../logic/LogicGate';
import {SegmentDisplay} from '../logic/SegmentDisplay';
import {Splitter} from '../logic/Splitter';
import {Joiner} from '../logic/Joiner';
import {Switch} from '../logic/Switch';
import {Bulb} from '../logic/Bulb';
import {TriStateBuffer} from '../logic/TriStateBuffer';
import {GateType} from '../enums/GateType';
import {GLOBAL_SCOPE} from '../Constants';

const scope = GLOBAL_SCOPE;

/**
 * The centre of a component's body in board coordinates.
 *
 * `body.bounds` is expressed in the geometry group's own space, so it has to be pushed through the
 * group's matrix to be comparable with a position on the board.
 */
function bodyCentreOnBoard(component: LogicComponent) {
  return component.geometry.matrix.transform(component.body.bounds.center);
}

/** One of each shape of component: square, tall, wide, asymmetric pins. */
function samples(): Array<[string, LogicComponent]> {
  return [
    ['AND', new LogicGate({scope, subtype: GateType.AND})],
    ['Bulb', new Bulb({scope, subtype: 0})],
    ['Tri-State', new TriStateBuffer({scope})],
    ['Splitter(8)', new Splitter({scope, subtype: 0, width: 8})],
    ['7-Segment', new SegmentDisplay({scope, subtype: 1})],
    ['16-Segment', new SegmentDisplay({scope, subtype: 3})],
  ];
}

describe('component anchor', () => {
  test.each(samples())('%s is anchored at the centre of its body', (_name, component) => {
    const {x, y} = component.geometry.position;
    const centre = component.body.bounds.center;

    expect(x).toBeCloseTo(centre.x);
    expect(y).toBeCloseTo(centre.y);
  });

  test.each(samples())('%s reports that anchor as its position', (_name, component) => {
    const properties = component.properties();
    const centre = component.body.bounds.center;

    expect(properties.find(p => p.key === 'x')!.value).toBeCloseTo(centre.x);
    expect(properties.find(p => p.key === 'y')!.value).toBeCloseTo(centre.y);
  });

  test('the anchor ignores pins, which stick out unevenly', () => {
    // A tri-state buffer's enable pin extends above the body, so the bounds of the whole geometry
    // sit higher than the body. Anchoring on those bounds would hang the component off the cursor.
    const component = new TriStateBuffer({scope});

    expect(component.geometry.bounds.center.y).not.toBeCloseTo(component.body.bounds.center.y);
    expect(component.geometry.position.y).toBeCloseTo(component.body.bounds.center.y);
  });

  test.each(samples())('placing %s puts its body centre exactly there', (_name, component) => {
    component.geometry.position = new scope.Point(200, 120);

    const centre = bodyCentreOnBoard(component);
    expect(centre.x).toBeCloseTo(200);
    expect(centre.y).toBeCloseTo(120);
  });

  test('a resized component is still anchored on its body', () => {
    const component = new Splitter({scope, subtype: 0, width: 2});
    component.geometry.position = new scope.Point(50, 50);

    component.width = 8;

    const centre = bodyCentreOnBoard(component);
    expect(component.geometry.position.x).toBeCloseTo(centre.x);
    expect(component.geometry.position.y).toBeCloseTo(centre.y);
  });

  test.each([
    ['Splitter', () => new Splitter({scope, subtype: 0, width: 2})],
    ['Joiner', () => new Joiner({scope, subtype: 1, width: 2})],
    ['Switch', () => new Switch({scope, subtype: 1, width: 1})],
  ])('resizing a %s leaves its position untouched', (_name, build) => {
    // A component that grows does so evenly about its centre, so the point it was placed at does
    // not move. Anchoring growth at a corner instead slid the centre by half the size change.
    const component = build();
    component.geometry.position = new scope.Point(50, 50);

    component.width = 8;

    expect(component.geometry.position.x).toBeCloseTo(50);
    expect(component.geometry.position.y).toBeCloseTo(50);
    expect(bodyCentreOnBoard(component).x).toBeCloseTo(50);
    expect(bodyCentreOnBoard(component).y).toBeCloseTo(50);
  });

  test('a component grows evenly in both directions', () => {
    const component = new Splitter({scope, subtype: 0, width: 2});
    component.geometry.position = new scope.Point(50, 50);
    const before = component.geometry.matrix.transform(component.body.bounds.topLeft);

    component.width = 8;

    const after = component.geometry.matrix.transform(component.body.bounds.topLeft);
    const grew = component.body.bounds.height - 24;
    expect(after.y).toBeCloseTo(before.y - grew / 2);
  });
});

describe('drag image hotspot', () => {
  test.each(samples())('%s puts the cursor on the point the drop uses', (_name, component) => {
    const hotspot = dragImageHotspot(component);
    const {left, top} = component.geometry.bounds;

    // Converting the hotspot back out of preview pixels has to land on the anchor again.
    expect(hotspot.x + left - PREVIEW_PADDING).toBeCloseTo(component.geometry.position.x);
    expect(hotspot.y + top - PREVIEW_PADDING).toBeCloseTo(component.geometry.position.y);
  });

  test.each(samples())('%s hotspot lies inside its preview', (_name, component) => {
    const hotspot = dragImageHotspot(component);
    const {width, height} = component.geometry.bounds;

    expect(hotspot.x).toBeGreaterThan(0);
    expect(hotspot.x).toBeLessThan(width + 2 * PREVIEW_PADDING);
    expect(hotspot.y).toBeGreaterThan(0);
    expect(hotspot.y).toBeLessThan(height + 2 * PREVIEW_PADDING);
  });

  test('accounts for pins reaching left of the body', () => {
    // Input pins extend 20 units left of the body, so the preview starts that far before it. A
    // hotspot measured from the board origin instead was adrift by exactly that overhang.
    const gate = new LogicGate({scope, subtype: GateType.AND});
    const naive = gate.geometry.position.x + PREVIEW_PADDING;

    expect(gate.geometry.bounds.left).toBeLessThan(0);
    expect(dragImageHotspot(gate).x).toBeCloseTo(naive - gate.geometry.bounds.left);
  });
});
