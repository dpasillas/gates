import React from 'react';
import {render, screen, within} from '@testing-library/react';

import {Properties} from './Properties';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicComponent} from '../logic/LogicComponent';
import {LogicGate} from '../logic/LogicGate';
import {Clock} from '../logic/Clock';
import {Bulb} from '../logic/Bulb';
import {GateType} from '../enums/GateType';
import {GLOBAL_SCOPE} from '../Constants';

/** Renders the panel with the given components already selected. */
function renderWithSelection(...components: LogicComponent[]) {
  const board = new LogicBoard();
  components.forEach(c => board.selectedComponents.add(c));

  return render(<Properties board={board}/>);
}

/** The value shown for a row, whether it renders as text or as an input. */
function valueOf(label: string): string | null {
  const input = screen.queryByLabelText(label);
  if (input) {
    return (input as HTMLInputElement).value;
  }

  const row = screen.getByText(label).parentElement!;
  const texts = within(row).getAllByText(/.*/).map(e => e.textContent);

  return texts[texts.length - 1];
}

function gate(subtype: GateType) {
  return new LogicGate({scope: GLOBAL_SCOPE, subtype});
}

describe('Properties panel', () => {
  test('says so when nothing is selected', () => {
    renderWithSelection();

    expect(screen.getByText('No selection')).toBeInTheDocument();
  });

  test('shows the component type and its editable properties', () => {
    renderWithSelection(gate(GateType.AND));

    expect(screen.getByText('AND')).toBeInTheDocument();
    expect(screen.getByLabelText('Bit Width')).toBeInTheDocument();
    expect(screen.getByLabelText('Inputs')).toBeInTheDocument();
    expect(screen.getByLabelText('Delay')).toBeInTheDocument();
  });

  test('shows position as read-only text rather than an input', () => {
    renderWithSelection(gate(GateType.AND));

    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.queryByLabelText('X')).toBeNull();
  });

  test('shows a clock period and its locked duty cycle', () => {
    renderWithSelection(new Clock({scope: GLOBAL_SCOPE, subtype: 0}));

    expect(screen.getByText('Clock')).toBeInTheDocument();
    expect(valueOf('Period')).toBe('20');
    // Locked, so it renders as text and has no input to label.
    expect(screen.queryByLabelText('Duty Cycle (%)')).toBeNull();
    expect(valueOf('Duty Cycle (%)')).toBe('50');
  });

  describe('multiple selection', () => {
    test('shows the shared type, and a placeholder when types differ', () => {
      renderWithSelection(gate(GateType.AND), gate(GateType.NOT));

      expect(screen.getByText('-')).toBeInTheDocument();
      expect(screen.getByText('2 components selected')).toBeInTheDocument();
    });

    test('keeps only the properties every selected component has', () => {
      // NOT has a fixed input count, so the row cannot apply to the pair.
      renderWithSelection(gate(GateType.AND), gate(GateType.NOT));

      expect(screen.getByLabelText('Bit Width')).toBeInTheDocument();
      expect(screen.queryByLabelText('Inputs')).toBeNull();
    });

    test('shows a shared value when the selection agrees', () => {
      renderWithSelection(gate(GateType.AND), gate(GateType.OR));

      expect(valueOf('Bit Width')).toBe('1');
    });

    test('blanks the value when the selection disagrees', () => {
      const wide = gate(GateType.AND);
      wide.width = 4;
      renderWithSelection(wide, gate(GateType.OR));

      expect(valueOf('Bit Width')).toBe('');
    });

    test('locks a property when any selected component has it read-only', () => {
      // A gate's width is adjustable, a bulb's is not, so the pair must not be editable.
      renderWithSelection(gate(GateType.AND), new Bulb({scope: GLOBAL_SCOPE, subtype: 0}));

      expect(screen.getByText('Bit Width')).toBeInTheDocument();
      expect(screen.queryByLabelText('Bit Width')).toBeNull();
    });
  });
});
