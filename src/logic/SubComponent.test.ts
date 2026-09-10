import {GLOBAL_SCOPE} from '../Constants';
import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {PinType} from './LogicPin';
import {LogicState} from './LogicState';
import {PackageComponent} from './PackageComponent';
import {SubComponent} from './SubComponent';
import {serializeComponents} from './boardFile';
import type {ComponentSet} from './boardFile';
import {makeComponent} from './componentFactory';
import {setPort} from './nets';
import {packageForBoard} from './packageFromBoard';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/**
 * A board put behind a package and placed as one part.
 *
 * The parts inside run in the same simulation as everything around them, and are in none of the
 * collections that mean "on the board", so nothing can draw or reach them.
 */

function gate(board: LogicBoard, subtype = GateType.AND): LogicComponent {
  const made = makeComponent({type: PartType.GATE, subtype, scope: board.scope, board});
  board.addComponent(made);

  return made;
}

/** A board holding one AND gate with both inputs and its output exposed as ports. */
function andBoard(): {board: LogicBoard, inside: ComponentSet, packaging: PackageComponent} {
  const board = new LogicBoard();
  const and = gate(board);
  setPort(board, and.inputPins[0], 'a');
  setPort(board, and.inputPins[1], 'b');
  setPort(board, and.outputPins[0], 'y');

  return {
    board,
    inside: serializeComponents(board, [...board.components.values()]),
    packaging: packageForBoard(board, 'and2'),
  };
}

/**
 * That board, placed on another one, with a driver wired to each of its inputs.
 *
 * Driven rather than poked: a value only reaches a line from something driving it, so setting an
 * input pin's state by hand would prove nothing about whether the boundary carries anything.
 */
function bare(): {board: LogicBoard, part: SubComponent} {
  const {inside, packaging} = andBoard();
  const board = new LogicBoard();
  const part = new SubComponent({scope: board.scope, board, packaging, inside});
  board.addComponent(part);

  return {board, part};
}

function placed(): {board: LogicBoard, part: SubComponent, drive: (a: number, b: number) => void} {
  const {board, part} = bare();

  const drivers = part.inputPins.map(pin => {
    const source = gate(board);
    board.addConnection(pin.connectTo(source.outputPins[0])!);

    return source;
  });

  return {
    board,
    part,
    drive: (a: number, b: number) => {
      drivers[0].outputPins[0].setLogicState(new LogicState({v: a}));
      drivers[1].outputPins[0].setLogicState(new LogicState({v: b}));
    },
  };
}

/** Runs the queue until it is empty, so a value has time to cross the part. */
function settle(board: LogicBoard) {
  for (let step = 0; step < 50; step++) {
    board.advanceSimulation();
  }
}

describe('a placed subcomponent', () => {
  test('has a pin for every one the packaging declares', () => {
    const {part} = placed();

    expect(part.pins().map(pin => pin.label)).toEqual(['a', 'b', 'y']);
  });

  test('is drawn as the packaging, not as something of its own', () => {
    const {inside, packaging} = andBoard();
    const board = new LogicBoard();
    const part = new SubComponent({scope: board.scope, board, packaging, inside});

    expect(part.d).toBe(packaging.d);
  });

  test('takes the roles and widths the packaging gave', () => {
    const {part} = placed();

    expect(part.inputPins.map(pin => pin.pinType)).toEqual([PinType.INPUT, PinType.INPUT]);
    expect(part.outputPins.map(pin => pin.pinType)).toEqual([PinType.OUTPUT]);
  });
});

describe('what is inside it', () => {
  test('runs on the board it was placed on', () => {
    const {board, part} = bare();

    expect(board.hosted.size).toBe(1);
    expect(part.inner).toHaveLength(1);
    expect([...board.hosted.values()][0].board).toBe(board);
  });

  test('is not on that board, so nothing draws or files it', () => {
    const {board} = bare();

    // One component on the board: the subcomponent itself.
    expect(board.components.size).toBe(1);
  });

  test('is not among the pins anything hit-tests or names', () => {
    const {board, part} = bare();

    // Only the subcomponent's own three, which are what a user can reach.
    expect(board.pins.size).toBe(part.pins().length);
  });

  test('is not among the wires the board draws', () => {
    const {board} = bare();

    expect(board.connections.size).toBe(0);
  });

  test('keeps no port names, which two instances would otherwise clash over', () => {
    const {board} = bare();

    const named = [...board.hosted.values()]
        .flatMap(component => component.pins())
        .filter(pin => pin.isPort);

    expect(named).toEqual([]);
  });
});

describe('running one', () => {
  test('carries a value in, through, and out again', () => {
    const {board, part, drive} = placed();

    drive(1, 1);
    settle(board);

    expect(part.outputPins[0].state.v).toBe(1);
  });

  test('gives the answer the board inside would have given', () => {
    const {board, part, drive} = placed();

    drive(1, 0);
    settle(board);

    expect(part.outputPins[0].state.v).toBe(0);
  });

  test('drives what is wired to it outside', () => {
    const {board, part, drive} = placed();
    const reader = gate(board);
    board.addConnection(reader.inputPins[0].connectTo(part.outputPins[0])!);

    drive(1, 1);
    settle(board);

    expect(reader.inputPins[0].state.v).toBe(1);
  });

  test('runs in the one queue, rather than one of its own', () => {
    const {board, part, drive} = placed();

    drive(1, 1);

    // The value reaching the far side is proof enough on its own; what this asks is that the work
    // was queued on the board rather than done inside the part before anything was advanced.
    expect(part.outputPins[0].state.v).toBe(0);
    settle(board);
    expect(part.outputPins[0].state.v).toBe(1);
  });

  test('is reset with the board', () => {
    const {board, part, drive} = placed();
    drive(1, 1);
    settle(board);

    board.stopSimulation();

    expect(board.simulationCurrentTime).toBe(0);
    expect(part.outputPins[0].state.v).not.toBe(1);
  });
});

describe('what the outside cannot do to the inside', () => {
  test('unwiring a pin leaves it joined to what it answers to inside', () => {
    const {board, part} = placed();
    const spare = gate(board);
    const connection = part.inputPins[0].connectTo(spare.outputPins[0])!;
    board.addConnection(connection);
    const inside = part.inner[0].inputPins[0];

    connection.remove();

    expect(part.inputPins[0].net!.family).toContain(inside.net);
  });

  test('and the part still works once something is wired to it again', () => {
    const {board, part} = placed();
    // Unwire the driver that was feeding one input, then feed it from a different one.
    [...part.inputPins[0].connections.values()][0].remove();
    const again = gate(board);
    board.addConnection(part.inputPins[0].connectTo(again.outputPins[0])!);

    again.outputPins[0].setLogicState(new LogicState({v: 1}));
    [...part.inputPins[1].connections.values()][0].source
        .setLogicState(new LogicState({v: 1}));
    settle(board);

    expect(part.outputPins[0].state.v).toBe(1);
  });
});

describe('a port whose pin is also wired to something inside', () => {
  /**
   * A board of two gates, the first driving the second, with the first's output exposed.
   *
   * The case that tells a bond from an ordinary join: the exposed pin is already on an internal
   * line, so putting it on the port's line by moving it would take the second gate off its input.
   */
  function chained() {
    const board = new LogicBoard();
    const first = gate(board);
    const second = gate(board);
    board.addConnection(second.inputPins[0].connectTo(first.outputPins[0])!);
    setPort(board, first.inputPins[0], 'a');
    setPort(board, first.inputPins[1], 'b');
    setPort(board, first.outputPins[0], 'y');

    const inside = serializeComponents(board, [...board.components.values()]);
    const packaging = packageForBoard(board, 'chain');
    const placedOn = new LogicBoard();
    const part = new SubComponent({scope: placedOn.scope, board: placedOn, packaging, inside});
    placedOn.addComponent(part);

    const drivers = part.inputPins.map(pin => {
      const source = gate(placedOn);
      placedOn.addConnection(pin.connectTo(source.outputPins[0])!);

      return source;
    });

    return {board: placedOn, part, drivers};
  }

  test('leaves the pin on the line it was already on inside', () => {
    const {part} = chained();
    const [first, second] = part.inner;

    expect(first.outputPins[0].net!.line).toContain(second.inputPins[0]);
    expect(first.outputPins[0].net!.listeners).toContain(second.inputPins[0]);
  });

  test('so what is wired to it inside still hears the value', () => {
    const {board, part, drivers} = chained();
    const [, second] = part.inner;

    drivers.forEach(source => source.outputPins[0].setLogicState(new LogicState({v: 1})));
    settle(board);

    expect(second.inputPins[0].state.v).toBe(1);
  });

  test('and the value still reaches the pin outside', () => {
    const {board, part, drivers} = chained();

    drivers.forEach(source => source.outputPins[0].setLogicState(new LogicState({v: 1})));
    settle(board);

    expect(part.outputPins[0].state.v).toBe(1);
  });
});

describe('two of the same component', () => {
  test('share a packaging without sharing a value', () => {
    const {inside, packaging} = andBoard();
    const board = new LogicBoard();
    const first = new SubComponent({scope: board.scope, board, packaging, inside});
    const second = new SubComponent({scope: board.scope, board, packaging, inside});
    board.addComponent(first);
    board.addComponent(second);

    first.inputPins.forEach(pin => {
      const source = gate(board);
      board.addConnection(pin.connectTo(source.outputPins[0])!);
      source.outputPins[0].setLogicState(new LogicState({v: 1}));
    });
    settle(board);

    expect(first.outputPins[0].state.v).toBe(1);
    expect(second.outputPins[0].state.v).not.toBe(1);
  });

  test('each bring their own parts to the board', () => {
    const {inside, packaging} = andBoard();
    const board = new LogicBoard();
    board.addComponent(new SubComponent({scope: board.scope, board, packaging, inside}));
    board.addComponent(new SubComponent({scope: board.scope, board, packaging, inside}));

    expect(board.hosted.size).toBe(2);
  });
});

describe('taking one off the board', () => {
  test('takes what was inside it with it', () => {
    const {board, part} = bare();

    part.remove();

    expect(board.hosted.size).toBe(0);
  });
});

describe('a packaging on its own', () => {
  test('draws the same whether it is being authored or placed', () => {
    const packaging = new PackageComponent({scope: GLOBAL_SCOPE, name: 'p'});
    packaging.declarePin({label: 'a', pinType: PinType.INPUT});
    packaging.declarePin({label: 'y', pinType: PinType.OUTPUT});
    const board = new LogicBoard();

    const part = new SubComponent({scope: board.scope, board, packaging});

    expect(part.d).toBe(packaging.d);
    expect(part.pins().map(pin => pin.label)).toEqual(['a', 'y']);
  });
});
