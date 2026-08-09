import {LogicBoard} from "./LogicBoard";
import {LogicPin, PinType} from "./LogicPin";

/**
 * Naming nets.
 *
 * A net name is an interface for describing connections rather than a thing the simulation knows
 * about: pins that share a name are wired to one another, and the name is only the bookkeeping used
 * to work out which wires to make, change or remove. Drawing a wire and naming two pins the same
 * thing produce the same graph, so nothing downstream has to tell them apart.
 */

/** What naming a set of pins would do, and anything the user should know before it happens. */
interface NetNameCheck {
  /** Why the name cannot be applied at all. */
  readonly error?: string;
  /** Something that will happen if it is applied anyway. */
  readonly warning?: string;
  /** An output that would be pushed off the net to make room for this one. */
  readonly displaced?: LogicPin;
}

/** Every pin currently on the named net. */
function pinsOnNet(board: LogicBoard, name: string): LogicPin[] {
  return name ? [...board.pins.values()].filter(pin => pin.netName === name) : [];
}

/**
 * Every pin reachable from this one along the wires already drawn.
 *
 * Naming an output names everything it drives, so that a net which was drawn by hand ends up under
 * a single name rather than one named pin sitting among anonymous ones.
 */
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
 * Whether these pins could share a net at all.
 *
 * A net is driven by at most one output, so a selection holding two of them describes something
 * that cannot exist however it is named.
 *
 * TODO(dpasillas): Bidirectional pins will not fit this rule — several of them may share a net and
 *   take turns driving it — so this will need to count only the pins that drive unconditionally.
 */
function isConnectableGroup(pins: LogicPin[]): boolean {
  return pins.filter(pin => pin.pinType === PinType.OUTPUT).length <= 1;
}

/** What would happen if the given pins were put on the named net. */
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

  // A net carries one width. Letting pins of two widths share a name would leave the name
  // describing two separate nets, which is not something the name can then be used to talk about.
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

/**
 * Wires a net up: its one output driving each of its inputs.
 *
 * The width check refuses a net that would mix widths, so the guard below should never fire; it is
 * there because connecting pins that cannot be connected would otherwise fail silently.
 */
function rewireNet(board: LogicBoard, name: string) {
  const members = pinsOnNet(board, name);
  const driver = members.find(pin => pin.pinType === PinType.OUTPUT);
  if (!driver) {
    return;
  }

  for (const pin of members) {
    if (pin === driver || pin.pinType !== PinType.INPUT || !pin.canConnect(driver)) {
      continue;
    }
    const connection = pin.connectTo(driver);
    if (connection) {
      board.addConnection(connection);
    }
  }
}

/**
 * Puts the given pins on a net, wiring them to whatever is already there.
 *
 * What that does to the rest of the net depends on which end of it the pin is. An output is the
 * net — everything wired to it is on the net by virtue of being driven by it — so renaming an
 * output renames the whole net with it, and clearing the name takes the net down. An input only
 * listens to a net, so naming one moves that pin alone: it leaves whatever it was joined to and
 * joins the pins now sharing its name, and clearing it just takes it off.
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

/** Why this pin cannot be exposed under the given port name, if it cannot. */
function checkPortName(board: LogicBoard, pin: LogicPin, name: string): string | undefined {
  if (!name.trim()) {
    return "A port needs a name.";
  }

  const taken = [...board.pins.values()]
    .some(other => other !== pin && other.isPort && other.portName === name.trim());

  return taken ? `Another pin is already the port "${name.trim()}".` : undefined;
}

/** Exposes or hides a pin as a port of the board. */
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
  checkNetName, checkPortName, connectedGroup, isConnectableGroup, pinsOnNet, setNetName, setPort,
};
export type {NetNameCheck};
