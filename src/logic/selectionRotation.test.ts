import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {LogicGate} from './LogicGate';
import {GateType} from '../enums/GateType';

/** A gate placed at a point on the board and added to the selection. */
function place(board: LogicBoard, x: number, y: number): LogicComponent {
  const gate = new LogicGate({scope: board.scope, subtype: GateType.AND, board});
  gate.geometry.position = new board.scope.Point(x, y);
  board.addComponent(gate);
  board.selectedComponents.add(gate);

  return gate;
}

/** A board with components at the corners of a square, all selected. */
function square() {
  const board = new LogicBoard();
  const components = [
    place(board, 0, 0),
    place(board, 100, 0),
    place(board, 100, 100),
    place(board, 0, 100),
  ];

  return {board, components};
}

function angleOf(component: LogicComponent): number {
  return component.properties().find(p => p.key === 'angle')!.value;
}

describe('rotating a single component', () => {
  test.each([
    // One component is described by how far it has been turned, counted one way round.
    [370, 10],
    [-1, 359],
    [190, 190],
    [-190, 170],
    [180, 180],
    [-180, 180],
    [720, 0],
  ])('an angle of %i reads as %i', (set, shown) => {
    const board = new LogicBoard();
    const gate = place(board, 0, 0);

    gate.angle = set;

    expect(gate.angle).toBeCloseTo(shown);
  });

  test('winds backwards past zero rather than stopping there', () => {
    // The panel treats bounds as a clamp, so an angle bounded below at zero could wind forwards
    // through 360 but not backwards through 0.
    const board = new LogicBoard();
    const gate = place(board, 0, 0);

    gate.angle = -1;

    expect(gate.angle).toBeCloseTo(359);
  });

  test('offers the angle unbounded, so the panel will not stop it wrapping', () => {
    const board = new LogicBoard();
    const angle = place(board, 0, 0).properties().find(p => p.key === 'angle')!;

    expect(angle.min).toBeUndefined();
    expect(angle.max).toBeUndefined();
  });

  test('turns on the spot, without moving', () => {
    const board = new LogicBoard();
    const gate = place(board, 40, 60);

    gate.angle = 90;

    expect(gate.geometry.position.x).toBeCloseTo(40);
    expect(gate.geometry.position.y).toBeCloseTo(60);
  });
});

describe('rotating a selection', () => {
  test('is offered as an amount to turn by, starting at nothing', () => {
    const {board} = square();
    const angle = board.selectionProperties().find(p => p.key === 'angle')!;

    expect(angle.label).toBe('Rotate By');
    expect(angle.value).toBe(0);
    expect(angle.editable).toBe(true);
  });

  test('is offered as a plain angle when only one component is selected', () => {
    const board = new LogicBoard();
    place(board, 0, 0);

    expect(board.selectionProperties().find(p => p.key === 'angle')!.label).toBe('Angle');
  });

  test('swings every component around the shared centre', () => {
    // A square about (50, 50): a quarter turn sends each corner to the next one round.
    const {board, components} = square();

    board.selectionRotation = 90;

    // `|| 0` folds away the negative zero that rounding a hair below the axis produces.
    const corners = components.map(c => [Math.round(c.geometry.position.x) || 0,
                                         Math.round(c.geometry.position.y) || 0]);
    expect(corners).toEqual([[100, 0], [100, 100], [0, 100], [0, 0]]);
  });

  test('turns each component on the spot as well as around the group', () => {
    const {board, components} = square();

    board.selectionRotation = 90;

    expect(components.map(c => Math.round(angleOf(c)))).toEqual([90, 90, 90, 90]);
  });

  test('applies the difference, so repeated edits do not compound', () => {
    const {board, components} = square();

    board.selectionRotation = 30;
    board.selectionRotation = 90;

    expect(components.map(c => Math.round(angleOf(c)))).toEqual([90, 90, 90, 90]);
    expect(Math.round(components[0].geometry.position.x)).toBe(100);
  });

  test('keeps one pivot across repeated turns', () => {
    // Turning a set about the centre of its enclosing circle leaves that centre where it is, so a
    // full turn in steps has to land exactly where it started.
    const {board, components} = square();
    const before = components.map(c => [c.geometry.position.x, c.geometry.position.y]);

    for (let turned = 10; turned <= 360; turned += 10) {
      board.selectionRotation = turned;
    }

    components.forEach((c, i) => {
      expect(c.geometry.position.x).toBeCloseTo(before[i][0], 6);
      expect(c.geometry.position.y).toBeCloseTo(before[i][1], 6);
    });
  });

  test('centres on the enclosing circle, not on where the components crowd', () => {
    // Three components bunched at one end and one far away: the pivot sits midway between the
    // extremes rather than being dragged towards the crowd as an average would be.
    const board = new LogicBoard();
    place(board, 0, 0);
    place(board, 4, 0);
    place(board, 8, 0);
    const far = place(board, 200, 0);

    board.selectionRotation = 180;

    // A half turn about x = 100 sends the far component to where the first one was.
    expect(far.geometry.position.x).toBeCloseTo(0);
  });

  test('reports how far it has turned the short way round', () => {
    const {board} = square();

    board.selectionRotation = 190;

    expect(board.selectionRotation).toBeCloseTo(-170);
  });

  test('keeps winding the same way past half a turn', () => {
    // Nudging up from 180 has to carry on turning, not spin almost all the way back the other way.
    const {board, components} = square();
    board.selectionRotation = 180;
    const before = components[0].geometry.position.clone();

    board.selectionRotation = -179;

    expect(board.selectionRotation).toBeCloseTo(-179);
    // One degree of travel, not 359.
    expect(components[0].geometry.position.getDistance(before)).toBeLessThan(2);
  });

  test('starts counting again from nothing once the selection changes', () => {
    const {board} = square();
    board.selectionRotation = 45;

    board.clearSelection();
    place(board, 300, 300);

    expect(board.selectionRotation).toBe(0);
  });

  test('takes a fresh centre after the selection is moved', () => {
    const {board, components} = square();
    board.selectionRotation = 90;

    // Drag the whole selection sideways, then turn it again.
    components.forEach(c => c.translate(new board.scope.Point(500, 0)));
    board.selectionRotation = 180;

    // The pivot moved with them, so the square is still a square in the same place.
    const xs = components.map(c => c.geometry.position.x);
    const ys = components.map(c => c.geometry.position.y);
    expect(Math.round(Math.min(...xs))).toBe(500);
    expect(Math.round(Math.max(...xs))).toBe(600);
    expect(Math.round(Math.min(...ys))).toBe(0);
    expect(Math.round(Math.max(...ys))).toBe(100);
  });
});
