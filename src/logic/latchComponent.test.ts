import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {LogicState} from './LogicState';
import {SubComponent} from './SubComponent';
import {defineComponent} from './ComponentDefinition';
import {copySelection, pasteInto} from './clipboard';
import {makeComponent} from './componentFactory';
import {setPort} from './nets';
import {packageForBoard} from './packageFromBoard';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/**
 * A component has to behave as the board behind it does.
 *
 * An SR latch is the case that shows a difference: it holds state, so it starts unknown and only a
 * set or a reset resolves it. A component that starts at zero instead has skipped the power-up its
 * board would have had, and reads as settled when nothing has settled it.
 */

function gate(board: LogicBoard, subtype: GateType): LogicComponent {
  const made = makeComponent({type: PartType.GATE, subtype, scope: board.scope, board});
  board.addComponent(made);

  return made;
}

function wire(board: LogicBoard, from: LogicComponent, to: LogicComponent, at: number) {
  board.addConnection(to.inputPins[at].connectTo(from.outputPins[0])!);
}

/**
 * Two NOR gates, each output feeding one of the other's inputs.
 *
 * The free input of the first is S and its output Q; the free input of the second is R and its
 * output Q'.
 */
function latchBoard(): LogicBoard {
  const board = new LogicBoard();
  board.name = 'sr_latch';
  const first = gate(board, GateType.NOR);
  const second = gate(board, GateType.NOR);
  wire(board, second, first, 1);
  wire(board, first, second, 1);
  setPort(board, first.inputPins[0], 'S');
  setPort(board, second.inputPins[0], 'R');
  setPort(board, first.outputPins[0], 'Q');
  setPort(board, second.outputPins[0], 'Qbar');

  return board;
}

function settle(board: LogicBoard) {
  for (let step = 0; step < 80; step++) {
    board.advanceSimulation();
  }
}

/** A switch bank, which is what a user drives an input with. */
function toggle(board: LogicBoard): LogicComponent {
  const made = makeComponent({type: PartType.INPUT, subtype: 1, scope: board.scope, board});
  board.addComponent(made);

  return made;
}

/** The latch as a component, placed on a board with a switch on each input. */
function placed() {
  const source = latchBoard();
  const made = defineComponent({board: source, packaging: packageForBoard(source, 'sr')});
  const board = new LogicBoard();
  const part = new SubComponent({scope: board.scope, board, definition: made});
  board.addComponent(part);

  const drivers = part.inputPins.map(pin => {
    const bank = toggle(board);
    board.addConnection(pin.connectTo(bank.outputPins[0])!);

    return bank;
  });
  const set = (s: number, r: number) => {
    drivers[0].outputPins[0].setLogicState(new LogicState({v: s}));
    drivers[1].outputPins[0].setLogicState(new LogicState({v: r}));
    settle(board);
  };

  return {board, part, set, q: () => part.outputPins[0], qbar: () => part.outputPins[1]};
}

/** The same latch on the board itself, driven the same way. */
function bare() {
  const board = latchBoard();
  const [first, second] = [...board.components.values()];
  const drivers = [first.inputPins[0], second.inputPins[0]].map(pin => {
    const bank = toggle(board);
    board.addConnection(pin.connectTo(bank.outputPins[0])!);

    return bank;
  });
  board.stopSimulation();
  const set = (s: number, r: number) => {
    drivers[0].outputPins[0].setLogicState(new LogicState({v: s}));
    drivers[1].outputPins[0].setLogicState(new LogicState({v: r}));
    settle(board);
  };

  return {board, set, q: () => first.outputPins[0], qbar: () => second.outputPins[0]};
}

/**
 * The latch placed on a board that is already running, and wired up afterwards.
 *
 * Placing and wiring are editing actions, and the simulation does not stop for them. A value that
 * was already on a driver has to reach what it is newly wired to, without waiting for the user to
 * toggle something.
 */
function whileRunning() {
  const source = latchBoard();
  const made = defineComponent({board: source, packaging: packageForBoard(source, 'sr')});
  const board = new LogicBoard();
  board.library = id => id === made.uuid ? made : undefined;
  // Something else already running on it, so the board is mid-simulation rather than at zero.
  const spare = gate(board, GateType.AND);
  spare.outputPins[0].setLogicState(new LogicState({v: 1}));
  settle(board);

  const part = new SubComponent({scope: board.scope, board, definition: made});
  board.addComponent(part);
  const banks = part.inputPins.map(pin => {
    const bank = toggle(board);
    // Set before it is wired, which is what a switch already sitting on the board looks like.
    bank.outputPins[0].setLogicState(new LogicState({v: 0}));
    board.addConnection(pin.connectTo(bank.outputPins[0])!);

    return bank;
  });
  settle(board);

  return {
    board,
    part,
    set: (s: number, r: number) => {
      banks[0].outputPins[0].setLogicState(new LogicState({v: s}));
      banks[1].outputPins[0].setLogicState(new LogicState({v: r}));
      settle(board);
    },
    q: () => part.outputPins[0],
    qbar: () => part.outputPins[1],
  };
}

describe('placed on a board that is already running', () => {
  test('takes the value of a driver it is wired to without waiting to be toggled', () => {
    const {part} = whileRunning();

    // Both switches were already at zero when they were wired on.
    expect(part.inputPins.map(pin => pin.state.v)).toEqual([0, 0]);
    expect(part.inputPins.map(pin => pin.state.z)).toEqual([0, 0]);
  });

  test('sets, rather than leaving the other output unknown', () => {
    const {set, q, qbar} = whileRunning();

    set(1, 0);

    expect([q().state.v, qbar().state.v]).toEqual([0, 1]);
    expect([q().state.x, qbar().state.x]).toEqual([0, 0]);
  });

  test('resets', () => {
    const {set, q, qbar} = whileRunning();

    set(0, 1);

    expect([q().state.v, qbar().state.v]).toEqual([1, 0]);
    expect([q().state.x, qbar().state.x]).toEqual([0, 0]);
  });
});

describe('wiring a driver that already has a value', () => {
  test('carries it into the component there and then', () => {
    const {board, part, set} = whileRunning();
    set(0, 1);
    const bank = toggle(board);
    bank.outputPins[0].setLogicState(new LogicState({v: 1}));

    // Rewire S to a switch that is already high.
    board.addConnection(part.inputPins[0].connectTo(bank.outputPins[0])!);
    settle(board);

    expect(part.inputPins[0].state.v).toBe(1);
    expect(part.inner[0].inputPins[0].state.v).toBe(1);
  });

  test('and the component answers to it', () => {
    const {board, part, set} = whileRunning();
    set(0, 1);
    const bank = toggle(board);
    bank.outputPins[0].setLogicState(new LogicState({v: 1}));

    board.addConnection(part.inputPins[0].connectTo(bank.outputPins[0])!);
    settle(board);

    // S and R both high now, which drives both outputs low.
    expect([part.outputPins[0].state.v, part.outputPins[1].state.v]).toEqual([0, 0]);
  });
});

describe('the whole setup copied and pasted while the simulation is running', () => {
  /** Component, a switch on each input, and the wires between them, all put down at once. */
  function pasted() {
    const {board, part} = whileRunning();
    board.clearSelection();
    for (const component of board.components.values()) {
      component.selected = true;
      board.selectedComponents.add(component);
    }
    const copy = copySelection(board)!;
    board.clearSelection();

    const placed = pasteInto(board, copy, {x: 400, y: 400});
    settle(board);
    const copied = placed.find(component => component instanceof SubComponent) as SubComponent;
    const banks = copied.inputPins.map(pin =>
        [...pin.connections.values()][0].source);

    void part;

    return {
      board,
      part: copied,
      // Only the one switch, which is what makes this the case it is: the other was never touched
      // after the paste, so its value has to have arrived when it was wired.
      setS: (v: number) => {
        banks[0].setLogicState(new LogicState({v}));
        settle(board);
      },
      setR: (v: number) => {
        banks[1].setLogicState(new LogicState({v}));
        settle(board);
      },
    };
  }

  test('has both inputs at what their switches were left at', () => {
    const {part} = pasted();

    expect(part.inner[0].inputPins[0].state.z).toBe(0);
    expect(part.inner[1].inputPins[0].state.z).toBe(0);
  });

  test('sets on S alone, rather than leaving the other output unknown', () => {
    const {part, setS} = pasted();

    setS(1);

    expect([part.outputPins[0].state.v, part.outputPins[1].state.v]).toEqual([0, 1]);
    expect([part.outputPins[0].state.x, part.outputPins[1].state.x]).toEqual([0, 0]);
  });

  test('resets on R alone', () => {
    const {part, setR} = pasted();

    setR(1);

    expect([part.outputPins[0].state.v, part.outputPins[1].state.v]).toEqual([1, 0]);
    expect([part.outputPins[0].state.x, part.outputPins[1].state.x]).toEqual([0, 0]);
  });

  test('runs on its own parts, not the ones it was copied from', () => {
    const {board, part, setS} = pasted();
    const original = [...board.components.values()]
        .find(component => component instanceof SubComponent && component !== part) as SubComponent;

    setS(1);

    expect(original.outputPins[0].state.x).toBe(1);
  });
});

describe('the latch on the board it was drawn on', () => {
  test('starts unknown, since nothing has set or reset it', () => {
    const {q, qbar} = bare();

    expect(q().state.x).toBe(1);
    expect(qbar().state.x).toBe(1);
  });

  test('sets', () => {
    const {set, q, qbar} = bare();

    set(1, 0);

    expect([q().state.v, qbar().state.v]).toEqual([0, 1]);
  });

  test('resets', () => {
    const {set, q, qbar} = bare();

    set(0, 1);

    expect([q().state.v, qbar().state.v]).toEqual([1, 0]);
  });

  test('drives both outputs low when both inputs are high', () => {
    const {set, q, qbar} = bare();

    set(1, 1);

    expect([q().state.v, qbar().state.v]).toEqual([0, 0]);
    expect([q().state.x, qbar().state.x]).toEqual([0, 0]);
  });
});

describe('the same latch behind a package', () => {
  test('starts unknown too, rather than reading as a settled zero', () => {
    const {q, qbar} = placed();

    expect(q().state.x).toBe(1);
    expect(qbar().state.x).toBe(1);
  });

  test('sets', () => {
    const {set, q, qbar} = placed();

    set(1, 0);

    expect([q().state.v, qbar().state.v]).toEqual([0, 1]);
  });

  test('resets', () => {
    const {set, q, qbar} = placed();

    set(0, 1);

    expect([q().state.v, qbar().state.v]).toEqual([1, 0]);
  });

  test('drives both outputs low when both inputs are high', () => {
    const {set, q, qbar} = placed();

    set(1, 1);

    expect([q().state.v, qbar().state.v]).toEqual([0, 0]);
    expect([q().state.x, qbar().state.x]).toEqual([0, 0]);
  });

  test('holds what it was set to when both inputs go low again', () => {
    const {set, q, qbar} = placed();

    set(0, 1);
    set(0, 0);

    expect([q().state.v, qbar().state.v]).toEqual([1, 0]);
  });

  test('is brought back to unknown by resetting the simulation', () => {
    const {board, set, q} = placed();
    set(1, 0);

    board.stopSimulation();

    expect(q().state.x).toBe(1);
  });
});
