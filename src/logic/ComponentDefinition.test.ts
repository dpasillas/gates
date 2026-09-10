import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {LogicState} from './LogicState';
import {PackageComponent} from './PackageComponent';
import {PinType} from './LogicPin';
import {SubComponent} from './SubComponent';
import {bindByName, defineComponent, linkage} from './ComponentDefinition';
import {makeComponent} from './componentFactory';
import {setPort} from './nets';
import {packageForBoard} from './packageFromBoard';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/**
 * A component is a package bound to a board, and holds copies of both.
 *
 * What that buys is that a saved component is always internally consistent: editing the board or
 * the package it came from cannot reach inside one, so there is no broken state to represent. What
 * it costs is that a component can fall behind, which is what `linkage` reports.
 */

function gate(board: LogicBoard, subtype = GateType.AND): LogicComponent {
  const made = makeComponent({type: PartType.GATE, subtype, scope: board.scope, board});
  board.addComponent(made);

  return made;
}

/** A board holding one AND gate, both inputs and its output exposed as ports. */
function andBoard(): LogicBoard {
  const board = new LogicBoard();
  const and = gate(board);
  setPort(board, and.inputPins[0], 'a');
  setPort(board, and.inputPins[1], 'b');
  setPort(board, and.outputPins[0], 'y');

  return board;
}

function project(board: LogicBoard, packaging: PackageComponent) {
  return {boards: [board], packages: [packaging]};
}

/** Drives every input pin high and runs the queue out. */
function driveHigh(board: LogicBoard, part: SubComponent) {
  part.inputPins.forEach(pin => {
    const source = gate(board);
    board.addConnection(pin.connectTo(source.outputPins[0])!);
    source.outputPins[0].setLogicState(new LogicState({v: 1}));
  });

  for (let step = 0; step < 50; step++) {
    board.advanceSimulation();
  }
}

describe('defining one', () => {
  test('binds each pin to the port sharing its name', () => {
    const board = andBoard();
    const made = defineComponent({board, packaging: packageForBoard(board, 'and2')});

    expect([...made.ports.values()].sort()).toEqual(['a', 'b', 'y']);
  });

  test('leaves a pin whose name matches no port unbound', () => {
    const board = andBoard();
    const packaging = packageForBoard(board, 'and2');
    packaging.declarePin({label: 'carry', pinType: PinType.OUTPUT});

    const made = defineComponent({board, packaging});

    expect(made.unbound).toEqual(['carry']);
  });

  test('reports nothing unbound once every pin has a port', () => {
    const board = andBoard();

    expect(defineComponent({board, packaging: packageForBoard(board, 'and2')}).unbound).toEqual([]);
  });

  test('binds nothing on a board with no ports', () => {
    const packaging = new PackageComponent({scope: new LogicBoard().scope, name: 'p'});
    packaging.declarePin({label: 'a', pinType: PinType.INPUT});

    expect(bindByName(packaging, new LogicBoard()).size).toBe(0);
  });
});

describe('what it holds', () => {
  test('keeps the board it was built from, not a view of it', () => {
    const board = andBoard();
    const made = defineComponent({board, packaging: packageForBoard(board, 'and2')});

    gate(board, GateType.OR);

    expect(made.contents.components).toHaveLength(1);
  });

  test('keeps the package it was built from, not a view of it', () => {
    const board = andBoard();
    const packaging = packageForBoard(board, 'and2');
    const made = defineComponent({board, packaging});

    packaging.declarePin({label: 'extra', pinType: PinType.INPUT});

    expect(made.packaging.declared).toHaveLength(3);
  });
});

describe('how it stands to the project', () => {
  test('is current while nothing it was built from has changed', () => {
    const board = andBoard();
    const packaging = packageForBoard(board, 'and2');

    expect(linkage(defineComponent({board, packaging}), project(board, packaging)))
        .toBe('current');
  });

  test('falls behind when the board is edited', () => {
    const board = andBoard();
    const packaging = packageForBoard(board, 'and2');
    const made = defineComponent({board, packaging});

    gate(board, GateType.OR);

    expect(linkage(made, project(board, packaging))).toBe('stale');
  });

  test('falls behind when the package is edited', () => {
    const board = andBoard();
    const packaging = packageForBoard(board, 'and2');
    const made = defineComponent({board, packaging});

    packaging.declarePin({label: 'extra', pinType: PinType.INPUT});

    expect(linkage(made, project(board, packaging))).toBe('stale');
  });

  test('says nothing about a board the project no longer has', () => {
    // A source the project does not hold cannot have moved on. Reporting it as a problem would mark
    // every component made with an auto packaging, which belongs to the component rather than the
    // project and is never in it.
    const board = andBoard();
    const packaging = packageForBoard(board, 'and2');
    const made = defineComponent({board, packaging});

    expect(linkage(made, {boards: [], packages: [packaging]})).toBe('current');
  });

  test('is current when its packaging was derived rather than chosen', () => {
    const board = andBoard();
    const made = defineComponent({board, packaging: packageForBoard(board, 'and2')});

    expect(linkage(made, {boards: [board], packages: []})).toBe('current');
  });

  test('still falls behind on the board when its packaging is not in the project', () => {
    const board = andBoard();
    const made = defineComponent({board, packaging: packageForBoard(board, 'and2')});

    gate(board, GateType.OR);

    expect(linkage(made, {boards: [board], packages: []})).toBe('stale');
  });

  test('runs whatever the project holds', () => {
    const board = andBoard();
    const made = defineComponent({board, packaging: packageForBoard(board, 'and2')});
    const onto = new LogicBoard();
    const part = new SubComponent({scope: onto.scope, board: onto, definition: made});
    onto.addComponent(part);

    driveHigh(onto, part);

    expect(part.outputPins[0].state.v).toBe(1);
  });
});

describe('placing one', () => {
  test('takes its pins from the package it holds', () => {
    const board = andBoard();
    const made = defineComponent({board, packaging: packageForBoard(board, 'and2')});
    const onto = new LogicBoard();

    const part = new SubComponent({scope: onto.scope, board: onto, definition: made});

    expect(part.pins().map(pin => pin.label)).toEqual(['a', 'b', 'y']);
    expect(part.definitionId).toBe(made.uuid);
  });

  test('answers to the port the binding names, not the pin label', () => {
    // The package calls the pins in1/in2/out; the board calls the ports a/b/y. Only the binding
    // joins them, so this passes for no other reason.
    const board = andBoard();
    const packaging = new PackageComponent({scope: board.scope, name: 'renamed'});
    const first = packaging.declarePin({label: 'in1', pinType: PinType.INPUT});
    const second = packaging.declarePin({label: 'in2', pinType: PinType.INPUT});
    const out = packaging.declarePin({label: 'out', pinType: PinType.OUTPUT});
    const made = defineComponent({board, packaging, binding: new Map([
      [first.uuid, {port: 'a'}], [second.uuid, {port: 'b'}], [out.uuid, {port: 'y'}]])});
    const onto = new LogicBoard();
    const part = new SubComponent({scope: onto.scope, board: onto, definition: made});
    onto.addComponent(part);

    driveHigh(onto, part);

    expect(part.outputPins[0].state.v).toBe(1);
  });

  test('two placements are two copies of the board, not one shared', () => {
    const board = andBoard();
    const made = defineComponent({board, packaging: packageForBoard(board, 'and2')});
    const onto = new LogicBoard();
    const first = new SubComponent({scope: onto.scope, board: onto, definition: made});
    const second = new SubComponent({scope: onto.scope, board: onto, definition: made});
    onto.addComponent(first);
    onto.addComponent(second);

    expect(onto.hosted.size).toBe(2);
    expect(first.inner[0]).not.toBe(second.inner[0]);
  });
});
