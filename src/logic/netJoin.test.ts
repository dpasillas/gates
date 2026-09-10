import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {LogicPin} from './LogicPin';
import {LogicState} from './LogicState';
import {Net} from './Net';
import {makeComponent} from './componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/**
 * Joining lines rather than folding them together.
 *
 * A wire between two pins that each already belong to a line used to move one of them onto the
 * other's. That is destructive twice over: two lines folded into one cannot be told apart again
 * when the wire is deleted, and a pin dragged off a line inside a subcomponent takes the
 * subcomponent apart. A join leaves both lines exactly as they were.
 */

function gate(board: LogicBoard, subtype = GateType.AND): LogicComponent {
  const made = makeComponent({type: PartType.GATE, subtype, scope: board.scope, board});
  board.addComponent(made);

  return made;
}

/** Puts a pin on a line of its own, the way a subcomponent's internals arrive on one. */
function ownLine(...pins: LogicPin[]): Net {
  const line = new Net();
  pins.forEach(pin => line.add(pin));

  return line;
}

function wire(board: LogicBoard, source: LogicPin, sink: LogicPin) {
  const connection = sink.connectTo(source)!;
  board.addConnection(connection);

  return connection;
}

describe('wiring a pin that is already on a line', () => {
  test('leaves it there rather than moving it', () => {
    const board = new LogicBoard();
    const [driver, held] = [gate(board), gate(board)];
    const line = ownLine(held.inputPins[0]);

    wire(board, driver.outputPins[0], held.inputPins[0]);

    expect(held.inputPins[0].net).toBe(line);
    expect(line.has(held.inputPins[0])).toBe(true);
  });

  test('joins the two lines, so what drives one drives the other', () => {
    const board = new LogicBoard();
    const [driver, held] = [gate(board), gate(board)];
    ownLine(held.inputPins[0]);

    wire(board, driver.outputPins[0], held.inputPins[0]);

    expect(driver.outputPins[0].net!.family).toContain(held.inputPins[0].net);
    expect(driver.outputPins[0].net!.listeners).toContain(held.inputPins[0]);
  });

  test('carries a value across the join', () => {
    const board = new LogicBoard();
    const [driver, held] = [gate(board), gate(board)];
    ownLine(held.inputPins[0]);
    wire(board, driver.outputPins[0], held.inputPins[0]);

    driver.outputPins[0].setLogicState(new LogicState({v: 1}));

    expect(held.inputPins[0].state.v).toBe(1);
  });

  test('reaches everything else already on that line', () => {
    const board = new LogicBoard();
    const [driver, held, alongside] = [gate(board), gate(board), gate(board)];
    // Two pins sharing a line, as a port's pins inside a subcomponent do.
    ownLine(held.inputPins[0], alongside.inputPins[0]);
    wire(board, driver.outputPins[0], held.inputPins[0]);

    driver.outputPins[0].setLogicState(new LogicState({v: 1}));

    expect(alongside.inputPins[0].state.v).toBe(1);
  });
});

describe('deleting the wire that joined them', () => {
  test('leaves both lines as they were', () => {
    const board = new LogicBoard();
    const [driver, held] = [gate(board), gate(board)];
    const line = ownLine(held.inputPins[0]);
    const connection = wire(board, driver.outputPins[0], held.inputPins[0]);

    connection.remove();

    expect(held.inputPins[0].net).toBe(line);
    expect(driver.outputPins[0].net!.family).toEqual([driver.outputPins[0].net]);
  });

  test('does not take the pin off the line it was on', () => {
    const board = new LogicBoard();
    const [driver, held, alongside] = [gate(board), gate(board), gate(board)];
    const line = ownLine(held.inputPins[0], alongside.inputPins[0]);
    const connection = wire(board, driver.outputPins[0], held.inputPins[0]);

    connection.remove();

    expect(line.members).toContain(held.inputPins[0]);
    expect(line.members).toContain(alongside.inputPins[0]);
  });

  test('splits two lines that a wire across one component had joined', () => {
    // The case a fold could never undo: one wire joining two lines that both belong to the same
    // thing, which has to come apart again exactly as it was.
    const board = new LogicBoard();
    const [driver, held] = [gate(board), gate(board)];
    const first = ownLine(driver.outputPins[0]);
    const second = ownLine(held.inputPins[0]);
    const connection = wire(board, driver.outputPins[0], held.inputPins[0]);
    expect(first.family).toHaveLength(2);

    connection.remove();

    expect(first.family).toEqual([first]);
    expect(second.family).toEqual([second]);
  });
});

describe('two wires between the same pair of lines', () => {
  test('keep them joined until both are gone', () => {
    const board = new LogicBoard();
    const [driver, held] = [gate(board), gate(board)];
    ownLine(driver.outputPins[0]);
    const line = ownLine(held.inputPins[0], held.inputPins[1]);
    const first = wire(board, driver.outputPins[0], held.inputPins[0]);
    wire(board, driver.outputPins[0], held.inputPins[1]);

    first.remove();

    expect(driver.outputPins[0].net!.family).toContain(line);
  });

  test('and come apart once both are', () => {
    const board = new LogicBoard();
    const [driver, held] = [gate(board), gate(board)];
    const source = ownLine(driver.outputPins[0]);
    ownLine(held.inputPins[0], held.inputPins[1]);
    const first = wire(board, driver.outputPins[0], held.inputPins[0]);
    const second = wire(board, driver.outputPins[0], held.inputPins[1]);

    first.remove();
    second.remove();

    expect(source.family).toEqual([source]);
  });
});

describe('a line joined to itself', () => {
  test('is walked once rather than for ever', () => {
    const board = new LogicBoard();
    const [driver, held] = [gate(board), gate(board)];
    // Both ends already on one line, which a wire between them must not turn into a cycle.
    const line = ownLine(driver.outputPins[0], held.inputPins[0]);

    wire(board, driver.outputPins[0], held.inputPins[0]);

    expect(line.family).toEqual([line]);
    expect(line.drivers).toEqual([driver.outputPins[0]]);
  });
});

describe('resolving across a join', () => {
  test('weighs drivers on both sides together rather than one side at a time', () => {
    // What forwarding a settled value could not do: a released driver on one line and an active
    // one on the other have to resolve as one line, not as two answers meeting in the middle.
    const board = new LogicBoard();
    const [first, second, reader] = [gate(board), gate(board), gate(board)];
    const line = ownLine(first.outputPins[0]);
    ownLine(second.outputPins[0], reader.inputPins[0]);
    wire(board, first.outputPins[0], reader.inputPins[0]);

    first.outputPins[0].drive(new LogicState({z: 1}));
    second.outputPins[0].drive(new LogicState({v: 1}));
    line.settle();

    expect(line.drivers).toHaveLength(2);
    expect(reader.inputPins[0].state.v).toBe(1);
    expect(reader.inputPins[0].state.z).toBe(0);
  });
});
