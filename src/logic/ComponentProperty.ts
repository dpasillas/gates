/**
 * A numeric property of a component, surfaced in the properties panel.
 *
 * Components describe their own properties rather than the panel branching on component type. That
 * keeps the panel ignorant of what a Clock or a LogicGate is, and it means a multi-selection can be
 * merged by matching keys without knowing what it holds.
 */
interface ComponentProperty {
  /** Stable identity, used to match the same property across a multi-selection. */
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** Read-only properties are still shown; they just cannot be edited. */
  readonly editable: boolean;
  readonly min?: number;
  readonly max?: number;
  /** Digits to show after the decimal point. Defaults to 0. */
  readonly precision?: number;
  /** Applies a new value. Not called for read-only properties. */
  setValue(value: number): void;
}

export type {ComponentProperty};
