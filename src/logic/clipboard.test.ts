import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {Switch} from './Switch';
import {copySelection, duplicateSelection, pasteAnchor, pasteInto, CASCADE} from './clipboard';
import {makeComponent} from './componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';
import {setNetName} from './nets';

function place(board: LogicBoard, x: number, y = 0,
               type = PartType.GATE, subtype: number = GateType.AND): LogicComponent {
  const component = makeComponent({type, subtype, scope: board.scope, board});
  component.geometry.position = new board.scope.Point(x, y);
  board.addComponent(component);

  return component;
}

/** An input takes one source at a time, so each driver is wired to an input of its own. */
function wire(board: LogicBoard, source: LogicComponent, sink: LogicComponent, input = 0) {
  board.addConnection(sink.inputPins[input].connectTo(source.outputPins[0])!);
}

/** Two drivers feeding one sink, one of them off to the side, none of it selected. */
function board(): {board: LogicBoard, source: LogicComponent, sink: LogicComponent, other: LogicComponent} {
  const made = new LogicBoard();
  const source = place(made, 0);
  const sink = place(made, 80);
  const other = place(made, 400);
  wire(made, source, sink, 0);
  wire(made, other, sink, 1);

  return {board: made, source, sink, other};
}

function select(made: LogicBoard, ...components: LogicComponent[]) {
  made.clearSelection();
  components.forEach(component => {
    component.selected = true;
    made.selectedComponents.add(component);
  });
}

/** Everything on the board that was not there before. */
function added(made: LogicBoard, before: LogicComponent[]): LogicComponent[] {
  return [...made.components.values()].filter(component => !before.includes(component));
}

describe('copying a selection', () => {
  test('takes the components that are selected', () => {
    const {board: made, source, sink} = board();
    select(made, source, sink);

    expect(copySelection(made)?.components).toHaveLength(2);
  });

  test('takes nothing when nothing is selected', () => {
    expect(copySelection(board().board)).toBeUndefined();
  });

  test('takes nothing when only pins are selected, which cannot be pasted on their own', () => {
    const {board: made, source} = board();
    made.selectedPins.add(source.outputPins[0]);

    expect(copySelection(made)).toBeUndefined();
  });

  test('keeps the wires that run between the components taken', () => {
    const {board: made, source, sink} = board();
    select(made, source, sink);

    expect(copySelection(made)?.connections).toHaveLength(1);
  });

  test('drops a wire leading to something left behind', () => {
    // The sink is also driven by a component outside the selection, which the copy cannot include.
    const {board: made, sink} = board();
    select(made, sink);

    expect(copySelection(made)?.connections).toHaveLength(0);
  });

  test('is a snapshot, so moving what was copied does not change it', () => {
    const {board: made, source} = board();
    select(made, source);
    const copied = copySelection(made)!;

    source.geometry.position = new made.scope.Point(999, 999);

    expect(copied.components[0].x).not.toBeCloseTo(999);
  });

  test('survives what was copied being deleted, which is what makes cut work', () => {
    const {board: made, source, sink} = board();
    select(made, source, sink);
    const copied = copySelection(made)!;

    made.deleteSelection();
    const placed = pasteInto(made, copied, {x: 0, y: 0});

    expect(placed).toHaveLength(2);
  });
});

describe('what a copy leaves behind', () => {
  test('the names that put pins on a net, which are connections to things outside it', () => {
    const {board: made, source} = board();
    setNetName(made, [source.outputPins[0]], 'clk');
    select(made, source);

    const copied = copySelection(made)!;
    const placed = pasteInto(made, copied, {x: 200, y: 200});

    expect(placed[0].outputPins[0].netName).toBe('');
  });

  test('the flag marking a pin as a port, which no two pins may share', () => {
    const {board: made, source} = board();
    source.inputPins[0].isPort = true;
    source.inputPins[0].portName = 'A';
    select(made, source);

    const placed = pasteInto(made, copySelection(made)!, {x: 200, y: 200});

    expect(placed[0].inputPins[0].isPort).toBe(false);
    expect(placed[0].inputPins[0].portName).toBe('');
  });
});

describe('pasting', () => {
  test('adds to the board rather than replacing what is on it', () => {
    const {board: made, source, sink} = board();
    select(made, source, sink);

    pasteInto(made, copySelection(made)!, {x: 200, y: 200});

    expect(made.components.size).toBe(5);
  });

  test('brings the wiring of what was copied', () => {
    const {board: made, source, sink} = board();
    select(made, source, sink);
    const before = [...made.components.values()];

    pasteInto(made, copySelection(made)!, {x: 200, y: 200});

    const [pastedSource, pastedSink] = added(made, before);
    expect(pastedSink.inputPins[0].isConnectedTo(pastedSource.outputPins[0])).toBe(true);
  });

  test('leaves what was copied wired as it was', () => {
    const {board: made, source, sink} = board();
    select(made, source, sink);

    pasteInto(made, copySelection(made)!, {x: 200, y: 200});

    expect(sink.inputPins[0].isConnectedTo(source.outputPins[0])).toBe(true);
  });

  test('keeps the copied components in the same arrangement', () => {
    const {board: made, source, sink} = board();
    select(made, source, sink);
    const apart = sink.geometry.position.x - source.geometry.position.x;
    const before = [...made.components.values()];

    pasteInto(made, copySelection(made)!, {x: 500, y: 500});

    const [pastedSource, pastedSink] = added(made, before);
    expect(pastedSink.geometry.position.x - pastedSource.geometry.position.x).toBeCloseTo(apart);
  });

  test('centres what was pasted on the point it was aimed at', () => {
    const {board: made, source, sink} = board();
    select(made, source, sink);
    const before = [...made.components.values()];

    pasteInto(made, copySelection(made)!, {x: 500, y: 300});

    const placed = added(made, before).map(component => component.geometry.position);
    const middle = (Math.min(...placed.map(p => p.x)) + Math.max(...placed.map(p => p.x))) / 2;
    expect(middle).toBeCloseTo(500);
  });

  test('carries a switch with its toggles as they were left', () => {
    const made = new LogicBoard();
    const toggles = place(made, 0, 0, PartType.INPUT, 1) as Switch;
    toggles.width = 4;
    toggles.toggles = 0b1010;
    select(made, toggles);

    const [pasted] = pasteInto(made, copySelection(made)!, {x: 200, y: 0});

    expect((pasted as Switch).toggles).toBe(0b1010);
  });

  test('selects what was pasted, so that it is what moves next', () => {
    const {board: made, source, sink} = board();
    select(made, source, sink);

    const placed = pasteInto(made, copySelection(made)!, {x: 200, y: 200});

    expect([...made.selectedComponents]).toEqual(placed);
    expect(made.selectedComponents.has(source)).toBe(false);
  });

  test('can put a copy on a different board', () => {
    const {board: made, source, sink} = board();
    select(made, source, sink);
    const elsewhere = new LogicBoard();

    const placed = pasteInto(elsewhere, copySelection(made)!, {x: 0, y: 0});

    expect(elsewhere.components.size).toBe(2);
    expect(placed[1].inputPins[0].isConnectedTo(placed[0].outputPins[0])).toBe(true);
  });

  test('does not disturb a simulation that is running', () => {
    const {board: made, source} = board();
    made.advanceSimulation();
    made.advanceSimulation();
    const running = made.simulationCurrentTime;
    select(made, source);

    pasteInto(made, copySelection(made)!, {x: 200, y: 200});

    expect(made.simulationCurrentTime).toBe(running);
  });
});

describe('pasting again at the same point', () => {
  test('steps the copy along so it does not land on the one before', () => {
    const {board: made, source} = board();
    select(made, source);
    const copied = copySelection(made)!;

    const [first] = pasteInto(made, copied, {x: 200, y: 200, repeat: 0});
    const [second] = pasteInto(made, copied, {x: 200, y: 200, repeat: 1});

    expect(second.geometry.position.x - first.geometry.position.x).toBeCloseTo(CASCADE);
    expect(second.geometry.position.y - first.geometry.position.y).toBeCloseTo(CASCADE);
  });

  test('lands where it is aimed when the point has moved', () => {
    const {board: made, source} = board();
    select(made, source);
    const copied = copySelection(made)!;

    const [placed] = pasteInto(made, copied, {x: 700, y: 400, repeat: 0});

    expect(placed.geometry.position.x).toBeCloseTo(700);
    expect(placed.geometry.position.y).toBeCloseTo(400);
  });
});

describe('where a paste is aimed', () => {
  test('at the pointer, when it is over the board', () => {
    const made = new LogicBoard();
    made.pointer = {x: 123, y: 456};

    expect(pasteAnchor(made)).toEqual({x: 123, y: 456});
  });

  test('at the middle of the view, when it is not', () => {
    const made = new LogicBoard();
    made.viewBox = {left: 100, top: 200, width: 800, height: 600};

    expect(pasteAnchor(made)).toEqual({x: 500, y: 500});
  });
});

describe('duplicating', () => {
  test('puts the copy beside what it was made from', () => {
    const {board: made, source} = board();
    select(made, source);
    const was = source.geometry.position;

    const [copy] = duplicateSelection(made);

    expect(copy.geometry.position.x).toBeCloseTo(was.x + CASCADE);
    expect(copy.geometry.position.y).toBeCloseTo(was.y + CASCADE);
  });

  test('brings the wiring, like any other copy', () => {
    const {board: made, source, sink} = board();
    select(made, source, sink);

    const [a, b] = duplicateSelection(made);

    expect(b.inputPins[0].isConnectedTo(a.outputPins[0])).toBe(true);
  });

  test('does nothing with nothing selected', () => {
    const {board: made} = board();

    expect(duplicateSelection(made)).toEqual([]);
    expect(made.components.size).toBe(3);
  });
});
