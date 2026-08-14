import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {LogicGate} from './LogicGate';
import {LogicPin, PinType} from './LogicPin';
import {connectPins, setNetName} from './nets';
import {GateType} from '../enums/GateType';

/** Registers a component's pins with the board, as dropping one onto it does. */
function place(board: LogicBoard, component: LogicComponent): LogicComponent {
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

/** One output named "clk" driving two inputs on the same net. */
function net(board: LogicBoard) {
  const [source, a, b] = [gate(board), gate(board), gate(board)];
  setNetName(board, [source.outputPins[0]], 'clk');
  setNetName(board, [a.inputPins[0]], 'clk');
  setNetName(board, [b.inputPins[0]], 'clk');

  return {source, a, b};
}

/** Every pin still claiming to be on the named net. */
function claiming(board: LogicBoard, name: string): LogicPin[] {
  return [...board.pins.values()].filter(pin => pin.netName === name);
}

/**
 * Checks the rule the names exist to keep: wired pins answer to one name.
 *
 * Stated over the wires rather than over the names, so it holds whatever the pins are called.
 */
function expectWiredPinsAgree(board: LogicBoard) {
  for (const connection of board.connections.values()) {
    expect([connection.source.netName, connection.sink.netName])
      .toEqual([connection.source.netName, connection.source.netName]);
  }
}

describe('deleting a pin', () => {
  test('takes that pin off its net', () => {
    const board = new LogicBoard();
    const {a} = net(board);
    board.setSelectedPins([a.inputPins[0]]);

    board.deleteSelection();

    expect(a.inputPins[0].connections.size).toBe(0);
    expect(a.inputPins[0].netName).toBe('');
  });

  test('takes the output off its net when the output is what was deleted', () => {
    // The reported bug: the wires went and the output kept the name, leaving it claiming a net it
    // was no longer wired to anything on.
    const board = new LogicBoard();
    const {source} = net(board);
    board.setSelectedPins([source.outputPins[0]]);

    board.deleteSelection();

    expect(source.outputPins[0].connections.size).toBe(0);
    expect(source.outputPins[0].netName).toBe('');
  });

  test('leaves the pins at the far end on the net', () => {
    // They are not what was deleted. A net that has lost its driver is still a net, and the next
    // output named onto it drives them again.
    const board = new LogicBoard();
    const {source, a, b} = net(board);
    board.setSelectedPins([source.outputPins[0]]);

    board.deleteSelection();

    expect(claiming(board, 'clk')).toEqual([a.inputPins[0], b.inputPins[0]]);
  });

  test('leaves the rest of the net wired when only one listener goes', () => {
    const board = new LogicBoard();
    const {source, a, b} = net(board);
    board.setSelectedPins([a.inputPins[0]]);

    board.deleteSelection();

    expect(source.outputPins[0].netName).toBe('clk');
    expect(b.inputPins[0].netName).toBe('clk');
    expect(source.outputPins[0].isConnectedTo(b.inputPins[0])).toBe(true);
    expectWiredPinsAgree(board);
  });

  test('leaves the far end named when the component driving it is deleted', () => {
    const board = new LogicBoard();
    const {source, a, b} = net(board);
    board.setSelectedComponents([source]);

    board.deleteSelection();

    expect(claiming(board, 'clk')).toEqual([a.inputPins[0], b.inputPins[0]]);
  });

  test('leaves an unrelated net alone', () => {
    const board = new LogicBoard();
    const {source, a, b} = net(board);
    const bystander = gate(board);
    board.setSelectedComponents([bystander]);

    board.deleteSelection();

    expect(claiming(board, 'clk'))
      .toEqual([source.outputPins[0], a.inputPins[0], b.inputPins[0]]);
  });
});

describe('wiring two pins together', () => {
  test('puts the input on the output net', () => {
    const board = new LogicBoard();
    const [source, sink] = [gate(board), gate(board)];
    setNetName(board, [source.outputPins[0]], 'clk');

    connectPins(board, [source.outputPins[0], sink.inputPins[0]]);

    expect(sink.inputPins[0].netName).toBe('clk');
    expectWiredPinsAgree(board);
  });

  test('moves an input off the net it was on', () => {
    // Two pins wired together answer to one name, so the one it had cannot survive the wire.
    const board = new LogicBoard();
    const [source, sink] = [gate(board), gate(board)];
    setNetName(board, [source.outputPins[0]], 'clk');
    setNetName(board, [sink.inputPins[0]], 'reset');

    connectPins(board, [source.outputPins[0], sink.inputPins[0]]);

    expect(sink.inputPins[0].netName).toBe('clk');
    expectWiredPinsAgree(board);
  });

  test('takes the input off its net when the output is on none', () => {
    const board = new LogicBoard();
    const [source, sink] = [gate(board), gate(board)];
    setNetName(board, [sink.inputPins[0]], 'reset');

    connectPins(board, [source.outputPins[0], sink.inputPins[0]]);

    expect(sink.inputPins[0].netName).toBe('');
    expectWiredPinsAgree(board);
  });

  test('names every input it gathers onto one output', () => {
    const board = new LogicBoard();
    const [source, a, b] = [gate(board), gate(board), gate(board)];
    setNetName(board, [source.outputPins[0]], 'clk');

    connectPins(board, [source.outputPins[0], a.inputPins[0], b.inputPins[0]]);

    expect(claiming(board, 'clk'))
      .toEqual([source.outputPins[0], a.inputPins[0], b.inputPins[0]]);
  });
});

describe('naming pins that have no wires', () => {
  test('still works, since a net may be named before it has a driver', () => {
    // Clearing names on every disconnection would have broken this: connecting an input
    // disconnects it first, so the name would go as the wire arrived.
    const board = new LogicBoard();
    const [a, b] = [gate(board), gate(board)];

    setNetName(board, [a.inputPins[0]], 'bus');
    setNetName(board, [b.inputPins[0]], 'bus');

    expect(a.inputPins[0].netName).toBe('bus');
    expect(b.inputPins[0].netName).toBe('bus');
    expect(board.connections.size).toBe(0);
  });

  test('wires them up when a driver joins them', () => {
    const board = new LogicBoard();
    const [a, b, source] = [gate(board), gate(board), gate(board)];
    setNetName(board, [a.inputPins[0]], 'bus');
    setNetName(board, [b.inputPins[0]], 'bus');

    setNetName(board, [source.outputPins[0]], 'bus');

    expect(board.connections.size).toBe(2);
    expectWiredPinsAgree(board);
  });

  test('picks up a pin deleted off the net earlier, now that it is nameless', () => {
    const board = new LogicBoard();
    const {source, a} = net(board);
    board.setSelectedPins([a.inputPins[0]]);
    board.deleteSelection();

    setNetName(board, [a.inputPins[0]], 'clk');

    expect(source.outputPins[0].isConnectedTo(a.inputPins[0])).toBe(true);
    expectWiredPinsAgree(board);
  });
});

describe('the rule the names stand for', () => {
  test('holds across a run of wiring and deleting', () => {
    const board = new LogicBoard();
    const {source, a, b} = net(board);
    const c = gate(board);

    connectPins(board, [source.outputPins[0], c.inputPins[0]]);
    expectWiredPinsAgree(board);

    board.setSelectedPins([b.inputPins[0]]);
    board.deleteSelection();
    expectWiredPinsAgree(board);

    board.setSelectedPins([source.outputPins[0]]);
    board.deleteSelection();
    expectWiredPinsAgree(board);

    // Nothing is wired now, and only the pins left alone still answer to the name.
    expect(board.connections.size).toBe(0);
    expect(claiming(board, 'clk')).toEqual([a.inputPins[0], c.inputPins[0]]);
    expect(source.outputPins[0].netName).toBe('');
    expect(b.inputPins[0].netName).toBe('');
  });

  test('never leaves an output and the input it drives disagreeing', () => {
    const board = new LogicBoard();
    const [source, sink] = [gate(board), gate(board)];
    connectPins(board, [source.outputPins[0], sink.inputPins[0]]);

    setNetName(board, [source.outputPins[0]], 'clk');

    expect(sink.inputPins[0].netName).toBe('clk');
    expect(sink.inputPins[0].pinType).toBe(PinType.INPUT);
    expectWiredPinsAgree(board);
  });
});
