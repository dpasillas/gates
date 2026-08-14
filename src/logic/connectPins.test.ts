import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {LogicGate} from './LogicGate';
import {Splitter} from './Splitter';
import {connectPins} from './nets';
import {GateType} from '../enums/GateType';

/** Registers a component's pins with the board, as dropping one onto the board does. */
function place(board: LogicBoard, component: LogicComponent) {
  board.addComponent(component);
  component.pins().forEach(pin => {
    pin.board = board;
    board.addPin(pin);
  });

  return component;
}

function gate(board: LogicBoard): LogicGate {
  return place(board, new LogicGate({scope: board.scope, subtype: GateType.AND})) as LogicGate;
}

describe('wiring a set of pins together', () => {
  test('drives every selected input from the one selected output', () => {
    const board = new LogicBoard();
    const source = gate(board);
    const [a, b] = [gate(board), gate(board)];
    const pins = [source.outputPins[0], a.inputPins[0], b.inputPins[0]];

    expect(connectPins(board, pins)).toBe(2);

    expect(source.outputPins[0].isConnectedTo(a.inputPins[0])).toBe(true);
    expect(source.outputPins[0].isConnectedTo(b.inputPins[0])).toBe(true);
  });

  test('makes nothing of a set with no output to drive it', () => {
    const board = new LogicBoard();
    const [a, b] = [gate(board), gate(board)];

    expect(connectPins(board, [a.inputPins[0], b.inputPins[0]])).toBe(0);
    expect(board.connections.size).toBe(0);
  });

  test('refuses a set holding two outputs, which no net could carry', () => {
    const board = new LogicBoard();
    const [a, b] = [gate(board), gate(board)];
    const sink = gate(board);

    const made = connectPins(board, [a.outputPins[0], b.outputPins[0], sink.inputPins[0]]);

    expect(made).toBe(0);
    expect(board.connections.size).toBe(0);
  });

  test('passes over a pin of a width the output cannot drive', () => {
    const board = new LogicBoard();
    const source = gate(board);
    const narrow = gate(board);
    const wide = place(board, new Splitter({scope: board.scope, subtype: 0, width: 2}));

    const made = connectPins(board,
        [source.outputPins[0], narrow.inputPins[0], wide.inputPins[0]]);

    expect(made).toBe(1);
    expect(source.outputPins[0].isConnectedTo(narrow.inputPins[0])).toBe(true);
    expect(source.outputPins[0].isConnectedTo(wide.inputPins[0])).toBe(false);
  });

  test('leaves the output alone when it is the only pin given', () => {
    const board = new LogicBoard();
    const source = gate(board);

    expect(connectPins(board, [source.outputPins[0]])).toBe(0);
    expect(board.connections.size).toBe(0);
  });

  test('draws nothing itself, so the caller decides whether to redraw', () => {
    const board = new LogicBoard();
    const source = gate(board);
    const sink = gate(board);
    let redraws = 0;
    board.update = () => {redraws++};

    connectPins(board, [source.outputPins[0], sink.inputPins[0]]);

    expect(redraws).toBe(0);
    expect(board.connections.size).toBe(1);
  });
});
