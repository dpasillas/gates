import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {Switch} from './Switch';
import {LogicState} from './LogicState';
import {makeComponent} from './componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/**
 * What a pin is still attached to after it has been wired somewhere else.
 *
 * A wire joins two lines rather than moving a pin onto one, so a pin that is unwired has to leave
 * the line it was on. Left there it goes on driving and being driven by things it is no longer
 * attached to.
 */

function gate(board: LogicBoard, subtype = GateType.AND): LogicComponent {
  const made = makeComponent({type: PartType.GATE, subtype, scope: board.scope, board});
  board.addComponent(made);

  return made;
}

function wire(board: LogicBoard, source: LogicComponent, sink: LogicComponent, at = 0) {
  const connection = sink.inputPins[at].connectTo(source.outputPins[0])!;
  board.addConnection(connection);

  return connection;
}

function settle(board: LogicBoard) {
  for (let step = 0; step < 50; step++) {
    board.advanceSimulation();
  }
}

describe('rewiring an input to a different driver', () => {
  test('takes it off the line the old driver is on', () => {
    const board = new LogicBoard();
    const [first, second, reader] = [gate(board), gate(board), gate(board)];
    wire(board, first, reader);

    wire(board, second, reader);

    expect(first.outputPins[0].net!.family).not.toContain(reader.inputPins[0].net);
  });

  test('leaves the old driver driving nothing', () => {
    const board = new LogicBoard();
    const [first, second, reader] = [gate(board), gate(board), gate(board)];
    wire(board, first, reader);
    wire(board, second, reader);

    expect(first.outputPins[0].net!.listeners).toEqual([]);
  });

  test('so the old driver cannot change what the new one is driving', () => {
    const board = new LogicBoard();
    const [first, second, reader] = [gate(board), gate(board), gate(board)];
    wire(board, first, reader);
    wire(board, second, reader);
    second.outputPins[0].setLogicState(new LogicState({v: 1}));
    settle(board);

    first.outputPins[0].setLogicState(new LogicState({v: 0}));
    settle(board);

    expect(reader.inputPins[0].state.v).toBe(1);
    expect(reader.inputPins[0].state.x).toBe(0);
  });

  test('and the two drivers do not come to share a value', () => {
    const board = new LogicBoard();
    const [first, second, reader] = [gate(board), gate(board), gate(board)];
    wire(board, first, reader);
    wire(board, second, reader);

    second.outputPins[0].setLogicState(new LogicState({v: 1}));
    settle(board);

    // The first drives nothing now; what the second put on its own line is not its business.
    expect(first.outputPins[0].driven.v).toBe(0);
  });
});

describe('one driver feeding two inputs', () => {
  test('reaches both', () => {
    const board = new LogicBoard();
    const [driver, reader] = [gate(board), gate(board)];
    wire(board, driver, reader, 0);
    wire(board, driver, reader, 1);

    driver.outputPins[0].setLogicState(new LogicState({v: 1}));
    settle(board);

    expect(reader.inputPins[0].state.v).toBe(1);
    expect(reader.inputPins[1].state.v).toBe(1);
  });
});

describe('a switch', () => {
  /** A switch is a pure driver: what it shows is where the user left it, never what a line is at. */
  function toggleBank(board: LogicBoard): Switch {
    const made = makeComponent(
        {type: PartType.INPUT, subtype: 1, scope: board.scope, board}) as Switch;
    board.addComponent(made);

    return made;
  }

  test('keeps its own setting when something else drives the line it is on', () => {
    const board = new LogicBoard();
    const bank = toggleBank(board);
    const other = gate(board);
    const reader = gate(board);
    bank.outputPins[0].setLogicState(new LogicState({v: 1}));
    wire(board, bank, reader);
    // A second driver put on the same line, which is what a clash looks like.
    reader.inputPins[0].net!.add(other.outputPins[0]);
    other.outputPins[0].setLogicState(new LogicState({v: 0}));
    settle(board);

    expect(bank.toggles).toBe(1);
  });
});
