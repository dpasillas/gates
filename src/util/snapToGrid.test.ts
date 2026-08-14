import {MouseManager} from './MouseManager';
import {MouseEventMapping} from './MouseEventMapping';
import {nextSnapMode, snapModeLabel, snapTo, SNAP_SIZES, SnapMode} from './grid';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicComponent} from '../logic/LogicComponent';
import {makeComponent} from '../logic/componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

const VIEWPORT = {width: 800, height: 600};

function mouseEvent(button: number, x: number, y: number) {
  return {
    button, clientX: x, clientY: y, altKey: false,
    preventDefault: () => {}, stopPropagation: () => {}, getModifierState: () => false,
  } as unknown as MouseEvent;
}

/** A board whose viewBox matches the viewport, so screen coordinates are board coordinates. */
function setup(mode: SnapMode) {
  const board = new LogicBoard();
  board.viewBox = {left: 0, top: 0, width: VIEWPORT.width, height: VIEWPORT.height};
  board.snapMode = mode;

  const manager = new MouseManager();
  manager.getViewCoordinates = (e): MouseEventMapping => {
    const rx = (e as MouseEvent).clientX / VIEWPORT.width;
    const ry = (e as MouseEvent).clientY / VIEWPORT.height;
    const {left, top, width, height} = board.viewBox;

    return {x: left + rx * width, y: top + ry * height, rx, ry, dx: 0, dy: 0};
  };

  return {board, manager};
}

function place(board: LogicBoard, x: number, y: number): LogicComponent {
  const component = makeComponent({
    type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board,
  });
  component.geometry.position = new board.scope.Point(x, y);
  board.addComponent(component);

  return component;
}

function at(component: LogicComponent): [number, number] {
  const {x, y} = component.geometry.position;

  return [x, y];
}

/**
 * Checks where a component ended up.
 *
 * Approximately, because mapping the pointer through the viewBox and back is not exact, so a drag
 * that follows the pointer lands a fraction of a millionth of a unit off.
 */
function expectAt(component: LogicComponent, [x, y]: [number, number]) {
  const position = at(component);
  expect(position[0]).toBeCloseTo(x);
  expect(position[1]).toBeCloseTo(y);
}

/** Picks a component up at its own centre and carries the pointer through each given position. */
function drag(manager: MouseManager, board: LogicBoard, component: LogicComponent,
    through: Array<[number, number]>) {
  const [x, y] = at(component);
  manager.handleGateMouseDown(board, component, mouseEvent(0, x, y));
  for (const [px, py] of through) {
    manager.handleMouseMoveDrag(board, mouseEvent(0, px, py));
  }
  manager.handleMouseUp(board, mouseEvent(0, ...(through[through.length - 1] ?? [x, y])));
}

const FINE = SNAP_SIZES.fine;
const COARSE = SNAP_SIZES.coarse;

describe('snapping a coordinate', () => {
  test('goes to the nearest grid position', () => {
    expect(snapTo(0, FINE)).toBe(0);
    expect(snapTo(4, FINE)).toBe(0);
    expect(snapTo(6, FINE)).toBe(10);
    expect(snapTo(123, FINE)).toBe(120);
    expect(snapTo(127, FINE)).toBe(130);
  });

  test('works below the origin', () => {
    expect(snapTo(-4, FINE)).toBe(0);
    expect(snapTo(-6, FINE)).toBe(-10);
    expect(snapTo(-123, FINE)).toBe(-120);
  });

  test('leaves a position already on the grid where it is', () => {
    expect(snapTo(FINE * 7, FINE)).toBe(FINE * 7);
  });

  test('takes the coarse spacing where the fine one would have stopped sooner', () => {
    expect(snapTo(123, COARSE)).toBe(120);
    expect(snapTo(141, COARSE)).toBe(160);
    expect(snapTo(30, COARSE)).toBe(40);
    // The fine grid has a position at 30, the coarse one does not.
    expect(snapTo(30, FINE)).toBe(30);
  });

  test('leaves the coordinate alone when there is no grid', () => {
    expect(snapTo(123.456, 0)).toBe(123.456);
    expect(snapTo(-7.5, 0)).toBe(-7.5);
  });
});

describe('the modes the button steps through', () => {
  test('cycle off, fine, coarse and back', () => {
    expect(nextSnapMode('off')).toBe('fine');
    expect(nextSnapMode('fine')).toBe('coarse');
    expect(nextSnapMode('coarse')).toBe('off');
  });

  test('are described by their spacing, except off, which has none to describe', () => {
    expect(snapModeLabel('fine')).toContain(String(SNAP_SIZES.fine));
    expect(snapModeLabel('coarse')).toContain(String(SNAP_SIZES.coarse));
    expect(snapModeLabel('off')).toBe('off');
  });

  test('give the board a size to place on, or none', () => {
    const board = new LogicBoard();

    board.snapMode = 'off';
    expect(board.snapSize).toBe(0);
    board.snapMode = 'fine';
    expect(board.snapSize).toBe(SNAP_SIZES.fine);
    board.snapMode = 'coarse';
    expect(board.snapSize).toBe(SNAP_SIZES.coarse);
  });
});

describe('dragging with snapping off', () => {
  test('puts the component exactly where the pointer went', () => {
    const {board, manager} = setup('off');
    const gate = place(board, 103, 207);

    drag(manager, board, gate, [[110, 214]]);

    expectAt(gate, [110, 214]);
  });

  test('follows the pointer through a run of small moves', () => {
    const {board, manager} = setup('off');
    const gate = place(board, 100, 100);

    drag(manager, board, gate, [[102, 100], [104, 100], [107, 100], [111, 100]]);

    expectAt(gate, [111, 100]);
  });
});

describe('dragging with snapping on', () => {
  test('lands the component on the grid', () => {
    const {board, manager} = setup('fine');
    const gate = place(board, 100, 100);

    drag(manager, board, gate, [[123, 147]]);

    expectAt(gate, [120, 150]);
  });

  test('lands on the grid even when it started off it', () => {
    const {board, manager} = setup('fine');
    const gate = place(board, 103, 207);

    drag(manager, board, gate, [[143, 247]]);

    expectAt(gate, [140, 250]);
  });

  test('stays put while the pointer moves less than half a grid step', () => {
    const {board, manager} = setup('fine');
    const gate = place(board, 100, 100);

    drag(manager, board, gate, [[104, 103]]);

    expectAt(gate, [100, 100]);
  });

  test('moves once a run of small steps adds up, rather than rounding each away', () => {
    // Measuring a drag from the previous position of the pointer rather than from where it was
    // grabbed loses every move too small to reach the next grid position. Carried far enough in
    // small enough steps, the component would never move at all.
    const {board, manager} = setup('fine');
    const gate = place(board, 100, 100);

    drag(manager, board, gate, [[102, 100], [104, 100], [106, 100], [108, 100], [110, 100]]);

    expectAt(gate, [110, 100]);
  });

  test('does not drift away from the pointer over a long drag', () => {
    const {board, manager} = setup('fine');
    const gate = place(board, 100, 100);
    const steps: Array<[number, number]> = [];
    for (let i = 1; i <= 60; i++) {
      steps.push([100 + i * 3, 100]);
    }

    drag(manager, board, gate, steps);

    // The pointer finished at 280, which is a grid position, so the component must be on it.
    expectAt(gate, [280, 100]);
  });

  test('goes back where it started if the pointer returns', () => {
    const {board, manager} = setup('fine');
    const gate = place(board, 100, 100);

    drag(manager, board, gate, [[160, 140], [220, 180], [100, 100]]);

    expectAt(gate, [100, 100]);
  });
});

describe('dragging a group with snapping on', () => {
  test('keeps the components in the same arrangement', () => {
    const {board, manager} = setup('fine');
    const grabbed = place(board, 100, 100);
    const other = place(board, 137, 143);
    board.setSelectedComponents([grabbed, other]);

    drag(manager, board, grabbed, [[123, 147]]);

    // The grabbed one goes to the grid, and the other travels the same distance rather than being
    // snapped on its own, which would have closed the gap between them.
    expectAt(grabbed, [120, 150]);
    expectAt(other, [157, 193]);
  });

  test('moves the whole group off one component reaching the next grid position', () => {
    const {board, manager} = setup('fine');
    const grabbed = place(board, 100, 100);
    const other = place(board, 200, 100);
    board.setSelectedComponents([grabbed, other]);

    drag(manager, board, grabbed, [[104, 100]]);

    expectAt(grabbed, [100, 100]);
    expectAt(other, [200, 100]);
  });
});

describe('dragging on the coarse grid', () => {
  test('lands the component on the wider spacing', () => {
    const {board, manager} = setup('coarse');
    const gate = place(board, 120, 120);

    drag(manager, board, gate, [[143, 167]]);

    expectAt(gate, [160, 160]);
  });

  test('passes over the positions the fine grid would have stopped on', () => {
    const {board, manager} = setup('coarse');
    const gate = place(board, 120, 120);

    // A pointer 10 units along is a whole step on the fine grid and a quarter of one here.
    drag(manager, board, gate, [[130, 120]]);

    expectAt(gate, [120, 120]);
  });
});
