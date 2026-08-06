import {LogicGate} from './LogicGate';
import {Clock} from './Clock';
import {Bulb} from './Bulb';
import {GateType} from '../enums/GateType';
import {GLOBAL_SCOPE} from '../Constants';
import {ComponentProperty} from './ComponentProperty';

function byKey(properties: ComponentProperty[]) {
  return new Map(properties.map(p => [p.key, p]));
}

describe('component properties', () => {
  test('a gate exposes width, inputs and delay, all editable', () => {
    const properties = byKey(new LogicGate({scope: GLOBAL_SCOPE, subtype: GateType.AND}).properties());

    expect(properties.get('width')?.editable).toBe(true);
    expect(properties.get('fieldWidth')?.editable).toBe(true);
    expect(properties.get('delay')?.editable).toBe(true);
  });

  test('a gate with a fixed input count omits the inputs row', () => {
    // NOT takes exactly one input, so there is nothing to adjust.
    const properties = byKey(new LogicGate({scope: GLOBAL_SCOPE, subtype: GateType.NOT}).properties());

    expect(properties.has('fieldWidth')).toBe(false);
  });

  test('every component reports its position, read-only, to one decimal', () => {
    const properties = byKey(new LogicGate({scope: GLOBAL_SCOPE, subtype: GateType.AND}).properties());

    for (const key of ['x', 'y']) {
      expect(properties.get(key)?.editable).toBe(false);
      expect(properties.get(key)?.precision).toBe(1);
    }
  });

  test('a component without an adjustable width shows it locked', () => {
    const properties = byKey(new Bulb({scope: GLOBAL_SCOPE, subtype: 0}).properties());

    expect(properties.get('width')?.editable).toBe(false);
    expect(properties.get('width')?.value).toBe(1);
  });

  describe('clock', () => {
    test('reports period as twice the propagation delay', () => {
      const clock = new Clock({scope: GLOBAL_SCOPE, subtype: 0});

      expect(clock.delay).toBe(10);
      expect(byKey(clock.properties()).get('period')?.value).toBe(20);
    });

    test('setting the period halves it back into the delay', () => {
      const clock = new Clock({scope: GLOBAL_SCOPE, subtype: 0});

      byKey(clock.properties()).get('period')?.setValue(50);

      expect(clock.delay).toBe(25);
      expect(clock.period).toBe(50);
    });

    test('shows duty cycle locked at 50%', () => {
      const dutyCycle = byKey(new Clock({scope: GLOBAL_SCOPE, subtype: 0}).properties()).get('dutyCycle');

      expect(dutyCycle?.value).toBe(50);
      expect(dutyCycle?.editable).toBe(false);
    });

    test('replaces the raw delay row rather than showing both', () => {
      const properties = byKey(new Clock({scope: GLOBAL_SCOPE, subtype: 0}).properties());

      expect(properties.has('delay')).toBe(false);
      expect(properties.has('period')).toBe(true);
    });
  });
});
