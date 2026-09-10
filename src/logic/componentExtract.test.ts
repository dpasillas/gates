import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {PackageComponent} from './PackageComponent';
import {PinType} from './LogicPin';
import {Project} from './Project';
import {SubComponent} from './SubComponent';
import {defineComponent, linkage} from './ComponentDefinition';
import type {ComponentDefinition} from './ComponentDefinition';
import {extractBoard, extractPackage} from './componentExtract';
import {makeComponent} from './componentFactory';
import {setPort} from './nets';
import {packageForBoard} from './packageFromBoard';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/**
 * Taking back out what a component holds.
 *
 * The copies a component carries are what make it whole and what make them unreachable. Extracting
 * one restores it where the project has lost it, and forks it where the project still has it — a
 * look at a working component must not repoint it.
 */

function gate(board: LogicBoard, subtype = GateType.AND): LogicComponent {
  const made = makeComponent({type: PartType.GATE, subtype, scope: board.scope, board});
  board.addComponent(made);

  return made;
}

/** A project with a board of two gates, packaged as a component. */
function built(): {project: Project, board: LogicBoard, made: ComponentDefinition} {
  const project = new Project();
  // Not the main board, which the project refuses to remove — and losing it is half of what this
  // is about.
  const board = project.addBoard('core');
  const and = gate(board);
  const or = gate(board, GateType.OR);
  board.addConnection(or.inputPins[0].connectTo(and.outputPins[0])!);
  setPort(board, and.inputPins[0], 'a');
  setPort(board, or.outputPins[0], 'y');
  const packaging = packageForBoard(board, 'core_pkg');
  const made = project.addComponent(defineComponent({name: 'core1', board, packaging}));

  return {project, board, made};
}

describe('extracting the board a component holds', () => {
  test('puts back what the component was carrying, not a fresh board', () => {
    const {project, board, made} = built();
    project.removeBoard(board);

    const back = extractBoard(made, project, 'taken out');

    expect(back.components.size).toBe(2);
    expect(back.connections.size).toBe(1);
  });

  test('keeps the ports, so the component still binds to it', () => {
    const {project, board, made} = built();
    project.removeBoard(board);

    const back = extractBoard(made, project, 'taken out');

    expect([...back.pins.values()].filter(pin => pin.isPort).map(pin => pin.portName).sort())
        .toEqual(['a', 'y']);
  });

  test('takes the identity it names back when the project has lost it', () => {
    const {project, board, made} = built();
    project.removeBoard(board);

    const back = extractBoard(made, project, 'taken out');

    expect(back.id).toBe(made.source.boardId);
  });

  test('is called whatever it was asked to be called', () => {
    const {project, made} = built();

    const back = extractBoard(made, project, 'taken out');

    expect(back.name).toBe('taken out');
  });

  test('falls back to the name it was stored under when asked for nothing', () => {
    const {project, made} = built();

    const back = extractBoard(made, project, '   ');

    expect(back.name).toBe('core');
  });

  test('so the component is linked to it again', () => {
    const {project, board, made} = built();
    project.removeBoard(board);
    extractBoard(made, project, 'taken out');

    expect(project.boards.some(board => board.id === made.source.boardId)).toBe(true);
    expect(linkage(made, project)).toBe('current');
  });

  test('takes an identity of its own when the project still has it', () => {
    const {project, board, made} = built();

    const back = extractBoard(made, project, 'taken out');

    expect(back.id).not.toBe(board.id);
  });

  test('and leaves the component pointing where it was', () => {
    const {project, board, made} = built();

    extractBoard(made, project, 'taken out');

    expect(made.source.boardId).toBe(board.id);
  });

  test('joins the project and opens', () => {
    const {project, made} = built();

    const back = extractBoard(made, project, 'taken out');

    expect(project.boards).toContain(back);
    expect(project.activeBoardId).toBe(back.id);
  });

  test('starts from power-up rather than from whatever the wiring propagated', () => {
    const {project, made} = built();

    const back = extractBoard(made, project, 'taken out');

    expect(back.simulationCurrentTime).toBe(0);
  });
});

describe('extracting the packaging a component holds', () => {
  test('restores it under its own identity when the project has none', () => {
    const {project, made} = built();

    const back = extractPackage(made, project);

    expect(back.name).toBe('core_pkg');
    expect(back.uuid).toBe(made.packaging.uuid);
    expect(project.packages).toContain(back);
  });

  test('brings the pins with it', () => {
    const {project, made} = built();

    const back = extractPackage(made, project);

    expect(back.declared.map(pin => pin.label)).toEqual(['a', 'y']);
    expect(back.declared.map(pin => pin.pinType))
        .toEqual([PinType.INPUT, PinType.OUTPUT]);
  });

  test('so a component packaged by auto becomes linked to a package it can edit', () => {
    // An auto packaging belongs to the component and is never in the project, so extracting it is
    // how it becomes a thing in its own right.
    const {project, made} = built();
    expect(project.packages).toHaveLength(0);

    extractPackage(made, project);

    expect(project.packages.map(pkg => pkg.uuid)).toEqual([made.source.packageId]);
  });

  test('forks it when the project already has that package', () => {
    const {project, made} = built();
    project.addPackage(made.packaging);

    const back = extractPackage(made, project);

    expect(back.name).toBe('core_pkg copy');
    expect(back.uuid).not.toBe(made.packaging.uuid);
  });

  test('is a copy, so editing it leaves the component alone', () => {
    const {project, made} = built();

    const back = extractPackage(made, project);
    back.declarePin({label: 'extra', pinType: PinType.INPUT});

    expect(made.packaging.declared).toHaveLength(2);
  });
});

describe('a board extracted from a component that holds components of its own', () => {
  test('comes back with those placed on it', () => {
    const {project, made: inner} = built();
    const middle = project.addBoard('middle');
    const part = new SubComponent({scope: middle.scope, board: middle, definition: inner});
    middle.addComponent(part);
    setPort(middle, part.inputPins[0], 'p');
    const outer = project.addComponent(
        defineComponent({name: 'outer', board: middle, packaging: packageForBoard(middle, 'op')}));
    project.removeBoard(middle);

    const back = extractBoard(outer, project, 'taken out');

    expect([...back.components.values()][0]).toBeInstanceOf(SubComponent);
  });
});

describe('the packaging a component holds', () => {
  test('is named on the component, so the panel can say what it is', () => {
    const project = new Project();
    const board = project.mainBoard;
    board.name = 'named_board';
    const and = gate(board);
    setPort(board, and.outputPins[0], 'y');
    const packaging = new PackageComponent({scope: board.scope, name: 'named_package'});
    packaging.declarePin({label: 'y', pinType: PinType.OUTPUT});

    const made = defineComponent({name: 'c', board, packaging});

    expect(made.source.boardName).toBe('named_board');
    expect(made.packaging.name).toBe('named_package');
  });
});
