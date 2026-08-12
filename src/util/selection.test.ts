import {MouseManager} from './MouseManager';
import {MouseEventMapping} from './MouseEventMapping';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicComponent} from '../logic/LogicComponent';
import {LogicPin} from '../logic/LogicPin';
import {makeComponent} from '../logic/componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

const VIEWPORT = {width: 800, height: 600};

type Modifier = 'Shift' | 'Alt' | 'Control';

/** Builds the minimum of a MouseEvent that the board handlers actually read. */
function mouseEvent(button: number, x: number, y: number, modifier?: Modifier) {
  return {
    button,
    clientX: x,
    clientY: y,
    altKey: modifier === 'Alt',
    preventDefault: () => {},
    stopPropagation: () => {},
    getModifierState: (key: string) => key === modifier,
  } as unknown as MouseEvent;
}

/**
 * A board whose viewBox matches the viewport, so screen coordinates are board coordinates.
 *
 * The origin sits in the top left corner, so everything the tests place is at positive coordinates
 * and the band that reaches it can be drawn from (0, 0).
 */
function setup() {
  const board = new LogicBoard();
  board.viewBox = {left: 0, top: 0, width: VIEWPORT.width, height: VIEWPORT.height};

  const manager = new MouseManager();
  manager.getViewCoordinates = (e): MouseEventMapping => {
    const rx = (e as MouseEvent).clientX / VIEWPORT.width;
    const ry = (e as MouseEvent).clientY / VIEWPORT.height;
    const {left, top, width, height} = board.viewBox;

    return {x: left + rx * width, y: top + ry * height, rx, ry, dx: 0, dy: 0};
  };

  return {board, manager};
}

function place(board: LogicBoard, x: number, y = 100): LogicComponent {
  const component = makeComponent({
    type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board,
  });
  component.geometry.position = new board.scope.Point(x, y);
  board.addComponent(component);

  return component;
}

/** Drags a rubber band across the given corners, and lets go. */
function band(manager: MouseManager, board: LogicBoard,
    from: [number, number], to: [number, number], modifier?: Modifier) {
  manager.handleBoardMouseDown(board, mouseEvent(0, from[0], from[1], modifier));
  manager.handleMouseMoveSelect(board, mouseEvent(0, to[0], to[1], modifier));
  manager.handleMouseUp(board, mouseEvent(0, to[0], to[1], modifier));
}

/** A band drawn well clear of everything placed by these tests. */
const EMPTY: [[number, number], [number, number]] = [[600, 400], [700, 500]];

describe('components and pins are never selected together', () => {
  test('clicking a pin drops the selected components', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);
    const other = place(board, 300);

    manager.handleGateMouseDown(board, gate, mouseEvent(0, 100, 100));
    manager.handleMouseUp(board, mouseEvent(0, 100, 100));
    manager.handlePinMouseDown(board, other.inputPins[0], mouseEvent(0, 280, 100));

    expect(board.selectedComponents.size).toBe(0);
    expect(gate.selected).toBe(false);
    expect([...board.selectedPins]).toEqual([other.inputPins[0]]);

    manager.reset(board);
  });

  test('clicking a component drops the selected pins', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);

    manager.handlePinMouseDown(board, gate.inputPins[0], mouseEvent(0, 80, 100));
    manager.handleMouseUp(board, mouseEvent(0, 80, 100));
    manager.handleGateMouseDown(board, gate, mouseEvent(0, 100, 100));

    expect(board.selectedPins.size).toBe(0);
    expect(gate.inputPins[0].selected).toBe(false);
    expect([...board.selectedComponents]).toEqual([gate]);

    manager.reset(board);
  });

  test('adding a pin to a component selection replaces it rather than joining it', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);

    manager.handleGateMouseDown(board, gate, mouseEvent(0, 100, 100));
    manager.handleMouseUp(board, mouseEvent(0, 100, 100));
    manager.handlePinMouseDown(board, gate.inputPins[0], mouseEvent(0, 80, 100, 'Shift'));

    expect(board.selectedComponents.size).toBe(0);
    expect(board.selectedPins.size).toBe(1);

    manager.reset(board);
  });
});

describe('a plain click', () => {
  test('on a pin replaces the pins that were selected', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);

    manager.handlePinMouseDown(board, gate.inputPins[0], mouseEvent(0, 80, 100));
    manager.handleMouseUp(board, mouseEvent(0, 80, 100));
    manager.handlePinMouseDown(board, gate.inputPins[1], mouseEvent(0, 80, 110));

    expect([...board.selectedPins]).toEqual([gate.inputPins[1]]);
    expect(gate.inputPins[0].selected).toBe(false);

    manager.reset(board);
  });

  test('on a component replaces the components that were selected', () => {
    const {board, manager} = setup();
    const first = place(board, 100);
    const second = place(board, 300);

    manager.handleGateMouseDown(board, first, mouseEvent(0, 100, 100));
    manager.handleMouseUp(board, mouseEvent(0, 100, 100));
    manager.handleGateMouseDown(board, second, mouseEvent(0, 300, 100));

    expect([...board.selectedComponents]).toEqual([second]);

    manager.reset(board);
  });

  test('on a member of a selection keeps the whole of it, so the group can be dragged', () => {
    const {board, manager} = setup();
    const first = place(board, 100);
    const second = place(board, 130);
    band(manager, board, [0, 0], [200, 200]);
    expect(board.selectedComponents.size).toBe(2);

    manager.handleGateMouseDown(board, first, mouseEvent(0, 100, 100));

    expect(board.selectedComponents.size).toBe(2);
    expect(second.selected).toBe(true);

    manager.reset(board);
  });
});

describe('shift adds to the selection', () => {
  test('a clicked component joins the ones already selected', () => {
    const {board, manager} = setup();
    const first = place(board, 100);
    const second = place(board, 300);

    manager.handleGateMouseDown(board, first, mouseEvent(0, 100, 100));
    manager.handleMouseUp(board, mouseEvent(0, 100, 100));
    manager.handleGateMouseDown(board, second, mouseEvent(0, 300, 100, 'Shift'));

    expect([...board.selectedComponents]).toEqual([first, second]);

    manager.reset(board);
  });

  test('a clicked pin joins the ones already selected', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);

    manager.handlePinMouseDown(board, gate.inputPins[0], mouseEvent(0, 80, 100));
    manager.handleMouseUp(board, mouseEvent(0, 80, 100));
    manager.handlePinMouseDown(board, gate.inputPins[1], mouseEvent(0, 80, 110, 'Shift'));

    expect(board.selectedPins.size).toBe(2);
    expect(gate.inputPins[0].selected).toBe(true);

    manager.reset(board);
  });

  test('what a band encloses joins the ones already selected', () => {
    const {board, manager} = setup();
    const first = place(board, 100);
    const second = place(board, 300);

    band(manager, board, [0, 0], [200, 200]);
    band(manager, board, [250, 0], [400, 200], 'Shift');

    expect(board.selectedComponents.size).toBe(2);
    expect(first.selected).toBe(true);
    expect(second.selected).toBe(true);
  });
});

describe('alt takes away from the selection', () => {
  test('a clicked component leaves the ones already selected', () => {
    const {board, manager} = setup();
    const first = place(board, 100);
    const second = place(board, 130);
    band(manager, board, [0, 0], [200, 200]);

    manager.handleGateMouseDown(board, first, mouseEvent(0, 100, 100, 'Alt'));

    expect([...board.selectedComponents]).toEqual([second]);
    expect(first.selected).toBe(false);

    manager.reset(board);
  });

  test('a component taken out of the selection is not dragged with it', () => {
    const {board, manager} = setup();
    const first = place(board, 100);
    const second = place(board, 130);
    band(manager, board, [0, 0], [200, 200]);
    const before = first.geometry.position.x;
    const secondBefore = second.geometry.position.x;

    manager.handleGateMouseDown(board, first, mouseEvent(0, 100, 100, 'Alt'));
    // Whatever the pointer does next, the component just deselected must stay where it is. The
    // handler that moves the selection is only attached when there is something to move, and
    // reaches this manager through the window rather than through the board.
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: 160, clientY: 100, altKey: true}));

    expect(first.geometry.position.x).toBeCloseTo(before);
    expect(second.geometry.position.x).toBeCloseTo(secondBefore);

    manager.reset(board);
  });

  test('a clicked pin leaves the ones already selected', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);
    board.setSelectedPins([gate.inputPins[0], gate.inputPins[1]]);

    manager.handlePinMouseDown(board, gate.inputPins[0], mouseEvent(0, 80, 100, 'Alt'));

    expect([...board.selectedPins]).toEqual([gate.inputPins[1]]);

    manager.reset(board);
  });

  test('what a band encloses leaves the ones already selected', () => {
    const {board, manager} = setup();
    const first = place(board, 100);
    const second = place(board, 300);

    band(manager, board, [0, 0], [400, 200]);
    expect(board.selectedComponents.size).toBe(2);
    band(manager, board, [250, 0], [400, 200], 'Alt');

    expect([...board.selectedComponents]).toEqual([first]);
    expect(second.selected).toBe(false);
  });

  test('dragging with the left button no longer pans', () => {
    // Alt used to be how a left drag panned the view, which is now how it takes things out of the
    // selection instead.
    const {board, manager} = setup();
    const before = board.viewBox.left;

    manager.handleBoardMouseDown(board, mouseEvent(0, 100, 100, 'Alt'));
    manager.handleMouseMoveSelect(board, mouseEvent(0, 300, 200, 'Alt'));

    expect(board.viewBox.left).toBe(before);
    expect(manager.selectBox).toBeDefined();

    manager.reset(board);
  });
});

describe('a band built on an existing selection', () => {
  test('stays on pins when pins were selected, though it covers components', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);
    board.setSelectedPins([gate.inputPins[0]]);

    band(manager, board, [0, 0], [400, 200], 'Shift');

    expect(board.selectedComponents.size).toBe(0);
    expect(board.selectedPins.size).toBeGreaterThan(1);
  });

  test('picks up components when nothing was selected to build on', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);

    band(manager, board, [0, 0], [400, 200], 'Shift');

    expect([...board.selectedComponents]).toEqual([gate]);
  });
});

describe('what the selection is left as', () => {
  test('a band over nothing clears what was selected', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);
    band(manager, board, [0, 0], [200, 200]);
    expect(gate.selected).toBe(true);

    band(manager, board, EMPTY[0], EMPTY[1]);

    expect(board.selectedComponents.size).toBe(0);
    expect(gate.selected).toBe(false);
  });

  test('a band offers pins only where it covers no component', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);

    band(manager, board, [0, 0], [200, 200]);

    expect(board.selectedPins.size).toBe(0);
    expect([...board.selectedComponents]).toEqual([gate]);
  });
});

describe('a press arriving while an interaction is already running', () => {
  // A release outside the browser window never reaches the board, leaving the handlers from that
  // interaction attached. Registering a second set over them throws, and the board then threw on
  // every press that followed until the page was reloaded.
  test('does not throw when the board was left mid-band', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);
    manager.handleBoardMouseDown(board, mouseEvent(0, 300, 300));

    expect(() => manager.handlePinMouseDown(board, gate.inputPins[0], mouseEvent(0, 80, 100)))
        .not.toThrow();

    manager.reset(board);
  });

  test('does not throw when the board was left mid-wire', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);
    manager.handlePinMouseDown(board, gate.inputPins[0], mouseEvent(0, 80, 100));

    expect(() => manager.handlePinMouseDown(board, gate.inputPins[1], mouseEvent(0, 80, 110)))
        .not.toThrow();

    manager.reset(board);
  });

  test('does not throw on a run of modifier clicks with no release between them', () => {
    // These start nothing, so each has to leave the board as ready as it found it.
    const {board, manager} = setup();
    const gate = place(board, 100);

    expect(() => {
      for (let i = 0; i < 5; i++) {
        manager.handlePinMouseDown(board, gate.inputPins[i % 2], mouseEvent(0, 80, 100, 'Shift'));
      }
    }).not.toThrow();

    expect(board.selectedPins.size).toBe(2);

    manager.reset(board);
  });
});

describe('the properties panel', () => {
  test('hears about a selection edited by modifier', () => {
    const {board, manager} = setup();
    const first = place(board, 100);
    const second = place(board, 300);
    manager.handleGateMouseDown(board, first, mouseEvent(0, 100, 100));
    manager.handleMouseUp(board, mouseEvent(0, 100, 100));

    let told = 0;
    board.onPropertiesChanged = () => {told++};
    manager.handleGateMouseDown(board, second, mouseEvent(0, 300, 100, 'Shift'));

    expect(told).toBeGreaterThan(0);

    manager.reset(board);
  });
});

/** Every pin of every component placed, for the checks that count them. */
function allPins(board: LogicBoard): LogicPin[] {
  return [...board.pins.values()];
}

describe('selecting pins by band', () => {
  test('takes only the pins the band reaches', () => {
    const {board, manager} = setup();
    const gate = place(board, 100);
    board.setSelectedPins([gate.inputPins[0]]);

    band(manager, board, EMPTY[0], EMPTY[1], 'Shift');

    expect([...board.selectedPins]).toEqual([gate.inputPins[0]]);
    expect(allPins(board).filter(p => p.selected)).toEqual([gate.inputPins[0]]);
  });
});
