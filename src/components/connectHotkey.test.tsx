import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {App} from './App';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicGate} from '../logic/LogicGate';
import {LogicPin} from '../logic/LogicPin';
import {connectPins, setNetName} from '../logic/nets';
import {GateType} from '../enums/GateType';

const {ResizeObserver} = window;

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = vi.fn().mockImplementation(function () {
    return {observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn()};
  });
  vi.useFakeTimers({shouldAdvanceTime: true});
});

afterEach(() => {
  vi.useRealTimers();
  window.ResizeObserver = ResizeObserver;
  vi.restoreAllMocks();
});

/** The board the running app is showing. */
function shownBoard(): LogicBoard {
  const wrapper = document.querySelector('.board-wrapper')!;
  const key = Object.keys(wrapper).find(k => k.startsWith('__reactFiber$'))!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = (wrapper as any)[key];
  while (node && !node.stateNode?.props?.board) {
    node = node.return;
  }

  return node.stateNode.props.board;
}

/** Puts a gate on the board and registers its pins, as a drop from the parts drawer does. */
function gate(board: LogicBoard): LogicGate {
  const made = new LogicGate({scope: board.scope, subtype: GateType.AND, board});
  board.addComponent(made);
  made.pins().forEach(pin => {
    pin.board = board;
    board.addPin(pin);
  });

  return made;
}

/** Starts the app with the given pins selected, chosen from freshly placed gates. */
function running(pick: (board: LogicBoard) => LogicPin[]) {
  render(<App/>);
  const board = shownBoard();
  const pins = pick(board);
  board.setSelectedPins(pins);

  return {board, pins};
}

const pressSpace = () => fireEvent.keyDown(window, {key: ' '});

describe('space over a pin selection', () => {
  test('wires the selected inputs to the selected output', () => {
    const {board} = running(b => {
      const [source, a, c] = [gate(b), gate(b), gate(b)];

      return [source.outputPins[0], a.inputPins[0], c.inputPins[0]];
    });

    pressSpace();

    expect(board.connections.size).toBe(2);
  });

  test('brings the properties panel up and puts the caret in Net Name', () => {
    running(b => {
      const [source, a] = [gate(b), gate(b)];

      return [source.outputPins[0], a.inputPins[0]];
    });

    pressSpace();
    vi.advanceTimersByTime(1);

    expect(screen.getByLabelText('Net Name')).toHaveFocus();
  });

  test('offers the field even when there was nothing to wire', () => {
    // A set of inputs has no output among it to drive them. Putting them on a named net is how
    // they get one, so the panel is exactly what the user needs next.
    const {board} = running(b => {
      const [a, c] = [gate(b), gate(b)];

      return [a.inputPins[0], c.inputPins[0]];
    });

    pressSpace();
    vi.advanceTimersByTime(1);

    expect(board.connections.size).toBe(0);
    expect(screen.getByLabelText('Net Name')).toHaveFocus();
  });

  test('refuses a selection holding two outputs, and says why', () => {
    // Nothing a name could do would make this net exist, so the panel says so against the field
    // rather than the board quietly wiring part of it.
    const {board} = running(b => {
      const [a, c] = [gate(b), gate(b)];

      return [a.outputPins[0], c.outputPins[0]];
    });

    pressSpace();

    expect(board.connections.size).toBe(0);
    expect(screen.getByText(/only be driven by one output/)).toBeInTheDocument();
    expect(screen.getByLabelText('Net Name')).toBeDisabled();
  });

  test('offers the field for a single pin, which has nothing to be wired to', () => {
    const {board} = running(b => [gate(b).outputPins[0]]);

    pressSpace();
    vi.advanceTimersByTime(1);

    expect(board.connections.size).toBe(0);
    expect(screen.getByLabelText('Net Name')).toHaveFocus();
  });

  test('does nothing with no pins selected at all', () => {
    render(<App/>);
    const board = shownBoard();
    gate(board);

    pressSpace();
    vi.advanceTimersByTime(1);

    expect(board.connections.size).toBe(0);
    expect(screen.queryByLabelText('Net Name')).toBeNull();
  });

  test('does nothing with components selected rather than pins', () => {
    render(<App/>);
    const board = shownBoard();
    const [a, c] = [gate(board), gate(board)];
    board.setSelectedComponents([a, c]);

    pressSpace();

    expect(board.connections.size).toBe(0);
  });

  test('is left to the field while a name is being typed into it', () => {
    // Space is a character before it is a shortcut, and net names may hold one.
    const {board} = running(b => {
      const [source, a] = [gate(b), gate(b)];

      return [source.outputPins[0], a.inputPins[0]];
    });
    pressSpace();
    vi.advanceTimersByTime(1);
    const field = screen.getByLabelText('Net Name');
    const before = board.connections.size;

    fireEvent.keyDown(field, {key: ' '});

    expect(board.connections.size).toBe(before);
  });
});

describe('the hint beside a pin', () => {
  test('says how pins are joined', () => {
    running(b => [gate(b).outputPins[0]]);

    expect(screen.getByLabelText(/press Space to wire/i)).toBeInTheDocument();
  });

  test('is reachable by keyboard, so it is not mouse-only advice', () => {
    running(b => [gate(b).outputPins[0]]);

    expect(screen.getByLabelText(/press Space to wire/i)).toHaveAttribute('tabindex', '0');
  });
});

describe('escape', () => {
  test('drops a pin selection', () => {
    const {board} = running(b => [gate(b).outputPins[0], gate(b).inputPins[0]]);

    fireEvent.keyDown(window, {key: 'Escape'});

    expect(board.selectedPins.size).toBe(0);
  });

  test('drops a component selection', () => {
    render(<App/>);
    const board = shownBoard();
    board.setSelectedComponents([gate(board), gate(board)]);

    fireEvent.keyDown(window, {key: 'Escape'});

    expect(board.selectedComponents.size).toBe(0);
  });

  test('takes the caret out of a panel field', () => {
    const {board} = running(b => {
      const [source, a] = [gate(b), gate(b)];

      return [source.outputPins[0], a.inputPins[0]];
    });
    pressSpace();
    vi.advanceTimersByTime(1);
    const field = screen.getByLabelText('Net Name');
    expect(field).toHaveFocus();

    fireEvent.keyDown(field, {key: 'Escape'});

    expect(field).not.toHaveFocus();
    expect(board.selectedPins.size).toBe(0);
  });

  test('reaches the board even though the caret is in a field', () => {
    // Every other shortcut is ignored while typing. This one has to get through, since stepping
    // out of the field is the thing it is for.
    const {board} = running(b => {
      const [source, a] = [gate(b), gate(b)];

      return [source.outputPins[0], a.inputPins[0]];
    });
    pressSpace();
    vi.advanceTimersByTime(1);

    fireEvent.keyDown(screen.getByLabelText('Net Name'), {key: 'Escape'});

    expect(board.selectedPins.size).toBe(0);
  });

  test('leaves the selection alone while a dialog is up', () => {
    // Escape belongs to the dialog there, and closing it is not a reason to lose the selection.
    render(<App/>);
    const board = shownBoard();
    board.setSelectedComponents([gate(board)]);
    fireEvent.click(screen.getByRole('button', {name: 'New board'}));

    fireEvent.keyDown(window, {key: 'Escape'});

    expect(board.selectedComponents.size).toBe(1);
  });
});

describe('the caret space leaves in the net name field', () => {
  test('takes the name already there, so typing replaces it', () => {
    running(b => {
      const [source, a] = [gate(b), gate(b)];
      const chosen = [source.outputPins[0], a.inputPins[0]];
      setNetName(b, chosen, 'clk');

      return chosen;
    });

    pressSpace();
    vi.advanceTimersByTime(1);

    const field = screen.getByLabelText('Net Name') as HTMLInputElement;
    expect(field.value).toBe('clk');
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 'clk'.length]);
  });

  test('leaves nothing selected when the pins have no name yet', () => {
    running(b => {
      const [source, a] = [gate(b), gate(b)];

      return [source.outputPins[0], a.inputPins[0]];
    });

    pressSpace();
    vi.advanceTimersByTime(1);

    const field = screen.getByLabelText('Net Name') as HTMLInputElement;
    expect(field.value).toBe('');
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 0]);
  });
});

describe('the panel keeping up with the board', () => {
  test('shows the net name a pin picks up when it is wired', () => {
    // Connecting moves the input onto its driver's net. The panel read the pins once, when it was
    // built, so the field went on showing what the pin used to be called.
    const {board} = running(b => {
      const [source, a] = [gate(b), gate(b)];
      setNetName(b, [source.outputPins[0]], 'clk');

      return [a.inputPins[0]];
    });
    pressSpace();
    vi.advanceTimersByTime(1);
    expect((screen.getByLabelText('Net Name') as HTMLInputElement).value).toBe('');

    const [source, a] = [...board.components.values()];
    connectPins(board, [source.outputPins[0], a.inputPins[0]]);
    board.updateProperties();

    expect((screen.getByLabelText('Net Name') as HTMLInputElement).value).toBe('clk');
  });

  test('shows a name emptied by a delete', () => {
    const {board} = running(b => {
      const [source, a] = [gate(b), gate(b)];
      const chosen = [source.outputPins[0], a.inputPins[0]];
      setNetName(b, chosen, 'clk');

      return chosen;
    });
    pressSpace();
    vi.advanceTimersByTime(1);
    expect((screen.getByLabelText('Net Name') as HTMLInputElement).value).toBe('clk');

    board.deleteSelection();
    const [source] = [...board.components.values()];
    board.setSelectedPins([source.outputPins[0]]);

    expect((screen.getByLabelText('Net Name') as HTMLInputElement).value).toBe('');
  });

  test('keeps a name being typed while the pins have not moved', () => {
    const {board} = running(b => [gate(b).outputPins[0]]);
    pressSpace();
    vi.advanceTimersByTime(1);
    const field = screen.getByLabelText('Net Name');

    fireEvent.change(field, {target: {value: 'half typ'}});
    board.updateProperties();

    expect((field as HTMLInputElement).value).toBe('half typ');
  });
});

describe('pressing outside the properties panel', () => {
  test('lets go of a field the caret was left in', () => {
    // The board suppresses the browser's own handling of a press, so nothing else takes focus off.
    //
    // Held with shift, which adds to the selection rather than starting a new one. A plain press
    // empties the selection, and the panel then goes with it — which would take the field away
    // whether or not anything had let go of it.
    running(b => {
      const [source, a] = [gate(b), gate(b)];

      return [source.outputPins[0], a.inputPins[0]];
    });
    pressSpace();
    vi.advanceTimersByTime(1);
    const field = screen.getByLabelText('Net Name');
    expect(field).toHaveFocus();

    fireEvent.mouseDown(document.querySelector('.board-wrapper')!, {shiftKey: true});

    expect(field).toBeInTheDocument();
    expect(field).not.toHaveFocus();
  });

  test('holds on to it while the press is inside the panel', () => {
    running(b => {
      const [source, a] = [gate(b), gate(b)];

      return [source.outputPins[0], a.inputPins[0]];
    });
    pressSpace();
    vi.advanceTimersByTime(1);
    const field = screen.getByLabelText('Net Name');

    fireEvent.mouseDown(field.closest('.properties-content')!);

    expect(field).toHaveFocus();
  });

  test('lets go of the field without touching the selection, unlike Escape', () => {
    // Somewhere that is neither the panel nor the board: pressing the board starts a fresh
    // selection under its own rules, which would hide whether this handler did anything.
    const {board} = running(b => {
      const [source, a] = [gate(b), gate(b)];

      return [source.outputPins[0], a.inputPins[0]];
    });
    pressSpace();
    vi.advanceTimersByTime(1);
    const field = screen.getByLabelText('Net Name');

    fireEvent.mouseDown(document.body);

    expect(field).not.toHaveFocus();
    expect(board.selectedPins.size).toBe(2);
  });
});
