import React from 'react';
import {render} from '@testing-library/react';

import {Board} from './Board';
import {LogicBoard} from '../logic/LogicBoard';

const {ResizeObserver} = window;

/** The size the editor is pretending to be, which jsdom will not work out on its own. */
const EDITOR = {width: 400, height: 300};

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
  vi.restoreAllMocks();
});

/** A board zoomed out, as one the user has scrolled away from would be. */
function zoomed(): LogicBoard {
  const board = new LogicBoard();
  board.viewBox = {left: 0, top: 0, width: 800, height: 600};

  return board;
}

describe('handing the editor a different board', () => {
  test('fits the arriving board to the editor showing it', () => {
    // A board keeps its identity across a save, so reopening the project that is already open
    // swaps the object without rebuilding the editor. Left alone the new board keeps the size it
    // was constructed with, and is drawn and clicked through a region that does not match.
    const first = zoomed();
    const second = zoomed();
    const {rerender} = render(<Board board={first}/>);

    rerender(<Board board={second}/>);

    expect(second.viewBox.width).toBeCloseTo(EDITOR.width);
    expect(second.viewBox.height).toBeCloseTo(EDITOR.height);
  });

  test('keeps where the board was scrolled to', () => {
    const first = zoomed();
    const second = zoomed();
    second.viewBox = {left: 120, top: 40, width: 800, height: 600};
    const {rerender} = render(<Board board={first}/>);

    rerender(<Board board={second}/>);

    expect(second.viewBox.left).toBe(120);
    expect(second.viewBox.top).toBe(40);
  });

  test('starts redrawing the arriving board', () => {
    const first = zoomed();
    const second = zoomed();
    const {rerender} = render(<Board board={first}/>);
    const before = second.update;

    rerender(<Board board={second}/>);

    expect(second.update).not.toBe(before);
  });

  test('stops redrawing the one it let go of', () => {
    const first = zoomed();
    const second = zoomed();
    const {rerender} = render(<Board board={first}/>);
    const wired = first.update;

    rerender(<Board board={second}/>);

    expect(first.update).not.toBe(wired);
  });

  test('leaves the board alone when it is handed the same one again', () => {
    const board = zoomed();
    const {rerender} = render(<Board board={board}/>);
    board.viewBox = {left: 0, top: 0, width: 123, height: 456};

    rerender(<Board board={board}/>);

    expect(board.viewBox.width).toBe(123);
  });
});
