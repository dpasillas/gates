import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {Toolbar} from './Toolbar';
import {buildMenus} from './menus';
import {LogicBoard} from '../logic/LogicBoard';
import {MenuCommands} from './menus';
import {WireStyle} from '../util/wireStyle';

function commands(overrides: Partial<MenuCommands> = {}): MenuCommands {
  return {
    newProject: () => {}, openProject: () => {}, save: () => {}, saveAs: () => {},
    exportBoard: () => {}, exportProject: () => {}, importBoard: () => {}, importProject: () => {},
    wireStyle: 'bezier' as WireStyle, setWireStyle: () => {},
    highlightPorts: false, toggleHighlightPorts: () => {},
    ...overrides,
  };
}

function viewItem(spec: MenuCommands, label: string) {
  const view = buildMenus(spec).find(menu => menu.label === 'View')!;

  return view.items.find(item => item.label === label);
}

describe('the Highlight Ports menu item', () => {
  test('is offered, rather than sitting there disabled like the unbuilt ones', () => {
    expect(viewItem(commands(), 'Highlight Ports')?.run).toBeDefined();
  });

  test('shows a check when ports are being highlighted', () => {
    expect(viewItem(commands({highlightPorts: true}), 'Highlight Ports')?.checked).toBe(true);
    expect(viewItem(commands({highlightPorts: false}), 'Highlight Ports')?.checked).toBe(false);
  });

  test('runs the toggle when picked', () => {
    let toggled = 0;

    viewItem(commands({toggleHighlightPorts: () => {toggled++}}), 'Highlight Ports')?.run?.();

    expect(toggled).toBe(1);
  });
});

describe('the Highlight Ports toolbar button', () => {
  function renderToolbar(board: LogicBoard, onToggle = () => {}) {
    render(<Toolbar board={board} onSave={() => {}} onToggleHighlightPorts={onToggle}/>);

    return screen.getByRole('button', {name: /Highlight ports/i});
  }

  test('says whether ports are being highlighted', () => {
    const board = new LogicBoard();

    board.highlightPorts = true;
    expect(renderToolbar(board).getAttribute('aria-pressed')).toBe('true');
  });

  test('says when they are not', () => {
    const board = new LogicBoard();

    board.highlightPorts = false;
    expect(renderToolbar(board).getAttribute('aria-pressed')).toBe('false');
  });

  test('asks for the toggle when clicked', () => {
    const board = new LogicBoard();
    let toggled = 0;

    fireEvent.click(renderToolbar(board, () => {toggled++}));

    expect(toggled).toBe(1);
  });
});
