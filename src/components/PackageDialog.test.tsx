import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {PackageDialog} from './PackageDialog';
import {PinOrientation, PinType} from '../logic/LogicPin';
import {GLOBAL_SCOPE} from '../Constants';
import {PackageDivider, PackageGroup, PackageShape} from '../enums/Packaging';
import {PackageComponent} from '../logic/PackageComponent';

/** A finished package, so that saving is offered without anything having to be filled in. */
function reg(): PackageComponent {
  const pkg = new PackageComponent({scope: GLOBAL_SCOPE, name: 'reg8'});
  pkg.declarePin({label: 'D', pinType: PinType.INPUT});
  pkg.declarePin({label: 'Q', pinType: PinType.OUTPUT});

  return pkg;
}

/** Opens the dialog, handing back what it saves. */
function open(pkg: PackageComponent) {
  const saved: PackageComponent[] = [];
  let cancelled = false;
  render(<PackageDialog package={pkg}
                        onCancel={() => {cancelled = true}}
                        onSave={made => saved.push(made)}/>);

  return {saved, wasCancelled: () => cancelled};
}

const save = () => screen.getByRole('button', {name: 'Save Package'});
const labelField = () => screen.getByLabelText('Pin label');

/** The pin rows, by the text they show. */
function rows(): string[] {
  return [...document.querySelectorAll('.package-pin-row')]
      .map(row => row.querySelector('.package-pin-name')?.textContent ?? '');
}

/** The rows in one column, so that a pin can be told from the label of the same name on the symbol. */
function rowsIn(kind: 'input' | 'output'): string[] {
  return [...document.querySelectorAll(`.package-pin-column.${kind} .package-pin-name`)]
      .map(name => name.textContent ?? '');
}

/** Picks a pin by clicking its row rather than its label on the symbol. */
function pickRow(name: string) {
  const row = [...document.querySelectorAll('.package-pin-row')]
      .find(candidate => candidate.querySelector('.package-pin-name')?.textContent === name);
  fireEvent.click(row!);
}

describe('authoring a package', () => {
  test('opens on what it was given', () => {
    open(reg());

    expect(screen.getByLabelText('Package name')).toHaveValue('reg8');
    expect(rows()).toEqual(['D', 'Q']);
  });

  test('starts with the first pin in the editor, rather than an empty one', () => {
    open(reg());

    expect(labelField()).toHaveValue('D');
  });

  test('shows the pin picked in the editor', () => {
    open(reg());

    pickRow('Q');

    expect(labelField()).toHaveValue('Q');
  });

  test('draws the package as it is being edited', () => {
    open(reg());

    fireEvent.change(labelField(), {target: {value: 'DIN'}});

    // Read off the symbol itself, which draws pin labels the way a component on a board does.
    expect([...document.querySelectorAll('.package-symbol text')].map(text => text.textContent))
        .toContain('DIN');
  });

  test('renames the package', () => {
    const {saved} = open(reg());

    fireEvent.change(screen.getByLabelText('Package name'), {target: {value: 'reg16'}});
    fireEvent.click(save());

    expect(saved[0].name).toBe('reg16');
  });
});

describe('the pins on it', () => {
  test('are added to the column they were asked for', () => {
    open(reg());

    fireEvent.click(screen.getByRole('button', {name: 'Add output'}));

    expect(rows()).toEqual(['D', 'Q', 'needs label']);
  });

  test('are put straight into the editor, so a new one can be named at once', () => {
    open(reg());

    fireEvent.click(screen.getByRole('button', {name: 'Add input'}));

    expect(labelField()).toHaveValue('');
  });

  test('are taken off again', () => {
    open(reg());

    fireEvent.click(screen.getByRole('button', {name: 'Remove D'}));

    expect(rows()).toEqual(['Q']);
  });

  test('leave the editor showing what is left rather than nothing', () => {
    open(reg());

    fireEvent.click(screen.getByRole('button', {name: 'Remove D'}));

    expect(labelField()).toHaveValue('Q');
  });

  test('leave the editor empty-handed only once there are none', () => {
    open(reg());

    fireEvent.click(screen.getByRole('button', {name: 'Remove D'}));
    fireEvent.click(screen.getByRole('button', {name: 'Remove Q'}));

    expect(screen.getByText('Add a pin, or pick one to edit it.')).toBeInTheDocument();
  });

  test('move between the columns when what the outside does with them changes', () => {
    open(reg());

    fireEvent.click(screen.getByRole('button', {name: 'Output'}));

    expect(rowsIn('input')).toEqual([]);
    expect(rowsIn('output')).toEqual(['D', 'Q']);
  });
});

describe('what a pin carries', () => {
  test('a width, kept to what a bus can hold', () => {
    const {saved} = open(reg());

    fireEvent.change(screen.getByLabelText('Pin width'), {target: {value: '8'}});
    fireEvent.click(save());

    expect(saved[0].declared[0].width).toBe(8);
  });

  test('a width of at least one bit, whatever is typed', () => {
    const {saved} = open(reg());

    fireEvent.change(screen.getByLabelText('Pin width'), {target: {value: '0'}});
    fireEvent.click(save());

    expect(saved[0].declared[0].width).toBe(1);
  });

  test('a bubble, saying it is active low', () => {
    const {saved} = open(reg());

    fireEvent.click(screen.getByLabelText('Bubble on the pin'));
    fireEvent.click(save());

    expect(saved[0].declared[0].not).toBe(true);
  });

  test('the clock mark, which moves rather than multiplying', () => {
    const {saved} = open(reg());

    fireEvent.click(screen.getByLabelText('Clock-edge marker'));
    pickRow('Q');
    fireEvent.click(screen.getByLabelText('Clock-edge marker'));
    fireEvent.click(save());

    expect(saved[0].declared.filter(pin => pin.clock).map(pin => pin.label)).toEqual(['Q']);
  });

  test('the clock mark taken off again', () => {
    const {saved} = open(reg());

    fireEvent.click(screen.getByLabelText('Clock-edge marker'));
    fireEvent.click(screen.getByLabelText('Clock-edge marker'));
    fireEvent.click(save());

    expect(saved[0].clockPin).toBeUndefined();
  });

  test('a heavier label, which the mockup offers beside showing one at all', () => {
    const {saved} = open(reg());

    fireEvent.click(screen.getByRole('button', {name: 'Bold'}));
    fireEvent.click(save());

    expect(saved[0].declared[0].labelBold).toBe(true);
  });

  test('no bolding to ask for while the label is not drawn at all', () => {
    open(reg());

    fireEvent.click(screen.getByLabelText('Show label'));

    expect(screen.getByRole('button', {name: 'Bold'})).toBeDisabled();
  });

  test('whether its label is drawn', () => {
    const {saved} = open(reg());

    fireEvent.click(screen.getByLabelText('Show label'));
    fireEvent.click(save());

    expect(saved[0].declared[0].showLabel).toBe(false);
  });
});

describe('which side of a divider a pin sits on', () => {
  /** The package divided down the middle, with its input pin along the top edge. */
  function divided() {
    const pkg = reg();
    pkg.divider = PackageDivider.VERTICAL;
    pkg.declared[0].orientation = PinOrientation.UP;

    return pkg;
  }

  test('is asked for only where the pin is on an edge the line crosses', () => {
    open(divided());

    expect(screen.getByRole('button', {name: 'Left'})).toBeInTheDocument();

    pickRow('Q');

    expect(screen.queryByRole('button', {name: 'Left'})).toBeNull();
  });

  test('is not asked for at all without a divider', () => {
    const pkg = reg();
    pkg.declared[0].orientation = PinOrientation.UP;
    open(pkg);

    expect(screen.queryByRole('button', {name: 'Left'})).toBeNull();
  });

  test('is named for where the run falls, which depends on the way the line runs', () => {
    const pkg = divided();
    pkg.divider = PackageDivider.HORIZONTAL;
    pkg.declared[0].orientation = PinOrientation.LEFT;
    open(pkg);

    expect(screen.getByRole('button', {name: 'Top'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Bottom'})).toBeInTheDocument();
  });

  test('is carried on the pin, and moves it on the symbol', () => {
    const {saved} = open(divided());
    const anchor = () => document.querySelector('.package-symbol .pin .anchor')!.getAttribute('cx');
    const before = anchor();

    fireEvent.click(screen.getByRole('button', {name: 'Right'}));
    fireEvent.click(save());

    expect(saved[0].declared[0].group).toBe(PackageGroup.SECOND);
    expect(anchor()).not.toBe(before);
  });
});

describe('the clock mark against a slanted edge', () => {
  /** The package as a trapezoid, whose top and bottom edges then slant. */
  function trapezoid() {
    const pkg = reg();
    pkg.shape = PackageShape.TRAPEZOID;
    pkg.facing = PinOrientation.RIGHT;

    return pkg;
  }

  test('is not offered, the chevron having no square edge to point from', () => {
    open(trapezoid());

    fireEvent.click(screen.getByRole('button', {name: 'Top edge'}));

    expect(screen.getByLabelText('Clock-edge marker')).toBeDisabled();
    expect(screen.getByText('(not on a slanted edge)')).toBeInTheDocument();
  });

  test('is still offered on an edge of the same trapezoid that is square', () => {
    open(trapezoid());

    expect(screen.getByLabelText('Clock-edge marker')).toBeEnabled();
  });

  test('is dropped when the pin carrying it is moved onto one', () => {
    const {saved} = open(trapezoid());

    fireEvent.click(screen.getByLabelText('Clock-edge marker'));
    fireEvent.click(screen.getByRole('button', {name: 'Top edge'}));
    fireEvent.click(save());

    expect(saved[0].clockPin).toBeUndefined();
  });

  test('is dropped when the shape changes under it', () => {
    const pkg = reg();
    pkg.declared[0].orientation = PinOrientation.UP;
    const {saved} = open(pkg);

    fireEvent.click(screen.getByLabelText('Clock-edge marker'));
    fireEvent.click(screen.getByRole('button', {name: 'Trapezoid'}));
    fireEvent.click(save());

    expect(saved[0].clockPin).toBeUndefined();
  });
});

describe('saving', () => {
  test('is not offered while a pin has no name, which nothing could bind to', () => {
    const pkg = reg();
    pkg.declared[0].label = '';
    open(pkg);

    expect(save()).toBeDisabled();
    expect(screen.getByText(/1 pin still needs a label/)).toBeInTheDocument();
  });

  test('is not offered for a package with no pins, which is a drawing rather than a contract', () => {
    open(new PackageComponent({scope: GLOBAL_SCOPE, name: 'empty'}));

    expect(save()).toBeDisabled();
  });

  test('is offered once what was wrong is put right', () => {
    const pkg = reg();
    pkg.declared[0].label = '';
    open(pkg);

    fireEvent.change(labelField(), {target: {value: 'D'}});

    expect(save()).toBeEnabled();
  });

  test('hands back the same package, so an edit replaces rather than adds', () => {
    const pkg = reg();
    const {saved} = open(pkg);

    fireEvent.click(save());

    expect(saved[0].uuid).toBe(pkg.uuid);
  });
});

describe('changing your mind', () => {
  test('leaves the package exactly as it was found', () => {
    const pkg = reg();
    const {wasCancelled} = open(pkg);

    fireEvent.change(labelField(), {target: {value: 'DIN'}});
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(wasCancelled()).toBe(true);
    expect(pkg.declared[0].label).toBe('D');
  });

  test('leaves it alone even where a pin was removed', () => {
    const pkg = reg();
    open(pkg);

    fireEvent.click(screen.getByRole('button', {name: 'Remove D'}));
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(pkg.declared.map(pin => pin.label)).toEqual(['D', 'Q']);
  });

  test('does not touch the package even while it is being edited', () => {
    const pkg = reg();
    open(pkg);

    fireEvent.change(screen.getByLabelText('Package name'), {target: {value: 'reg16'}});

    expect(pkg.name).toBe('reg8');
  });
});
