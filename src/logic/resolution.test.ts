import {Net} from './Net';
import {LogicBoard} from './LogicBoard';
import {LogicState} from './LogicState';
import {PinType} from './LogicPin';
import {makeComponent} from './componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/** What a line settles to when each of these is put on it. */
function lineOf(...driven: LogicState[]): LogicState {
  return wideLineOf(1, ...driven);
}

function wideLineOf(width: number, ...driven: LogicState[]): LogicState {
  const board = new LogicBoard();
  const net = new Net();

  for (const state of driven) {
    const gate = makeComponent({
      type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board,
    });
    const pin = gate.pins().find(p => p.pinType === PinType.OUTPUT)!;
    pin.width = width;
    pin.driven = state;
    net.add(pin);
  }

  return net.resolve();
}

const strong1 = new LogicState({v: 1});
const strong0 = new LogicState({});
const weak1 = new LogicState({v: 1, w: 1});
const weak0 = new LogicState({w: 1});
const released = new LogicState({z: 1});

describe('a line with more than one driver', () => {
  test('lets a strong driver decide over a weak one', () => {
    expect(lineOf(strong0, weak1)).toEqual(strong0);
    expect(lineOf(strong1, weak0)).toEqual(strong1);
  });

  test('lets the weak one decide once nothing stronger is driving', () => {
    // A tri-state that has let go, against a pull: the whole point of the resistor.
    expect(lineOf(released, weak1)).toEqual(weak1);
    expect(lineOf(released, weak0)).toEqual(weak0);
  });

  test('is unknown where drivers of the same strength disagree', () => {
    expect(lineOf(strong0, strong1)).toEqual(new LogicState({x: 1}));
    expect(lineOf(weak0, weak1)).toEqual(new LogicState({x: 1}));
  });

  test('floats where every driver has let go', () => {
    expect(lineOf(released, released)).toEqual(released);
  });

  test('weighs each channel on its own', () => {
    // Bit 0 driven strongly, bit 1 only weakly, bit 2 by nobody.
    const strongly = new LogicState({v: 0b001, z: 0b110});
    const weakly = new LogicState({v: 0b010, z: 0b100, w: 0b011});

    const line = wideLineOf(3, strongly, weakly);

    expect(line.v).toBe(0b011);
    expect(line.z).toBe(0b100);
    expect(line.w).toBe(0b010);
  });
});

describe('removing a component', () => {
  test('takes its pins off the lines they were on', () => {
    // Membership is what a line resolves from, so a pin left on one goes on driving after the
    // component holding it is gone — as a second pull did, holding a line at unknown.
    const board = new LogicBoard();
    const make = (subtype: number) => {
      const made = makeComponent({
        type: PartType.INPUT, subtype: subtype as GateType, scope: board.scope, board,
      });
      board.addComponent(made);

      return made;
    };
    const first = make(3), second = make(4);
    const line = new Net();
    line.add(first.outputPins[0]);
    line.add(second.outputPins[0]);

    first.remove();

    expect(line.drivers).toEqual([second.outputPins[0]]);
    expect(line.resolve()).toEqual(new LogicState({v: 0, w: 1}));
  });
});

describe('a pull resistor against a tri-state', () => {
  function scenario(pull: number) {
    const board = new LogicBoard();
    const make = (type: PartType, subtype: number) => {
      const made = makeComponent({type, subtype: subtype as GateType, scope: board.scope, board});
      board.addComponent(made);

      return made;
    };
    const resistor = make(PartType.INPUT, pull);
    const buffer = make(PartType.GATE, GateType.TRI);
    const out = (c: typeof resistor) => c.pins().find(p => p.pinType === PinType.OUTPUT)!;

    // Put on one line directly: two outputs cannot be wired to each other, which is the whole
    // reason the resistors are not in the parts panel yet.
    const line = new Net();
    line.add(out(resistor));
    line.add(out(buffer));

    return {board, resistor, buffer, line};
  }

  test('holds the line at the pulled level once the buffer lets go', () => {
    // Released, not merely idle: a tri-state whose enable is floating cannot tell whether it is
    // driving, so it holds the line at unknown and beats the resistor until it is told.
    const up = scenario(3), down = scenario(4);
    up.buffer.outputPins[0].setLogicState(new LogicState({z: 1}));
    down.buffer.outputPins[0].setLogicState(new LogicState({z: 1}));

    expect(up.line.resolve()).toEqual(new LogicState({v: 1, w: 1}));
    expect(down.line.resolve()).toEqual(new LogicState({v: 0, w: 1}));
  });

  test('is held at unknown while the buffer cannot tell whether it is driving', () => {
    expect(scenario(3).line.resolve()).toEqual(new LogicState({x: 1}));
  });

  test('gives way once the buffer drives', () => {
    const {buffer, line} = scenario(3);
    const [data, enable] = buffer.inputPins;

    enable.setLogicState(new LogicState({v: 1}));
    data.setLogicState(new LogicState({v: 0}));
    buffer.operate();
    buffer.outputPins[0].setLogicState(new LogicState({v: 0}));

    expect(line.resolve()).toEqual(new LogicState({v: 0}));
  });
});
