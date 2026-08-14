import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {Part} from './Part';
import {PartsPanel} from './PartsPanel';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

function gate(subtype: GateType, label: string, userDefined = false) {
  return new Part({type: PartType.GATE, subtype, label, userDefined});
}

/** Two categories, so that filtering has something to narrow away. */
function parts() {
  return new Map<string, Part[]>([
    ['Gates', [gate(GateType.AND, 'AND'), gate(GateType.OR, 'OR'), gate(GateType.NAND, 'NAND')]],
    ['Input', [gate(GateType.BUF, 'Clock')]],
  ]);
}

const section = (label: string) => screen.getByRole('button', {name: new RegExp(label, 'i')});
const filter = () => screen.getByLabelText('Filter parts');

describe('the parts panel', () => {
  test('lists a section per category', () => {
    render(<PartsPanel parts={parts()}/>);

    expect(section('Gates')).toBeInTheDocument();
    expect(section('Input')).toBeInTheDocument();
  });

  test('keeps the parts out of the way until a section is opened', () => {
    render(<PartsPanel parts={parts()}/>);

    expect(screen.queryByText('AND')).toBeNull();

    fireEvent.click(section('Gates'));

    expect(screen.getByText('AND')).toBeInTheDocument();
    expect(section('Gates')).toHaveAttribute('aria-expanded', 'true');
  });

  test('a filter narrows the parts to those that match', () => {
    render(<PartsPanel parts={parts()}/>);

    fireEvent.change(filter(), {target: {value: 'nan'}});

    expect(screen.getByText('NAND')).toBeInTheDocument();
    expect(screen.queryByText('AND')).toBeNull();
  });

  test('a filter opens the sections it leaves standing', () => {
    // Without this the matches would be found and then hidden behind a closed section.
    render(<PartsPanel parts={parts()}/>);

    fireEvent.change(filter(), {target: {value: 'clock'}});

    expect(screen.getByText('Clock')).toBeInTheDocument();
    expect(screen.queryByText('Gates')).toBeNull();
  });

  test('says so when nothing matches', () => {
    render(<PartsPanel parts={parts()}/>);

    fireEvent.change(filter(), {target: {value: 'zzz'}});

    expect(screen.getByText(/No parts match/)).toBeInTheDocument();
  });

  test('marks a user-defined part', () => {
    const map = new Map<string, Part[]>([['Custom', [gate(GateType.AND, 'RegFile', true)]]]);
    render(<PartsPanel parts={map}/>);

    fireEvent.click(section('Custom'));

    expect(screen.getAllByTitle('User-defined part')).toHaveLength(1);
  });
});

describe('the recent section', () => {
  /** Starts a drag from the named tile, which is what marks a part as recently used. */
  function drag(label: string) {
    fireEvent.dragStart(screen.getByText(label), {
      dataTransfer: {setDragImage: () => {}, setData: () => {}},
    });
  }

  test('is there before any part has been reached for', () => {
    // It used to appear only once it had something in it, so the first drag of a session made it
    // arrive and pushed every section below it down.
    render(<PartsPanel parts={parts()}/>);

    expect(section('Recent')).toBeInTheDocument();
  });

  test('holds the parts a drag started from', () => {
    render(<PartsPanel parts={parts()}/>);
    fireEvent.click(section('Gates'));
    fireEvent.click(section('Recent'));

    drag('OR');

    expect(screen.getAllByText('OR')).toHaveLength(2);
  });

  test('holds a single row of parts', () => {
    render(<PartsPanel parts={parts()}/>);
    fireEvent.click(section('Gates'));
    fireEvent.click(section('Recent'));

    // Four different parts reached for, of which the section keeps the three most recent.
    ['AND', 'OR', 'NAND'].forEach(drag);
    fireEvent.click(section('Input'));
    drag('Clock');

    // Each surviving part appears twice, once in its own section and once here.
    expect(screen.getAllByText('Clock')).toHaveLength(2);
    expect(screen.getAllByText('NAND')).toHaveLength(2);
    expect(screen.getAllByText('OR')).toHaveLength(2);
    // The oldest has been pushed out, leaving it only in its own section.
    expect(screen.getAllByText('AND')).toHaveLength(1);
  });

  test('keeps the height of a full row while it is empty', () => {
    // The part arriving must not move what is below it: that is what pulls a tile out from under
    // the pointer partway through the drag that put it there.
    const {container} = render(<PartsPanel parts={parts()}/>);
    fireEvent.click(section('Recent'));
    expect(container.querySelectorAll('.parts-grid .part')).toHaveLength(1);
    expect(container.querySelector('.part-placeholder')).toBeInTheDocument();

    fireEvent.click(section('Gates'));
    drag('OR');

    // The placeholder gives way to the real tile, one cell for one cell.
    expect(container.querySelector('.parts-grid .part-placeholder')).toBeNull();
    expect(container.querySelectorAll('.parts-grid')[0].querySelectorAll('.part')).toHaveLength(1);
  });

  test('reserves nothing in the other sections', () => {
    const {container} = render(<PartsPanel parts={parts()}/>);

    fireEvent.click(section('Recent'));
    fireEvent.click(section('Gates'));

    // Recent is the first section, and the only one holding a cell open.
    const grids = container.querySelectorAll('.parts-grid');
    expect(grids[0].querySelector('.part-placeholder')).toBeInTheDocument();
    expect(grids[1].querySelector('.part-placeholder')).toBeNull();
  });

  test('gives way to a filter that it does not match', () => {
    render(<PartsPanel parts={parts()}/>);

    fireEvent.change(filter(), {target: {value: 'zzz'}});

    expect(screen.queryByRole('button', {name: /recent/i})).toBeNull();
    expect(screen.getByText(/No parts match/)).toBeInTheDocument();
  });

  test('can be turned off from the options', () => {
    render(<PartsPanel parts={parts()}/>);
    fireEvent.click(section('Gates'));
    drag('OR');
    expect(section('Recent')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Parts panel options'}));
    fireEvent.click(screen.getByRole('menuitemcheckbox', {name: 'Recent'}));

    expect(screen.queryByRole('button', {name: /recent/i})).toBeNull();
  });
});
