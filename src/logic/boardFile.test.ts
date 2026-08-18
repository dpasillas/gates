import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {loadBoard, parseBoardFile, serializeBoard} from './boardFile';
import {makeComponent} from './componentFactory';
import {LogicState} from './LogicState';
import {Switch} from './Switch';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';
import {setNetName} from './nets';
import {PARTS} from '../components/partsCatalogue';

function place(board: LogicBoard, type: PartType, subtype: number, x = 0, y = 0): LogicComponent {
  const component = makeComponent({type, subtype, scope: board.scope, board});
  component.geometry.position = new board.scope.Point(x, y);
  board.addComponent(component);

  return component;
}

function wire(board: LogicBoard, source: LogicComponent, sink: LogicComponent) {
  const connection = sink.inputPins[0].connectTo(source.outputPins[0])!;
  board.addConnection(connection);

  return connection;
}

/** The board as it comes back from a trip through a file on disk. */
function roundTrip(board: LogicBoard): LogicBoard {
  const written = JSON.stringify(serializeBoard(board));
  const reopened = new LogicBoard();
  loadBoard(reopened, parseBoardFile(written));

  return reopened;
}

describe('a board written out and read back', () => {
  test('brings its components with it', () => {
    const board = new LogicBoard();
    place(board, PartType.GATE, GateType.AND, 40, 60);
    place(board, PartType.INPUT, 1, 100, 20);

    const reopened = [...roundTrip(board).components.values()];

    expect(reopened.map(c => [c.type, c.subtype])).toEqual([
      [PartType.GATE, GateType.AND],
      [PartType.INPUT, 1],
    ]);
  });

  test('puts them back where they were', () => {
    const board = new LogicBoard();
    place(board, PartType.GATE, GateType.OR, 137.5, -42.25);

    const [reopened] = [...roundTrip(board).components.values()];

    expect(reopened.geometry.position.x).toBeCloseTo(137.5);
    expect(reopened.geometry.position.y).toBeCloseTo(-42.25);
  });

  test('leaves them turned the way they were', () => {
    const board = new LogicBoard();
    const gate = place(board, PartType.GATE, GateType.AND, 10, 10);
    gate.angle = 90;

    const [reopened] = [...roundTrip(board).components.values()];

    expect(reopened.angle).toBeCloseTo(90);
  });

  test('keeps the wires between their pins', () => {
    const board = new LogicBoard();
    const source = place(board, PartType.GATE, GateType.AND);
    const sink = place(board, PartType.GATE, GateType.OR, 80);
    wire(board, source, sink);

    const reopened = roundTrip(board);
    const [a, b] = [...reopened.components.values()];

    expect(reopened.connections.size).toBe(1);
    expect(b.inputPins[0].isConnectedTo(a.outputPins[0])).toBe(true);
  });

  test('keeps the settings that change a component shape', () => {
    const board = new LogicBoard();
    const gate = place(board, PartType.GATE, GateType.AND);
    gate.width = 4;
    gate.fieldWidth = 3;
    gate.delay = 7;

    const [reopened] = [...roundTrip(board).components.values()];

    expect(reopened.width).toBe(4);
    expect(reopened.fieldWidth).toBe(3);
    expect(reopened.delay).toBe(7);
  });

  test('keeps merged pins merged', () => {
    const board = new LogicBoard();
    const toggles = place(board, PartType.INPUT, 1);
    toggles.width = 4;
    toggles.isMerged = true;

    const [reopened] = [...roundTrip(board).components.values()];

    expect(reopened.isMerged).toBe(true);
    expect(reopened.outputPins).toHaveLength(1);
    expect(reopened.outputPins[0].width).toBe(4);
  });

  test('keeps the names given to pins', () => {
    const board = new LogicBoard();
    const gate = place(board, PartType.GATE, GateType.AND);
    setNetName(board, [gate.outputPins[0]], 'clk');
    gate.inputPins[0].portName = 'A';
    gate.inputPins[0].isPort = true;

    const [reopened] = [...roundTrip(board).components.values()];

    expect(reopened.outputPins[0].netName).toBe('clk');
    expect(reopened.inputPins[0].portName).toBe('A');
    expect(reopened.inputPins[0].isPort).toBe(true);
  });

  test('carries the board name', () => {
    const board = new LogicBoard();
    board.name = 'adder4';

    expect(roundTrip(board).name).toBe('adder4');
  });

  test.each([...PARTS].flatMap(([category, parts]) =>
      parts.map(part => [`${category}/${part.label}`, part] as const)))(
    '%s survives the trip', (_name, part) => {
      const board = new LogicBoard();
      const placed = place(board, part.type, part.subtype);

      const [reopened] = [...roundTrip(board).components.values()];

      expect(reopened.type).toBe(placed.type);
      expect(reopened.subtype).toBe(placed.subtype);
      expect(reopened.label).toBe(placed.label);
    });
});

describe('what a board file leaves out', () => {
  test('the simulation clock, which restarts from zero', () => {
    const board = new LogicBoard();
    place(board, PartType.INPUT, 0);
    board.advanceSimulation();
    board.advanceSimulation();
    expect(board.simulationCurrentTime).toBeGreaterThan(0);

    expect(roundTrip(board).simulationCurrentTime).toBe(0);
  });

  test('the states riding on the pins, which come back from power-up', () => {
    const board = new LogicBoard();
    const gate = place(board, PartType.GATE, GateType.AND);
    gate.outputPins[0].setLogicState(new LogicState({v: 1}));

    const [reopened] = [...roundTrip(board).components.values()];

    expect(reopened.outputPins[0].state.v).toBe(0);
  });
});

describe('a switch, whose toggles are its own setting rather than a logic state', () => {
  test('comes back with the same toggles on', () => {
    const board = new LogicBoard();
    const toggles = place(board, PartType.INPUT, 1);
    toggles.width = 4;
    (toggles as Switch).toggles = 0b1010;

    const [reopened] = [...roundTrip(board).components.values()];

    expect((reopened as Switch).toggles).toBe(0b1010);
  });

  test('comes back off when it was left off', () => {
    const board = new LogicBoard();
    place(board, PartType.INPUT, 1);

    const [reopened] = [...roundTrip(board).components.values()];

    expect((reopened as Switch).toggles).toBe(0);
  });

  test('keeps its toggles across being merged onto one bus', () => {
    const board = new LogicBoard();
    const toggles = place(board, PartType.INPUT, 1) as Switch;
    toggles.width = 4;
    toggles.isMerged = true;
    toggles.toggles = 0b0110;

    const [reopened] = [...roundTrip(board).components.values()];

    expect((reopened as Switch).toggles).toBe(0b0110);
  });

  test('drives what it is wired to as soon as the board is open', () => {
    const board = new LogicBoard();
    const toggles = place(board, PartType.INPUT, 1) as Switch;
    const bulb = place(board, PartType.OUTPUT, 0, 80);
    board.addConnection(bulb.inputPins[0].connectTo(toggles.outputPins[0])!);
    toggles.toggles = 1;

    const reopened = [...roundTrip(board).components.values()];

    expect(reopened[1].inputPins[0].state.v).toBe(1);
  });
});

describe('loading over a board already open', () => {
  test('takes away what was there before', () => {
    const board = new LogicBoard();
    place(board, PartType.GATE, GateType.AND);
    place(board, PartType.GATE, GateType.OR, 80);

    const empty = new LogicBoard();
    loadBoard(board, parseBoardFile(JSON.stringify(serializeBoard(empty))));

    expect(board.components.size).toBe(0);
    expect(board.pins.size).toBe(0);
    expect(board.connections.size).toBe(0);
  });
});

describe('reading a file that is not a board', () => {
  test('rejects text that is not JSON at all', () => {
    expect(() => parseBoardFile('<html>')).toThrow(/not valid JSON/);
  });

  test('rejects JSON that is some other kind of file', () => {
    expect(() => parseBoardFile('{"format": "gates.project"}')).toThrow(/not a board/);
  });

  test('rejects a version this build does not know', () => {
    expect(() => parseBoardFile('{"format": "gates.board", "version": 99}'))
        .toThrow(/different version/);
  });

  test('rejects a board with its parts missing', () => {
    expect(() => parseBoardFile('{"format": "gates.board", "version": 1}')).toThrow(/damaged/);
  });

  test('rejects a part type this build does not have', () => {
    const file = '{"format": "gates.board", "version": 1, "name": "x",' +
        ' "components": [{"type": "QUANTUM"}], "connections": []}';

    expect(() => loadBoard(new LogicBoard(), parseBoardFile(file))).toThrow(/Unknown part type/);
  });
});
