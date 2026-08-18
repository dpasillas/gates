import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {LogicState} from './LogicState';
import {PinType} from './LogicPin';
import {makeComponent} from './componentFactory';
import {connectPins} from './nets';
import {Net} from './Net';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

function place(board: LogicBoard, type: PartType, subtype: number): LogicComponent {
  const made = makeComponent({type, subtype: subtype as GateType, scope: board.scope, board});
  board.addComponent(made);

  return made;
}

const outputOf = (c: LogicComponent) => c.pins().find(p => p.pinType === PinType.OUTPUT)!;
const inputOf = (c: LogicComponent) => c.pins().find(p => p.pinType === PinType.INPUT)!;

/** A driver wired to a listener, on one line. */
function wired() {
  const board = new LogicBoard();
  const source = place(board, PartType.GATE, GateType.AND);
  const sink = place(board, PartType.GATE, GateType.AND);
  connectPins(board, [outputOf(source), inputOf(sink)]);

  return {board, driver: outputOf(source), listener: inputOf(sink)};
}

describe('an event', () => {
  test('records what the pin drives without working out the line', () => {
    // The two phases: every event at an instant lands, and only then does the line resolve. A line
    // driven from more than one place must not settle part way through its own instant.
    const {board, driver, listener} = wired();
    // Wiring the two left events of its own in the queue; this test is about one of its own.
    board.simulation.clear();
    const before = listener.state;

    board.postEvent(new LogicState({v: 1}), driver, 1);
    board.simulation.popFirst()!.apply();

    expect(driver.driven).toEqual(new LogicState({v: 1}));
    expect(listener.state).toBe(before);

    board.settleNets();

    expect(listener.state).toEqual(new LogicState({v: 1}));
  });

});

describe('a line', () => {
  test('carries what its driver puts on it', () => {
    const {driver, listener} = wired();

    driver.setLogicState(new LogicState({v: 1}));

    expect(listener.state).toEqual(new LogicState({v: 1}));
    expect(driver.state).toEqual(new LogicState({v: 1}));
  });

  test('floats where nothing drives it', () => {
    const board = new LogicBoard();
    const gate = place(board, PartType.GATE, GateType.AND);
    const pin = inputOf(gate);
    const net = new Net();
    net.add(pin);

    expect(net.resolve().z).toBe(pin.bitMask());
  });
});

/** How many times a run of samples changed value — one tick alone is not a clock. */
function alternations(seen: number[]): number {
  return seen.filter((value, i) => i > 0 && value !== seen[i - 1]).length;
}

describe('a clock', () => {
  test('keeps itself ticking, having nothing to drive it', () => {
    const board = new LogicBoard();
    const clock = place(board, PartType.INPUT, 0);
    board.stopSimulation();

    const seen: number[] = [];
    for (let step = 0; step < clock.delay * 4; step++) {
      board.advanceSimulation();
      seen.push(outputOf(clock).driven.v);
    }

    expect(alternations(seen)).toBeGreaterThanOrEqual(3);
  });

  test('is not stopped by unwiring what it drove', () => {
    // It used to tick through a connection from its own output back to itself, which a disconnect
    // had to be taught to skip.
    const board = new LogicBoard();
    const clock = place(board, PartType.INPUT, 0);
    const bulb = place(board, PartType.OUTPUT, 0);
    connectPins(board, [outputOf(clock), inputOf(bulb)]);
    board.stopSimulation();

    outputOf(clock).disconnect();

    const seen: number[] = [];
    for (let step = 0; step < clock.delay * 4; step++) {
      board.advanceSimulation();
      seen.push(outputOf(clock).driven.v);
    }

    expect(alternations(seen)).toBeGreaterThanOrEqual(3);
  });
});
