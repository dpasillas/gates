import {TriStateBuffer} from './TriStateBuffer';
import {LogicState} from './LogicState';
import {GLOBAL_SCOPE} from '../Constants';

/** A buffer whose posted output is captured rather than sent to a board. */
function buffer(width: number = 1) {
  const component = new TriStateBuffer({scope: GLOBAL_SCOPE, width});
  const posted: LogicState[] = [];
  component.postEvent = state => {posted.push(state)};

  const [data, enable] = component.inputPins;

  return {component, posted, data, enable, last: () => posted[posted.length - 1]};
}

describe('TriStateBuffer', () => {
  test('has a data pin and a one-bit enable', () => {
    const {component, data, enable} = buffer(8);

    expect(component.inputPins).toHaveLength(2);
    expect(data.width).toBe(8);
    // The enable is a control input, so it stays one bit wide however wide the data path gets.
    expect(enable.width).toBe(1);
  });

  test('passes the input through while enabled', () => {
    const {data, enable, last} = buffer(4);

    enable.setLogicState(new LogicState({v: 1}));
    data.setLogicState(new LogicState({v: 0b1011}));

    expect(last()).toEqual(new LogicState({v: 0b1011}));
  });

  test('releases the output while disabled', () => {
    const {data, enable, last} = buffer(4);

    data.setLogicState(new LogicState({v: 0b1011}));
    enable.setLogicState(new LogicState({v: 0}));

    expect(last()).toEqual(new LogicState({z: 0b1111}));
  });

  test('stops driving as soon as the enable goes low', () => {
    const {data, enable, last} = buffer();

    enable.setLogicState(new LogicState({v: 1}));
    data.setLogicState(new LogicState({v: 1}));
    expect(last()).toEqual(new LogicState({v: 1}));

    enable.setLogicState(new LogicState({v: 0}));

    expect(last()).toEqual(new LogicState({z: 1}));
  });

  test('reports the output as unknown when the enable is unknown', () => {
    // Not knowing whether the component is driving is a stronger statement than either driving or
    // releasing, so it cannot be reported as high impedance.
    const {data, enable, last} = buffer(4);

    data.setLogicState(new LogicState({v: 0b1011}));
    enable.setLogicState(new LogicState({x: 1}));

    expect(last()).toEqual(new LogicState({x: 0b1111}));
  });

  test('reports the output as unknown when the enable is floating', () => {
    const {data, enable, last} = buffer(4);

    data.setLogicState(new LogicState({v: 0b1011}));
    enable.setLogicState(new LogicState({z: 1}));

    expect(last()).toEqual(new LogicState({x: 0b1111}));
  });

  test('drives an enabled but floating input as unknown, not as floating', () => {
    // The buffer is driving the line, so it cannot report the line as undriven; what it drives is
    // simply not a known value.
    const {data, enable, last} = buffer(4);

    enable.setLogicState(new LogicState({v: 1}));
    data.setLogicState(new LogicState({v: 0b0001, z: 0b0010}));

    expect(last()).toEqual(new LogicState({v: 0b0001, x: 0b0010}));
  });

  test('widening carries the data and output pins, and leaves the enable alone', () => {
    const {component, data, enable} = buffer(2);
    const [output] = component.outputPins;

    component.width = 8;

    expect(component.inputPins[0]).toBe(data);
    expect(component.inputPins[1]).toBe(enable);
    expect(component.outputPins[0]).toBe(output);
    expect(data.width).toBe(8);
    expect(output.width).toBe(8);
    expect(enable.width).toBe(1);
  });
});
