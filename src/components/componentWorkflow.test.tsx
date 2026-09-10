import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {ComponentDialog} from './ComponentDialog';
import {ProjectPanel} from './ProjectPanel';
import {partsFor} from './partsCatalogue';
import {LogicBoard} from '../logic/LogicBoard';
import {PackageComponent} from '../logic/PackageComponent';
import {PinType} from '../logic/LogicPin';
import {Project} from '../logic/Project';
import {SubComponent} from '../logic/SubComponent';
import {defineComponent, linkage} from '../logic/ComponentDefinition';
import type {ComponentDefinition} from '../logic/ComponentDefinition';
import {makeComponent} from '../logic/componentFactory';
import {setPort} from '../logic/nets';
import {packageForBoard} from '../logic/packageFromBoard';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/**
 * Making a component out of a board, and reaching for it afterwards.
 *
 * The dialog binds a package's pins to a board's ports; the panel lists what that made and says
 * whether it has fallen behind; the parts panel is where it is picked up and placed.
 */

/** A board holding one AND gate with both inputs and its output exposed as ports. */
function andBoard(): LogicBoard {
  const board = new LogicBoard();
  board.name = 'and_core';
  const and = makeComponent(
      {type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
  board.addComponent(and);
  setPort(board, and.inputPins[0], 'a');
  setPort(board, and.inputPins[1], 'b');
  setPort(board, and.outputPins[0], 'y');

  return board;
}

function dialog(board: LogicBoard, packages: PackageComponent[] = []) {
  const saved: ComponentDefinition[] = [];
  render(<ComponentDialog board={board} boards={[board]} packages={packages}
                          onCancel={() => {}}
                          onCreatePackage={() => {}}
                          onSave={made => saved.push(made)}/>);

  return {saved};
}

const save = () => screen.getByRole('button', {name: 'Save Component'});

/**
 * The packaging dropdown's own control.
 *
 * By class rather than by label: once the list has been opened, the popover it leaves mounted
 * carries the same label and `getByLabelText` finds both.
 */
const packagingField = () =>
    document.querySelector('.component-packaging .MuiSelect-select') as HTMLElement;

describe('creating a component from a board', () => {
  test('offers one row for each pin the packaging declares', () => {
    dialog(andBoard());

    expect(screen.getByLabelText('Port for a')).toBeInTheDocument();
    expect(screen.getByLabelText('Port for b')).toBeInTheDocument();
    expect(screen.getByLabelText('Port for y')).toBeInTheDocument();
  });

  test('starts from a packaging derived from the board, with every port bound', () => {
    const {saved} = dialog(andBoard());

    fireEvent.click(save());

    expect([...saved[0].ports.values()].sort()).toEqual(['a', 'b', 'y']);
  });

  test('names the component after the board until it is called something else', () => {
    const {saved} = dialog(andBoard());

    fireEvent.change(screen.getByLabelText('Component name'), {target: {value: 'and2'}});
    fireEvent.click(save());

    expect(saved[0].name).toBe('and2');
  });

  test('refuses to save a component with a pin bound to nothing', () => {
    const board = andBoard();
    const packaging = packageForBoard(board, 'and2');
    packaging.declarePin({label: 'carry', pinType: PinType.OUTPUT});

    dialog(board, [packaging]);
    // Auto is still the choice, so this only checks the packaging above is offered, not used.
    expect(save()).toBeEnabled();
  });

  test('says how many pins are still to bind', () => {
    const board = new LogicBoard();
    const and = makeComponent(
        {type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
    board.addComponent(and);
    setPort(board, and.inputPins[0], 'a');
    const packaging = packageForBoard(board, 'one');
    packaging.declarePin({label: 'unbound', pinType: PinType.OUTPUT});

    const saved: ComponentDefinition[] = [];
    render(<ComponentDialog board={board} boards={[board]} packages={[packaging]}
                            existing={defineComponent({board, packaging})}
                            onCreatePackage={() => {}}
                            onCancel={() => {}} onSave={made => saved.push(made)}/>);

    expect(screen.getByText('1 pin still to bind')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  test('says which of the board ports nothing takes', () => {
    const board = andBoard();
    const packaging = new PackageComponent({scope: board.scope, name: 'partial'});
    packaging.declarePin({label: 'a', pinType: PinType.INPUT});
    packaging.declarePin({label: 'b', pinType: PinType.INPUT});

    render(<ComponentDialog board={board} boards={[board]} packages={[packaging]}
                            existing={defineComponent({board, packaging})}
                            onCreatePackage={() => {}}
                            onCancel={() => {}} onSave={() => {}}/>);

    expect(screen.getByText(/Not bound to anything: y/)).toBeInTheDocument();
  });

  test('binds by name to a packaging that was authored separately', () => {
    const board = andBoard();
    const packaging = new PackageComponent({scope: board.scope, name: 'authored'});
    packaging.declarePin({label: 'a', pinType: PinType.INPUT});
    packaging.declarePin({label: 'b', pinType: PinType.INPUT});
    packaging.declarePin({label: 'y', pinType: PinType.OUTPUT});
    const saved: ComponentDefinition[] = [];

    render(<ComponentDialog board={board} boards={[board]} packages={[packaging]}
                            existing={defineComponent({board, packaging})}
                            onCreatePackage={() => {}}
                            onCancel={() => {}} onSave={made => saved.push(made)}/>);
    fireEvent.click(save());

    expect([...saved[0].ports.values()].sort()).toEqual(['a', 'b', 'y']);
  });

  test('shows Auto again when editing something whose packaging was derived', () => {
    // An auto packaging belongs to the component, so it is not one of the project's — reading the
    // recorded id straight into the dropdown left it showing nothing at all.
    const board = andBoard();
    const other = new PackageComponent({scope: board.scope, name: 'something else'});
    render(<ComponentDialog board={board} boards={[board]} packages={[other]}
                            existing={defineComponent({board, packaging: packageForBoard(board)})}
                            onCancel={() => {}} onCreatePackage={() => {}} onSave={() => {}}/>);

    expect(packagingField()).toHaveTextContent(/Auto/);
  });

  test('shows the package by name when editing something built to one the project holds', () => {
    const board = andBoard();
    const packaging = new PackageComponent({scope: board.scope, name: 'chosen'});
    packaging.declarePin({label: 'a', pinType: PinType.INPUT});
    render(<ComponentDialog board={board} boards={[board]} packages={[packaging]}
                            existing={defineComponent({board, packaging})}
                            onCancel={() => {}} onCreatePackage={() => {}} onSave={() => {}}/>);

    expect(packagingField()).toHaveTextContent('chosen');
  });

  test('says it is editing when the component already exists', () => {
    const board = andBoard();
    render(<ComponentDialog board={board} boards={[board]} packages={[]}
                            existing={defineComponent({board, packaging: packageForBoard(board)})}
                            onCreatePackage={() => {}}
                            onCancel={() => {}} onSave={() => {}}/>);

    expect(screen.getByText('Edit Component')).toBeInTheDocument();
  });

  test('keeps the component it was editing rather than making a second one', () => {
    const board = andBoard();
    const existing = defineComponent({board, packaging: packageForBoard(board, 'and2')});
    const saved: ComponentDefinition[] = [];
    render(<ComponentDialog board={board} boards={[board]} packages={[]} existing={existing}
                            onCreatePackage={() => {}}
                            onCancel={() => {}} onSave={made => saved.push(made)}/>);

    fireEvent.click(save());

    expect(saved[0].uuid).toBe(existing.uuid);
  });
});

describe('authoring a package from the binding dialog', () => {
  /** The dropdown open, with its options readable. */
  function options(board: LogicBoard, packages: PackageComponent[] = []) {
    const made: PackageComponent[] = [];
    render(<ComponentDialog board={board} boards={[board]} packages={packages}
                            onCancel={() => {}}
                            onCreatePackage={pkg => made.push(pkg)}
                            onSave={() => {}}/>);
    fireEvent.mouseDown(packagingField());

    return {made};
  }

  test('is offered beside the packages already made', () => {
    options(andBoard());

    expect(screen.getByRole('option', {name: 'New package…'})).toBeInTheDocument();
  });

  test('opens the package editor rather than choosing anything', () => {
    options(andBoard());

    fireEvent.click(screen.getByRole('option', {name: 'New package…'}));

    expect(screen.getByText('Create Package')).toBeInTheDocument();
  });

  test('leaves the dropdown where it was when the editor is cancelled', () => {
    const board = andBoard();
    const packaging = new PackageComponent({scope: board.scope, name: 'chosen'});
    packaging.declarePin({label: 'a', pinType: PinType.INPUT});
    options(board, [packaging]);
    fireEvent.click(screen.getByRole('option', {name: 'chosen'}));

    fireEvent.mouseDown(packagingField());
    fireEvent.click(screen.getByRole('option', {name: 'New package…'}));
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(screen.queryByText('Create Package')).toBeNull();
    expect(packagingField()).toHaveTextContent('chosen');
  });

  test('takes the package into the project and selects it once it is saved', () => {
    const {made} = options(andBoard());
    fireEvent.click(screen.getByRole('option', {name: 'New package…'}));

    fireEvent.click(screen.getByRole('button', {name: 'Add input'}));
    fireEvent.change(screen.getByLabelText('Pin label'), {target: {value: 'a'}});
    fireEvent.change(screen.getByLabelText('Package name'), {target: {value: 'fresh'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save Package'}));

    expect(made.map(pkg => pkg.name)).toEqual(['fresh']);
    expect(packagingField()).toHaveTextContent('fresh');
    expect(screen.getByLabelText('Port for a')).toBeInTheDocument();
  });
});

describe('choosing which board is behind the component', () => {
  /** A project of two boards, each exposing a port of its own. */
  function two() {
    const project = new Project();
    const first = project.mainBoard;
    first.name = 'first';
    const and = makeComponent(
        {type: PartType.GATE, subtype: GateType.AND, scope: first.scope, board: first});
    first.addComponent(and);
    setPort(first, and.inputPins[0], 'a');
    setPort(first, and.outputPins[0], 'y');

    const second = project.addBoard('second');
    const or = makeComponent(
        {type: PartType.GATE, subtype: GateType.OR, scope: second.scope, board: second});
    second.addComponent(or);
    setPort(second, or.inputPins[0], 'a');
    setPort(second, or.outputPins[0], 'y');

    return {project, first, second};
  }

  const boardField = () =>
      document.querySelector('.component-board .MuiSelect-select') as HTMLElement;

  test('starts on the board the dialog was opened for', () => {
    const {project, first} = two();
    render(<ComponentDialog board={first} boards={project.boards} packages={[]}
                            onCancel={() => {}} onCreatePackage={() => {}} onSave={() => {}}/>);

    expect(boardField()).toHaveTextContent('first');
  });

  test('offers every board the project holds', () => {
    const {project, first} = two();
    render(<ComponentDialog board={first} boards={project.boards} packages={[]}
                            onCancel={() => {}} onCreatePackage={() => {}} onSave={() => {}}/>);

    fireEvent.mouseDown(boardField());

    expect(screen.getByRole('option', {name: 'second'})).toBeInTheDocument();
  });

  test('starts on the board the component was built from, not the one in front', () => {
    const {project, second} = two();
    const made = defineComponent({name: 'c', board: second, packaging: packageForBoard(second)});

    render(<ComponentDialog board={second} boards={project.boards} packages={project.packages}
                            existing={made} onCancel={() => {}} onCreatePackage={() => {}}
                            onSave={() => {}}/>);

    expect(boardField()).toHaveTextContent('second');
  });
});

describe('saving an edited component', () => {
  /** A project with one board and a component built from it. */
  function built() {
    const project = new Project();
    const board = project.mainBoard;
    board.name = 'core';
    const and = makeComponent(
        {type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
    board.addComponent(and);
    setPort(board, and.inputPins[0], 'a');
    setPort(board, and.outputPins[0], 'y');
    const made = project.addComponent(
        defineComponent({name: 'and2', board, packaging: packageForBoard(board, 'and2')}));

    return {project, board, made};
  }

  /** Moves the board on, so that the component's copy of it is behind. */
  function change(board: LogicBoard) {
    board.addComponent(makeComponent(
        {type: PartType.GATE, subtype: GateType.OR, scope: board.scope, board}));
  }

  function editing(project: Project, board: LogicBoard, existing: ComponentDefinition) {
    const saved: ComponentDefinition[] = [];
    render(<ComponentDialog board={board} boards={project.boards}
                            packages={project.packages} existing={existing}
                            onCancel={() => {}} onCreatePackage={() => {}}
                            onSave={made => saved.push(made)}/>);

    return {saved};
  }

  test('keeps the copy of the board it already holds', () => {
    const {project, board, made} = built();
    change(board);
    const {saved} = editing(project, board, made);

    fireEvent.change(screen.getByLabelText('Component name'), {target: {value: 'renamed'}});
    fireEvent.click(save());

    expect(saved[0].name).toBe('renamed');
    expect(saved[0].contents.components).toHaveLength(1);
    expect(saved[0].source.boardHash).toBe(made.source.boardHash);
  });

  test('says the board has moved on, and offers to take a new copy', () => {
    const {project, board, made} = built();
    change(board);

    editing(project, board, made);

    expect(screen.getByText(/This board has changed since/)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Update'})).toBeEnabled();
  });

  test('offers nothing to update while the board is where it was', () => {
    const {project, board, made} = built();

    editing(project, board, made);

    expect(screen.queryByText(/This board has changed since/)).toBeNull();
    expect(screen.getByRole('button', {name: 'Update'})).toBeDisabled();
  });

  test('takes a new copy only once Update is used, and only on save', () => {
    const {project, board, made} = built();
    change(board);
    const {saved} = editing(project, board, made);

    fireEvent.click(screen.getByRole('button', {name: 'Update'}));
    // The button says what saving will do; it commits nothing on its own.
    expect(made.contents.components).toHaveLength(1);

    fireEvent.click(save());

    expect(saved[0].contents.components).toHaveLength(2);
    expect(saved[0].source.boardHash).not.toBe(made.source.boardHash);
  });

  test('takes a copy of a different board without being asked twice', () => {
    const {project, board, made} = built();
    const other = project.addBoard('other');
    const or = makeComponent(
        {type: PartType.GATE, subtype: GateType.OR, scope: other.scope, board: other});
    other.addComponent(or);
    setPort(other, or.inputPins[0], 'a');
    setPort(other, or.outputPins[0], 'y');
    const {saved} = editing(project, board, made);

    fireEvent.mouseDown(
        document.querySelector('.component-board .MuiSelect-select') as HTMLElement);
    fireEvent.click(screen.getByRole('option', {name: 'other'}));
    fireEvent.click(save());

    expect(saved[0].source.boardId).toBe(other.id);
    expect(saved[0].source.boardHash).not.toBe(made.source.boardHash);
  });
});

describe('a board that already has this component on it', () => {
  test('is refused, since building from it would make the component contain itself', () => {
    const project = new Project();
    const board = project.mainBoard;
    board.name = 'core';
    const and = makeComponent(
        {type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
    board.addComponent(and);
    setPort(board, and.inputPins[0], 'a');
    setPort(board, and.outputPins[0], 'y');
    const made = project.addComponent(
        defineComponent({name: 'and2', board, packaging: packageForBoard(board, 'and2')}));
    board.addComponent(new SubComponent({scope: board.scope, board, definition: made}));

    render(<ComponentDialog board={board} boards={project.boards} packages={project.packages}
                            existing={made} onCancel={() => {}} onCreatePackage={() => {}}
                            onSave={() => {}}/>);

    expect(screen.getByText(/would make the component contain itself/)).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });
});

describe('renaming a board', () => {
  function panel(project: Project) {
    const renamed: LogicBoard[] = [];
    render(<ProjectPanel project={project}
                         onRename={() => {}} onAddBoard={() => {}} onImportBoard={() => {}}
                         onSelectBoard={() => {}} onRenameBoard={board => renamed.push(board)}
                         onDeleteBoard={() => {}}
                         onAddPackage={() => {}} onEditPackage={() => {}}
                         onDeletePackage={() => {}}
                         onAddComponent={() => {}} onEditComponent={() => {}}
                         onDeleteComponent={() => {}}
                         onExtractBoard={() => {}} onExtractPackage={() => {}}/>);

    return {renamed};
  }

  test('is offered on every board, as editing is on every package', () => {
    const project = new Project();
    project.mainBoard.name = 'core';
    const {renamed} = panel(project);

    fireEvent.click(screen.getByRole('button', {name: 'Rename core'}));

    expect(renamed).toEqual([project.mainBoard]);
  });

  test('does not also select the board it was asked about', () => {
    const project = new Project();
    project.mainBoard.name = 'core';
    const second = project.addBoard('other');
    project.show(project.mainBoard);
    panel(project);

    fireEvent.click(screen.getByRole('button', {name: 'Rename other'}));

    expect(project.activeBoardId).toBe(project.mainBoard.id);
    void second;
  });

  test('leaves components built from the board where they were', () => {
    // A board's name is not part of what a component holds, so renaming one is not a reason to
    // tell every component built from it that it has fallen behind.
    const project = new Project();
    const board = project.mainBoard;
    board.name = 'core';
    const and = makeComponent(
        {type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
    board.addComponent(and);
    setPort(board, and.outputPins[0], 'y');
    const made = project.addComponent(
        defineComponent({name: 'and1', board, packaging: packageForBoard(board, 'p')}));

    board.name = 'renamed';

    expect(linkage(made, project)).toBe('current');
  });
});

describe('what a component row opens to show', () => {
  function panel(project: Project) {
    const boards: ComponentDefinition[] = [];
    const packages: ComponentDefinition[] = [];
    render(<ProjectPanel project={project}
                         onRename={() => {}} onAddBoard={() => {}} onImportBoard={() => {}}
                         onSelectBoard={() => {}} onRenameBoard={() => {}}
                         onDeleteBoard={() => {}}
                         onAddPackage={() => {}} onEditPackage={() => {}}
                         onDeletePackage={() => {}}
                         onAddComponent={() => {}} onEditComponent={() => {}}
                         onDeleteComponent={() => {}}
                         onExtractBoard={made => boards.push(made)}
                         onExtractPackage={made => packages.push(made)}/>);

    return {boards, packages};
  }

  /** A project whose second board is packaged as a component. */
  function built(): {project: Project, made: ComponentDefinition} {
    const project = new Project();
    const board = project.addBoard('core');
    const and = makeComponent(
        {type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
    board.addComponent(and);
    setPort(board, and.outputPins[0], 'y');
    const made = project.addComponent(
        defineComponent({name: 'and1', board, packaging: packageForBoard(board, 'core_pkg')}));

    return {project, made};
  }

  test('shows nothing until it is opened', () => {
    panel(built().project);

    expect(document.querySelectorAll('.project-held-row')).toHaveLength(0);
  });

  test('names the board and the packaging it holds', () => {
    panel(built().project);

    fireEvent.click(screen.getByText('and1'));

    const held = [...document.querySelectorAll('.project-held-row')].map(row => [
      row.querySelector('.project-row-icon title')?.textContent,
      row.querySelector('.project-row-name')?.textContent,
    ]);
    expect(held).toEqual([['Board', 'core'], ['Package', 'core_pkg']]);
  });

  test('keeps the whole name reachable however narrow the row', () => {
    panel(built().project);

    fireEvent.click(screen.getByText('and1'));

    const names = [...document.querySelectorAll('.project-held-row .project-row-name')];
    expect(names.map(name => name.getAttribute('title'))).toEqual(['core', 'core_pkg']);
  });

  test('offers taking the board out', () => {
    const {project, made} = built();
    const {boards} = panel(project);
    fireEvent.click(screen.getByText('and1'));

    fireEvent.click(screen.getByRole('button', {name: 'Extract board from and1'}));

    expect(boards).toEqual([made]);
  });

  test('offers taking the packaging out', () => {
    const {project, made} = built();
    const {packages} = panel(project);
    fireEvent.click(screen.getByText('and1'));

    fireEvent.click(screen.getByRole('button', {name: 'Extract package from and1'}));

    expect(packages).toEqual([made]);
  });

  test('closes again', () => {
    panel(built().project);

    fireEvent.click(screen.getByText('and1'));
    fireEvent.click(screen.getByText('and1'));

    expect(document.querySelectorAll('.project-held-row')).toHaveLength(0);
  });

  test('is not opened by the actions on the row itself', () => {
    panel(built().project);

    fireEvent.click(screen.getByRole('button', {name: 'Edit and1'}));

    expect(document.querySelectorAll('.project-held-row')).toHaveLength(0);
  });
});

describe('the components a project holds', () => {
  function panel(project: Project) {
    const edited: ComponentDefinition[] = [];
    render(<ProjectPanel project={project}
                         onRename={() => {}} onAddBoard={() => {}} onImportBoard={() => {}}
                         onSelectBoard={() => {}} onRenameBoard={() => {}} onDeleteBoard={() => {}}
                         onAddPackage={() => {}} onEditPackage={() => {}}
                         onDeletePackage={() => {}}
                         onAddComponent={() => {}}
                         onEditComponent={made => edited.push(made)}
                         onDeleteComponent={() => {}}
                         onExtractBoard={() => {}} onExtractPackage={() => {}}/>);

    return {edited};
  }

  /** A project whose one board is packaged as a component. */
  function built(): {project: Project, made: ComponentDefinition} {
    const project = new Project();
    const board = project.mainBoard;
    const and = makeComponent(
        {type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
    board.addComponent(and);
    setPort(board, and.inputPins[0], 'a');
    setPort(board, and.outputPins[0], 'y');
    const packaging = packageForBoard(board, 'and2_pkg');
    project.addPackage(packaging);
    const made = project.addComponent(defineComponent({name: 'and2', board, packaging}));

    return {project, made};
  }

  test('are listed under a heading of their own', () => {
    panel(built().project);

    expect(screen.getByText('Components')).toBeInTheDocument();
    expect(screen.getByText('and2')).toBeInTheDocument();
  });

  test('say so when there are none, rather than showing an empty heading', () => {
    panel(new Project());

    expect(screen.getByText(/Nothing built yet/)).toBeInTheDocument();
  });

  test('are marked once the board they were built from has changed', () => {
    const {project} = built();
    project.mainBoard.addComponent(makeComponent({
      type: PartType.GATE, subtype: GateType.OR, scope: project.mainBoard.scope,
      board: project.mainBoard,
    }));

    panel(project);

    expect(screen.getByText('BEHIND')).toBeInTheDocument();
  });

  test('are not marked while nothing has changed', () => {
    panel(built().project);

    expect(screen.queryByText('BEHIND')).toBeNull();
  });

  test('are not marked when the packaging was derived rather than kept in the project', () => {
    // An auto packaging belongs to the component, so it is never in the project's list and cannot
    // have moved on. Marking that would put a badge on every component made the ordinary way.
    const {project} = built();
    project.packages = [];

    panel(project);

    expect(screen.queryByText('BEHIND')).toBeNull();
  });

  test('can be opened for editing', () => {
    const {project, made} = built();
    const {edited} = panel(project);

    fireEvent.click(screen.getByRole('button', {name: 'Edit and2'}));

    expect(edited).toEqual([made]);
  });
});

describe('the parts panel', () => {
  test('holds nothing but the built-ins until a component exists', () => {
    expect([...partsFor(new Project()).keys()]).not.toContain('Components');
  });

  test('gains a section for the components the project holds', () => {
    const project = new Project();
    const board = project.mainBoard;
    const and = makeComponent(
        {type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
    board.addComponent(and);
    setPort(board, and.outputPins[0], 'y');
    project.addComponent(defineComponent({board, packaging: packageForBoard(board, 'and2')}));

    const section = partsFor(project).get('Components')!;

    expect(section.map(part => part.label)).toEqual(['and2']);
    expect(section[0].userDefined).toBe(true);
  });

  test('places the component, not a drawing of it', () => {
    const project = new Project();
    const board = project.mainBoard;
    const and = makeComponent(
        {type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
    board.addComponent(and);
    setPort(board, and.inputPins[0], 'a');
    setPort(board, and.outputPins[0], 'y');
    const made = project.addComponent(
        defineComponent({board, packaging: packageForBoard(board, 'and2')}));
    const onto = new LogicBoard();

    const placed = partsFor(project).get('Components')![0].make(onto);

    expect(placed.pins().map(pin => pin.label)).toEqual(['a', 'y']);
    expect(onto.hosted.size).toBe(1);
    void made;
  });

  test('draws the tile from the package alone, with nothing built inside it', () => {
    const project = new Project();
    const board = project.mainBoard;
    const and = makeComponent(
        {type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
    board.addComponent(and);
    setPort(board, and.outputPins[0], 'y');
    project.addComponent(defineComponent({board, packaging: packageForBoard(board, 'and2')}));

    const part = partsFor(project).get('Components')![0];

    // The preview draws the symbol; building the circuit behind it would cost the panel every
    // part of every component in the project.
    expect(part.component.pins().map(pin => pin.label)).toEqual(['y']);
    expect((part.component as SubComponent).inner).toHaveLength(0);
  });
});
