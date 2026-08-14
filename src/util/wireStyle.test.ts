import {LogicBoard} from '../logic/LogicBoard';
import {DEFAULT_WIRE_STYLE, WireStyle, nextWireStyle, wireStyleLabel} from './wireStyle';

/** The styles a board passes through, starting from the default and cycling back to it. */
function cycle(): string[] {
  const seen: string[] = [];
  let style: WireStyle = DEFAULT_WIRE_STYLE;

  do {
    seen.push(wireStyleLabel(style));
    style = nextWireStyle(style);
  } while (style !== DEFAULT_WIRE_STYLE);

  return seen;
}

describe('the wire style toggle', () => {
  test('starts curved', () => {
    expect(wireStyleLabel(new LogicBoard().wireStyle)).toBe('Curved');
  });

  test('goes curved, angled, square', () => {
    expect(cycle()).toEqual(['Curved', 'Angled', 'Square']);
  });
});
