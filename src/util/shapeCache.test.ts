import {clearShapeCache, shapeFor} from './shapeCache';

describe('the shape cache', () => {
  beforeEach(() => clearShapeCache());

  test('builds a shape the first time it is asked for', () => {
    let built = 0;

    const d = shapeFor('gate', () => {built++; return 'M 0 0'});

    expect(d).toBe('M 0 0');
    expect(built).toBe(1);
  });

  test('hands back the same shape without building it again', () => {
    let built = 0;
    const build = () => {built++; return `M ${built} 0`};

    const first = shapeFor('gate', build);
    const second = shapeFor('gate', build);

    expect(second).toBe(first);
    expect(built).toBe(1);
  });

  test('builds separately for keys that differ', () => {
    shapeFor('gate/1', () => 'M 1 0');

    expect(shapeFor('gate/2', () => 'M 2 0')).toBe('M 2 0');
  });

  test('builds again once cleared, so a rebuilt shape is not served from a stale run', () => {
    shapeFor('gate', () => 'M 0 0');
    clearShapeCache();

    expect(shapeFor('gate', () => 'M 9 9')).toBe('M 9 9');
  });
});
