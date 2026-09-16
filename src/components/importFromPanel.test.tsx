import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {App} from './App';
import {GLOBAL_SCOPE} from '../Constants';
import {LogicBoard} from '../logic/LogicBoard';
import {PinType} from '../logic/LogicPin';
import {PackageComponent} from '../logic/PackageComponent';
import {importExported} from '../storage/exportedFile';
import type {Imported} from '../storage/exportedFile';

vi.mock('../storage/exportedFile', () => ({importExported: vi.fn()}));

/**
 * The project panel's one Import button takes whatever was exported.
 *
 * The file dialog cannot be driven from here, so what it hands back is stood in for; what is
 * tested is that each kind lands in the project where it belongs.
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

/** The app with the project panel open, and the next import answered as given. */
function opened(arrives: Imported | undefined) {
  vi.mocked(importExported).mockResolvedValue(arrives);
  render(<App/>);
  fireEvent.click(screen.getByRole('tab', {name: 'Project'}));
}

const importing = () => fireEvent.click(screen.getByRole('button', {name: 'Import...'}));

describe('the panel\'s Import button', () => {
  test('lands a package among the packages', async () => {
    const pkg = new PackageComponent({scope: GLOBAL_SCOPE, name: 'reg8'});
    pkg.declarePin({label: 'D', pinType: PinType.INPUT});
    opened({kind: 'package', pkg});

    importing();

    expect(await screen.findByText('Added reg8')).toBeInTheDocument();
    expect(screen.getByText('reg8')).toBeInTheDocument();
  });

  test('lands a board among the boards, with a tab of its own', async () => {
    const board = new LogicBoard();
    board.name = 'arrived';
    opened({kind: 'board', board, components: []});

    importing();

    expect(await screen.findByText('Added arrived')).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: /arrived/})).toBeInTheDocument();
  });

  test('does nothing when the file dialog is dismissed', async () => {
    opened(undefined);

    importing();
    await Promise.resolve();

    expect(screen.queryByText(/^Added/)).toBeNull();
  });
});
