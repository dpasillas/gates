import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {App} from './App';

const { ResizeObserver } = window;

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = vi.fn().mockImplementation(function () {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  });

});

afterEach(() => {
  window.ResizeObserver = ResizeObserver;
  vi.restoreAllMocks();
});

/** Opens a top-level menu and hands back the item with the given label. */
function itemIn(menu: string, label: string): HTMLElement {
  fireEvent.click(screen.getByRole('button', {name: menu}));

  // Found by its own label rather than by the item's name, which also carries the shortcut, and
  // would match Save As and Save Image alongside Save.
  return screen.getByText(label).closest('[role="menuitem"]') as HTMLElement;
}

describe('the app', () => {
  test('offers the menus above the board', () => {
    render(<App/>);

    for (const menu of ['File', 'Edit', 'View']) {
      expect(screen.getByRole('button', {name: menu})).toBeInTheDocument();
    }
  });

  test('names what is being worked on', () => {
    const {container} = render(<App/>);

    expect(container.querySelector('.menu-title')?.textContent).toMatch(/Untitled Project/);
  });

  test('offers saving from the toolbar as well as the menu', () => {
    render(<App/>);

    expect(screen.getByRole('button', {name: 'Save'})).toBeInTheDocument();
  });

  test('lets the file actions that exist be used', () => {
    render(<App/>);

    expect(itemIn('File', 'Save')).not.toHaveAttribute('aria-disabled');
  });

  test('lists the actions that do not exist yet, disabled', () => {
    render(<App/>);

    expect(itemIn('Edit', 'Undo')).toHaveAttribute('aria-disabled', 'true');
  });

  test('offers deleting a selection only while there is one', () => {
    render(<App/>);

    expect(screen.getByRole('button', {name: 'Delete selection'})).toBeDisabled();
    expect(itemIn('Edit', 'Delete Selection')).toHaveAttribute('aria-disabled', 'true');
  });
});
