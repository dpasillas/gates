import React from 'react';
import { render } from '@testing-library/react';
import Board from './Board';
import LogicBoard from '../logic/LogicBoard';

/** Captures the observer callback so a resize can be delivered on demand. */
let notifyResize: ((entries: ResizeObserverEntry[]) => void) | undefined;

const { ResizeObserver } = window;

beforeEach(() => {
  notifyResize = undefined;
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = vi.fn().mockImplementation(function (cb: (entries: ResizeObserverEntry[]) => void) {
    notifyResize = cb;
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

/** Renders a board and gives it a known viewport, which the rulers are measured against. */
function renderSizedBoard(width: number, height: number) {
  const logicBoard = new LogicBoard();
  const { container } = render(<Board board={logicBoard} />);

  notifyResize?.([{ contentRect: { width, height } } as ResizeObserverEntry]);

  return { container, logicBoard };
}

describe('tickStep', () => {
  test('only ever returns 1, 2, or 5 times a power of ten', () => {
    for (let unitsPerPixel = 0.001; unitsPerPixel < 100; unitsPerPixel *= 1.1) {
      const step = Board.tickStep(unitsPerPixel);
      const magnitude = Math.pow(10, Math.round(Math.log10(step)));

      expect([1, 2, 5, 10]).toContain(Math.round(step / magnitude) || Math.round(step / (magnitude / 10)));
    }
  });

  test('keeps labeled ticks near the target spacing at any zoom', () => {
    for (let unitsPerPixel = 0.01; unitsPerPixel < 100; unitsPerPixel *= 1.3) {
      const spacing = Board.tickStep(unitsPerPixel) / unitsPerPixel;

      // 80px is the target; the 1/2/5 sequence can never be more than a factor of two off.
      expect(spacing).toBeGreaterThanOrEqual(40);
      expect(spacing).toBeLessThanOrEqual(160);
    }
  });

  test('grows as the board is zoomed out', () => {
    expect(Board.tickStep(0.1)).toBeLessThan(Board.tickStep(10));
  });
});

describe('formatTick', () => {
  test('adds only as much precision as the step requires', () => {
    expect(Board.formatTick(200, 100)).toBe('200');
    expect(Board.formatTick(0.25, 0.1)).toBe('0.3');
    expect(Board.formatTick(0.25, 0.01)).toBe('0.25');
  });

  test('renders the origin as 0 rather than -0', () => {
    expect(Board.formatTick(-1e-13, 10)).toBe('0');
    expect(Board.formatTick(0, 10)).toBe('0');
  });

  test('keeps the sign on negative coordinates', () => {
    expect(Board.formatTick(-400, 100)).toBe('-400');
  });
});

describe('axes', () => {
  test('span the viewBox and cross at the origin', () => {
    const { container, logicBoard } = renderSizedBoard(800, 600);
    const { left, top, width, height } = logicBoard.viewBox;

    const axes = [...container.querySelectorAll('.axis')].map((a) => a.getAttribute('d'));
    expect(axes).toEqual([
      `M ${left} 0 H ${left + width}`,
      `M 0 ${top} V ${top + height}`,
    ]);

    const origin = container.querySelector('.origin');
    expect(origin?.getAttribute('cx')).toBe('0');
    expect(origin?.getAttribute('cy')).toBe('0');
  });
});

describe('rulers', () => {
  test('are not drawn before the board has been measured', () => {
    const logicBoard = new LogicBoard();
    const { container } = render(<Board board={logicBoard} />);

    expect(container.querySelector('.rulers')).toBeNull();
  });

  test('label ticks with board coordinates once measured', () => {
    const { container } = renderSizedBoard(800, 600);

    expect(container.querySelector('.rulers')).not.toBeNull();

    // A default 800x600 viewBox over an 800x600 viewport is 1:1, so ticks land every 100 units.
    const labels = [...container.querySelectorAll('.ruler-label')].map((t) => t.textContent);
    expect(labels).toContain('100');
    expect(labels).toContain('500');
  });

  test('track the viewBox when the board is panned', () => {
    const { container, logicBoard } = renderSizedBoard(800, 600);

    logicBoard.viewBox = { left: -400, top: -300, width: 800, height: 600 };
    notifyResize?.([{ contentRect: { width: 800, height: 600 } } as ResizeObserverEntry]);

    const labels = [...container.querySelectorAll('.ruler-label')].map((t) => t.textContent);
    expect(labels).toContain('-300');
    expect(labels).toContain('0');
  });

  test('are drawn outside the board svg, so they overlay it', () => {
    const { container } = renderSizedBoard(800, 600);

    // The rulers are siblings of the inner (viewBox) svg rather than children, which is what keeps
    // their geometry in screen pixels. Their pointer-events are handled by `.rulers` in Board.css.
    const rulers = container.querySelector('.rulers');
    expect(rulers?.parentElement?.classList.contains('board-wrapper')).toBe(true);
    expect(rulers?.previousElementSibling?.classList.contains('board')).toBe(true);
  });
});
