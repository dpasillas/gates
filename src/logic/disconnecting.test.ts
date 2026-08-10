import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {LogicState} from './LogicState';
import {Switch} from './Switch';
import {makeComponent} from './componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

function place(board: LogicBoard, type: PartType, subtype: number, x = 0): LogicComponent {
  const component = makeComponent({type, subtype, scope: board.scope, board});
  component.geometry.position = new board.scope.Point(x, 0);
  board.addComponent(component);

  return component;
}

function wire(board: LogicBoard, source: LogicComponent, sink: LogicComponent, input = 0) {
  board.addConnection(sink.inputPins[input].connectTo(source.outputPins[0])!);
}

/** How many times the clock's output changes while the board runs. */
function ticks(board: LogicBoard, clock: LogicComponent, steps = 80): number {
  let changes = 0;
  let last = clock.outputPins[0].state.v;

  for (let i = 0; i < steps; i++) {
    board.advanceSimulation();
    const now = clock.outputPins[0].state.v;
    if (now !== last) {
      changes++;
    }
    last = now;
  }

  return changes;
}

describe('a clock whose wire is taken away', () => {
  test('goes on ticking', () => {
    // The clock keeps itself going through a connection from its output back to itself. Taking
    // every connection off the pin took that one too, and the clock never ticked again.
    const board = new LogicBoard();
    const clock = place(board, PartType.INPUT, 0);
    const gate = place(board, PartType.GATE, GateType.AND, 80);
    wire(board, clock, gate);
    board.stopSimulation();
    expect(ticks(board, clock)).toBeGreaterThan(3);

    clock.outputPins[0].disconnect();

    expect(ticks(board, clock)).toBeGreaterThan(3);
  });

  test('goes on ticking when the wire is taken from the other end', () => {
    const board = new LogicBoard();
    const clock = place(board, PartType.INPUT, 0);
    const gate = place(board, PartType.GATE, GateType.AND, 80);
    wire(board, clock, gate);
    board.stopSimulation();

    gate.inputPins[0].disconnect();

    expect(ticks(board, clock)).toBeGreaterThan(3);
  });

  test('goes on ticking after the Delete key reaches its pin', () => {
    const board = new LogicBoard();
    const clock = place(board, PartType.INPUT, 0);
    const gate = place(board, PartType.GATE, GateType.AND, 80);
    wire(board, clock, gate);
    board.stopSimulation();
    board.selectedPins.add(clock.outputPins[0]);

    board.deleteSelection();

    expect(board.connections.size).toBe(0);
    expect(ticks(board, clock)).toBeGreaterThan(3);
  });
});

describe('the pin a wire was feeding', () => {
  test('stops being driven, rather than keeping the last value it was given', () => {
    const board = new LogicBoard();
    const toggles = place(board, PartType.INPUT, 1) as Switch;
    const gate = place(board, PartType.GATE, GateType.AND, 80);
    wire(board, toggles, gate);
    toggles.outputPins[0].setLogicState(new LogicState({v: 1}));
    expect(gate.inputPins[0].state.v).toBe(1);

    gate.inputPins[0].disconnect();

    expect(gate.inputPins[0].state.v).toBe(0);
    expect(gate.inputPins[0].state.z).toBe(1);
  });

  test('is told, so that its component works out what losing the wire means', () => {
    const board = new LogicBoard();
    const toggles = place(board, PartType.INPUT, 1) as Switch;
    const gate = place(board, PartType.GATE, GateType.AND, 80);
    wire(board, toggles, gate);

    let operated = 0;
    const operate = gate.operate.bind(gate);
    gate.operate = () => {operated++; operate()};

    gate.inputPins[0].disconnect();

    expect(operated).toBeGreaterThan(0);
  });

  test('stops being driven when the component driving it is removed', () => {
    const board = new LogicBoard();
    const toggles = place(board, PartType.INPUT, 1) as Switch;
    const gate = place(board, PartType.GATE, GateType.AND, 80);
    wire(board, toggles, gate);
    toggles.outputPins[0].setLogicState(new LogicState({v: 1}));

    toggles.remove();

    expect(gate.inputPins[0].state.v).toBe(0);
    expect(gate.inputPins[0].state.z).toBe(1);
  });

  test('stops being driven when the wire goes because the driver changed width', () => {
    const board = new LogicBoard();
    const toggles = place(board, PartType.INPUT, 1) as Switch;
    const gate = place(board, PartType.GATE, GateType.AND, 80);
    wire(board, toggles, gate);
    toggles.outputPins[0].setLogicState(new LogicState({v: 1}));

    toggles.width = 4;

    expect(board.connections.size).toBe(0);
    expect(gate.inputPins[0].state.z).toBe(1);
  });
});
