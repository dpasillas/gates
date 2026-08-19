import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {App} from './App';
import {ProjectPanel} from './ProjectPanel';
import {PinType} from '../logic/LogicPin';
import {GLOBAL_SCOPE} from '../Constants';
import {PackageComponent} from '../logic/PackageComponent';
import {Project} from '../logic/Project';

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
  vi.restoreAllMocks();
});

function reg8(): PackageComponent {
  const pkg = new PackageComponent({scope: GLOBAL_SCOPE, name: 'reg8_std'});
  [
    {label: 'D', pinType: PinType.INPUT, width: 8},
    {label: 'CLK', pinType: PinType.INPUT, clock: true},
    {label: 'CLR', pinType: PinType.INPUT, not: true},
    {label: 'Q', pinType: PinType.OUTPUT, width: 8},].forEach(pin => pkg.declarePin(pin));

  return pkg;
}

/** The panel on a project holding one package. */
function panel(pkg = reg8()) {
  const project = new Project();
  project.addPackage(pkg);
  const edited: PackageComponent[] = [];
  const deleted: PackageComponent[] = [];
  let added = 0;

  render(<ProjectPanel project={project}
                       onRename={() => {}}
                       onAddBoard={() => {}}
                       onImportBoard={() => {}}
                       onSelectBoard={() => {}}
                       onDeleteBoard={() => {}}
                       onAddPackage={() => {added++}}
                       onEditPackage={made => edited.push(made)}
                       onDeletePackage={made => deleted.push(made)}/>);

  return {project, pkg, edited, deleted, addedCount: () => added};
}

/** The pins shown under the package, as the panel reads them out. */
function pinRows(): string[] {
  return [...document.querySelectorAll('.project-pin-row')]
      .map(row => (row.textContent ?? '').trim());
}

describe('the packages a project holds', () => {
  test('are listed under a heading of their own', () => {
    panel();

    expect(screen.getByText('Packages')).toBeInTheDocument();
    expect(screen.getByText('reg8_std')).toBeInTheDocument();
  });

  test('say how many pins are on them without being opened', () => {
    panel();

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  test('say so when there are none, rather than showing an empty heading', () => {
    render(<ProjectPanel project={new Project()}
                         onRename={() => {}} onAddBoard={() => {}} onImportBoard={() => {}}
                         onSelectBoard={() => {}} onDeleteBoard={() => {}}
                         onAddPackage={() => {}} onEditPackage={() => {}}
                         onDeletePackage={() => {}}/>);

    expect(screen.getByText(/Nothing packaged yet/)).toBeInTheDocument();
  });

  test('offer making one', () => {
    const {addedCount} = panel();

    fireEvent.click(screen.getByRole('button', {name: '+ Package'}));

    expect(addedCount()).toBe(1);
  });
});

describe('opening a package out', () => {
  test('shows nothing until it is asked for', () => {
    panel();

    expect(pinRows()).toEqual([]);
  });

  test('reads out the contract a board would be built to', () => {
    panel();

    fireEvent.click(screen.getByText('reg8_std'));

    expect(pinRows()).toEqual(['inD8-bit', 'inCLKclk', 'inCLRlow', 'outQ8-bit']);
  });

  test('closes again', () => {
    panel();

    fireEvent.click(screen.getByText('reg8_std'));
    fireEvent.click(screen.getByText('reg8_std'));

    expect(pinRows()).toEqual([]);
  });

  test('says so when a package has no pins yet', () => {
    panel(new PackageComponent({scope: GLOBAL_SCOPE, name: 'empty'}));

    fireEvent.click(screen.getByText('empty'));

    expect(screen.getByText('No pins on it yet')).toBeInTheDocument();
  });

  test('marks a pin nobody has named, which is what stops the package', () => {
    const pkg = reg8();
    pkg.declared[0].label = '';
    panel(pkg);

    fireEvent.click(screen.getByText('reg8_std'));

    expect(screen.getByText('unnamed')).toBeInTheDocument();
  });
});

describe('what a package row offers', () => {
  test('editing it', () => {
    const {pkg, edited} = panel();

    fireEvent.click(screen.getByRole('button', {name: 'Edit reg8_std'}));

    expect(edited).toEqual([pkg]);
  });

  test('deleting it', () => {
    const {pkg, deleted} = panel();

    fireEvent.click(screen.getByRole('button', {name: 'Delete reg8_std'}));

    expect(deleted).toEqual([pkg]);
  });

  test('neither of which opens it out, the row being for the package rather than its pins', () => {
    panel();

    fireEvent.click(screen.getByRole('button', {name: 'Edit reg8_std'}));

    expect(pinRows()).toEqual([]);
  });
});

describe('making a package from the panel', () => {
  /** Opens the project panel in the running app. */
  function openPanel() {
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', {name: 'Project'}));
  }

  test('brings up the interface editor', () => {
    openPanel();

    fireEvent.click(screen.getByRole('button', {name: '+ Package'}));

    expect(screen.getByText('Author interface')).toBeInTheDocument();
  });

  test('adds nothing to the project until it is saved', () => {
    openPanel();

    fireEvent.click(screen.getByRole('button', {name: '+ Package'}));
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(screen.getByText(/Nothing packaged yet/)).toBeInTheDocument();
  });

  test('lists what was saved', () => {
    openPanel();

    fireEvent.click(screen.getByRole('button', {name: '+ Package'}));
    fireEvent.change(screen.getByLabelText('Package name'), {target: {value: 'mux2'}});
    fireEvent.click(screen.getByRole('button', {name: 'Add input'}));
    fireEvent.change(screen.getByLabelText('Pin label'), {target: {value: 'a'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save interface'}));

    expect(screen.getByText('mux2')).toBeInTheDocument();
  });

  test('puts an edit back over the package rather than beside it', () => {
    openPanel();
    fireEvent.click(screen.getByRole('button', {name: '+ Package'}));
    fireEvent.click(screen.getByRole('button', {name: 'Add input'}));
    fireEvent.change(screen.getByLabelText('Pin label'), {target: {value: 'a'}});
    fireEvent.change(screen.getByLabelText('Package name'), {target: {value: 'mux2'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save interface'}));

    fireEvent.click(screen.getByRole('button', {name: 'Edit mux2'}));
    fireEvent.change(screen.getByLabelText('Package name'), {target: {value: 'mux4'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save interface'}));

    expect(screen.getByText('mux4')).toBeInTheDocument();
    expect(screen.queryByText('mux2')).toBeNull();
  });
});
