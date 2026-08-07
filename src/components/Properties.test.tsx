import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';

import {Properties} from './Properties';
import {LogicBoard} from '../logic/LogicBoard';
import {LogicComponent} from '../logic/LogicComponent';
import {LogicGate} from '../logic/LogicGate';
import {Clock} from '../logic/Clock';
import {Bulb} from '../logic/Bulb';
import {SegmentDisplay} from '../logic/SegmentDisplay';
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

function sevenSegment() {
  return new SegmentDisplay({scope: GLOBAL_SCOPE, subtype: 1});
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

  describe('editing a value', () => {
    test('shows the value it just applied', () => {
      const component = gate(GateType.AND);
      renderWithSelection(component);

      fireEvent.change(screen.getByLabelText('Bit Width'), {target: {value: '2'}});

      expect(component.width).toBe(2);
      expect(valueOf('Bit Width')).toBe('2');
    });

    test('lets repeated nudges walk the value further than one step', () => {
      // The arrow keys and the wheel each compute the next value from what the field is showing.
      // While that stayed at the pre-edit value, every nudge landed on the same number.
      const component = gate(GateType.AND);
      renderWithSelection(component);

      for (let expected = 2; expected <= 5; expected++) {
        const field = screen.getByLabelText('Bit Width') as HTMLInputElement;
        fireEvent.change(field, {target: {value: String(Number(field.value) + 1)}});

        expect(component.width).toBe(expected);
      }

      expect(valueOf('Bit Width')).toBe('5');
    });

    test('shows a boolean it just toggled', () => {
      renderWithSelection(sevenSegment());

      fireEvent.click(screen.getByLabelText('Merge Pins'));

      expect((screen.getByLabelText('Merge Pins') as HTMLInputElement).checked).toBe(false);
    });
  });

  describe('boolean properties', () => {
    test('renders as a checkbox rather than a number field', () => {
      renderWithSelection(sevenSegment());

      const checkbox = screen.getByLabelText('Merge Pins') as HTMLInputElement;
      expect(checkbox.type).toBe('checkbox');
      expect(checkbox.checked).toBe(true);
    });

    test('reflects the component it came from', () => {
      const display = sevenSegment();
      display.isMerged = false;
      renderWithSelection(display);

      expect((screen.getByLabelText('Merge Pins') as HTMLInputElement).checked).toBe(false);
    });

    test('applies to the component when toggled', () => {
      const display = sevenSegment();
      renderWithSelection(display);

      fireEvent.click(screen.getByLabelText('Merge Pins'));

      expect(display.isMerged).toBe(false);
    });

    test('shows a selection that disagrees as indeterminate rather than picking one', () => {
      const separated = sevenSegment();
      separated.isMerged = false;
      renderWithSelection(separated, sevenSegment());

      const checkbox = screen.getByLabelText('Merge Pins');
      expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
      expect(checkbox).toHaveAttribute('data-indeterminate', 'true');
    });
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
