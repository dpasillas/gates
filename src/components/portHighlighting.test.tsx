import React from 'react';
import {render} from '@testing-library/react';

import {Board} from './Board';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicComponent} from '../logic/LogicComponent';
import {LogicPin, PinType} from '../logic/LogicPin';
import {makeComponent} from '../logic/componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';
import {setPort} from '../logic/nets';

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = vi.fn().mockImplementation(function () {
    return {observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn()};
  });
});

/** A board with one gate whose first input and only output are named ports. */
function boardWithPorts(highlight: boolean, angle: number = 0) {
  const board = new LogicBoard();
  board.highlightPorts = highlight;

  const gate = makeComponent({
    type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board,
  });
  board.addComponent(gate);
  gate.angle = angle;

  const input = gate.pins().find(pin => pin.pinType === PinType.INPUT)!;
  const output = gate.pins().find(pin => pin.pinType === PinType.OUTPUT)!;
  setPort(board, input, true, 'a');
  setPort(board, output, true, 'q');

  const {container} = render(<Board board={board}/>);

  return {board, gate, container, input, output};
}

function pinCount(container: HTMLElement, selector: string): number {
  return container.querySelectorAll(selector).length;
}

describe('marking ports on the board', () => {
  test('marks a pin that is a port, whether or not they are being highlighted', () => {
    const off = boardWithPorts(false);
    const on = boardWithPorts(true);

    expect(pinCount(off.container, 'g.pin.port')).toBe(2);
    expect(pinCount(on.container, 'g.pin.port')).toBe(2);
  });

  test('leaves pins that are not ports unmarked', () => {
    const {container, gate} = boardWithPorts(true);

    expect(pinCount(container, 'g.pin')).toBe(gate.pins().length);
    expect(pinCount(container, 'g.pin:not(.port)')).toBe(gate.pins().length - 2);
  });

  test('tells the driving port apart from the driven ones', () => {
    // At most one output holds a port name while inputs may share it, so which end drives is the
    // thing a reader needs from the mark.
    const {container} = boardWithPorts(true);

    expect(pinCount(container, 'g.pin.port.driver')).toBe(1);
    expect(container.querySelector('g.pin.port.driver')).not.toBe(
        container.querySelector('g.pin.port:not(.driver)'));
  });

  test('tells the board when to show the marks, rather than deciding per pin', () => {
    expect(boardWithPorts(true).container.querySelector('svg.board.highlight-ports')).not.toBeNull();
    expect(boardWithPorts(false).container.querySelector('svg.board.highlight-ports')).toBeNull();
  });

  test('draws a disc for the driving port and a notched ring for a driven one', () => {
    const {container} = boardWithPorts(true);

    expect(container.querySelectorAll('g.pin.driver circle.port-mark')).toHaveLength(1);
    expect(container.querySelectorAll('g.pin.port:not(.driver) path.port-mark')).toHaveLength(1);
  });

  test('leaves the anchor alone, since that is the only sign a pin is hovered', () => {
    // The mark is drawn beside the anchor rather than by colouring it in. Taking the anchor over
    // would outrank `.pin:hover .anchor` and leave port pins with no hover feedback at all.
    const {container} = boardWithPorts(true);
    const anchors = [...container.querySelectorAll('g.pin.port circle.anchor')];

    expect(anchors).toHaveLength(2);
    expect(anchors.every(a => a.classList.contains('port-mark'))).toBe(false);
  });

  test('draws the mark behind the pin and its anchor', () => {
    // Painting order: the mark is decoration on the pin, not something laid over it, and the anchor
    // above it is what fills in to show the pin is hovered.
    const {container} = boardWithPorts(true);
    const inside = [...container.querySelector('g.pin.port')!.children]
        .map(child => child.getAttribute('class') ?? '');

    expect(inside.indexOf('port-mark')).toBe(0);
    expect(inside.indexOf('anchor')).toBeGreaterThan(inside.indexOf('port-mark'));
  });

  test('keeps the mark within the anchor, so neighbouring pins do not collide', () => {
    const {container} = boardWithPorts(true);
    const disc = container.querySelector('circle.port-mark')!;
    const ring = container.querySelector('path.port-mark')!;
    const [, arcRadius] = / A ([\d.]+) /.exec(ring.getAttribute('d') ?? '')!;

    expect(Number(disc.getAttribute('r'))).toBeLessThanOrEqual(LogicPin.ANCHOR_RADIUS);
    expect(Number(arcRadius)).toBeLessThanOrEqual(LogicPin.ANCHOR_RADIUS);
  });

  test('cuts a notch of the intended angle out of the ring', () => {
    const {container} = boardWithPorts(true);
    const pin = container.querySelector('g.pin.port:not(.driver)')!;
    const centre = pin.querySelector('circle.anchor')!;
    const cx = Number(centre.getAttribute('cx')), cy = Number(centre.getAttribute('cy'));

    // M x1 y1 A r r 0 1 1 x2 y2 — the arc runs the long way, so the gap is what it leaves out.
    const numbers = pin.querySelector('path.port-mark')!.getAttribute('d')!
        .match(/-?[\d.]+/g)!.map(Number);
    const facing = (x: number, y: number) => Math.atan2(y - cy, x - cx) * 180 / Math.PI;
    const from = facing(numbers[0], numbers[1]);
    const to = facing(numbers[numbers.length - 2], numbers[numbers.length - 1]);

    expect(Math.round(((from - to) % 360 + 360) % 360)).toBe(45);
  });

  test('marks nothing on a pin that is not a port', () => {
    const {container} = boardWithPorts(true);

    expect(container.querySelectorAll('g.pin:not(.port) .port-mark')).toHaveLength(0);
  });
});

/** The angle a port name is drawn at, and which end of it meets the pin. */
function nameLayout(container: HTMLElement, name: string) {
  const text = [...container.querySelectorAll('.port-name text')]
      .find(t => t.textContent === name)!;
  // The turn is on the group holding the name and its backdrop, so both are placed as one.
  const [, angle] = /rotate\((-?[\d.]+) /.exec(text.parentElement!.getAttribute('transform') ?? '')!;

  return {angle: Number(angle), anchor: text.getAttribute('text-anchor')};
}

describe('port names on the board', () => {
  test('are written while ports are highlighted', () => {
    const {container} = boardWithPorts(true);
    const names = [...container.querySelectorAll('.port-name text')].map(t => t.textContent);

    expect(names.sort()).toEqual(['a', 'q']);
  });

  test('are not written otherwise, since the board is not being read as an interface', () => {
    expect(pinCount(boardWithPorts(false).container, '.port-name')).toBe(0);
  });

  test('are drawn over the components rather than inside one of them', () => {
    // A name inside a component's frame turns with it and is painted over by any component drawn
    // afterwards, svg having painting order and no z-index.
    const {container} = boardWithPorts(true);
    const layer = container.querySelector('g.port-names')!;

    expect(layer.closest('g.component')).toBeNull();
    expect(layer.querySelectorAll('.port-name text')).toHaveLength(2);
  });

  test('lie along the pin, and never run right to left', () => {
    // 'a' is on a west-facing input, 'q' on an east-facing output.
    const {container} = boardWithPorts(true);

    // Turned to face east and anchored at its far end, so it still reads outward from the pin.
    expect(nameLayout(container, 'a')).toEqual({angle: 0, anchor: 'end'});
    expect(nameLayout(container, 'q')).toEqual({angle: 0, anchor: 'start'});
  });

  test('are placed by where the pin faces on the board, not on its component', () => {
    // The same west-facing input, on a component turned a quarter turn, now faces north — and is
    // laid out as a north-facing pin, not as the west-facing one it was built as.
    const upright = nameLayout(boardWithPorts(true, 0).container, 'a');
    const turned = nameLayout(boardWithPorts(true, 90).container, 'a');

    expect(upright.angle).toBe(0);
    expect(turned.angle).toBe(-90);
  });

  test('never read right to left, at any angle a component can be turned to', () => {
    // A component turns continuously, not in quarters, so the readable range has to hold throughout.
    for (let angle = 0; angle < 360; angle += 15) {
      const {container} = boardWithPorts(true, angle);
      for (const name of container.querySelectorAll('g.port-name')) {
        const [, turn] = /rotate\((-?[\d.]+) /.exec(name.getAttribute('transform') ?? '')!;

        expect(Math.abs(Number(turn))).toBeLessThanOrEqual(90);
      }
    }
  });

  test('sit on a backdrop covering the whole name, whichever end is anchored', () => {
    // Roboto Mono is fixed width, so a name's extent is known rather than guessed at — and which
    // side of the anchor point it occupies depends on which end of it meets the pin.
    const {container} = boardWithPorts(true);

    for (const group of container.querySelectorAll('g.port-name')) {
      const rect = group.querySelector('rect')!, text = group.querySelector('text')!;
      const at = Number(text.getAttribute('x'));
      const size = Number(text.getAttribute('font-size'));
      const runs = text.textContent!.length * size * 0.6;
      const [from, to] = text.getAttribute('text-anchor') === 'end'
          ? [at - runs, at]
          : [at, at + runs];

      const left = Number(rect.getAttribute('x'));
      expect(left).toBeLessThanOrEqual(from);
      expect(left + Number(rect.getAttribute('width'))).toBeGreaterThanOrEqual(to);
    }
  });

  test('follow the pin they belong to rather than sitting on top of it', () => {
    const {container} = boardWithPorts(true);
    const names = [...container.querySelectorAll('.port-name text')];
    const at = (t: Element) => `${t.getAttribute('x')},${t.getAttribute('y')}`;

    expect(new Set(names.map(at)).size).toBe(names.length);
  });
});

describe('a port pin that has lost its name', () => {
  test('is not written out blank', () => {
    const board = new LogicBoard();
    board.highlightPorts = true;
    const gate: LogicComponent = makeComponent({
      type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board,
    });
    board.addComponent(gate);
    // Reaching past setPort, which will not take an empty name, to the state a damaged file could
    // still hold.
    gate.pins()[0].isPort = true;

    const {container} = render(<Board board={board}/>);

    expect(pinCount(container, '.port-name')).toBe(0);
  });
});
