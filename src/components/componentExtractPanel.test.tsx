import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {App} from './App';
import {Part} from './Part';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/**
 * Taking a component's board back out, from the panel.
 *
 * The name is asked for rather than derived: the project may already have a board going by the one
 * the component recorded, and telling the two apart is the point.
 */

const {ResizeObserver} = window;

const EDITOR = {width: 800, height: 600};

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = vi.fn().mockImplementation(function () {
    return {observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn()};
  });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    ...EDITOR, left: 0, top: 0, right: EDITOR.width, bottom: EDITOR.height, x: 0, y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  window.ResizeObserver = ResizeObserver;
  Part.data = undefined;
  vi.restoreAllMocks();
});

/** Drops a gate onto the editor, the way the parts drawer hands one over. */
function dropGate(container: HTMLElement) {
  Part.data = new Part({type: PartType.GATE, subtype: GateType.AND});

  const event = new MouseEvent('drop', {bubbles: true, cancelable: true});
  Object.defineProperty(event, 'clientX', {value: 100});
  Object.defineProperty(event, 'clientY', {value: 100});
  Object.defineProperty(event, 'dataTransfer', {value: {effectAllowed: ''}});
  container.querySelector('.board-wrapper')!.dispatchEvent(event);
}

/**
 * The running app with a component built from the board in front, its panel row opened.
 *
 * Built through the interface rather than handed a project: the app owns its own, so a board with a
 * port on it is the only way to reach the dialog that makes a component.
 */
function opened() {
  const {container} = render(<App/>);
  dropGate(container);

  // The last pin is the gate's output, which is the one a port can take a name alone on.
  const pins = container.querySelectorAll('g.pin');
  fireEvent.mouseDown(pins[pins.length - 1], {button: 0});
  fireEvent.mouseUp(window, {button: 0});

  fireEvent.click(screen.getByLabelText('Properties panel'));
  fireEvent.change(screen.getByLabelText('Port Name'), {target: {value: 'y'}});
  fireEvent.click(screen.getByRole('button', {name: 'Set port name'}));

  fireEvent.click(screen.getByRole('tab', {name: 'Project'}));
  fireEvent.click(screen.getByRole('button', {name: '+ Component'}));
  fireEvent.change(screen.getByLabelText('Component name'), {target: {value: 'made1'}});
  fireEvent.click(screen.getByRole('button', {name: 'Save Component'}));
  fireEvent.click(screen.getByText('made1'));
}

const boardNames = () =>
    [...document.querySelectorAll('.project-rows .project-row .project-row-name')]
        .map(row => row.textContent);

const extract = () =>
    fireEvent.click(screen.getByRole('button', {name: 'Extract board from made1'}));

describe('extracting a board from the panel', () => {
  test('asks for a name before making anything', () => {
    opened();
    const before = boardNames().length;

    extract();

    expect(screen.getByText('Extract Board')).toBeInTheDocument();
    expect(boardNames()).toHaveLength(before);
  });

  test('offers the name the component stored', () => {
    opened();

    extract();

    expect((screen.getByLabelText('Board name') as HTMLInputElement).value).toBe('untitled');
  });

  test('makes nothing when the prompt is cancelled', () => {
    opened();
    const before = boardNames().length;

    extract();
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(boardNames()).toHaveLength(before);
  });

  test('makes the board under the name it was given', () => {
    opened();

    extract();
    fireEvent.change(screen.getByLabelText('Board name'), {target: {value: 'core fork'}});
    fireEvent.click(screen.getByRole('button', {name: 'Extract'}));

    expect(boardNames()).toContain('core fork');
  });
});
