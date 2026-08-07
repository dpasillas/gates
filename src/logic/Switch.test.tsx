import React from 'react';
import {fireEvent, render} from '@testing-library/react';

import {Switch} from './Switch';
import {LogicState} from './LogicState';
import {GLOBAL_SCOPE} from '../Constants';

const scope = GLOBAL_SCOPE;

function bank(width: number): Switch {
  return new Switch({scope, subtype: 1, width});
}

/** Which toggles are drawn as on, in bit order. */
function litToggles(component: Switch): boolean[] {
  const {container} = render(<svg>{component.extraRender()}</svg>);

  return [...container.querySelectorAll('g.switch')].map(g => g.classList.contains('on'));
}

/** Drives every bit low, so nothing is left at the unknown state a reset leaves behind. */
function clear(component: Switch) {
  component.outputPins.forEach(pin => pin.setLogicState(new LogicState({v: 0})));
}

describe('Switch geometry', () => {
  test('is a square at its smallest', () => {
    const {width, height} = bank(1).body.bounds;

    expect(width).toBe(32);
    expect(height).toBe(32);
  });

  test('grows downward, not sideways', () => {
    const narrow = bank(1).body.bounds;
    const wide = bank(8).body.bounds;

    expect(wide.width).toBe(narrow.width);
    expect(wide.height).toBeGreaterThan(narrow.height);
  });

  test('gives each toggle less room than the minimum square', () => {
    // Two toggles still fit inside the 32-unit minimum, which they would not at a square each.
    expect(bank(2).body.bounds.height).toBe(32);
    expect(bank(4).body.bounds.height).toBe(64);
  });

  test('puts the least significant bit at the bottom', () => {
    // Matching the channel order of the bus components, so a bank wires straight across to one.
    const ys = bank(4).outputPins.map(p => p.pos.y);

    expect(ys[0]).toBeGreaterThan(ys[3]);
    expect(new Set(ys).size).toBe(4);
  });

  test('spaces its pins far enough apart to aim at individually', () => {
    // Two anchor radii, or neighbouring pins would overlap where they are grabbed.
    const ys = bank(8).outputPins.map(p => p.pos.y).sort((a, b) => a - b);
    const gaps = ys.slice(1).map((y, i) => y - ys[i]);

    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(10);
  });

  test('centres a single toggle in the minimum square', () => {
    const [pin] = bank(1).outputPins;

    expect(pin.pos.y).toBeCloseTo(16);
  });
});

describe('Switch pins', () => {
  test('gives every bit its own pin by default', () => {
    const component = bank(4);

    expect(component.isMerged).toBe(false);
    expect(component.outputPins).toHaveLength(4);
    expect(component.outputPins.every(p => p.width === 1)).toBe(true);
  });

  test('collapses onto one bus when merged', () => {
    const component = bank(4);

    component.isMerged = true;

    expect(component.outputPins).toHaveLength(1);
    expect(component.outputPins[0].width).toBe(4);
  });

  test('expands back to one pin per bit', () => {
    const component = bank(4);

    component.isMerged = true;
    component.isMerged = false;

    expect(component.outputPins).toHaveLength(4);
    expect(component.outputPins.every(p => p.width === 1)).toBe(true);
  });

  test('offers merging as a property', () => {
    const merged = bank(4).properties().find(p => p.key === 'merged')!;

    expect(merged.kind).toBe('boolean');
    expect(merged.editable).toBe(true);
    expect(merged.value).toBe(0);
  });
});

describe('Switch interaction area', () => {
  test('is the track and the thumb, and nothing else', () => {
    // A row responds where the control is drawn rather than across the blank body beside it, so
    // there is no invisible catcher spanning the row.
    const {container} = render(<svg>{bank(2).extraRender()}</svg>);
    const [row] = [...container.querySelectorAll('g.switch')];

    expect([...row.children].map(c => c.getAttribute('class')))
      .toEqual(['switch-track', 'switch-thumb']);
  });

  test('the track is thinner than the thumb that rides it', () => {
    const {container} = render(<svg>{bank(1).extraRender()}</svg>);
    const track = container.querySelector('.switch-track')!;
    const thumb = container.querySelector('.switch-thumb')!;

    const trackHeight = Number(track.getAttribute('height'));
    const thumbDiameter = 2 * Number(thumb.getAttribute('r'));

    expect(trackHeight).toBeLessThan(thumbDiameter);
    // Rounded to a pill, so the corner radius has to follow the height.
    expect(Number(track.getAttribute('rx'))).toBeCloseTo(trackHeight / 2);
  });

  test('the thumb stays within the body at both ends of its travel', () => {
    const off = bank(1);
    clear(off);
    const on = bank(1);
    clear(on);
    on.handleClick(0);

    const edge = (component: Switch) => {
      const {container} = render(<svg>{component.extraRender()}</svg>);
      const thumb = container.querySelector('.switch-thumb')!;
      const cx = Number(thumb.getAttribute('cx'));
      const r = Number(thumb.getAttribute('r'));
      return {left: cx - r, right: cx + r};
    };

    expect(edge(off).left).toBeGreaterThanOrEqual(0);
    expect(edge(on).right).toBeLessThanOrEqual(32);
  });

  test('flipping a toggle does not select the component underneath', () => {
    // The toggle sits inside the group that selects and drags the component, so the event has to
    // stop there or a click would pick the switch up on its way to flipping a bit.
    const component = bank(2);
    const onGateMouseDown = vi.fn();
    const {container} = render(<svg>{component.render({onGateMouseDown})}</svg>);

    fireEvent.mouseDown(container.querySelector('.switch-track')!);
    fireEvent.mouseDown(container.querySelector('.switch-thumb')!);

    expect(onGateMouseDown).not.toHaveBeenCalled();
  });

  test('but pressing the body still does', () => {
    const component = bank(2);
    const onGateMouseDown = vi.fn();
    const {container} = render(<svg>{component.render({onGateMouseDown})}</svg>);

    fireEvent.mouseDown(container.querySelector('g.component > g > path')!);

    expect(onGateMouseDown).toHaveBeenCalled();
  });
});

describe('toggling a Switch', () => {
  test('drives only the bit that was clicked', () => {
    const component = bank(4);
    clear(component);

    component.handleClick(2);

    expect(component.outputPins.map(p => p.state.v)).toEqual([0, 0, 1, 0]);
  });

  test('toggles back off', () => {
    const component = bank(4);
    clear(component);

    component.handleClick(1);
    component.handleClick(1);

    expect(component.outputPins[1].state.v).toBe(0);
  });

  test('sets the matching bit of the bus when merged', () => {
    const component = bank(4);
    component.isMerged = true;
    clear(component);

    component.handleClick(0);
    component.handleClick(3);

    expect(component.outputPins[0].state.v).toBe(0b1001);
  });

  test('shows the toggles it has driven', () => {
    const component = bank(4);
    clear(component);

    component.handleClick(0);
    component.handleClick(2);

    expect(litToggles(component)).toEqual([true, false, true, false]);
  });

  test('reads the bus per bit when merged', () => {
    const component = bank(4);
    component.isMerged = true;
    component.outputPins[0].setLogicState(new LogicState({v: 0b0110}));

    expect(litToggles(component)).toEqual([false, true, true, false]);
  });

  test('draws one toggle per bit', () => {
    expect(litToggles(bank(6))).toHaveLength(6);
  });
});
