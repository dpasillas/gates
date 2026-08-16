import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {Board} from './Board';
import {Properties} from './Properties';
import {LogicBoard} from '../logic/LogicBoard';
import {PinType} from '../logic/LogicPin';
import {makeComponent} from '../logic/componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';
import {setPort} from '../logic/nets';

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = vi.fn().mockImplementation(function () {
    return {observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn()};
  });
});

/** The board and the panel side by side, as the app has them. */
function editor() {
  const board = new LogicBoard();
  board.highlightPorts = true;

  const gate = makeComponent({
    type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board,
  });
  board.addComponent(gate);
  setPort(board, gate.pins().find(pin => pin.pinType === PinType.INPUT)!, true, 'a');
  board.setSelectedComponents([gate]);

  const {container} = render(
      <><Board board={board}/><Properties board={board}/></>
  );

  return {board, gate, container};
}

function nameTurn(container: HTMLElement): string {
  const name = container.querySelector('g.port-name')!;

  return /rotate\((-?[\d.]+) /.exec(name.getAttribute('transform') ?? '')![1];
}

test('a port name follows its component when the angle is changed from the panel', () => {
  // The component redraws itself, but the names are a layer the board draws, so a panel that only
  // re-rendered itself left them showing where the pins used to be until something else redrew.
  const {container} = editor();
  expect(nameTurn(container)).toBe('0');

  fireEvent.change(screen.getByLabelText('Angle'), {target: {value: '90'}});

  expect(nameTurn(container)).toBe('-90');
});
