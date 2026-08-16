import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {Properties} from './Properties';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicGate} from '../logic/LogicGate';
import {LogicPin} from '../logic/LogicPin';
import {GateType} from '../enums/GateType';

function board() {
  const logicBoard = new LogicBoard();
  const gate = (subtype: GateType) => {
    const made = new LogicGate({scope: logicBoard.scope, subtype, board: logicBoard});
    made.pins().forEach(pin => {
      pin.board = logicBoard;
      logicBoard.addPin(pin);
    });

    return made;
  };

  return {logicBoard, gate};
}

/** Renders the panel open, with the given pins selected. */
function showing(logicBoard: LogicBoard, ...pins: LogicPin[]) {
  pins.forEach(pin => logicBoard.selectedPins.add(pin));
  render(<Properties board={logicBoard}/>);
  fireEvent.click(screen.getByLabelText('Properties panel'));
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const setNet = () => screen.getByRole('button', {name: 'Set net name'});
const setPortName = () => screen.getByRole('button', {name: 'Set port name'});

describe('pin properties', () => {
  test('shows what a pin is rather than what a component is', () => {
    const {logicBoard, gate} = board();
    showing(logicBoard, gate(GateType.AND).outputPins[0]);

    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('Bit Width')).toBeInTheDocument();
    expect(field('Net Name')).toBeInTheDocument();
  });

  test('reports the width but does not offer to change it here', () => {
    // Width follows from the component the pin belongs to.
    const {logicBoard, gate} = board();
    const wide = gate(GateType.AND);
    wide.width = 8;
    showing(logicBoard, wide.outputPins[0]);

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bit Width')).toBeNull();
  });

  test('applies a net name only when the button is used', () => {
    const {logicBoard, gate} = board();
    const pin = gate(GateType.AND).outputPins[0];
    showing(logicBoard, pin);

    fireEvent.change(field('Net Name'), {target: {value: 'clk'}});
    expect(pin.netName).toBe('');

    fireEvent.click(setNet());

    expect(pin.netName).toBe('clk');
  });

  test('warns before taking another output off a net, without refusing', () => {
    const {logicBoard, gate} = board();
    const resident = gate(GateType.AND).outputPins[0];
    const arriving = gate(GateType.OR).outputPins[0];
    resident.netName = 'clk';
    showing(logicBoard, arriving);

    fireEvent.change(field('Net Name'), {target: {value: 'clk'}});

    expect(screen.getByText(/already driven/)).toBeInTheDocument();
    expect(setNet()).toBeEnabled();
  });

  test('refuses a net for two outputs at once', () => {
    const {logicBoard, gate} = board();
    showing(logicBoard, gate(GateType.AND).outputPins[0], gate(GateType.OR).outputPins[0]);

    expect(screen.getByText(/only be driven by one output/)).toBeInTheDocument();
    expect(field('Net Name')).toBeDisabled();
  });

  test('lets a group of inputs share a net', () => {
    const {logicBoard, gate} = board();
    const first = gate(GateType.AND);
    showing(logicBoard, first.inputPins[0], first.inputPins[1]);

    expect(field('Net Name')).toBeEnabled();
    expect(screen.getByText('2 pins selected')).toBeInTheDocument();
  });

  test('offers the port option for one pin only', () => {
    const {logicBoard, gate} = board();
    const single = gate(GateType.AND);
    showing(logicBoard, single.inputPins[0]);

    expect(screen.getByLabelText('Port')).toBeInTheDocument();
  });

  test('hides the port option when several pins are selected', () => {
    const {logicBoard, gate} = board();
    const pair = gate(GateType.AND);
    showing(logicBoard, pair.inputPins[0], pair.inputPins[1]);

    expect(screen.queryByLabelText('Port')).toBeNull();
  });

  test('will not take a port name an output already drives', () => {
    const {logicBoard, gate} = board();
    const taken = gate(GateType.AND).outputPins[0];
    taken.isPort = true;
    taken.portName = 'A';
    const pin = gate(GateType.OR).inputPins[0];
    showing(logicBoard, pin);

    fireEvent.click(screen.getByLabelText('Port'));
    fireEvent.change(field('Port Name'), {target: {value: 'A'}});

    expect(screen.getByText(/already an output port/)).toBeInTheDocument();
    expect(field('Port Name')).toHaveAttribute('aria-invalid', 'true');
    expect(setPortName()).toBeDisabled();
  });

  test('takes a port name another input already has, since they share the exposed pin', () => {
    const {logicBoard, gate} = board();
    const other = gate(GateType.AND).inputPins[0];
    other.isPort = true;
    other.portName = 'A';
    const pin = gate(GateType.OR).inputPins[0];
    showing(logicBoard, pin);

    fireEvent.click(screen.getByLabelText('Port'));
    fireEvent.change(field('Port Name'), {target: {value: 'A'}});
    fireEvent.click(setPortName());

    expect(pin.isPort).toBe(true);
    expect(pin.portName).toBe('A');
  });

  test('accepts a free port name', () => {
    const {logicBoard, gate} = board();
    const pin = gate(GateType.AND).inputPins[0];
    showing(logicBoard, pin);

    fireEvent.click(screen.getByLabelText('Port'));
    fireEvent.change(field('Port Name'), {target: {value: 'Reset'}});
    fireEvent.click(setPortName());

    expect(pin.isPort).toBe(true);
    expect(pin.portName).toBe('Reset');
  });

  test('asks for a name before it says how names may be shared', () => {
    const {logicBoard, gate} = board();
    showing(logicBoard, gate(GateType.AND).inputPins[0]);

    fireEvent.click(screen.getByLabelText('Port'));
    expect(screen.getByText(/needs a name/)).toBeInTheDocument();

    fireEvent.change(field('Port Name'), {target: {value: 'Reset'}});

    // Nothing wrong with it, so the rule it has to keep meeting is what is left to say.
    expect(screen.queryByText(/needs a name/)).toBeNull();
    expect(screen.getByText(/share/i)).toBeInTheDocument();
  });
});

describe('committing a field with Enter', () => {
  test('sets the net name, as the button beside it would', () => {
    const {logicBoard, gate} = board();
    const pin = gate(GateType.AND).outputPins[0];
    showing(logicBoard, pin);

    fireEvent.change(field('Net Name'), {target: {value: 'clk'}});
    fireEvent.keyDown(field('Net Name'), {key: 'Enter'});

    expect(pin.netName).toBe('clk');
  });

  test('sets the port name', () => {
    const {logicBoard, gate} = board();
    const pin = gate(GateType.AND).inputPins[0];
    showing(logicBoard, pin);

    fireEvent.click(screen.getByLabelText('Port'));
    fireEvent.change(field('Port Name'), {target: {value: 'Reset'}});
    fireEvent.keyDown(field('Port Name'), {key: 'Enter'});

    expect(pin.isPort).toBe(true);
    expect(pin.portName).toBe('Reset');
  });

  test('does nothing while the value is unchanged, matching the disabled button', () => {
    const {logicBoard, gate} = board();
    const pin = gate(GateType.AND).outputPins[0];
    showing(logicBoard, pin);
    let applied = 0;
    const update = logicBoard.update;
    logicBoard.update = () => {applied++; update()};

    expect(setNet()).toBeDisabled();
    fireEvent.keyDown(field('Net Name'), {key: 'Enter'});

    expect(applied).toBe(0);
  });

  test('does nothing while the value is refused', () => {
    // Two outputs describe a net that cannot exist, so neither the button nor Enter applies it.
    const {logicBoard, gate} = board();
    const [a, b] = [gate(GateType.AND).outputPins[0], gate(GateType.OR).outputPins[0]];
    showing(logicBoard, a, b);

    fireEvent.change(field('Net Name'), {target: {value: 'bus'}});
    fireEvent.keyDown(field('Net Name'), {key: 'Enter'});

    expect(a.netName).toBe('');
    expect(b.netName).toBe('');
  });

  test('leaves other keys to the field', () => {
    const {logicBoard, gate} = board();
    const pin = gate(GateType.AND).outputPins[0];
    showing(logicBoard, pin);

    fireEvent.change(field('Net Name'), {target: {value: 'clk'}});
    fireEvent.keyDown(field('Net Name'), {key: 'a'});

    expect(pin.netName).toBe('');
  });
});
