import React from 'react';
import {render} from '@testing-library/react';

import {SegmentDisplay} from './SegmentDisplay';
import {Joiner} from './Joiner';
import {LogicState} from './LogicState';
import {GLOBAL_SCOPE} from '../Constants';
import {DIGIT_HEIGHT, DIGIT_WIDTH, digitOverhang} from '../util/segments';

/** Subtype for each layout, as the parts list registers them. */
const SUBTYPE = {7: 1, 14: 2, 16: 3} as const;

function display(segments: 7 | 14 | 16): SegmentDisplay {
  return new SegmentDisplay({scope: GLOBAL_SCOPE, subtype: SUBTYPE[segments]});
}

/** A display wired segment by segment, rather than from a bus as they come by default. */
function separate(segments: 7 | 14 | 16): SegmentDisplay {
  return new SegmentDisplay({scope: GLOBAL_SCOPE, subtype: SUBTYPE[segments], isMerged: false});
}

/** The class list of each rendered segment, in bit order. */
function renderedStates(component: SegmentDisplay): string[] {
  const {container} = render(<svg>{component.extraRender()}</svg>);

  return [...container.querySelectorAll('path.segment')]
    .map(p => p.getAttribute('class')!.replace('segment ', ''));
}

/** Drives every input of an unmerged display, so nothing is left floating from reset. */
function driveAll(component: SegmentDisplay, bits: number) {
  component.inputPins.forEach((pin, i) => {
    pin.setLogicState(new LogicState({v: (bits >>> i) & 1}));
  });
}

describe('SegmentDisplay', () => {
  test.each([7, 14, 16] as const)('a %i-segment display arrives on one bus', segments => {
    // A display is normally fed a whole character at once, so that is how it starts.
    const component = display(segments);

    expect(component.segments).toBe(segments);
    expect(component.isMerged).toBe(true);
    expect(component.inputPins).toHaveLength(1);
    expect(component.inputPins[0].width).toBe(segments);
  });

  test.each([7, 14, 16] as const)('a separated %i-segment display takes one pin per segment',
                                  segments => {
    const component = separate(segments);

    expect(component.inputPins).toHaveLength(segments);
    expect(component.inputPins.every(p => p.width === 1)).toBe(true);
  });

  test('draws nothing on the body but the digit', () => {
    // The displays this copies carry no pin labels, and the body is sized for the digit alone.
    const component = separate(16);

    expect(component.inputPins.every(p => p.label === undefined)).toBe(true);
  });

  test('splits the pins across both edges once there are too many for one', () => {
    const seven = separate(7);
    const sixteen = separate(16);

    // A 7-segment display fits on one edge; the wider layouts do not.
    expect(new Set(seven.inputPins.map(p => p.pos.x)).size).toBe(1);
    expect(new Set(sixteen.inputPins.map(p => p.pos.x)).size).toBe(2);
  });

  test.each([7, 14, 16] as const)('the %i-segment digit fits inside the body', segments => {
    const component = display(segments);
    const {container} = render(<svg>{component.extraRender()}</svg>);
    const transform = container.querySelector('g')!.getAttribute('transform')!;
    const [, left, top] = transform.match(/translate\((-?[\d.]+) (-?[\d.]+)\)/)!.map(Number);
    const body = component.body.bounds;
    const overhang = digitOverhang(segments);

    expect(left - overhang.x).toBeGreaterThan(0);
    expect(left + DIGIT_WIDTH + overhang.x).toBeLessThan(body.width);
    expect(top - overhang.y).toBeGreaterThan(0);
    expect(top + DIGIT_HEIGHT + overhang.y).toBeLessThan(body.height);
  });

  test('lights the segments whose bits are set', () => {
    const component = separate(7);

    driveAll(component, 0b0000101);

    expect(renderedStates(component))
      .toEqual(['on', 'off', 'on', 'off', 'off', 'off', 'off']);
  });

  test('shows an unknown bit as an error rather than as unlit', () => {
    const component = separate(7);
    driveAll(component, 0);

    component.inputPins[2].setLogicState(new LogicState({x: 1}));

    expect(renderedStates(component)[2]).toBe('error');
  });

  test('leaves an undriven segment unlit', () => {
    // Every pin floats after reset, which is the state a display sits in before it is wired up.
    const component = display(7);

    expect(renderedStates(component).every(s => s === 'off')).toBe(true);
  });
});

describe('merging a display', () => {
  test('collapses the pins into one bus as wide as the display', () => {
    const component = separate(16);

    component.isMerged = true;

    expect(component.inputPins).toHaveLength(1);
    expect(component.inputPins[0].width).toBe(16);
  });

  test('lights segments from the bits of the bus, first segment most significant', () => {
    const component = display(7);

    // The top two bits of the seven, which are segments a and c.
    component.inputPins[0].setLogicState(new LogicState({v: 0b1010000}));

    expect(renderedStates(component))
      .toEqual(['on', 'off', 'on', 'off', 'off', 'off', 'off']);
  });

  test.each([7, 14, 16] as const)(
    'a %i-segment display fed from a joiner lights up as its separated pins are laid out',
    segments => {
      // This is the whole reason for the bit order. A joiner carries its most significant channel
      // at the top, and a separated display has its first segment at the top, so merging only
      // leaves the display looking the same if the first segment takes the most significant bit.
      const joiner = new Joiner({scope: GLOBAL_SCOPE, subtype: 1, width: segments});
      const byHeight = <T,>(items: T[], y: (item: T) => number) =>
        items.map((item, i) => ({i, y: y(item)})).sort((l, r) => l.y - r.y);

      const channels = byHeight(joiner.inputPins, p => p.pos.y);
      const pins = byHeight(separate(segments).inputPins, p => p.pos.y);
      const topChannel = channels[0].i;
      const bottomChannel = channels[channels.length - 1].i;

      const lit = (bit: number) => {
        const merged = display(segments);
        merged.inputPins[0].setLogicState(new LogicState({v: 1 << bit}));
        return renderedStates(merged).indexOf('on');
      };

      // The channel at the top of the joiner drives the segment whose separated pin is at the top.
      expect(lit(topChannel)).toBe(pins[0].i);
      expect(lit(bottomChannel)).toBe(pins[pins.length - 1].i);
    });

  test('separates back into one pin per segment', () => {
    const component = display(14);

    component.isMerged = false;

    expect(component.inputPins).toHaveLength(14);
    expect(component.inputPins.every(p => p.width === 1)).toBe(true);
  });
});

describe('segment display properties', () => {
  test('offers the merge toggle as a boolean, set by default', () => {
    const merged = display(7).properties().find(p => p.key === 'merged')!;

    expect(merged.kind).toBe('boolean');
    expect(merged.editable).toBe(true);
    expect(merged.value).toBe(1);
  });

  test('reports the bit width the wiring implies, and does not let it be set', () => {
    const component = display(7);
    const widthOf = () => component.properties().find(p => p.key === 'width')!;

    expect(widthOf().value).toBe(7);
    expect(widthOf().editable).toBe(false);

    component.isMerged = false;

    expect(widthOf().value).toBe(1);
    expect(widthOf().editable).toBe(false);
  });

  test('has no delay to configure', () => {
    // A display only consumes, so there is no output for a propagation delay to apply to.
    expect(display(7).properties().find(p => p.key === 'delay')).toBeUndefined();
  });

  test('toggling merge through the property rebuilds the pins', () => {
    const component = display(7);
    const merged = component.properties().find(p => p.key === 'merged')!;

    merged.setValue(0);

    expect(component.isMerged).toBe(false);
    expect(component.inputPins).toHaveLength(7);
  });
});
