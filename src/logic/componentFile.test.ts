import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {LogicState} from './LogicState';
import {SubComponent} from './SubComponent';
import {defineComponent} from './ComponentDefinition';
import type {ComponentDefinition} from './ComponentDefinition';
import {componentFrom, parseComponentFile, serializeComponentDefinition} from './componentFile';
import {loadBoard, parseBoardFile, serializeBoard} from './boardFile';
import {boardText} from '../storage/boardStore';
import {makeComponent} from './componentFactory';
import {setPort} from './nets';
import {packageForBoard} from './packageFromBoard';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/**
 * A component travels whole; a placement of one travels as a name.
 *
 * The component's file carries the board and the package it was built from, so it can never open to
 * find them changed. A board that has one on it stores only which component it is: the two are in
 * one project and travel together, and forty placements should not be forty copies of a board.
 */

function gate(board: LogicBoard, subtype = GateType.AND): LogicComponent {
  const made = makeComponent({type: PartType.GATE, subtype, scope: board.scope, board});
  board.addComponent(made);

  return made;
}

function andBoard(): LogicBoard {
  const board = new LogicBoard();
  const and = gate(board);
  setPort(board, and.inputPins[0], 'a');
  setPort(board, and.inputPins[1], 'b');
  setPort(board, and.outputPins[0], 'y');

  return board;
}

function and2(): ComponentDefinition {
  const board = andBoard();

  return defineComponent({board, packaging: packageForBoard(board, 'and2')});
}

/** The component as it comes back from being written down. */
function roundTrip(made: ComponentDefinition): ComponentDefinition {
  return componentFrom(parseComponentFile(JSON.stringify(serializeComponentDefinition(made))));
}

function settle(board: LogicBoard) {
  for (let step = 0; step < 50; step++) {
    board.advanceSimulation();
  }
}

/** Drives every input pin of a placement high. */
function driveHigh(board: LogicBoard, part: SubComponent) {
  part.inputPins.forEach(pin => {
    const source = gate(board);
    board.addConnection(pin.connectTo(source.outputPins[0])!);
    source.outputPins[0].setLogicState(new LogicState({v: 1}));
  });
  settle(board);
}

/** Places a component and returns it, wired to nothing. */
function place(board: LogicBoard, definition: ComponentDefinition,
               library?: (id: string) => ComponentDefinition | undefined): SubComponent {
  board.library = library ?? board.library;
  const part = new SubComponent({scope: board.scope, board, definition});
  board.addComponent(part);

  return part;
}

describe('a component written down', () => {
  test('keeps its name and its identity', () => {
    const made = and2();

    const back = roundTrip(made);

    expect(back.name).toBe(made.name);
    expect(back.uuid).toBe(made.uuid);
  });

  test('brings its package with it', () => {
    const back = roundTrip(and2());

    expect(back.packaging.declared.map(pin => pin.label)).toEqual(['a', 'b', 'y']);
  });

  test('brings the board it was built from with it', () => {
    const back = roundTrip(and2());

    expect(back.contents.components).toHaveLength(1);
  });

  test('brings its binding, keyed by the pin it belongs to', () => {
    const made = and2();

    const back = roundTrip(made);

    expect([...back.binding.keys()].sort()).toEqual([...made.binding.keys()].sort());
    expect([...back.ports.values()].sort()).toEqual(['a', 'b', 'y']);
  });

  test('remembers what it was built from, so it can be offered a refresh', () => {
    const made = and2();

    expect(roundTrip(made).source).toEqual(made.source);
  });

  test('runs once it is read back', () => {
    const board = new LogicBoard();
    const part = place(board, roundTrip(and2()));

    driveHigh(board, part);

    expect(part.outputPins[0].state.v).toBe(1);
  });

  test('is refused when it is not a component file', () => {
    expect(() => parseComponentFile(JSON.stringify({format: 'gates.board'})))
        .toThrow(/not a Gates component/);
  });
});

describe('a board with one placed on it', () => {
  /** That board, written down and read back with the project's components to hand. */
  function through(board: LogicBoard, made: ComponentDefinition): LogicBoard {
    const data = parseBoardFile(JSON.stringify(serializeBoard(board)));
    const back = new LogicBoard();
    back.library = id => id === made.uuid ? made : undefined;
    loadBoard(back, data);

    return back;
  }

  test('stores which component it is rather than a copy of it', () => {
    const made = and2();
    const board = new LogicBoard();
    place(board, made);

    const entry = serializeBoard(board).components[0];

    expect(entry.component).toBe(made.uuid);
    expect(entry.type).toBe('COMPOSITE_CUSTOM');
  });

  test('comes back as a placement of the same component', () => {
    const made = and2();
    const board = new LogicBoard();
    place(board, made);

    const back = through(board, made);
    const part = [...back.components.values()][0] as SubComponent;

    expect(part).toBeInstanceOf(SubComponent);
    expect(part.definitionId).toBe(made.uuid);
    expect(part.pins().map(pin => pin.label)).toEqual(['a', 'b', 'y']);
  });

  test('comes back running', () => {
    const made = and2();
    const board = new LogicBoard();
    place(board, made);

    const back = through(board, made);
    const part = [...back.components.values()][0] as SubComponent;
    driveHigh(back, part);

    expect(part.outputPins[0].state.v).toBe(1);
  });

  test('keeps the wires that ran to it', () => {
    const made = and2();
    const board = new LogicBoard();
    const part = place(board, made);
    const driver = gate(board);
    board.addConnection(part.inputPins[0].connectTo(driver.outputPins[0])!);

    const back = through(board, made);

    expect(back.connections.size).toBe(1);
  });

  test('refuses to open when the project no longer has the component', () => {
    const made = and2();
    const board = new LogicBoard();
    place(board, made);
    const data = parseBoardFile(JSON.stringify(serializeBoard(board)));

    expect(() => loadBoard(new LogicBoard(), data))
        .toThrow(/component the project does not have/);
  });
});

describe('a board exported out of its project', () => {
  /** The board written down as an export writes it, and read back with nothing else to hand. */
  function exported(board: LogicBoard): LogicBoard {
    const data = parseBoardFile(boardText(board));
    const carried = (data.library ?? []).map(entry => componentFrom(entry));
    const back = new LogicBoard();
    back.library = id => carried.find(made => made.uuid === id);
    loadBoard(back, data);

    return back;
  }

  test('carries the components it uses, since it has left the project that had them', () => {
    const made = and2();
    const board = new LogicBoard();
    board.library = id => id === made.uuid ? made : undefined;
    place(board, made);

    const data = parseBoardFile(boardText(board));

    expect(data.library?.map(entry => entry.id)).toEqual([made.uuid]);
  });

  test('carries nothing when it uses nothing, rather than an empty list', () => {
    const board = new LogicBoard();
    gate(board);

    expect(parseBoardFile(boardText(board)).library).toBeUndefined();
  });

  test('opens somewhere that has never heard of the component', () => {
    const made = and2();
    const board = new LogicBoard();
    board.library = id => id === made.uuid ? made : undefined;
    place(board, made);

    const back = exported(board);
    const part = [...back.components.values()][0] as SubComponent;

    expect(part).toBeInstanceOf(SubComponent);
    expect(part.pins().map(pin => pin.label)).toEqual(['a', 'b', 'y']);
  });

  test('and runs there', () => {
    const made = and2();
    const board = new LogicBoard();
    board.library = id => id === made.uuid ? made : undefined;
    place(board, made);

    const back = exported(board);
    const part = [...back.components.values()][0] as SubComponent;
    driveHigh(back, part);

    expect(part.outputPins[0].state.v).toBe(1);
  });

  test('carries the components its components use, all the way down', () => {
    const inner = and2();
    const middle = new LogicBoard();
    middle.library = id => id === inner.uuid ? inner : undefined;
    const part = place(middle, inner);
    setPort(middle, part.inputPins[0], 'p');
    setPort(middle, part.outputPins[0], 'r');
    const outer = defineComponent({board: middle, packaging: packageForBoard(middle, 'wrapped')});

    const board = new LogicBoard();
    board.library = id =>
        id === outer.uuid ? outer : (id === inner.uuid ? inner : undefined);
    place(board, outer);

    const data = parseBoardFile(boardText(board));

    expect(data.library?.map(entry => entry.id).sort())
        .toEqual([inner.uuid, outer.uuid].sort());
  });
});

describe('a component built on a board that already had one on it', () => {
  /** `and2` placed on a board, its pins exposed, and that board packaged in turn. */
  function nested(): {inner: ComponentDefinition, outer: ComponentDefinition} {
    const inner = and2();
    const board = new LogicBoard();
    const part = place(board, inner);
    setPort(board, part.inputPins[0], 'p');
    setPort(board, part.inputPins[1], 'q');
    setPort(board, part.outputPins[0], 'r');

    return {inner, outer: defineComponent({board, packaging: packageForBoard(board, 'wrapped')})};
  }

  test('names the one inside rather than copying it', () => {
    const {inner, outer} = nested();

    expect(outer.contents.components[0].component).toBe(inner.uuid);
  });

  test('runs, with the parts of both on the one board', () => {
    const {inner, outer} = nested();
    const board = new LogicBoard();
    const part = place(board, outer, id => id === inner.uuid ? inner : undefined);

    driveHigh(board, part);

    expect(part.outputPins[0].state.v).toBe(1);
  });

  test('brings what the one inside brings, however deep it sits', () => {
    const {inner, outer} = nested();
    const board = new LogicBoard();
    place(board, outer, id => id === inner.uuid ? inner : undefined);

    // The placement of `and2` inside, and the AND gate that placement brings with it.
    expect(board.hosted.size).toBe(2);
  });

  test('takes all of it away again when it is removed', () => {
    const {inner, outer} = nested();
    const board = new LogicBoard();
    const part = place(board, outer, id => id === inner.uuid ? inner : undefined);

    part.remove();

    expect(board.hosted.size).toBe(0);
  });

  test('picks up an improvement to the one inside without being refreshed', () => {
    // The component inside is named rather than copied, so refreshing it is the one explicit
    // moment, and everything built on it follows from there.
    const {inner, outer} = nested();
    const swapped = componentFrom(parseComponentFile(JSON.stringify({
      ...serializeComponentDefinition(inner),
      contents: {
        ...inner.contents,
        components: [{...inner.contents.components[0], subtype: GateType.OR}],
      },
    })));
    const board = new LogicBoard();
    const part = place(board, outer, id => id === inner.uuid ? swapped : undefined);

    const driver = gate(board);
    board.addConnection(part.inputPins[0].connectTo(driver.outputPins[0])!);
    driver.outputPins[0].setLogicState(new LogicState({v: 1}));
    settle(board);

    // OR of 1 and nothing, where the AND it replaced would have given 0.
    expect(part.outputPins[0].state.v).toBe(1);
  });
});
