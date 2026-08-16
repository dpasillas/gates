import {LogicBoard} from './LogicBoard';
import {LogicPin, PinType} from './LogicPin';
import {LogicGate} from './LogicGate';
import {GateType} from '../enums/GateType';
import {checkNetName, checkPortName, isConnectableGroup, pinsOnNet, setNetName, setPort} from './nets';

/** A board with gates whose pins can be named and wired. */
function board() {
  const logicBoard = new LogicBoard();
  const gate = (subtype: GateType) => {
    const made = new LogicGate({scope: logicBoard.scope, subtype, board: logicBoard});
    made.pins().forEach(pin => {
      pin.board = logicBoard;
      logicBoard.addPin(pin);
    });
    logicBoard.addComponent(made);

    return made;
  };

  return {logicBoard, gate};
}

function wired(a: LogicPin, b: LogicPin): boolean {
  return a.isConnectedTo(b) && b.isConnectedTo(a);
}

describe('naming a net', () => {
  test('wires an output to an input that shares the name', () => {
    const {logicBoard, gate} = board();
    const source = gate(GateType.AND).outputPins[0];
    const sink = gate(GateType.OR).inputPins[0];

    setNetName(logicBoard, [source], 'clk');
    setNetName(logicBoard, [sink], 'clk');

    expect(wired(source, sink)).toBe(true);
  });

  test('wires an output to every input on the net', () => {
    const {logicBoard, gate} = board();
    const source = gate(GateType.AND).outputPins[0];
    const first = gate(GateType.OR).inputPins[0];
    const second = gate(GateType.XOR).inputPins[0];

    setNetName(logicBoard, [first, second], 'bus');
    setNetName(logicBoard, [source], 'bus');

    expect(wired(source, first)).toBe(true);
    expect(wired(source, second)).toBe(true);
  });

  test('registers the wires it makes, so they are drawn', () => {
    const {logicBoard, gate} = board();
    const source = gate(GateType.AND).outputPins[0];
    const sink = gate(GateType.OR).inputPins[0];

    setNetName(logicBoard, [source], 'n');
    setNetName(logicBoard, [sink], 'n');

    expect(logicBoard.connections.size).toBe(1);
  });

  test('names everything already wired to the pin', () => {
    // A net drawn by hand ends up under one name, rather than one named pin among anonymous ones.
    const {logicBoard, gate} = board();
    const source = gate(GateType.AND).outputPins[0];
    const sink = gate(GateType.OR).inputPins[0];
    const connection = sink.connectTo(source)!;
    logicBoard.addConnection(connection);

    setNetName(logicBoard, [source], 'drawn');

    expect(sink.netName).toBe('drawn');
    expect(pinsOnNet(logicBoard, 'drawn')).toHaveLength(2);
  });

  test('clearing the name takes the pin off the net', () => {
    const {logicBoard, gate} = board();
    const source = gate(GateType.AND).outputPins[0];
    const sink = gate(GateType.OR).inputPins[0];
    setNetName(logicBoard, [source], 'n');
    setNetName(logicBoard, [sink], 'n');

    setNetName(logicBoard, [sink], '');

    expect(wired(source, sink)).toBe(false);
    expect(sink.netName).toBe('');
  });

  test('refuses a pin of a different width than the net already carries', () => {
    // One name has to mean one net. Letting widths mix would leave the name describing two, which
    // is then no use for talking about either.
    const {logicBoard, gate} = board();
    const wide = gate(GateType.AND);
    wide.width = 4;
    const narrow = gate(GateType.OR);
    setNetName(logicBoard, [wide.outputPins[0]], 'w');

    const check = checkNetName(logicBoard, [narrow.inputPins[0]], 'w');
    setNetName(logicBoard, [narrow.inputPins[0]], 'w');

    expect(check.error).toContain('4 bits');
    expect(check.warning).toBeUndefined();
    expect(narrow.inputPins[0].netName).toBe('');
    expect(wired(wide.outputPins[0], narrow.inputPins[0])).toBe(false);
  });

  test('refuses a selection whose own pins disagree on width', () => {
    const {logicBoard, gate} = board();
    const wide = gate(GateType.AND);
    wide.width = 4;
    const narrow = gate(GateType.OR);

    const check = checkNetName(logicBoard, [wide.inputPins[0], narrow.inputPins[0]], 'w');

    expect(check.error).toContain('not all the same width');
  });

  test('the width check outranks the displaced-output warning', () => {
    // Both apply at once when a wider output joins a driven net; the one that blocks wins.
    const {logicBoard, gate} = board();
    const resident = gate(GateType.AND);
    setNetName(logicBoard, [resident.outputPins[0]], 'n');
    setNetName(logicBoard, [gate(GateType.XOR).inputPins[0]], 'n');
    const arriving = gate(GateType.OR);
    arriving.width = 4;

    const check = checkNetName(logicBoard, [arriving.outputPins[0]], 'n');

    expect(check.error).toBeTruthy();
    expect(check.displaced).toBeUndefined();
  });
});

describe('which end of the net was named', () => {
  /** An output driving two inputs, all three under one name. */
  function net() {
    const {logicBoard, gate} = board();
    const driver = gate(GateType.AND).outputPins[0];
    const first = gate(GateType.OR).inputPins[0];
    const second = gate(GateType.XOR).inputPins[0];
    setNetName(logicBoard, [driver], 'clk');
    setNetName(logicBoard, [first], 'clk');
    setNetName(logicBoard, [second], 'clk');
    expect(wired(driver, first) && wired(driver, second)).toBe(true);

    return {logicBoard, gate, driver, first, second};
  }

  test('clearing an input leaves the rest of the net standing', () => {
    // An input only listens to the net, so taking it off is not a statement about the net.
    const {logicBoard, driver, first, second} = net();

    setNetName(logicBoard, [first], '');

    expect(first.netName).toBe('');
    expect(wired(driver, first)).toBe(false);
    expect(driver.netName).toBe('clk');
    expect(second.netName).toBe('clk');
    expect(wired(driver, second)).toBe(true);
  });

  test('clearing the output takes the whole net down', () => {
    // The net exists because that output drives it, so unnaming it unnames the net.
    const {logicBoard, driver, first, second} = net();

    setNetName(logicBoard, [driver], '');

    expect([driver.netName, first.netName, second.netName]).toEqual(['', '', '']);
    expect(logicBoard.connections.size).toBe(0);
  });

  test('renaming the output carries the net with it', () => {
    const {logicBoard, driver, first, second} = net();

    setNetName(logicBoard, [driver], 'reset');

    expect([driver.netName, first.netName, second.netName])
      .toEqual(['reset', 'reset', 'reset']);
    expect(wired(driver, first) && wired(driver, second)).toBe(true);
  });

  test('renaming an input moves that pin alone', () => {
    const {logicBoard, driver, first, second} = net();

    setNetName(logicBoard, [first], 'other');

    expect(first.netName).toBe('other');
    expect(wired(driver, first)).toBe(false);
    expect(pinsOnNet(logicBoard, 'clk')).toHaveLength(2);
    expect(wired(driver, second)).toBe(true);
  });

  test('renaming an input joins it to whatever drives its new net', () => {
    const {logicBoard, gate, driver, first} = net();
    const other = gate(GateType.NOR).outputPins[0];
    setNetName(logicBoard, [other], 'alt');

    setNetName(logicBoard, [first], 'alt');

    expect(wired(driver, first)).toBe(false);
    expect(wired(other, first)).toBe(true);
  });
});

describe('a net has one driver', () => {
  test('two outputs cannot be named together', () => {
    const {logicBoard, gate} = board();
    const first = gate(GateType.AND).outputPins[0];
    const second = gate(GateType.OR).outputPins[0];

    expect(isConnectableGroup([first, second])).toBe(false);
    expect(checkNetName(logicBoard, [first, second], 'n').error).toBeTruthy();
  });

  test('an output joining a driven net is a warning, not a refusal', () => {
    const {logicBoard, gate} = board();
    const resident = gate(GateType.AND).outputPins[0];
    const arriving = gate(GateType.OR).outputPins[0];
    setNetName(logicBoard, [resident], 'n');

    const check = checkNetName(logicBoard, [arriving], 'n');

    expect(check.error).toBeUndefined();
    expect(check.warning).toContain('already driven');
    expect(check.displaced).toBe(resident);
  });

  test('setting it anyway takes the previous output off the net', () => {
    const {logicBoard, gate} = board();
    const resident = gate(GateType.AND).outputPins[0];
    const sink = gate(GateType.XOR).inputPins[0];
    const arriving = gate(GateType.OR).outputPins[0];
    setNetName(logicBoard, [resident], 'n');
    setNetName(logicBoard, [sink], 'n');
    expect(wired(resident, sink)).toBe(true);

    setNetName(logicBoard, [arriving], 'n');

    expect(resident.netName).toBe('');
    expect(wired(resident, sink)).toBe(false);
    expect(wired(arriving, sink)).toBe(true);
  });

  test('an input joining a driven net raises nothing', () => {
    const {logicBoard, gate} = board();
    setNetName(logicBoard, [gate(GateType.AND).outputPins[0]], 'n');

    const check = checkNetName(logicBoard, [gate(GateType.OR).inputPins[0]], 'n');

    expect(check.error).toBeUndefined();
    expect(check.warning).toBeUndefined();
  });

  test('any number of inputs make a connectable group', () => {
    const {gate} = board();
    const inputs = [gate(GateType.AND), gate(GateType.OR), gate(GateType.XOR)]
      .map(g => g.inputPins[0]);

    expect(isConnectableGroup(inputs)).toBe(true);
    expect(isConnectableGroup([...inputs, gate(GateType.NOR).outputPins[0]])).toBe(true);
  });
});

describe('exposing a pin as a port', () => {
  test('needs a name', () => {
    const {logicBoard, gate} = board();
    const pin = gate(GateType.AND).inputPins[0];

    expect(checkPortName(logicBoard, pin, '  ')).toBeTruthy();
  });

  test('accepts a name nothing else is using', () => {
    const {logicBoard, gate} = board();
    const pin = gate(GateType.AND).inputPins[0];

    expect(checkPortName(logicBoard, pin, 'A')).toBeUndefined();

    setPort(logicBoard, pin, true, 'A');

    expect(pin.isPort).toBe(true);
    expect(pin.portName).toBe('A');
  });

  test('lets inputs share a name, since one exposed pin drives them all', () => {
    const {logicBoard, gate} = board();
    const first = gate(GateType.AND).inputPins[0];
    const second = gate(GateType.OR).inputPins[0];
    setPort(logicBoard, first, true, 'A');

    expect(checkPortName(logicBoard, second, 'A')).toBeUndefined();

    setPort(logicBoard, second, true, 'A');

    expect(second.isPort).toBe(true);
    expect(second.portName).toBe('A');
  });

  test('refuses a second output on one name, which has nothing to drive it', () => {
    const {logicBoard, gate} = board();
    const first = gate(GateType.AND).outputPins[0];
    const second = gate(GateType.OR).outputPins[0];
    setPort(logicBoard, first, true, 'A');

    expect(checkPortName(logicBoard, second, 'A')).toContain('already an output port');

    setPort(logicBoard, second, true, 'A');

    expect(second.isPort).toBe(false);
  });

  test('refuses an input the name an output drives, which would make the pin both', () => {
    const {logicBoard, gate} = board();
    const driver = gate(GateType.AND).outputPins[0];
    const listener = gate(GateType.OR).inputPins[0];
    setPort(logicBoard, driver, true, 'A');

    expect(checkPortName(logicBoard, listener, 'A')).toContain('already an output port');
  });

  test('refuses an output the name inputs are already listening on', () => {
    const {logicBoard, gate} = board();
    const listener = gate(GateType.AND).inputPins[0];
    const driver = gate(GateType.OR).outputPins[0];
    setPort(logicBoard, listener, true, 'A');

    expect(checkPortName(logicBoard, driver, 'A')).toContain('already an input port');
  });

  test('frees the name once the pin stops being a port', () => {
    const {logicBoard, gate} = board();
    const first = gate(GateType.AND).inputPins[0];
    const second = gate(GateType.OR).inputPins[0];
    setPort(logicBoard, first, true, 'A');

    setPort(logicBoard, first, false, 'A');

    expect(first.portName).toBe('');
    expect(checkPortName(logicBoard, second, 'A')).toBeUndefined();
  });

  test('does not mind a pin keeping its own name', () => {
    const {logicBoard, gate} = board();
    const pin = gate(GateType.AND).inputPins[0];
    setPort(logicBoard, pin, true, 'A');

    expect(checkPortName(logicBoard, pin, 'A')).toBeUndefined();
  });
});

describe('pins start unnamed', () => {
  test('with no net and no port', () => {
    const {gate} = board();
    const pin = gate(GateType.AND).inputPins[0];

    expect(pin.netName).toBe('');
    expect(pin.portName).toBe('');
    expect(pin.isPort).toBe(false);
    expect(pin.pinType).toBe(PinType.INPUT);
  });
});
