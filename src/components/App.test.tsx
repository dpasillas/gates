import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

/** Adds a board through the tab strip, answering the dialog it puts up. */
function addBoard(name: string) {
  fireEvent.click(screen.getByRole('button', {name: 'New board'}));
  fireEvent.change(screen.getByLabelText('Board name'), {target: {value: name}});
  fireEvent.click(screen.getByRole('button', {name: 'Create'}));
}

function openTabElements(): HTMLElement[] {
  return within(screen.getByRole('tablist', {name: 'Open boards'})).getAllByRole('tab');
}

function openTabs(): string[] {
  return openTabElements().map(tab => tab.textContent ?? '');
}

/** Stands in for the clipboard a drag carries, which jsdom does not provide. */
function transfer() {
  const held: Record<string, string> = {};

  return {
    setData: (type: string, value: string) => {held[type] = value},
    getData: (type: string) => held[type] ?? '',
    get types() {return Object.keys(held)},
    setDragImage: () => {},
    effectAllowed: '',
    dropEffect: '',
  };
}

/**
 * A drag event carrying a clipboard and a pointer position.
 *
 * Built by hand because `dataTransfer` and `clientX` are read-only on the events jsdom constructs,
 * so passing them to fireEvent leaves the handler with neither.
 */
function dragEvent(type: string, dataTransfer: unknown, clientX = 0): Event {
  const event = new Event(type, {bubbles: true, cancelable: true});
  Object.defineProperty(event, 'dataTransfer', {value: dataTransfer});
  Object.defineProperty(event, 'clientX', {value: clientX});

  return event;
}

/** Lays the tabs out a hundred pixels apart, which jsdom will not do on its own. */
function spaceTabs() {
  openTabElements().forEach((tab, i) => {
    vi.spyOn(tab, 'getBoundingClientRect')
        .mockReturnValue({left: i * 100, width: 100} as DOMRect);
  });
}

/** Picks a tab up and lets it go at a position along the row. */
function dragTab(from: number, x: number) {
  const tabs = openTabElements();
  const strip = screen.getByRole('tablist', {name: 'Open boards'});
  const carrying = transfer();

  fireEvent(tabs[from], dragEvent('dragstart', carrying));
  fireEvent(strip, dragEvent('dragover', carrying, x));

  return {
    drop: () => fireEvent(strip, dragEvent('drop', carrying, x)),
  };
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

  test('opens on one board, with a tab for it', () => {
    render(<App/>);

    const tabs = within(screen.getByRole('tablist', {name: 'Open boards'})).getAllByRole('tab');
    expect(tabs).toHaveLength(1);
  });

  test('will not close the only board open', () => {
    render(<App/>);

    expect(screen.queryByRole('button', {name: /^Close /})).not.toBeInTheDocument();
  });

  test('opens a tab for a board that is added', () => {
    render(<App/>);

    addBoard('scratch');

    const tabs = within(screen.getByRole('tablist', {name: 'Open boards'})).getAllByRole('tab');
    expect(tabs.map(tab => tab.textContent)).toEqual(['untitledMAIN', 'scratch']);
  });

  test('offers to delete every board but the main one', () => {
    render(<App/>);

    addBoard('scratch');

    expect(screen.getByRole('button', {name: 'Delete scratch'})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Delete untitled'})).not.toBeInTheDocument();
  });

  test('deleting a board takes its tab with it', () => {
    render(<App/>);
    addBoard('scratch');

    fireEvent.click(screen.getByRole('button', {name: 'Delete scratch'}));

    expect(openTabs()).toEqual(['untitledMAIN']);
  });

  test('a tab dragged to the front of the row lands there', () => {
    render(<App/>);
    addBoard('a');
    addBoard('b');
    spaceTabs();

    dragTab(2, 20).drop();

    expect(openTabs()).toEqual(['b', 'untitledMAIN', 'a']);
  });

  test('a tab dragged past the end of the row lands there', () => {
    render(<App/>);
    addBoard('a');
    addBoard('b');
    spaceTabs();

    dragTab(0, 280).drop();

    expect(openTabs()).toEqual(['a', 'b', 'untitledMAIN']);
  });

  test('the tab being carried leaves the row, and a gap holds its place', () => {
    const {container} = render(<App/>);
    addBoard('a');
    addBoard('b');
    spaceTabs();

    dragTab(2, 20);

    // The gap sits where the tab would land, ahead of the two still in the row.
    const row = [...container.querySelectorAll('.editor-tab-gap, .editor-tab:not(.lifted)')];
    expect(row[0]).toHaveClass('editor-tab-gap');
    expect(row).toHaveLength(3);
    expect(container.querySelectorAll('.editor-tab.lifted')).toHaveLength(1);
  });

  test('the row goes back to itself when the drag is given up', () => {
    const {container} = render(<App/>);
    addBoard('a');
    spaceTabs();

    const tabs = openTabElements();
    dragTab(1, 20);
    fireEvent(tabs[1], dragEvent('dragend', transfer()));

    expect(container.querySelectorAll('.editor-tab-gap')).toHaveLength(0);
    expect(container.querySelectorAll('.editor-tab.lifted')).toHaveLength(0);
    expect(openTabs()).toEqual(['untitledMAIN', 'a']);
  });

  test('something dragged in from elsewhere does not reorder the tabs', () => {
    // A part dragged out of the parts panel crosses the tab strip on its way to the board.
    render(<App/>);
    addBoard('scratch');
    const carrying = transfer();
    carrying.setData('application/x-gates-part', 'AND');

    const strip = screen.getByRole('tablist', {name: 'Open boards'});
    fireEvent(strip, dragEvent('dragover', carrying));
    fireEvent(strip, dragEvent('drop', carrying));

    expect(openTabs()).toEqual(['untitledMAIN', 'scratch']);
  });

  test('shows one board at a time, whichever tab is in front', () => {
    // The editor and the properties panel are both keyed by the board they are showing. Sharing a
    // key left React unable to tell which sibling it was replacing, and the board being switched
    // away from stayed on screen beside its replacement.
    const {container} = render(<App/>);

    addBoard('scratch');

    expect(container.querySelectorAll('svg.board')).toHaveLength(1);
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

  test('offers the editing actions only once there is something to act on', () => {
    render(<App/>);

    for (const action of ['Cut', 'Copy', 'Paste']) {
      expect(screen.getByRole('button', {name: action})).toBeDisabled();
    }

    // Read from one opening of the menu: an open one covers the bar that would open it again.
    fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
    for (const action of ['Cut', 'Copy', 'Paste', 'Duplicate Selection']) {
      expect(screen.getByText(action).closest('[role="menuitem"]'))
          .toHaveAttribute('aria-disabled', 'true');
    }
  });

  test('offers deleting a selection only while there is one', () => {
    render(<App/>);

    expect(screen.getByRole('button', {name: 'Delete selection'})).toBeDisabled();
    expect(itemIn('Edit', 'Delete Selection')).toHaveAttribute('aria-disabled', 'true');
  });
});
