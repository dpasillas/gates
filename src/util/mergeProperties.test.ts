import {mergeProperties} from './mergeProperties';
import {ComponentProperty} from '../logic/ComponentProperty';

/** Builds a property, defaulting to an editable one so tests only state what they care about. */
function property(overrides: Partial<ComponentProperty> & {key: string}): ComponentProperty {
  return {
    label: overrides.key,
    value: 1,
    editable: true,
    setValue: () => {},
    ...overrides,
  };
}

describe('mergeProperties', () => {
  test('an empty selection has no properties', () => {
    expect(mergeProperties([])).toEqual([]);
  });

  test('a single component passes its properties through in order', () => {
    const merged = mergeProperties([[
      property({key: 'width', value: 4}),
      property({key: 'delay', value: 7}),
    ]]);

    expect(merged.map(p => p.key)).toEqual(['width', 'delay']);
    expect(merged.map(p => p.value)).toEqual([4, 7]);
  });

  test('shows the shared value when the selection agrees', () => {
    const merged = mergeProperties([
      [property({key: 'width', value: 8})],
      [property({key: 'width', value: 8})],
    ]);

    expect(merged[0].value).toBe(8);
  });

  test('leaves the value undefined when the selection disagrees', () => {
    const merged = mergeProperties([
      [property({key: 'width', value: 8})],
      [property({key: 'width', value: 2})],
    ]);

    expect(merged[0].value).toBeUndefined();
  });

  test('drops properties that not every component has', () => {
    const merged = mergeProperties([
      [property({key: 'width'}), property({key: 'period'})],
      [property({key: 'width'})],
    ]);

    expect(merged.map(p => p.key)).toEqual(['width']);
  });

  test('is read-only if any contributor is read-only', () => {
    const merged = mergeProperties([
      [property({key: 'width', editable: true})],
      [property({key: 'width', editable: false})],
    ]);

    expect(merged[0].editable).toBe(false);
  });

  test('is editable only when every contributor is', () => {
    const merged = mergeProperties([
      [property({key: 'width', editable: true})],
      [property({key: 'width', editable: true})],
    ]);

    expect(merged[0].editable).toBe(true);
  });

  test('narrows bounds to the range every component accepts', () => {
    const merged = mergeProperties([
      [property({key: 'inputs', min: 2, max: 8})],
      [property({key: 'inputs', min: 3, max: 4})],
    ]);

    expect(merged[0].min).toBe(3);
    expect(merged[0].max).toBe(4);
  });

  test('applies an edit to every contributing component', () => {
    const applied: number[] = [];
    const merged = mergeProperties([
      [property({key: 'width', setValue: v => applied.push(v)})],
      [property({key: 'width', setValue: v => applied.push(v)})],
    ]);

    merged[0].apply(16);

    expect(applied).toEqual([16, 16]);
  });

  test('never writes to a read-only contributor', () => {
    // A mixed selection is presented as read-only, but guard the write path too: a caller that
    // ignores the flag must still not be able to mutate a locked component.
    const applied: number[] = [];
    const merged = mergeProperties([
      [property({key: 'width', editable: true, setValue: v => applied.push(v)})],
      [property({key: 'width', editable: false, setValue: () => {throw new Error('read-only')}})],
    ]);

    merged[0].apply(16);

    expect(applied).toEqual([16]);
  });
});
