import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {Project} from './Project';
import {createBoardFromSelection} from './boardFromSelection';
import {makeComponent} from './componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';
import {setNetName, setPort} from './nets';

function place(board: LogicBoard, x: number, y = 0, subtype = GateType.AND): LogicComponent {
  const component = makeComponent({type: PartType.GATE, subtype, scope: board.scope, board});
  component.geometry.position = new board.scope.Point(x, y);
  board.addComponent(component);

  return component;
}

function select(board: LogicBoard, ...components: LogicComponent[]) {
  board.clearSelection();
  components.forEach(component => {
    component.selected = true;
    board.selectedComponents.add(component);
  });
}

/** A project whose one board holds two wired gates and a third off on its own. */
function project(): {
  project: Project, source: LogicBoard, driver: LogicComponent,
  sink: LogicComponent, other: LogicComponent,
} {
  const made = new Project();
  const source = made.mainBoard;
  const driver = place(source, 0);
  const sink = place(source, 80);
  const other = place(source, 400, 0, GateType.OR);
  source.addConnection(sink.inputPins[0].connectTo(driver.outputPins[0])!);

  return {project: made, source, driver, sink, other};
}

describe('making a board out of a selection', () => {
  test('puts the selected components on it', () => {
    const {project: made, source, driver, sink} = project();
    select(source, driver, sink);

    expect(createBoardFromSelection(made, source, 'taken')?.components.size).toBe(2);
  });

  test('leaves behind what was not selected', () => {
    const {project: made, source, driver, sink} = project();
    select(source, driver, sink);

    const board = createBoardFromSelection(made, source, 'taken')!;

    // The gate left out is the only OR on the board, so naming the subtypes says both that the two
    // selected came over and that the third did not.
    expect([...board.components.values()].map(component => component.subtype))
        .toEqual([GateType.AND, GateType.AND]);
  });

  test('keeps the wires that ran between what was taken', () => {
    const {project: made, source, driver, sink} = project();
    select(source, driver, sink);

    expect(createBoardFromSelection(made, source, 'taken')?.connections.size).toBe(1);
  });

  test('drops a wire with only one end in the selection, which would lead nowhere', () => {
    const {project: made, source, sink} = project();
    select(source, sink);

    expect(createBoardFromSelection(made, source, 'taken')?.connections.size).toBe(0);
  });

  test('makes nothing at all when nothing is selected', () => {
    const {project: made, source} = project();

    expect(createBoardFromSelection(made, source, 'taken')).toBeUndefined();
    expect(made.boards).toHaveLength(1);
  });

  test('makes nothing when only pins are selected, there being no component to take', () => {
    const {project: made, source, driver} = project();
    source.selectedPins.add(driver.outputPins[0]);

    expect(createBoardFromSelection(made, source, 'taken')).toBeUndefined();
    expect(made.boards).toHaveLength(1);
  });

  test('copies rather than moves, leaving the board it came from as it was', () => {
    const {project: made, source, driver, sink} = project();
    select(source, driver, sink);

    createBoardFromSelection(made, source, 'taken');

    expect(source.components.size).toBe(3);
    expect(source.connections.size).toBe(1);
  });

  test('is a board of its own: editing the copy does not reach back', () => {
    const {project: made, source, driver, sink} = project();
    select(source, driver, sink);
    const board = createBoardFromSelection(made, source, 'taken')!;

    [...board.components.keys()].forEach(uuid => board.removeComponent(uuid));

    expect(source.components.size).toBe(3);
  });
});

describe('where the new board goes', () => {
  test('into the project, under the name it was given', () => {
    const {project: made, source, driver, sink} = project();
    select(source, driver, sink);

    const board = createBoardFromSelection(made, source, 'adder stage')!;

    expect(made.boards).toContain(board);
    expect(board.name).toBe('adder stage');
  });

  test('in front, since it is what the user just asked for', () => {
    const {project: made, source, driver, sink} = project();
    select(source, driver, sink);

    const board = createBoardFromSelection(made, source, 'taken')!;

    expect(made.activeBoard).toBe(board);
    expect(made.openBoardIds).toContain(board.id);
  });

  test('is not the main board, which the project is still named for', () => {
    const {project: made, source, driver, sink} = project();
    select(source, driver, sink);

    const board = createBoardFromSelection(made, source, 'taken')!;

    expect(made.mainBoard).toBe(source);
    expect(made.canRemove(board)).toBe(true);
  });
});

describe('what the copy arrives holding', () => {
  test('sits where the new board is looking, not where it was copied from', () => {
    const {project: made, source, driver, sink} = project();
    driver.geometry.position = new source.scope.Point(4000, 4000);
    sink.geometry.position = new source.scope.Point(4080, 4000);
    select(source, driver, sink);

    const board = createBoardFromSelection(made, source, 'taken')!;
    const {left, top, width, height} = board.viewBox;

    for (const component of board.components.values()) {
      const {x, y} = component.geometry.position;
      expect(x).toBeGreaterThanOrEqual(left);
      expect(x).toBeLessThanOrEqual(left + width);
      expect(y).toBeGreaterThanOrEqual(top);
      expect(y).toBeLessThanOrEqual(top + height);
    }
  });

  test('keeps the shape of what was taken rather than piling it up', () => {
    const {project: made, source, driver, sink} = project();
    select(source, driver, sink);

    const board = createBoardFromSelection(made, source, 'taken')!;

    const [a, b] = [...board.components.values()].map(component => component.geometry.position);
    expect(Math.abs(a.x - b.x)).toBe(80);
  });

  test('is what is selected there, so it can be moved as one', () => {
    const {project: made, source, driver, sink} = project();
    select(source, driver, sink);

    const board = createBoardFromSelection(made, source, 'taken')!;

    expect(board.selectedComponents.size).toBe(2);
  });

  test('leaves net names behind, which named a line on the board it came from', () => {
    const {project: made, source, driver, sink} = project();
    setNetName(source, [driver.outputPins[0]], 'carry');
    expect(driver.outputPins[0].netName).toBe('carry');
    select(source, driver, sink);

    const board = createBoardFromSelection(made, source, 'taken')!;

    expect([...board.pins.values()].map(pin => pin.netName).filter(Boolean)).toHaveLength(0);
    expect(board.nets.size).toBe(0);
  });

  test('leaves port names behind for the same reason', () => {
    const {project: made, source, driver, sink} = project();
    setPort(source, driver.outputPins[0], true, 'q');
    expect(driver.outputPins[0].isPort).toBe(true);
    select(source, driver, sink);

    const board = createBoardFromSelection(made, source, 'taken')!;

    expect([...board.pins.values()].filter(pin => pin.isPort)).toHaveLength(0);
  });
});
