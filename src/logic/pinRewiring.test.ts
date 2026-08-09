import {LogicBoard} from './LogicBoard';
import {LogicGate} from './LogicGate';
import {GateType} from '../enums/GateType';
import {setNetName} from './nets';

/** A board whose gates have their pins registered, as dropping one onto the board does. */
function board() {
  const logicBoard = new LogicBoard();
  const gate = (subtype: GateType) => {
    const made = new LogicGate({scope: logicBoard.scope, subtype, board: logicBoard});
    made.pins().forEach(pin => {
      pin.board = logicBoard;
      logicBoard.addPin(pin);
    });
    logicBoard.addComponent(made);

    return made;
  };

  return {logicBoard, gate};
}

describe('changing a component width', () => {
  test('drops the connections of pins that changed width', () => {
    // A wire joins pins of one width. Widening one end leaves the wire joining two widths, which is
    // not a connection that could have been made in the first place.
    const {logicBoard, gate} = board();
    const source = gate(GateType.AND);
    const sink = gate(GateType.OR);
    const connection = sink.inputPins[0].connectTo(source.outputPins[0])!;
    logicBoard.addConnection(connection);
    expect(sink.inputPins[0].isConnectedTo(source.outputPins[0])).toBe(true);

    source.width = 4;

    expect(sink.inputPins[0].isConnectedTo(source.outputPins[0])).toBe(false);
    expect(logicBoard.connections.size).toBe(0);
  });

  test('takes those pins off their net as well', () => {
    // The name is how the connection was asked for, so it cannot outlive the connection.
    const {logicBoard, gate} = board();
    const source = gate(GateType.AND);
    const sink = gate(GateType.OR);
    setNetName(logicBoard, [source.outputPins[0]], 'clk');
    setNetName(logicBoard, [sink.inputPins[0]], 'clk');

    source.width = 4;

    expect(source.outputPins[0].netName).toBe('');
    expect(source.outputPins[0].connections.size).toBe(0);
  });

  test('clears both ends of the wire, not just the one that changed', () => {
    const {logicBoard, gate} = board();
    const source = gate(GateType.AND);
    const sink = gate(GateType.OR);
    const connection = sink.inputPins[0].connectTo(source.outputPins[0])!;
    logicBoard.addConnection(connection);

    source.width = 4;

    // Removing a connection takes it off both pins, so nothing is left pointing at a stale wire.
    expect(source.outputPins[0].connections.size).toBe(0);
    expect(sink.inputPins[0].connections.size).toBe(0);
  });

  test('leaves pins alone whose width did not change', () => {
    // A gate's input count can change without any width changing; wires must survive that.
    const {logicBoard, gate} = board();
    const source = gate(GateType.AND);
    const sink = gate(GateType.OR);
    const connection = sink.inputPins[0].connectTo(source.outputPins[0])!;
    logicBoard.addConnection(connection);

    sink.fieldWidth = 3;

    expect(sink.inputPins[0].isConnectedTo(source.outputPins[0])).toBe(true);
    expect(logicBoard.connections.size).toBe(1);
  });
});

describe('moving a component pin', () => {
  test('redraws the wires attached to it', () => {
    // A wire is drawn from the pins at its ends. Adding an input moves the existing ones, so a wire
    // that is not told about it keeps being drawn to where its pin used to be.
    const {logicBoard, gate} = board();
    const source = gate(GateType.AND);
    const sink = gate(GateType.OR);
    const connection = sink.inputPins[0].connectTo(source.outputPins[0])!;
    logicBoard.addConnection(connection);

    let redrawn = 0;
    connection.updateSelf = () => {redrawn++};
    const before = sink.inputPins[0].pos.y;

    sink.fieldWidth = 4;

    expect(sink.inputPins[0].pos.y).not.toBeCloseTo(before);
    expect(redrawn).toBeGreaterThan(0);
  });

  test('redraws them when the body resizes too', () => {
    const {logicBoard, gate} = board();
    const source = gate(GateType.AND);
    const sink = gate(GateType.OR);
    const connection = sink.inputPins[0].connectTo(source.outputPins[0])!;
    logicBoard.addConnection(connection);

    let redrawn = 0;
    connection.updateSelf = () => {redrawn++};

    sink.fieldWidth = 3;

    expect(redrawn).toBeGreaterThan(0);
  });
});
