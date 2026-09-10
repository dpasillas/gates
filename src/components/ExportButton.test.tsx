import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';

import {ExportButton, HOLD_MS} from './ExportButton';
import {ExportKind} from '../util/exportKind';

/**
 * The export button is modal: a press writes out whatever kind it shows, and the kind is changed
 * from a menu that a held press or a right-click brings up.
 */

function shown(kind: ExportKind = 'board', available: ExportKind[] = ['board', 'project']) {
  const exported: ExportKind[] = [];
  const chosen: ExportKind[] = [];
  render(<ExportButton kind={kind} available={available}
                       onExport={made => exported.push(made)}
                       onChooseKind={made => chosen.push(made)}/>);

  return {exported, chosen, button: screen.getByRole('button', {name: `Export ${kind}`})};
}

const menu = () => screen.queryByRole('menu');

describe('the export button', () => {
  test('writes out the kind it shows when pressed', () => {
    const {button, exported} = shown('project');

    fireEvent.click(button);

    expect(exported).toEqual(['project']);
  });

  test('opens its menu on a right-click, exporting nothing', () => {
    const {button, exported} = shown();

    fireEvent.contextMenu(button);

    expect(menu()).toBeInTheDocument();
    expect(exported).toEqual([]);
  });

  test('lists every kind, ticking the one it shows', () => {
    const {button} = shown('project');

    fireEvent.contextMenu(button);

    const items = screen.getAllByRole('menuitem').map(item => item.textContent);
    expect(items).toEqual(['Export board', 'Export component', 'Export package', 'Export project']);
    expect(screen.getByRole('menuitem', {name: 'Export project'}))
        .toHaveClass('Mui-selected');
  });

  test('greys out the kinds that cannot be written out yet', () => {
    const {button} = shown();

    fireEvent.contextMenu(button);

    expect(screen.getByRole('menuitem', {name: 'Export component'}))
        .toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', {name: 'Export project'}))
        .not.toHaveAttribute('aria-disabled');
  });

  test('changes the kind from the menu without exporting', () => {
    const {button, chosen, exported} = shown();

    fireEvent.contextMenu(button);
    fireEvent.click(screen.getByRole('menuitem', {name: 'Export project'}));

    expect(chosen).toEqual(['project']);
    expect(exported).toEqual([]);
  });

  test('says nothing when the kind chosen is the one already shown', () => {
    const {button, chosen} = shown();

    fireEvent.contextMenu(button);
    fireEvent.click(screen.getByRole('menuitem', {name: 'Export board'}));

    expect(chosen).toEqual([]);
  });
});

describe('holding the export button', () => {
  beforeEach(() => {vi.useFakeTimers()});
  afterEach(() => {vi.useRealTimers()});

  test('opens the menu, and the release that follows exports nothing', () => {
    const {button, exported} = shown();

    fireEvent.pointerDown(button, {button: 0});
    act(() => {vi.advanceTimersByTime(HOLD_MS)});
    fireEvent.pointerUp(button, {button: 0});
    fireEvent.click(button);

    expect(menu()).toBeInTheDocument();
    expect(exported).toEqual([]);
  });

  test('is not what a short press is', () => {
    const {button, exported} = shown();

    fireEvent.pointerDown(button, {button: 0});
    act(() => {vi.advanceTimersByTime(HOLD_MS / 2)});
    fireEvent.pointerUp(button, {button: 0});
    fireEvent.click(button);

    expect(menu()).not.toBeInTheDocument();
    expect(exported).toEqual(['board']);
  });

  test('is forgotten when the pointer leaves before the hold is up', () => {
    const {button} = shown();

    fireEvent.pointerDown(button, {button: 0});
    fireEvent.pointerLeave(button);
    act(() => {vi.advanceTimersByTime(HOLD_MS)});

    expect(menu()).not.toBeInTheDocument();
  });
});
