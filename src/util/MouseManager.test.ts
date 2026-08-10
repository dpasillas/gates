import {MouseManager} from './MouseManager';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicGate} from '../logic/LogicGate';
import {GateType} from '../enums/GateType';
import {GLOBAL_SCOPE} from '../Constants';
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

/** Board wired with a counter, plus a manager ready to receive interactions. */
function boardWithPanel() {
  const board = new LogicBoard();
  const counter = {notifications: 0};
  board.onPropertiesChanged = () => {counter.notifications++};

  const manager = new MouseManager();
  manager.getViewCoordinates = viewCoordinateMapper(board);

  return {board, manager, counter};
}

function xOf(gate: LogicGate): number {
  return gate.properties().find(p => p.key === 'x')!.value;
}

describe('properties panel notifications', () => {
  test('clicking a component tells the panel', () => {
    // Previously only the rubberband path notified, so a clicked component left the panel blank.
    const {board, manager, counter} = boardWithPanel();
    const gate = new LogicGate({scope: GLOBAL_SCOPE, subtype: GateType.AND});

    manager.handleGateMouseDown(board, gate, mouseEvent(0, 100, 100));

    expect(counter.notifications).toBeGreaterThan(0);
    expect([...board.selectedComponents]).toContain(gate);

    manager.reset(board);
  });

  test('clicking a pin tells the panel', () => {
    const {board, manager, counter} = boardWithPanel();
    const gate = new LogicGate({scope: GLOBAL_SCOPE, subtype: GateType.AND});

    manager.handlePinMouseDown(board, gate.inputPins[0], mouseEvent(0, 100, 100));

    expect(counter.notifications).toBeGreaterThan(0);

    manager.reset(board);
  });

  test('clearing the selection tells the panel', () => {
    const {board, counter} = boardWithPanel();

    board.clearSelection();

    expect(counter.notifications).toBeGreaterThan(0);
  });

  test('dragging tells the panel on every move', () => {
    const {board, manager, counter} = boardWithPanel();
    const gate = new LogicGate({scope: GLOBAL_SCOPE, subtype: GateType.AND});

    manager.handleGateMouseDown(board, gate, mouseEvent(0, 100, 100));
    const afterClick = counter.notifications;

    manager.handleMouseMoveDrag(board, mouseEvent(0, 120, 100));
    manager.handleMouseMoveDrag(board, mouseEvent(0, 140, 100));

    expect(counter.notifications).toBeGreaterThan(afterClick + 1);

    manager.reset(board);
  });

  test('a right-click on a pin does not select it', () => {
    // The context menu handler leaves an existing selection alone when the pin clicked is already
    // part of it. Selecting on the mouse down that precedes the menu made that always true, so a
    // right-click could never replace the selection it was opening the menu for.
    const {board, manager} = boardWithPanel();
    const gate = new LogicGate({scope: GLOBAL_SCOPE, subtype: GateType.AND});

    manager.handlePinMouseDown(board, gate.inputPins[0], mouseEvent(2, 100, 100));

    expect(board.selectedPins.size).toBe(0);

    manager.reset(board);
  });

  test('a right-click on a pin leaves the board ready for the next interaction', () => {
    // It used to start a connection drag, which the manager then treated as still in progress.
    const {board, manager} = boardWithPanel();
    const gate = new LogicGate({scope: GLOBAL_SCOPE, subtype: GateType.AND});

    manager.handlePinMouseDown(board, gate.inputPins[0], mouseEvent(2, 100, 100));
    manager.handleBoardMouseDown(board, mouseEvent(0, 200, 200));

    expect(manager.selectBox).toBeDefined();

    manager.reset(board);
  });

  test('the position it reports follows the drag', () => {
    const {board, manager} = boardWithPanel();
    const gate = new LogicGate({scope: GLOBAL_SCOPE, subtype: GateType.AND});

    manager.handleGateMouseDown(board, gate, mouseEvent(0, 100, 100));
    const start = xOf(gate);
    // The viewBox matches the viewport in these tests, so 40px of cursor travel is 40 board units.
    manager.handleMouseMoveDrag(board, mouseEvent(0, 140, 100));

    expect(xOf(gate)).toBeCloseTo(start + 40);

    manager.reset(board);
  });
});
