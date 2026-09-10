import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {PinOrientation, PinType} from './LogicPin';
import {boardPorts, packageForBoard} from './packageFromBoard';
import {makeComponent} from './componentFactory';
import {setPort} from './nets';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

function place(board: LogicBoard, x = 0, subtype = GateType.AND): LogicComponent {
  const component = makeComponent({type: PartType.GATE, subtype, scope: board.scope, board});
  component.geometry.position = new board.scope.Point(x, 0);
  board.addComponent(component);

  return component;
}

/** A gate with both inputs and its output exposed, which is the smallest board worth packaging. */
function board(): {board: LogicBoard, gate: LogicComponent} {
  const made = new LogicBoard();
  const gate = place(made);
  setPort(made, gate.inputPins[0], 'a');
  setPort(made, gate.inputPins[1], 'b');
  setPort(made, gate.outputPins[0], 'y');

  return {board: made, gate};
}

describe('the ports a board exposes', () => {
  test('are the pins marked as ports, under the names they carry', () => {
    expect(boardPorts(board().board).map(port => port.name)).toEqual(['a', 'b', 'y']);
  });

  test('leave out pins nobody marked', () => {
    const made = new LogicBoard();
    place(made);

    expect(boardPorts(made)).toEqual([]);
  });

  test('leave out a port whose name was never filled in, which nothing could reach', () => {
    const {board: made, gate} = board();
    gate.inputPins[0].portName = '';

    expect(boardPorts(made).map(port => port.name)).toEqual(['b', 'y']);
  });

  test('say what the outside has to do: drive an input, read an output', () => {
    const ports = new Map(boardPorts(board().board).map(port => [port.name, port.type]));

    expect(ports.get('a')).toBe(PinType.INPUT);
    expect(ports.get('y')).toBe(PinType.OUTPUT);
  });

  test('gather the pins sharing one name, which the port then drives together', () => {
    const {board: made, gate} = board();
    const second = place(made, 80);
    setPort(made, second.inputPins[0], 'a');

    const shared = boardPorts(made).find(port => port.name === 'a')!;

    expect(shared.pins).toEqual([gate.inputPins[0], second.inputPins[0]]);
    expect(shared.type).toBe(PinType.INPUT);
  });

  test('are read as an output when any pin on them drives, wherever it comes in the group', () => {
    // setPort refuses to let an output join a name another pin holds, so this state only arrives
    // by way of a file, which writes the flags straight onto the pins.
    const {board: made, gate} = board();
    const second = place(made, 80);
    second.outputPins[0].portName = 'a';

    const shared = boardPorts(made).find(port => port.name === 'a')!;

    expect(shared.pins).toEqual([gate.inputPins[0], second.outputPins[0]]);
    expect(shared.type).toBe(PinType.OUTPUT);
  });

  test('are as wide as the widest pin on them, which is what the port has to carry', () => {
    const {board: made} = board();
    const wide = place(made, 80);
    wide.width = 8;
    setPort(made, wide.inputPins[0], 'a');

    expect(boardPorts(made).find(port => port.name === 'a')?.width).toBe(8);
  });
});

describe('packaging a board without drawing one', () => {
  test('gives the package a pin for each port, named after it', () => {
    expect(packageForBoard(board().board).declared.map(pin => pin.label)).toEqual(['a', 'b', 'y']);
  });

  test('carries the width the port needs', () => {
    const {board: made, gate} = board();
    gate.width = 8;

    expect(packageForBoard(made).declared.map(pin => pin.width)).toEqual([8, 8, 8]);
  });

  test('puts what is driven from outside on the left and what is read on the right', () => {
    const sides = packageForBoard(board().board).declared.map(pin => [pin.label, pin.orientation]);

    expect(sides).toEqual([
      ['a', PinOrientation.LEFT],
      ['b', PinOrientation.LEFT],
      ['y', PinOrientation.RIGHT],
    ]);
  });

  test('takes the board name unless asked for another', () => {
    const {board: made} = board();
    made.name = 'half adder';

    expect(packageForBoard(made).name).toBe('half adder');
    expect(packageForBoard(made, 'ha').name).toBe('ha');
  });

  test('is finished as it stands, every pin having come with a name', () => {
    expect(packageForBoard(board().board).problems).toEqual([]);
  });

  test('marks no clock, there being nothing on a board that says which port is one', () => {
    expect(packageForBoard(board().board).clockPin).toBeUndefined();
  });

  test('is its own package each time, not a shared one', () => {
    const {board: made} = board();

    expect(packageForBoard(made).uuid).not.toBe(packageForBoard(made).uuid);
  });

  test('has nothing on it when the board exposes nothing', () => {
    const made = new LogicBoard();
    place(made);

    expect(packageForBoard(made).declared).toEqual([]);
  });
});
