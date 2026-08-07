import {Splitter} from './Splitter';
import {Joiner} from './Joiner';
import {LogicComponent} from './LogicComponent';
import {LogicPin} from './LogicPin';
import {LogicState} from './LogicState';
import {GLOBAL_SCOPE} from '../Constants';

/**
 * Captures what a component posts instead of letting it reach a board.
 *
 * The components are tested through the same entry point the simulation uses, so the assertions
 * describe what a neighbouring component would actually observe.
 */
function capture(component: LogicComponent): Map<LogicPin, LogicState> {
  const posted = new Map<LogicPin, LogicState>();
  component.postEvent = (state, pin) => {posted.set(pin ?? component.outputPins[0], state)};

  return posted;
}

function splitter(width: number): Splitter {
  return new Splitter({scope: GLOBAL_SCOPE, subtype: 0, width});
}

function joiner(width: number): Joiner {
  return new Joiner({scope: GLOBAL_SCOPE, subtype: 1, width});
}

/** The values a splitter drives onto its channels, least significant bit first. */
function channels(component: Splitter, posted: Map<LogicPin, LogicState>): LogicState[] {
  return component.outputPins.map(pin => posted.get(pin)!);
}

describe('Splitter', () => {
  test('drives one channel per bit of the bus', () => {
    const component = splitter(4);

    expect(component.inputPins).toHaveLength(1);
    expect(component.inputPins[0].width).toBe(4);
    expect(component.outputPins).toHaveLength(4);
    expect(component.outputPins.every(p => p.width === 1)).toBe(true);
  });

  test('sends each bit to its own channel, least significant first', () => {
    const component = splitter(4);
    const posted = capture(component);

    component.inputPins[0].setLogicState(new LogicState({v: 0b1010}));

    expect(channels(component, posted).map(s => s.v)).toEqual([0, 1, 0, 1]);
  });

  test('carries unknown and floating bits through to the channel they belong to', () => {
    const component = splitter(4);
    const posted = capture(component);

    component.inputPins[0].setLogicState(new LogicState({v: 0b0001, x: 0b0010, z: 0b0100}));

    const states = channels(component, posted);
    expect(states[0]).toEqual(new LogicState({v: 1}));
    expect(states[1]).toEqual(new LogicState({x: 1}));
    expect(states[2]).toEqual(new LogicState({z: 1}));
    expect(states[3]).toEqual(new LogicState({v: 0}));
  });

  test('does not smear the top bit across the channels above it', () => {
    // A 32-bit bus sets the sign bit, where an arithmetic shift would report every higher channel
    // as one as well. There are none above bit 31, but bit 31 itself must still read as a single
    // bit rather than as a negative number.
    const component = splitter(32);
    const posted = capture(component);

    component.inputPins[0].setLogicState(new LogicState({v: 1 << 31}));

    const states = channels(component, posted);
    expect(states[31].v).toBe(1);
    expect(states.slice(0, 31).every(s => s.v === 0)).toBe(true);
  });

  test('puts the least significant channel at the bottom', () => {
    const component = splitter(4);

    const ys = component.outputPins.map(pin => pin.pos.y);
    expect(ys[0]).toBeGreaterThan(ys[3]);
    // Evenly spaced, so no two channels share a row.
    expect(new Set(ys).size).toBe(4);
  });

  test('grows the body to fit the channels', () => {
    const narrow = splitter(2).body.bounds.height;
    const wide = splitter(8).body.bounds.height;

    expect(wide).toBeGreaterThan(narrow);
  });
});

describe('Joiner', () => {
  test('takes one single-bit channel per bit of the bus', () => {
    const component = joiner(4);

    expect(component.inputPins).toHaveLength(4);
    expect(component.inputPins.every(p => p.width === 1)).toBe(true);
    expect(component.outputPins).toHaveLength(1);
    expect(component.outputPins[0].width).toBe(4);
  });

  test('gathers the channels into a bus, least significant first', () => {
    const component = joiner(4);
    const posted = capture(component);

    component.inputPins[0].setLogicState(new LogicState({v: 1}));
    component.inputPins[2].setLogicState(new LogicState({v: 1}));

    expect(posted.get(component.outputPins[0])!.v).toBe(0b0101);
  });

  test('reports each channel error on the bit it came from', () => {
    const component = joiner(4);
    const posted = capture(component);

    // Every channel is driven, including the well-behaved ones: an unwired channel stays floating
    // from reset, which would otherwise be indistinguishable from the floating bit under test.
    component.inputPins[0].setLogicState(new LogicState({v: 1}));
    component.inputPins[1].setLogicState(new LogicState({x: 1}));
    component.inputPins[2].setLogicState(new LogicState({v: 0}));
    component.inputPins[3].setLogicState(new LogicState({z: 1}));

    const state = posted.get(component.outputPins[0])!;
    expect(state.v).toBe(0b0001);
    expect(state.x).toBe(0b0010);
    expect(state.z).toBe(0b1000);
  });
});

describe('bus round trip', () => {
  test('a value split apart and rejoined is the value it started as', () => {
    const apart = splitter(6);
    const together = joiner(6);
    const posted = capture(together);
    // Feeding the states across by hand rather than wiring the two up, so the assertion is about
    // the bit ordering the two components agree on and not about connection handling.
    apart.postEvent = (state, pin) => {
      const bit = apart.outputPins.indexOf(pin!);
      together.inputPins[bit].setLogicState(state);
    };

    apart.inputPins[0].setLogicState(new LogicState({v: 0b101101}));

    expect(posted.get(together.outputPins[0])!.v).toBe(0b101101);
  });
});

describe('changing bus width', () => {
  test('keeps the channels that still exist', () => {
    const component = splitter(4);
    const [bit0, bit1] = component.outputPins;

    component.width = 6;

    expect(component.outputPins).toHaveLength(6);
    expect(component.outputPins[0]).toBe(bit0);
    expect(component.outputPins[1]).toBe(bit1);
  });

  test('drops the channels that no longer exist', () => {
    const component = splitter(4);
    const removed = component.outputPins[3];

    component.width = 2;

    expect(component.outputPins).toHaveLength(2);
    expect(component.outputPins).not.toContain(removed);
  });

  test('rewidens the bus pin, dropping the connection it can no longer carry', () => {
    // Pins may only join pins of equal width, so a connection made at the old width would be
    // illegal at the new one.
    const component = splitter(4);
    const source = new Joiner({scope: GLOBAL_SCOPE, subtype: 1, width: 4});
    component.inputPins[0].connectTo(source.outputPins[0]);
    expect(component.inputPins[0].connections.size).toBe(1);

    component.width = 8;

    expect(component.inputPins[0].width).toBe(8);
    expect(component.inputPins[0].connections.size).toBe(0);
  });
});

describe('bus width property', () => {
  test('is adjustable and cannot be narrowed to a single channel', () => {
    const width = splitter(4).properties().find(p => p.key === 'width')!;

    expect(width.editable).toBe(true);
    expect(width.min).toBe(2);
    expect(width.max).toBe(32);
  });
});
