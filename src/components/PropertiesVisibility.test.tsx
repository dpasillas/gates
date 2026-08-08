import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {Properties} from './Properties';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicGate} from '../logic/LogicGate';
import {GateType} from '../enums/GateType';

/** A board with one gate, optionally already selected. */
function board(selected = false) {
  const logicBoard = new LogicBoard();
  const gate = new LogicGate({scope: logicBoard.scope, subtype: GateType.AND, board: logicBoard});
  logicBoard.addComponent(gate);
  if (selected) {
    logicBoard.selectedComponents.add(gate);
  }

  return {logicBoard, gate};
}

const tab = () => screen.getByLabelText('Properties panel');
const floatButton = () => screen.getByLabelText(/Float panel|Dock panel/);

/**
 * Whether the panel is actually on screen.
 *
 * The docked panel stays in the document when hidden and slides out of view by a class, so its
 * presence says nothing; the floating one is mounted only while shown.
 */
function shown(): boolean {
  const docked = document.querySelector('.properties-panel');
  const floating = document.querySelector('.properties-floating');

  return Boolean(floating)
    || Boolean(docked && !docked.classList.contains('properties-collapsed'));
}

describe('showing the properties panel', () => {
  test('starts closed', () => {
    render(<Properties board={board().logicBoard}/>);

    expect(shown()).toBe(false);
    expect(tab()).toHaveAttribute('aria-pressed', 'false');
  });

  test('the rail tab opens and closes it', () => {
    render(<Properties board={board().logicBoard}/>);

    fireEvent.click(tab());
    expect(shown()).toBe(true);

    fireEvent.click(tab());
    expect(shown()).toBe(false);
  });

  test('the rail tab still closes it once it is floating', () => {
    // The floating panel used to be shown whenever it was undocked, so the tab appeared to do
    // nothing until the panel was put back.
    render(<Properties board={board().logicBoard}/>);
    fireEvent.click(tab());
    fireEvent.click(floatButton());
    expect(shown()).toBe(true);

    fireEvent.click(tab());

    expect(shown()).toBe(false);
    expect(tab()).toHaveAttribute('aria-pressed', 'false');
  });

  test('the rail tab opens it again while floating', () => {
    render(<Properties board={board().logicBoard}/>);
    fireEvent.click(tab());
    fireEvent.click(floatButton());
    fireEvent.click(tab());

    fireEvent.click(tab());

    expect(shown()).toBe(true);
  });

  test('a floating panel has its own way out', () => {
    render(<Properties board={board().logicBoard}/>);
    fireEvent.click(tab());
    fireEvent.click(floatButton());

    fireEvent.click(screen.getByLabelText('Hide panel'));

    expect(shown()).toBe(false);
    expect(tab()).toHaveAttribute('aria-pressed', 'false');
  });

  test('a docked panel has no close button, since the tab is right there', () => {
    render(<Properties board={board().logicBoard}/>);
    fireEvent.click(tab());

    expect(screen.queryByLabelText('Hide panel')).toBeNull();
  });

  test('docking is offered as an edge to sit against, not as a pin', () => {
    render(<Properties board={board().logicBoard}/>);
    fireEvent.click(tab());
    fireEvent.click(floatButton());

    expect(screen.getByLabelText('Dock panel')).toBeInTheDocument();
    expect(screen.queryByTestId('PushPinIcon')).toBeNull();
    expect(screen.getByTestId('AlignHorizontalRightIcon')).toBeInTheDocument();
  });
});

describe('revealing the panel from a right-click', () => {
  test('comes up without the tab having been used', () => {
    const {logicBoard} = board(true);
    render(<Properties board={logicBoard}/>);

    logicBoard.revealProperties();

    expect(shown()).toBe(true);
    expect(tab()).toHaveAttribute('aria-pressed', 'true');
  });

  test('goes away once the selection it described is gone', () => {
    const {logicBoard} = board(true);
    render(<Properties board={logicBoard}/>);
    logicBoard.revealProperties();

    logicBoard.clearSelection();
    logicBoard.updateProperties();

    expect(shown()).toBe(false);
  });

  test('the rail tab puts it away too', () => {
    const {logicBoard} = board(true);
    render(<Properties board={logicBoard}/>);
    logicBoard.revealProperties();

    fireEvent.click(tab());

    expect(shown()).toBe(false);
  });

  test('does not close a panel the tab is holding open', () => {
    // Opened deliberately, the panel stays put when a selection comes and goes.
    const {logicBoard} = board(true);
    render(<Properties board={logicBoard}/>);
    fireEvent.click(tab());
    logicBoard.revealProperties();

    logicBoard.clearSelection();
    logicBoard.updateProperties();

    expect(shown()).toBe(true);
  });

  test('reaches a floating panel as well as a docked one', () => {
    const {logicBoard} = board(true);
    render(<Properties board={logicBoard}/>);
    fireEvent.click(tab());
    fireEvent.click(floatButton());
    fireEvent.click(tab());
    expect(shown()).toBe(false);

    logicBoard.revealProperties();

    expect(shown()).toBe(true);
  });
});
