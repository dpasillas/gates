import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {makeComponent} from './componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

function place(board: LogicBoard, x = 0): LogicComponent {
  const gate = makeComponent({type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
  gate.geometry.position = new board.scope.Point(x, 0);
  board.addComponent(gate);

  return gate;
}

function wire(board: LogicBoard, source: LogicComponent, sink: LogicComponent) {
  board.addConnection(sink.inputPins[0].connectTo(source.outputPins[0])!);
}

/** A driver wired to a sink, with nothing selected yet. */
function wired(): {board: LogicBoard, source: LogicComponent, sink: LogicComponent} {
  const board = new LogicBoard();
  const source = place(board);
  const sink = place(board, 80);
  wire(board, source, sink);

  return {board, source, sink};
}

describe('deleting a selection of components', () => {
  test('takes them off the board', () => {
    const {board, source} = wired();
    board.selectedComponents.add(source);

    board.deleteSelection();

    expect(board.components.size).toBe(1);
  });

  test('takes their wires with them', () => {
    const {board, source} = wired();
    board.selectedComponents.add(source);

    board.deleteSelection();

    expect(board.connections.size).toBe(0);
  });

  test('takes their pins with them', () => {
    const {board, source} = wired();
    board.selectedComponents.add(source);

    board.deleteSelection();

    // A gate has two inputs and an output, so one of the two gates leaves three behind.
    expect(board.pins.size).toBe(3);
  });

  test('leaves what was not selected alone', () => {
    const {board, source, sink} = wired();
    board.selectedComponents.add(source);

    board.deleteSelection();

    expect([...board.components.values()]).toEqual([sink]);
  });

  test('reports what it removed', () => {
    const {board, source, sink} = wired();
    board.selectedComponents.add(source);
    board.selectedComponents.add(sink);

    expect(board.deleteSelection()).toEqual({components: 2, pins: 0});
  });
});

describe('deleting a selection of pins', () => {
  test('unwires them without removing anything', () => {
    const {board, sink} = wired();
    board.selectedPins.add(sink.inputPins[0]);

    board.deleteSelection();

    expect(board.connections.size).toBe(0);
    expect(board.components.size).toBe(2);
    expect(board.pins.size).toBe(6);
  });

  test('reports the pins it unwired', () => {
    const {board, sink} = wired();
    board.selectedPins.add(sink.inputPins[0]);

    expect(board.deleteSelection()).toEqual({components: 0, pins: 1});
  });

  test('counts a pin only once when its component is going too', () => {
    // The pin would be disconnected twice over, and reported as work that was not done separately.
    const {board, sink} = wired();
    board.selectedComponents.add(sink);
    board.selectedPins.add(sink.inputPins[0]);

    expect(board.deleteSelection()).toEqual({components: 1, pins: 0});
    expect(board.components.size).toBe(1);
  });
});

describe('after a deletion', () => {
  test('nothing is left selected', () => {
    const {board, source, sink} = wired();
    board.selectedComponents.add(source);
    board.selectedPins.add(sink.inputPins[0]);

    board.deleteSelection();

    expect(board.selectedComponents.size).toBe(0);
    expect(board.selectedPins.size).toBe(0);
  });

  test('deleting nothing does nothing', () => {
    const {board} = wired();

    expect(board.deleteSelection()).toEqual({components: 0, pins: 0});
    expect(board.components.size).toBe(2);
    expect(board.connections.size).toBe(1);
  });
});
