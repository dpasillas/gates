import React from 'react';
import {render} from '@testing-library/react';

import {Board} from './Board';
import {LogicBoard} from '../logic/LogicBoard';
import {PinType} from '../logic/LogicPin';
import {GLOBAL_SCOPE} from '../Constants';
import {PackageComponent} from '../logic/PackageComponent';
import {makeComponent} from '../logic/componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

const {ResizeObserver} = window;

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = vi.fn().mockImplementation(function () {
    return {observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn()};
  });
});

afterEach(() => {
  window.ResizeObserver = ResizeObserver;
  vi.restoreAllMocks();
});

/** A board holding a joiner, which has single-bit pins on one side and a bus on the other. */
function board(): HTMLElement {
  const made = new LogicBoard();
  const joiner = makeComponent({type: PartType.BUS, subtype: 0, scope: made.scope, board: made});
  joiner.geometry.position = new made.scope.Point(80, 80);
  made.addComponent(joiner);

  return render(<Board board={made}/>).container;
}

/** A package with the same mix: two single-bit pins and one carrying a bus. */
function symbol(): HTMLElement {
  const pkg = new PackageComponent({scope: GLOBAL_SCOPE, name: 'p'});
  pkg.declarePin({label: 'a', pinType: PinType.INPUT});
  pkg.declarePin({label: 'b', pinType: PinType.INPUT});
  pkg.declarePin({label: 'y', pinType: PinType.OUTPUT, width: 8});

  return render(<svg>{pkg.render()}</svg>).container;
}

describe('the one way the app draws a pin', () => {
  // A board pin and a package pin are the same thing seen in two places. Drawing them through one
  // component is what keeps them from drifting; two renderers that merely resemble each other did.
  test('is used on a board', () => {
    expect(board().querySelectorAll('.pin-outline').length).toBeGreaterThan(0);
  });

  test('is used on a package symbol', () => {
    expect(symbol().querySelectorAll('.pin-outline')).toHaveLength(3);
  });

  test('says a bus the same way in both, with a slash and nothing else', () => {
    expect(board().querySelectorAll('.pin-bus')).toHaveLength(1);
    expect(symbol().querySelectorAll('.pin-bus')).toHaveLength(1);
  });

  test('leaves single-bit pins unmarked in both', () => {
    const onBoard = board().querySelectorAll('.pin-outline').length
        - board().querySelectorAll('.pin-bus').length;

    expect(onBoard).toBeGreaterThan(0);
    expect(symbol().querySelectorAll('.pin-outline').length
        - symbol().querySelectorAll('.pin-bus').length).toBe(2);
  });

  test('draws nothing else to say a pin is wide, the hatch having gone with it', () => {
    expect(board().querySelectorAll('.wide')).toHaveLength(0);
    expect(symbol().querySelectorAll('.wide')).toHaveLength(0);
  });
});

describe('a gate whose pins meet a curved body', () => {
  test('still has its pins trimmed to it', () => {
    const made = new LogicBoard();
    const gate = makeComponent(
        {type: PartType.GATE, subtype: GateType.OR, scope: made.scope, board: made});
    made.addComponent(gate);
    const container = render(<Board board={made}/>).container;

    const outlines = [...container.querySelectorAll('.pin-outline')]
        .map(path => path.getAttribute('d') ?? '');

    expect(outlines.length).toBeGreaterThan(0);
    outlines.forEach(d => expect(d).not.toBe(''));
  });
});
