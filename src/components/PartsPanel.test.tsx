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

  test('is absent until a part has been reached for', () => {
    render(<PartsPanel parts={parts()}/>);

    expect(screen.queryByRole('button', {name: /recent/i})).toBeNull();
  });

  test('holds the parts a drag started from', () => {
    render(<PartsPanel parts={parts()}/>);
    fireEvent.click(section('Gates'));

    drag('OR');

    expect(section('Recent')).toBeInTheDocument();
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
