import {snapshotBounds, snapshotSize, snapshotSvg} from './boardSnapshot';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicComponent} from '../logic/LogicComponent';
import {makeComponent} from '../logic/componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

const {ResizeObserver} = window;

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  // Written as a plain function rather than an arrow: the observer is constructed with new, which
  // an arrow function cannot be.
  window.ResizeObserver = vi.fn().mockImplementation(function () {
    return {observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn()};
  });
});

afterEach(() => {
  window.ResizeObserver = ResizeObserver;
  vi.restoreAllMocks();
});

/** A board with a driver wired to a sink, so there is both a component and a wire to draw. */
function wired(): {board: LogicBoard, source: LogicComponent, sink: LogicComponent} {
  const board = new LogicBoard();
  const place = (x: number) => {
    const gate = makeComponent(
        {type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
    gate.geometry.position = new board.scope.Point(x, 0);
    board.addComponent(gate);

    return gate;
  };

  const source = place(0);
  const sink = place(80);
  board.addConnection(sink.inputPins[0].connectTo(source.outputPins[0])!);

  return {board, source, sink};
}

function draw(board: LogicBoard, label?: string): SVGSVGElement {
  const bounds = snapshotBounds(board);

  return snapshotSvg(board, bounds, snapshotSize(bounds), label);
}

describe('drawing a board for export', () => {
  test('holds everything on it', () => {
    const {board} = wired();

    const svg = draw(board);

    expect(svg.querySelectorAll('g.component')).toHaveLength(2);
    expect(svg.querySelectorAll('g.connection')).toHaveLength(1);
  });

  test('is drawn against the area that fits it, not against the board view', () => {
    const {board} = wired();
    board.viewBox = {left: 5000, top: 5000, width: 100, height: 100};
    const bounds = snapshotBounds(board);

    const svg = draw(board);

    expect(svg.getAttribute('viewBox'))
        .toBe(`${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`);
  });

  test('carries the styles with it, since an image gets none from the page', () => {
    const {board} = wired();

    expect(draw(board).querySelector('style')?.textContent).toMatch(/\.component/);
  });

  test('leaves out what the user is doing', () => {
    const {board, source} = wired();
    source.selected = true;

    const svg = draw(board);

    expect(svg.querySelectorAll('.selected')).toHaveLength(0);
  });

  test('leaves out the rulers, which are not part of the board', () => {
    const {board} = wired();

    expect(draw(board).querySelectorAll('.rulers')).toHaveLength(0);
  });

  test('can be drawn for a board that is nowhere on the page', () => {
    const {board} = wired();

    expect(draw(board).querySelectorAll('g.component')).toHaveLength(2);
  });
});

describe('the badge saying what the picture holds', () => {
  test('is absent for a board on its own', () => {
    const {board} = wired();

    expect(draw(board).querySelectorAll('text')).toHaveLength(0);
  });

  test('says what it was given', () => {
    const {board} = wired();

    expect(draw(board, 'PROJECT - 4-bit ALU').querySelector('text')?.textContent)
        .toBe('PROJECT - 4-bit ALU');
  });

  test('sits inside the picture rather than off its edge', () => {
    const {board} = wired();
    const bounds = snapshotBounds(board);

    const rect = draw(board, 'PROJECT').querySelector('g rect')!;

    expect(Number(rect.getAttribute('x'))).toBeGreaterThan(bounds.left);
    expect(Number(rect.getAttribute('y'))).toBeGreaterThan(bounds.top);
  });
});

describe('what drawing a board a second time must not cost it', () => {
  test('the components keep the callbacks that redraw them on screen', () => {
    const {board, source} = wired();
    const onScreen = () => {};
    source.updateSelf = onScreen;

    draw(board);

    expect(source.updateSelf).toBe(onScreen);
  });

  test('the wires keep theirs', () => {
    const {board} = wired();
    const [connection] = [...board.connections.values()];
    const onScreen = () => {};
    connection.updateSelf = onScreen;

    draw(board);

    expect(connection.updateSelf).toBe(onScreen);
  });

  test('the pins keep theirs', () => {
    const {board, source} = wired();
    const onScreen = () => {};
    source.outputPins[0].updateSelf = onScreen;

    draw(board);

    expect(source.outputPins[0].updateSelf).toBe(onScreen);
  });

  test('the board keeps the one that redraws the whole editor', () => {
    const {board} = wired();
    const onScreen = () => {};
    board.update = onScreen;

    draw(board);

    expect(board.update).toBe(onScreen);
  });

  test('nothing is left behind on the page', () => {
    const {board} = wired();
    const before = document.body.childElementCount;

    draw(board);

    expect(document.body.childElementCount).toBe(before);
  });
});
