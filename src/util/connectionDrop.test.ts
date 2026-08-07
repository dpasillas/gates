import {MouseManager} from './MouseManager';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicComponent} from '../logic/LogicComponent';
import {LogicPin} from '../logic/LogicPin';
import {LogicGate} from '../logic/LogicGate';
import {SegmentDisplay} from '../logic/SegmentDisplay';
import {Splitter} from '../logic/Splitter';
import {GateType} from '../enums/GateType';
import {MouseEventMapping} from './MouseEventMapping';

/** The board-space point at which a connection to this pin attaches. */
function anchorOf(pin: LogicPin) {
  return pin.transform(pin.anchor[0]);
}

/** Registers a component's pins with the board, as dropping one onto the board does. */
function place(board: LogicBoard, component: LogicComponent) {
  component.pins().forEach(pin => {
    pin.board = board;
    board.addPin(pin);
  });
}

/**
 * A single-bit driver, parked well clear of everything else.
 *
 * Its own pins are on the board like any other component's, so keeping it at a distance stops it
 * from being a candidate for its own drop.
 */
function driver(board: LogicBoard): LogicPin {
  const gate = new LogicGate({scope: board.scope, subtype: GateType.AND});
  gate.translate(new board.scope.Point(500, 500));
  place(board, gate);

  return gate.outputPins[0];
}

/** Drags a connection from a pin and releases it at a point in board coordinates. */
function dropAt(board: LogicBoard, source: LogicPin, to: {x: number, y: number}) {
  const manager = new MouseManager();
  manager.getViewCoordinates = (): MouseEventMapping =>
    ({x: to.x, y: to.y, rx: 0, ry: 0, dx: 0, dy: 0});

  const event = {
    button: 0, clientX: 0, clientY: 0, altKey: false,
    preventDefault: () => {}, stopPropagation: () => {}, getModifierState: () => false,
  } as unknown as MouseEvent;

  manager.handlePinMouseDown(board, source, event);
  manager.handleMouseUp(board, event);
}

describe('dropping a connection', () => {
  test('lands on the nearest pin, not the first one in range', () => {
    // A 7-segment display spaces its pins 8 apart, closer than two anchor radii, so the circles
    // overlap and a drop in that overlap is in range of both. Taking the first match resolved it by
    // creation order, which handed the connection to whichever pin was made earlier.
    const board = new LogicBoard();
    const display = new SegmentDisplay({scope: board.scope, subtype: 1, isMerged: false});
    place(board, display);
    const source = driver(board);

    const [nearer, farther] = [display.inputPins[4], display.inputPins[3]];
    const from = anchorOf(farther);
    const to = anchorOf(nearer);
    // Just past halfway, so the nearer pin is the one scanned second.
    const drop = new board.scope.Point(from.x + (to.x - from.x) * 0.56,
                                       from.y + (to.y - from.y) * 0.56);

    // The premise: both are in range, and the farther one is checked first.
    expect(farther.distanceTo(drop)).toBeLessThan(LogicPin.ANCHOR_RADIUS);
    expect(nearer.distanceTo(drop)).toBeLessThan(farther.distanceTo(drop));
    expect([...board.pins.values()].indexOf(farther))
      .toBeLessThan([...board.pins.values()].indexOf(nearer));

    dropAt(board, source, drop);

    expect(display.inputPins.findIndex(p => source.isConnectedTo(p))).toBe(4);
  });

  test('is not swallowed by a nearer pin it cannot connect to', () => {
    // The splitter is registered first and its bus pin lands a unit away from the display pin being
    // aimed at, but it is two bits wide and cannot take a single-bit connection. The old scan
    // stopped at the first pin in range whether or not it could be connected, so the drop was lost.
    const board = new LogicBoard();
    const splitter = new Splitter({scope: board.scope, subtype: 0, width: 2});
    place(board, splitter);
    const display = new SegmentDisplay({scope: board.scope, subtype: 1, isMerged: false});
    place(board, display);
    const source = driver(board);

    const aimedAt = display.inputPins[1];
    const busPin = splitter.inputPins[0];
    // The premise: the incompatible pin really is nearer, and really is checked first.
    expect(busPin.distanceTo(anchorOf(aimedAt))).toBeLessThan(LogicPin.ANCHOR_RADIUS);
    expect([...board.pins.values()].indexOf(busPin))
      .toBeLessThan([...board.pins.values()].indexOf(aimedAt));

    dropAt(board, source, anchorOf(aimedAt));

    expect(source.isConnectedTo(aimedAt)).toBe(true);
  });

  test('accepts a drop exactly as far out as the circle it draws', () => {
    // The catch area and the drawn circle are the same affordance. While the hit test was three
    // times the radius of the circle, a drop could register on a pin the user never touched.
    const board = new LogicBoard();
    const display = new SegmentDisplay({scope: board.scope, subtype: 1, isMerged: false});
    place(board, display);
    const target = display.inputPins[0];
    const at = anchorOf(target);

    const inset = (offset: number) => new board.scope.Point(at.x, at.y - offset);

    expect(target.isOver(inset(LogicPin.ANCHOR_RADIUS - 0.5))).toBe(true);
    expect(target.isOver(inset(LogicPin.ANCHOR_RADIUS + 0.5))).toBe(false);
  });

  test('connects nothing when the drop is not near any pin', () => {
    const board = new LogicBoard();
    const display = new SegmentDisplay({scope: board.scope, subtype: 1, isMerged: false});
    place(board, display);
    const source = driver(board);

    dropAt(board, source, {x: 5000, y: 5000});

    expect(display.inputPins.some(p => source.isConnectedTo(p))).toBe(false);
  });
});
