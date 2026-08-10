import {snapshotBounds, snapshotSize, EMPTY_BOX, PADDING} from './boardSnapshot';
import {LogicBoard} from '../logic/LogicBoard';
import {makeComponent} from '../logic/componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

function place(board: LogicBoard, x: number, y: number) {
  const gate = makeComponent({type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
  gate.geometry.position = new board.scope.Point(x, y);
  board.addComponent(gate);

  return gate;
}

describe('the area a snapshot covers', () => {
  test('holds every component on the board', () => {
    const board = new LogicBoard();
    const left = place(board, 0, 0);
    const right = place(board, 400, 300);

    const bounds = snapshotBounds(board);

    expect(bounds.left).toBeLessThanOrEqual(left.geometry.bounds.left);
    expect(bounds.top).toBeLessThanOrEqual(left.geometry.bounds.top);
    expect(bounds.left + bounds.width).toBeGreaterThanOrEqual(right.geometry.bounds.right);
    expect(bounds.top + bounds.height).toBeGreaterThanOrEqual(right.geometry.bounds.bottom);
  });

  test('leaves room around them', () => {
    const board = new LogicBoard();
    const gate = place(board, 100, 100);

    const bounds = snapshotBounds(board);

    expect(bounds.left).toBeCloseTo(gate.geometry.bounds.left - PADDING);
    expect(bounds.width).toBeCloseTo(gate.geometry.bounds.width + 2 * PADDING);
  });

  test('does not depend on where the user is looking', () => {
    const board = new LogicBoard();
    place(board, 100, 100);
    const before = snapshotBounds(board);

    board.viewBox = {left: 5000, top: 5000, width: 100, height: 100};

    expect(snapshotBounds(board)).toEqual(before);
  });

  test('falls back to something to draw when the board is empty', () => {
    expect(snapshotBounds(new LogicBoard())).toEqual(EMPTY_BOX);
  });
});

describe('the size a snapshot is drawn at', () => {
  test('enlarges a small board rather than leaving it tiny', () => {
    const size = snapshotSize({left: 0, top: 0, width: 100, height: 80});

    expect(size.width).toBe(400);
    expect(size.height).toBe(320);
  });

  test('holds a large board to a preview', () => {
    const size = snapshotSize({left: 0, top: 0, width: 4000, height: 2000});

    expect(size.width).toBe(1200);
    expect(size.height).toBe(600);
  });

  test('keeps the shape of the area it covers', () => {
    const size = snapshotSize({left: 0, top: 0, width: 900, height: 300});

    expect(size.width / size.height).toBeCloseTo(3);
  });

  test('never asks for an image with no pixels in it', () => {
    const size = snapshotSize({left: 0, top: 0, width: 0.1, height: 0.1});

    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});
