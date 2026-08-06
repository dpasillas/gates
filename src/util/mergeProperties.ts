import {ComponentProperty} from "../logic/ComponentProperty";

/**
 * A property as presented for a whole selection.
 *
 * Merging is deliberately conservative: a property only appears if every selected component has it,
 * it only shows a value if they all agree, and it is only editable if none of them are read-only.
 * Anything looser would let an edit silently apply to a component the user could not see was
 * included.
 */
interface MergedProperty {
  readonly key: string;
  readonly label: string;
  /** The shared value, or undefined when the selection disagrees. */
  readonly value?: number;
  readonly editable: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly precision?: number;
  /** Applies a value to every component contributing to this property. */
  apply(value: number): void;
}

/** Largest of the defined bounds, or undefined when none are set. */
function tightestMin(properties: ComponentProperty[]): number | undefined {
  const bounds = properties.map(p => p.min).filter((m): m is number => m !== undefined);

  return bounds.length ? Math.max(...bounds) : undefined;
}

/** Smallest of the defined bounds, or undefined when none are set. */
function tightestMax(properties: ComponentProperty[]): number | undefined {
  const bounds = properties.map(p => p.max).filter((m): m is number => m !== undefined);

  return bounds.length ? Math.min(...bounds) : undefined;
}

/**
 * Combines the properties of a selection into the rows the panel should show.
 *
 * @param perComponent one entry per selected component, each listing that component's properties
 * @returns the properties common to every component, ordered as the first component lists them
 */
function mergeProperties(perComponent: ComponentProperty[][]): MergedProperty[] {
  const [first, ...rest] = perComponent;
  if (!first) {
    return [];
  }

  const merged: MergedProperty[] = [];

  for (const property of first) {
    // Take the matching property from every other component; a single omission drops the row,
    // since a property not shared by the whole selection has no meaning for it.
    const matches = [property];
    for (const other of rest) {
      const match = other.find(p => p.key === property.key);
      if (!match) {
        break;
      }
      matches.push(match);
    }

    if (matches.length !== perComponent.length) {
      continue;
    }

    const values = new Set(matches.map(p => p.value));

    merged.push({
      key: property.key,
      label: property.label,
      value: values.size === 1 ? property.value : undefined,
      editable: matches.every(p => p.editable),
      min: tightestMin(matches),
      max: tightestMax(matches),
      precision: property.precision,
      apply: (value: number) => matches.forEach(p => p.editable && p.setValue(value)),
    });
  }

  return merged;
}

export {mergeProperties};
export type {MergedProperty};
