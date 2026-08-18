import {Net} from './Net';
import {LogicBoard} from './LogicBoard';
import {LogicComponent} from './LogicComponent';
import {PinType} from './LogicPin';
import {makeComponent} from './componentFactory';
import {connectPins, netFor, leaveNet, setNetName} from './nets';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

function gate(board: LogicBoard): LogicComponent {
  const made = makeComponent({
    type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board,
  });
  board.addComponent(made);

  return made;
}

const outputOf = (c: LogicComponent) => c.pins().find(p => p.pinType === PinType.OUTPUT)!;
const inputOf = (c: LogicComponent) => c.pins().find(p => p.pinType === PinType.INPUT)!;

describe('a net', () => {
  test('sorts a pin by whether it drives the line or reads it', () => {
    const board = new LogicBoard();
    const source = outputOf(gate(board)), sink = inputOf(gate(board));
    const net = new Net();

    net.add(source);
    net.add(sink);

    expect(net.drivers).toEqual([source]);
    expect(net.listeners).toEqual([sink]);
  });

  test('holds each pin in exactly one of its three sets', () => {
    const board = new LogicBoard();
    const source = outputOf(gate(board));
    const net = new Net();

    net.add(source);

    const appearances = [net.sources, net.sinks, net.both].filter(set => set.has(source));
    expect(appearances).toHaveLength(1);
    expect(net.size).toBe(1);
  });

  test('takes a pin off the line it was on, so a pin is never on two', () => {
    const board = new LogicBoard();
    const pin = inputOf(gate(board));
    const first = new Net(), second = new Net();

    first.add(pin);
    second.add(pin);

    expect(first.has(pin)).toBe(false);
    expect(second.has(pin)).toBe(true);
    expect(pin.net).toBe(second);
  });

  test('is forgotten by its board once nobody is left on it', () => {
    const board = new LogicBoard();
    const pin = inputOf(gate(board));
    netFor(board, 'clk').add(pin);

    leaveNet(pin);

    // A name left registered with no members would be handed back out as a line nobody is on.
    expect(board.nets.has('clk')).toBe(false);
  });
});

describe('a name on a board', () => {
  test('picks out one net, so pins sharing it share a line', () => {
    const board = new LogicBoard();
    const first = inputOf(gate(board)), second = inputOf(gate(board));

    setNetName(board, [first], 'clk');
    setNetName(board, [second], 'clk');

    expect(first.net).toBe(second.net);
  });

  test('means nothing on another board, which is what keeps two boards apart', () => {
    // The whole reason a net is an object owned by a board: a subcomponent is another board, and
    // its `clk` must not be the `clk` of the board using it, nor of a second instance beside it.
    const one = new LogicBoard(), other = new LogicBoard();
    const here = inputOf(gate(one)), there = inputOf(gate(other));

    setNetName(one, [here], 'clk');
    setNetName(other, [there], 'clk');

    expect(here.netName).toBe('clk');
    expect(there.netName).toBe('clk');
    expect(here.net).not.toBe(there.net);
    expect(one.nets.get('clk')).not.toBe(other.nets.get('clk'));
  });
});

describe('wiring pins', () => {
  test('puts them on one line', () => {
    const board = new LogicBoard();
    const source = gate(board), sink = gate(board);

    connectPins(board, [outputOf(source), inputOf(sink)]);

    expect(inputOf(sink).net).toBe(outputOf(source).net);
  });

  test('carries the name the driver was holding to what it drives', () => {
    const board = new LogicBoard();
    const source = gate(board), sink = gate(board);
    setNetName(board, [outputOf(source)], 'clk');

    connectPins(board, [outputOf(source), inputOf(sink)]);

    expect(inputOf(sink).netName).toBe('clk');
  });

  test('takes away a name an input was holding while it waited for a driver', () => {
    // Connected pins answer to one name and the driver owns it, so an unnamed driver leaves the
    // line unnamed rather than adopting what the input was called.
    const board = new LogicBoard();
    const source = gate(board), sink = gate(board);
    setNetName(board, [inputOf(sink)], 'reset');

    connectPins(board, [outputOf(source), inputOf(sink)]);

    expect(inputOf(sink).netName).toBe('');
    expect(board.nets.has('reset')).toBe(false);
  });
});
