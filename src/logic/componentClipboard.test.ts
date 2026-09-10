import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {LogicState} from './LogicState';
import {Project} from './Project';
import {SubComponent} from './SubComponent';
import {defineComponent} from './ComponentDefinition';
import type {ComponentDefinition} from './ComponentDefinition';
import {copySelection, duplicateSelection, pasteInto} from './clipboard';
import {makeComponent} from './componentFactory';
import {setPort} from './nets';
import {packageForBoard} from './packageFromBoard';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/**
 * Copying a custom component, and finding it again afterwards.
 *
 * A placement names the component it was built from rather than carrying it, so whatever puts one
 * back has to be able to look the name up. The board being filled carries that lookup, since every
 * reader — the file, the clipboard — already has the board.
 */

function gate(board: LogicBoard, subtype = GateType.AND): LogicComponent {
  const made = makeComponent({type: PartType.GATE, subtype, scope: board.scope, board});
  board.addComponent(made);

  return made;
}

/** A project holding one component: an AND gate with both inputs and its output exposed. */
function project(): {project: Project, made: ComponentDefinition} {
  const made = new Project();
  const source = made.addBoard('and_core');
  const and = gate(source);
  setPort(source, and.inputPins[0], 'a');
  setPort(source, and.inputPins[1], 'b');
  setPort(source, and.outputPins[0], 'y');

  return {
    project: made,
    made: made.addComponent(
        defineComponent({name: 'and2', board: source, packaging: packageForBoard(source, 'and2')})),
  };
}

/** That component placed on the project's main board, and selected. */
function placed() {
  const {project: held, made} = project();
  const board = held.mainBoard;
  const part = new SubComponent({scope: board.scope, board, definition: made});
  board.addComponent(part);
  board.clearSelection();
  part.selected = true;
  board.selectedComponents.add(part);

  return {project: held, board, part, made};
}

function settle(board: LogicBoard) {
  for (let step = 0; step < 50; step++) {
    board.advanceSimulation();
  }
}

describe('copying a custom component', () => {
  test('names the component rather than carrying a copy of its board', () => {
    const {board, made} = placed();

    const copied = copySelection(board)!;

    expect(copied.components).toHaveLength(1);
    expect(copied.components[0].component).toBe(made.uuid);
  });

  test('pastes back as a placement of the same component', () => {
    const {board, made} = placed();
    const copied = copySelection(board)!;

    const [pasted] = pasteInto(board, copied, {x: 200, y: 200});

    expect(pasted).toBeInstanceOf(SubComponent);
    expect((pasted as SubComponent).definitionId).toBe(made.uuid);
    expect(pasted.pins().map(pin => pin.label)).toEqual(['a', 'b', 'y']);
  });

  test('pastes something that runs', () => {
    const {board} = placed();
    const copied = copySelection(board)!;

    const [pasted] = pasteInto(board, copied, {x: 200, y: 200});
    pasted.inputPins.forEach(pin => {
      const source = gate(board);
      board.addConnection(pin.connectTo(source.outputPins[0])!);
      source.outputPins[0].setLogicState(new LogicState({v: 1}));
    });
    settle(board);

    expect(pasted.outputPins[0].state.v).toBe(1);
  });

  test('brings its own parts rather than sharing the ones already placed', () => {
    const {board, part} = placed();
    const copied = copySelection(board)!;

    const [pasted] = pasteInto(board, copied, {x: 200, y: 200});

    expect(board.hosted.size).toBe(2);
    expect((pasted as SubComponent).inner[0]).not.toBe(part.inner[0]);
  });

  test('duplicates', () => {
    const {board, made} = placed();

    const [copy] = duplicateSelection(board);

    expect((copy as SubComponent).definitionId).toBe(made.uuid);
  });

  test('is refused rather than half-pasted onto a board with no project behind it', () => {
    const {board} = placed();
    const copied = copySelection(board)!;

    expect(() => pasteInto(new LogicBoard(), copied, {x: 0, y: 0}))
        .toThrow(/component the project does not have/);
  });
});

describe('a board a project holds', () => {
  test('can find the components the project holds, however the board was made', () => {
    const {project: held} = project();

    expect(held.mainBoard.library).toBeDefined();
    expect(held.boards[1].library).toBeDefined();
  });

  test('finds a component made after the board was', () => {
    const {project: held} = project();
    const source = held.boards[1];
    const later = held.addComponent(
        defineComponent({name: 'second', board: source, packaging: packageForBoard(source, 'p2')}));

    expect(held.mainBoard.library!(later.uuid)).toBe(later);
  });
});
