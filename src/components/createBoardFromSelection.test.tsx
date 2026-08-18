import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';

import {App} from './App';
import {Part} from './Part';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

const {ResizeObserver} = window;

/** The size the editor is pretending to be, matching a board's own so a page point is a board point. */
const EDITOR = {width: 800, height: 600};

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = vi.fn().mockImplementation(function () {
    return {observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn()};
  });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    ...EDITOR, left: 0, top: 0, right: EDITOR.width, bottom: EDITOR.height, x: 0, y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  window.ResizeObserver = ResizeObserver;
  Part.data = undefined;
  vi.restoreAllMocks();
});

/** Drops a gate onto the editor, the way the parts drawer hands one over. */
function dropGate(container: HTMLElement, at: {x: number, y: number}) {
  Part.data = new Part({type: PartType.GATE, subtype: GateType.AND});

  const event = new MouseEvent('drop', {bubbles: true, cancelable: true});
  Object.defineProperty(event, 'clientX', {value: at.x});
  Object.defineProperty(event, 'clientY', {value: at.y});
  Object.defineProperty(event, 'dataTransfer', {value: {effectAllowed: ''}});
  container.querySelector('.board-wrapper')!.dispatchEvent(event);
}

/** Drags a rubber band over the whole editor, taking in everything on it. */
function selectAll(container: HTMLElement) {
  const wrapper = container.querySelector('.board-wrapper')!;
  fireEvent.mouseDown(wrapper, {button: 0, clientX: 0, clientY: 0});
  fireEvent.mouseMove(window, {clientX: EDITOR.width, clientY: EDITOR.height});
  fireEvent.mouseUp(window, {button: 0, clientX: EDITOR.width, clientY: EDITOR.height});
}

function itemIn(menu: string, label: string): HTMLElement {
  fireEvent.click(screen.getByRole('button', {name: menu}));

  return screen.getByText(label).closest('[role="menuitem"]') as HTMLElement;
}

function openTabs(): string[] {
  return within(screen.getByRole('tablist', {name: 'Open boards'}))
      .getAllByRole('tab')
      .map(tab => tab.textContent ?? '');
}

const ITEM = 'Create Board from Selection...';

describe('making a board out of the selection, from the menu', () => {
  // Read from one render each: an open menu covers the bar that would open it again, so the two
  // states cannot be looked at in turn.
  test('is not offered while there is nothing selected to make one from', () => {
    render(<App/>);

    expect(itemIn('Edit', ITEM)).toHaveAttribute('aria-disabled', 'true');
  });

  test('is offered once something is selected', () => {
    const {container} = render(<App/>);
    dropGate(container, {x: 100, y: 100});
    selectAll(container);

    expect(itemIn('Edit', ITEM)).not.toHaveAttribute('aria-disabled');
  });

  test('asks what to call it, and opens it under that name', () => {
    const {container} = render(<App/>);
    dropGate(container, {x: 100, y: 100});
    selectAll(container);

    fireEvent.click(itemIn('Edit', ITEM));
    fireEvent.change(screen.getByLabelText('Board name'), {target: {value: 'adder stage'}});
    fireEvent.click(screen.getByRole('button', {name: 'Create'}));

    expect(openTabs()).toContain('adder stage');
    expect(screen.getByRole('tab', {name: 'adder stage'})).toHaveAttribute('aria-selected', 'true');
  });

  test('leaves the board it was taken from alone when the dialog is cancelled', () => {
    const {container} = render(<App/>);
    dropGate(container, {x: 100, y: 100});
    selectAll(container);
    const before = openTabs();

    fireEvent.click(itemIn('Edit', ITEM));
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(openTabs()).toEqual(before);
  });
});
