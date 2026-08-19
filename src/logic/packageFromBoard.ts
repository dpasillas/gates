import {LogicBoard} from "./LogicBoard";
import {LogicPin, PinType} from "./LogicPin";
import {GLOBAL_SCOPE} from "../Constants";
import {PackageComponent} from "./PackageComponent";

/**
 * One name on the outside of a board, and the pins inside carrying it.
 *
 * A port is a name rather than a pin: several pins may answer to one, in which case the port drives
 * all of them. Only an input port can be shared that way — `checkPortName` refuses to let an output
 * join a name another pin already has — so a port with an output on it has exactly that one pin.
 */
interface BoardPort {
  name: string;
  pins: LogicPin[];
  /**
   * What the outside has to do with it.
   *
   * An output inside is read from outside, and pins that only listen have to be driven from there.
   */
  type: PinType;
  /** The widest pin on it, since the port has to carry whatever the widest one expects. */
  width: number;
}

/**
 * The ports a board exposes, in the order they were put on it.
 *
 * Unnamed ports are left out: a port is reached by its name, and one without a name is a pin the
 * user has marked and not finished.
 */
function boardPorts(board: LogicBoard): BoardPort[] {
  const ports = new Map<string, BoardPort>();

  for (const pin of board.pins.values()) {
    if (!pin.isPort || !pin.portName) {
      continue;
    }

    const port = ports.get(pin.portName);
    if (!port) {
      ports.set(pin.portName,
                {name: pin.portName, pins: [pin], type: pin.pinType, width: pin.width});
      continue;
    }

    port.pins.push(pin);
    port.width = Math.max(port.width, pin.width);
    if (pin.pinType === PinType.OUTPUT) {
      port.type = PinType.OUTPUT;
    }
  }

  return [...ports.values()];
}

/**
 * A package matching a board's ports, with everything else left at its default.
 *
 * What the user gets by asking for packaging rather than drawing it: one pin per port, named after
 * it, as wide as it, driven the way it is, inputs down the left and outputs down the right. The
 * authoring dialog starts from this same package, so there is one set of defaults rather than one
 * for deriving and another for editing.
 */
function packageForBoard(board: LogicBoard, name: string = board.name): PackageComponent {
  const derived = new PackageComponent({scope: GLOBAL_SCOPE, name});
  boardPorts(board).forEach(port =>
      derived.declarePin({label: port.name, pinType: port.type, width: port.width}));

  return derived;
}

export {boardPorts, packageForBoard};
export type {BoardPort};
