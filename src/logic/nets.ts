import {LogicBoard} from "./LogicBoard";
import {LogicPin, PinType} from "./LogicPin";

/**
 * Sharing a net name is the same thing as being connected. The simulation knows only about wires;
 * names are the bookkeeping that decides which wires to make and unmake.
 */

interface NetNameCheck {
  readonly error?: string;
  readonly warning?: string;
  /** An output that would be pushed off the net to make room for this one. */
  readonly displaced?: LogicPin;
}

function pinsOnNet(board: LogicBoard, name: string): LogicPin[] {
  return name ? [...board.pins.values()].filter(pin => pin.netName === name) : [];
}

/** Naming an output has to name everything it drives, so the whole net ends up under one name. */
function connectedGroup(pin: LogicPin): LogicPin[] {
  const found = new Map<string, LogicPin>();
  const pending = [pin];

  while (pending.length > 0) {
    const current = pending.pop()!;
    if (found.has(current.uuid)) {
      continue;
    }
    found.set(current.uuid, current);

    for (const connection of current.connections.values()) {
      for (const end of [connection.source, connection.sink]) {
        if (!found.has(end.uuid)) {
          pending.push(end);
        }
      }
    }
  }

  return [...found.values()];
}

/**
 * A net is driven by at most one output, so two of them describe no possible net.
 *
 * TODO(dpasillas): Bidirectional pins will not fit this rule — several of them may share a net and
 *   take turns driving it — so this will need to count only the pins that drive unconditionally.
 */
function isConnectableGroup(pins: LogicPin[]): boolean {
  return pins.filter(pin => pin.pinType === PinType.OUTPUT).length <= 1;
}

function checkNetName(board: LogicBoard, pins: LogicPin[], name: string): NetNameCheck {
  if (!isConnectableGroup(pins)) {
    return {error: "A net can only be driven by one output."};
  }
  if (!name) {
    return {};
  }

  const already = pinsOnNet(board, name).filter(pin => !pins.includes(pin));
  const arriving = pins.find(pin => pin.pinType === PinType.OUTPUT);
  const resident = already.find(pin => pin.pinType === PinType.OUTPUT);
  const displaced = arriving && resident ? resident : undefined;

  // One name must describe one net, so it cannot span two widths.
  const arrivingWidths = new Set(pins.map(pin => pin.width));
  if (arrivingWidths.size > 1) {
    return {error: "These pins are not all the same width."};
  }

  const staying = already.filter(pin => pin !== displaced);
  if (staying.length > 0 && staying[0].width !== [...arrivingWidths][0]) {
    return {
      error: `"${name}" is ${staying[0].width} bits wide; these pins are `
        + `${[...arrivingWidths][0]}.`,
    };
  }

  if (displaced) {
    return {
      warning: `"${name}" is already driven by another output, which will be taken off the net.`,
      displaced,
    };
  }

  return {};
}

/** Redraws nothing, so callers decide whether the returned count is worth a repaint. */
function connectPins(board: LogicBoard, pins: LogicPin[]): number {
  const driver = pins.find(pin => pin.pinType === PinType.OUTPUT);
  if (!driver || !isConnectableGroup(pins)) {
    return 0;
  }

  let made = 0;
  for (const pin of pins) {
    if (pin === driver || pin.pinType !== PinType.INPUT || !pin.canConnect(driver)) {
      continue;
    }
    const connection = pin.connectTo(driver);
    if (connection) {
      board.addConnection(connection);
      adoptNet(driver, pin);
      made++;
    }
  }

  return made;
}

/**
 * Takes pins off their nets, for wires cut on purpose. Pass only the pins the user chose.
 *
 * Not for every disconnection: connectTo disconnects an input before rewiring it, so doing this
 * there would wipe the name a pin was being given.
 */
function leaveNets(pins: Iterable<LogicPin>) {
  for (const pin of pins) {
    pin.netName = "";
  }
}

/** Wired pins answer to one name, and the output owns it. */
function adoptNet(source: LogicPin, sink: LogicPin) {
  sink.netName = source.netName;
}

/**
 * Judged on the target, not the set: pins in the set that could join each other must not make an
 * unreachable target read as reachable.
 */
function wouldConnect(pins: LogicPin[], target: LogicPin): boolean {
  if (pins.length === 0 || pins.includes(target)) {
    return false;
  }

  const all = [...pins, target];
  if (!isConnectableGroup(all)) {
    return false;
  }

  const driver = all.find(pin => pin.pinType === PinType.OUTPUT);
  if (!driver) {
    return false;
  }

  return target === driver
    ? pins.some(pin => pin.pinType === PinType.INPUT && pin.canConnect(driver))
    : target.pinType === PinType.INPUT && target.canConnect(driver);
}

function rewireNet(board: LogicBoard, name: string) {
  connectPins(board, pinsOnNet(board, name));
}

/**
 * Puts the given pins on a net, wiring them to whatever is already there.
 *
 * An output is the net: renaming one renames everything it drives, and clearing it takes the net
 * down. An input only listens, so naming one moves that pin alone.
 */
function setNetName(board: LogicBoard, pins: LogicPin[], name: string) {
  const {error, displaced} = checkNetName(board, pins, name);
  if (error) {
    return;
  }

  if (displaced) {
    displaced.netName = "";
    displaced.disconnect();
  }

  for (const pin of pins) {
    if (pin.pinType === PinType.OUTPUT) {
      const group = connectedGroup(pin);
      group.forEach(member => member.netName = name);
      if (!name) {
        group.forEach(member => member.disconnect());
      }
    } else {
      pin.disconnect();
      pin.netName = name;
    }
  }

  if (name) {
    rewireNet(board, name);
  }

  board.update();
  board.updateProperties();
}

/**
 * One port name is one pin on the outside of the board, so the net rule applies across it: at most
 * one output drives it. Inputs share a name freely, and the exposed pin then drives all of them.
 *
 * An output meeting an input under one name would need that pin to drive and be driven at once,
 * which is the bidirectional case the simulation does not have.
 */
function checkPortName(board: LogicBoard, pin: LogicPin, name: string): string | undefined {
  const wanted = name.trim();
  if (!wanted) {
    return "A port needs a name.";
  }

  const sharing = [...board.pins.values()]
    .filter(other => other !== pin && other.isPort && other.portName === wanted);

  if (sharing.some(other => other.pinType === PinType.OUTPUT)) {
    return `"${wanted}" is already an output port.`;
  }

  return pin.pinType === PinType.OUTPUT && sharing.length > 0
    ? `"${wanted}" is already an input port.`
    : undefined;
}

function setPort(board: LogicBoard, pin: LogicPin, isPort: boolean, name: string) {
  if (isPort && checkPortName(board, pin, name)) {
    return;
  }

  pin.isPort = isPort;
  pin.portName = isPort ? name.trim() : "";

  board.update();
  board.updateProperties();
}

export {
  adoptNet, checkNetName, checkPortName, connectedGroup, connectPins, isConnectableGroup,
  leaveNets, pinsOnNet, setNetName, setPort, wouldConnect,
};
export type {NetNameCheck};
