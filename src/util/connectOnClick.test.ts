import {MouseManager} from './MouseManager';
import {MouseEventMapping} from './MouseEventMapping';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicComponent} from '../logic/LogicComponent';
import {LogicGate} from '../logic/LogicGate';
import {Splitter} from '../logic/Splitter';
import {wouldConnect} from '../logic/nets';
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

function setup(connectOnClick: boolean) {
  const board = new LogicBoard();
  board.connectOnClick = connectOnClick;

  const manager = new MouseManager();
  manager.getViewCoordinates = (): MouseEventMapping => ({x: 0, y: 0, rx: 0, ry: 0, dx: 0, dy: 0});

  return {board, manager};
}

type Modifier = 'Shift' | 'Alt' | 'Control';

function click(manager: MouseManager, board: LogicBoard, pin: Parameters<typeof manager.handlePinMouseDown>[1],
    modifier?: Modifier) {
  manager.handlePinMouseDown(board, pin, {
    button: 0, clientX: 0, clientY: 0, altKey: modifier === 'Alt',
    preventDefault: () => {}, stopPropagation: () => {},
    getModifierState: (key: string) => key === modifier,
  } as unknown as MouseEvent);
  manager.reset(board);
}

describe('whether a click would reach a pin', () => {
  test('an input is reachable from a selected output', () => {
    const board = new LogicBoard();
    const [source, sink] = [gate(board), gate(board)];

    expect(wouldConnect([source.outputPins[0]], sink.inputPins[0])).toBe(true);
  });

  test('an output is reachable from selected inputs', () => {
    const board = new LogicBoard();
    const [source, a, b] = [gate(board), gate(board), gate(board)];

    expect(wouldConnect([a.inputPins[0], b.inputPins[0]], source.outputPins[0])).toBe(true);
  });

  test('another input is not reachable from selected inputs, having nothing to drive them', () => {
    const board = new LogicBoard();
    const [a, b] = [gate(board), gate(board)];

    expect(wouldConnect([a.inputPins[0]], b.inputPins[0])).toBe(false);
  });

  test('a second output is not reachable from a selected output', () => {
    const board = new LogicBoard();
    const [a, b] = [gate(board), gate(board)];

    expect(wouldConnect([a.outputPins[0]], b.outputPins[0])).toBe(false);
  });

  test('a pin of another width is not reachable', () => {
    const board = new LogicBoard();
    const source = gate(board);
    const wide = place(board, new Splitter({scope: board.scope, subtype: 0, width: 2}));

    expect(wouldConnect([source.outputPins[0]], wide.inputPins[0])).toBe(false);
  });

  test('a pin already in the selection is not a target', () => {
    const board = new LogicBoard();
    const source = gate(board);

    expect(wouldConnect([source.outputPins[0]], source.outputPins[0])).toBe(false);
  });

  test('nothing is reachable from an empty selection', () => {
    const board = new LogicBoard();

    expect(wouldConnect([], gate(board).inputPins[0])).toBe(false);
  });

  test('is judged on the target, not on the rest of the set', () => {
    // The selected output can drive the selected input, but the pin being pointed at is the wrong
    // width, so pointing at it must not read as reachable.
    const board = new LogicBoard();
    const [source, sink] = [gate(board), gate(board)];
    const wide = place(board, new Splitter({scope: board.scope, subtype: 0, width: 2}));

    expect(wouldConnect([source.outputPins[0], sink.inputPins[0]], wide.inputPins[0])).toBe(false);
  });
});

describe('clicking a pin with connect-on-click on', () => {
  test('wires it to the selection rather than selecting it', () => {
    const {board, manager} = setup(true);
    const [source, sink] = [gate(board), gate(board)];
    board.setSelectedPins([source.outputPins[0]]);

    click(manager, board, sink.inputPins[0]);

    expect(source.outputPins[0].isConnectedTo(sink.inputPins[0])).toBe(true);
    expect(board.connections.size).toBe(1);
  });

  test('keeps the selection, so an output can be clicked out to input after input', () => {
    const {board, manager} = setup(true);
    const [source, a, b] = [gate(board), gate(board), gate(board)];
    board.setSelectedPins([source.outputPins[0]]);

    click(manager, board, a.inputPins[0]);
    click(manager, board, b.inputPins[0]);

    expect(board.connections.size).toBe(2);
    expect([...board.selectedPins]).toEqual([source.outputPins[0]]);
  });

  test('gathers several selected inputs onto one clicked output', () => {
    const {board, manager} = setup(true);
    const [source, a, b] = [gate(board), gate(board), gate(board)];
    board.setSelectedPins([a.inputPins[0], b.inputPins[0]]);

    click(manager, board, source.outputPins[0]);

    expect(board.connections.size).toBe(2);
  });

  test('selects a pin the selection cannot reach, which is the way out of the mode', () => {
    const {board, manager} = setup(true);
    const [a, b] = [gate(board), gate(board)];
    board.setSelectedPins([a.outputPins[0]]);

    click(manager, board, b.outputPins[0]);

    expect(board.connections.size).toBe(0);
    expect([...board.selectedPins]).toEqual([b.outputPins[0]]);
  });

  test('leaves a modifier click to the selection', () => {
    // Shift means "add this to what I have", and that has to keep working while the mode is on.
    const {board, manager} = setup(true);
    const [source, sink] = [gate(board), gate(board)];
    board.setSelectedPins([source.outputPins[0]]);

    click(manager, board, sink.inputPins[0], 'Shift');

    expect(board.connections.size).toBe(0);
    expect(board.selectedPins.size).toBe(2);
  });
});

describe('clicking a pin with connect-on-click off', () => {
  test('selects it, wiring nothing', () => {
    const {board, manager} = setup(false);
    const [source, sink] = [gate(board), gate(board)];
    board.setSelectedPins([source.outputPins[0]]);

    click(manager, board, sink.inputPins[0]);

    expect(board.connections.size).toBe(0);
    expect([...board.selectedPins]).toEqual([sink.inputPins[0]]);
  });
});
