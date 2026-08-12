import React from 'react';
import {render} from '@testing-library/react';

import {Board} from './Board';
import {Part} from './Part';
import {LogicBoard} from '../logic/LogicBoard';
import {SnapMode} from '../util/grid';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

const {ResizeObserver} = window;

/** The size the editor is pretending to be, which jsdom will not work out on its own. */
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

/**
 * Drops a part onto the editor at a point on the page.
 *
 * The part being carried is held statically by Part rather than travelling on the drag, which is
 * how the parts drawer hands it over, so the test does the same.
 */
function drop(board: LogicBoard, at: {x: number, y: number}) {
  board.viewBox = {left: 0, top: 0, width: EDITOR.width, height: EDITOR.height};
  const {container} = render(<Board board={board}/>);
  Part.data = new Part({type: PartType.GATE, subtype: GateType.AND});

  const wrapper = container.querySelector('.board-wrapper')!;
  const event = new MouseEvent('drop', {bubbles: true, cancelable: true}) as unknown as DragEvent;
  Object.defineProperty(event, 'clientX', {value: at.x});
  Object.defineProperty(event, 'clientY', {value: at.y});
  Object.defineProperty(event, 'dataTransfer', {value: {effectAllowed: ''}});
  wrapper.dispatchEvent(event);

  return [...board.components.values()].pop()!;
}

function placedAt(board: LogicBoard, mode: SnapMode, at: {x: number, y: number}) {
  board.snapMode = mode;
  const component = drop(board, at);
  const {x, y} = component.geometry.position;

  return [x, y];
}

describe('a component dropped from the parts drawer', () => {
  test('lands under the pointer when nothing is snapping it', () => {
    expect(placedAt(new LogicBoard(), 'off', {x: 123, y: 147})).toEqual([123, 147]);
  });

  test('lands on the fine grid', () => {
    // Carried onto the board rather than around it, but a component put down off the grid is just
    // as much out of line with its neighbours as one dragged off it.
    expect(placedAt(new LogicBoard(), 'fine', {x: 123, y: 147})).toEqual([120, 150]);
  });

  test('lands on the coarse grid', () => {
    expect(placedAt(new LogicBoard(), 'coarse', {x: 123, y: 147})).toEqual([120, 160]);
  });
});
