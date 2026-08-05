import {MouseManager} from './MouseManager';
import {LogicBoard} from '../logic/LogicBoard';
import {MouseEventMapping} from './MouseEventMapping';

const VIEWPORT = {width: 800, height: 600};

/** Builds the minimum of a MouseEvent that the board handlers actually read. */
function mouseEvent(button: number, clientX: number, clientY: number) {
  return {
    button,
    clientX,
    clientY,
    altKey: false,
    preventDefault: () => {},
    stopPropagation: () => {},
    getModifierState: () => false,
  } as unknown as MouseEvent;
}

/**
 * Mirrors Board.getViewCoordinates: screen pixels to viewBox coordinates, resolved against
 * whatever the viewBox happens to be at the moment of the call.
 *
 * That last part is what makes this a meaningful test — panning moves the viewBox, so a mapper
 * frozen to the starting frame would hide exactly the bug being guarded against.
 */
function viewCoordinateMapper(board: LogicBoard) {
  return (e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent): MouseEventMapping => {
    const rx = (e as MouseEvent).clientX / VIEWPORT.width;
    const ry = (e as MouseEvent).clientY / VIEWPORT.height;
    const {left, top, width, height} = board.viewBox;

    return {x: left + rx * width, y: top + ry * height, rx, ry, dx: 0, dy: 0};
  };
}

/** Starts a middle-mouse pan and drags through each of the given screen positions. */
function pan(board: LogicBoard, from: [number, number], through: Array<[number, number]>) {
  const manager = new MouseManager();
  manager.getViewCoordinates = viewCoordinateMapper(board);

  manager.handleBoardMouseDown(board, mouseEvent(1, from[0], from[1]));
  for (const [x, y] of through) {
    manager.handleMouseMovePan(board, mouseEvent(1, x, y));
  }

  manager.reset(board);
}

describe('middle-mouse pan', () => {
  test('moves the view exactly as far as the cursor at 1:1 zoom', () => {
    const board = new LogicBoard();
    board.viewBox = {left: 0, top: 0, width: VIEWPORT.width, height: VIEWPORT.height};

    pan(board, [100, 100], [[110, 100], [120, 100], [130, 100], [140, 100]]);

    // The cursor moved 40px right, so the view must move 40 units left. Differencing successive
    // positions in the moving frame produced half of this, in a stutter.
    expect(board.viewBox.left).toBeCloseTo(-40);
    expect(board.viewBox.top).toBeCloseTo(0);
  });

  test('scales the pan with the zoom level', () => {
    const board = new LogicBoard();
    // A viewBox twice the viewport means one screen pixel covers two board units.
    board.viewBox = {left: 0, top: 0, width: VIEWPORT.width * 2, height: VIEWPORT.height * 2};

    pan(board, [100, 100], [[140, 100]]);

    expect(board.viewBox.left).toBeCloseTo(-80);
  });

  test('keeps the grabbed point under the cursor', () => {
    const board = new LogicBoard();
    board.viewBox = {left: 37, top: -12, width: VIEWPORT.width, height: VIEWPORT.height};

    const grabbedBoardX = board.viewBox.left + (250 / VIEWPORT.width) * board.viewBox.width;
    pan(board, [250, 300], [[260, 310], [400, 180], [305, 295]]);

    const finalBoardX = board.viewBox.left + (305 / VIEWPORT.width) * board.viewBox.width;
    expect(finalBoardX).toBeCloseTo(grabbedBoardX);
  });

  test('never reverses direction while the cursor moves one way', () => {
    const board = new LogicBoard();
    board.viewBox = {left: 0, top: 0, width: VIEWPORT.width, height: VIEWPORT.height};

    const manager = new MouseManager();
    manager.getViewCoordinates = viewCoordinateMapper(board);
    manager.handleBoardMouseDown(board, mouseEvent(1, 100, 100));

    // Uneven deltas, as real pointer input produces. The old recurrence dx = ds - dxPrev went
    // negative whenever a step was smaller than the one before it, jerking the view backwards.
    let previousLeft = board.viewBox.left;
    for (const x of [103, 130, 134, 180, 182, 240]) {
      manager.handleMouseMovePan(board, mouseEvent(1, x, 100));
      expect(board.viewBox.left).toBeLessThan(previousLeft);
      previousLeft = board.viewBox.left;
    }

    manager.reset(board);
  });
});
