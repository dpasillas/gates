import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';

import {App} from './App';
import {ProjectPanel} from './ProjectPanel';
import {GLOBAL_SCOPE} from '../Constants';
import {LogicBoard} from '../logic/LogicBoard';
import {PinType} from '../logic/LogicPin';
import {PackageComponent} from '../logic/PackageComponent';
import {Project} from '../logic/Project';
import {defineComponent} from '../logic/ComponentDefinition';
import type {ComponentDefinition} from '../logic/ComponentDefinition';
import {makeComponent} from '../logic/componentFactory';
import {setPort} from '../logic/nets';
import {packageForBoard} from '../logic/packageFromBoard';
import {exportPackage} from '../storage/packageStore';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

vi.mock('../storage/packageStore', async (importOriginal) => ({
  ...await importOriginal<typeof import('../storage/packageStore')>(),
  exportPackage: vi.fn(async (pkg: PackageComponent) => `${pkg.name}.gtsp.json`),
}));

/**
 * Writing out a component or a package.
 *
 * A board is exported from the editor, where one is always in front. Neither of the other two has
 * such a place, so the toolbar and the menu ask which is meant — while a row in the project panel
 * already knows, and writes its own out without asking.
 */

const {ResizeObserver} = window;

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = vi.fn().mockImplementation(function () {
    return {observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn()};
  });
});

afterEach(() => {
  window.ResizeObserver = ResizeObserver;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function reg8(name = 'reg8'): PackageComponent {
  const pkg = new PackageComponent({scope: GLOBAL_SCOPE, name});
  pkg.declarePin({label: 'D', pinType: PinType.INPUT, width: 8});

  return pkg;
}

function and2(): ComponentDefinition {
  const board = new LogicBoard();
  const and = makeComponent({type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
  board.addComponent(and);
  setPort(board, and.outputPins[0], 'y');

  return defineComponent({name: 'and2', board, packaging: packageForBoard(board, 'and2_pkg')});
}

describe('the export button on a project panel row', () => {
  function panel() {
    const project = new Project();
    project.mainBoard.name = 'top';
    const pkg = project.addPackage(reg8());
    const made = project.addComponent(and2());
    const boards: LogicBoard[] = [];
    const packages: PackageComponent[] = [];
    const components: ComponentDefinition[] = [];

    render(<ProjectPanel project={project}
                         onRename={() => {}} onAddBoard={() => {}} onImport={() => {}}
                         onSelectBoard={() => {}} onRenameBoard={() => {}}
                         onDeleteBoard={() => {}}
                         onAddPackage={() => {}} onEditPackage={() => {}}
                         onDeletePackage={() => {}}
                         onAddComponent={() => {}} onEditComponent={() => {}}
                         onDeleteComponent={() => {}}
                         onExtractBoard={() => {}} onExtractPackage={() => {}}
                         onExportBoard={board => boards.push(board)}
                         onExportPackage={other => packages.push(other)}
                         onExportComponent={other => components.push(other)}/>);

    return {project, pkg, made, boards, packages, components};
  }

  test('writes out the board on that row', () => {
    const {project, boards} = panel();

    fireEvent.click(screen.getByRole('button', {name: 'Export top'}));

    expect(boards).toEqual([project.mainBoard]);
  });

  test('writes out the package on that row', () => {
    const {pkg, packages} = panel();

    fireEvent.click(screen.getByRole('button', {name: 'Export reg8'}));

    expect(packages).toEqual([pkg]);
  });

  test('writes out the component on that row, without opening it', () => {
    const {made, components} = panel();

    fireEvent.click(screen.getByRole('button', {name: 'Export and2'}));

    expect(components).toEqual([made]);
    expect(screen.getByText('and2').closest('[role="button"]'))
        .toHaveAttribute('aria-expanded', 'false');
  });
});

describe('exporting a package from the menu', () => {
  /** Opens a top-level menu, then the submenu under it, and hands back an item there. */
  function itemUnder(menu: string, submenu: string, label: string): HTMLElement {
    fireEvent.click(screen.getByRole('button', {name: menu}));
    fireEvent.click(screen.getByText(submenu).closest('[role="menuitem"]') as HTMLElement);

    return screen.getByText(label).closest('[role="menuitem"]') as HTMLElement;
  }

  /** Makes a package through the panel, since that is the only way into a running app's project. */
  function addPackage(name: string) {
    fireEvent.click(screen.getByRole('button', {name: '+ Package'}));
    fireEvent.change(screen.getByLabelText('Package name'), {target: {value: name}});
    fireEvent.click(screen.getByRole('button', {name: 'Add input'}));
    fireEvent.change(screen.getByLabelText('Pin label'), {target: {value: 'a'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save Package'}));
  }

  test('says so when there is none to export', () => {
    render(<App/>);

    fireEvent.click(itemUnder('File', 'Export', 'Package...'));

    expect(screen.getByText('There are no packages to export')).toBeInTheDocument();
    expect(screen.queryByText('Export Package')).toBeNull();
  });

  test('asks which one, listing every package the project holds', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', {name: 'Project'}));
    addPackage('mux2');
    addPackage('mux4');

    fireEvent.click(itemUnder('File', 'Export', 'Package...'));

    const dialog = screen.getByRole('dialog', {name: 'Export Package'});
    expect(within(dialog).getAllByRole('button').map(item => item.textContent))
        .toEqual(['mux2', 'mux4', 'Cancel', 'Export']);
  });

  test('will not export until one is picked', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', {name: 'Project'}));
    addPackage('mux2');
    addPackage('mux4');

    fireEvent.click(itemUnder('File', 'Export', 'Package...'));

    const dialog = screen.getByRole('dialog', {name: 'Export Package'});
    expect(within(dialog).getByRole('button', {name: 'Export'})).toBeDisabled();
  });

  test('writes out the one picked', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', {name: 'Project'}));
    addPackage('mux2');
    addPackage('mux4');

    fireEvent.click(itemUnder('File', 'Export', 'Package...'));
    const dialog = screen.getByRole('dialog', {name: 'Export Package'});
    fireEvent.click(within(dialog).getByRole('button', {name: 'mux4'}));
    fireEvent.click(within(dialog).getByRole('button', {name: 'Export'}));

    expect(exportPackage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(exportPackage).mock.calls[0][0].name).toBe('mux4');
    expect(screen.queryByRole('dialog', {name: 'Export Package'})).toBeNull();
  });

  test('starts with the only one picked when there is only one', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', {name: 'Project'}));
    addPackage('mux2');

    fireEvent.click(itemUnder('File', 'Export', 'Package...'));

    const dialog = screen.getByRole('dialog', {name: 'Export Package'});
    expect(within(dialog).getByRole('button', {name: 'Export'})).toBeEnabled();
  });
});
