import {LogicBoard} from "./LogicBoard";
import {LogicComponent} from "./LogicComponent";
import {LogicPin} from "./LogicPin";
import {Switch} from "./Switch";
import {netFor} from "./nets";
import {makeComponent} from "./componentFactory";
import {GateType} from "../enums/GateType";
import {PartType} from "../enums/PartType";

/** Tag every board file carries, so that a file of some other kind is rejected as one. */
const BOARD_FORMAT = "gates.board";
/** Raised whenever the shape of what is being read changes. */
const BOARD_FORMAT_VERSION = 1;

/** Decimal places kept for positions and angles. */
const PRECISION = 3;

/** Anything a pin carries that the component it belongs to does not already determine. */
interface PinData {
  /** Where the pin sits in its component's pin list, which the component's type and widths fix. */
  index: number;
  netName?: string;
  portName?: string;
  isPort?: boolean;
}

interface ComponentData {
  /**
   * The name of the PartType, not its number.
   *
   * Written by name so that inserting a part type into the enum cannot silently change what every
   * file already on disk means. The subtype below is a number because for most types it is a bare
   * index into that type's parts rather than a member of any enum.
   */
  type: string;
  subtype: number;
  x: number;
  y: number;
  angle: number;
  width: number;
  fieldWidth: number;
  merged?: boolean;
  delay: number;
  /**
   * Which of a switch's toggles are left on, a bit each.
   *
   * Kept here beside the other settings rather than behind a per-component hook: it is the one
   * piece of state any component has that its type and widths do not already give, and one number
   * does not pay for the machinery.
   */
  toggles?: number;
  pins?: PinData[];
}

/** One end of a connection, as a position in the file rather than an identity. */
interface PinRef {
  /** Index into the file's component list. */
  component: number;
  /** Index into that component's pin list. */
  pin: number;
}

interface ConnectionData {
  /** The driving pin. */
  source: PinRef;
  /** The pin being driven. */
  sink: PinRef;
}

/**
 * Some components and the wiring among them, without saying where they came from.
 *
 * A whole board is one of these; so is a selection lifted off one. Both are put back the same way,
 * which is what keeps a pasted component and a component read out of a file the same thing.
 */
interface ComponentSet {
  components: ComponentData[];
  connections: ConnectionData[];
}

interface BoardData extends ComponentSet {
  format: typeof BOARD_FORMAT;
  version: number;
  name: string;
}

function round(value: number): number {
  const scale = 10 ** PRECISION;

  return Math.round(value * scale) / scale;
}

/** The pin's own settings, or nothing when it is carrying none of them. */
function serializePin(pin: LogicPin, index: number): PinData | undefined {
  if (!pin.netName && !pin.portName && !pin.isPort) {
    return undefined;
  }

  const data: PinData = {index};
  if (pin.netName) {
    data.netName = pin.netName;
  }
  if (pin.portName) {
    data.portName = pin.portName;
  }
  if (pin.isPort) {
    data.isPort = true;
  }

  return data;
}

function serializeComponent(component: LogicComponent): ComponentData {
  const {x, y} = component.geometry.position;
  const pins = component.pins()
      .map(serializePin)
      .filter((pin): pin is PinData => pin !== undefined);

  const data: ComponentData = {
    type: PartType[component.type],
    subtype: component.subtype,
    x: round(x),
    y: round(y),
    angle: round(component.angle),
    width: component.width,
    fieldWidth: component.fieldWidth,
    delay: component.delay,
  };

  if (component.isMerged) {
    data.merged = true;
  }
  if (component instanceof Switch && component.toggles) {
    data.toggles = component.toggles;
  }
  if (pins.length) {
    data.pins = pins;
  }

  return data;
}

/**
 * Some components and the wires that run between them.
 *
 * A wire is only kept when both of its ends are in the set. One leading away to a component that
 * was left out describes a connection to something that will not be there, so it is dropped rather
 * than written as a reference to nothing.
 */
function serializeComponents(board: LogicBoard, components: LogicComponent[]): ComponentSet {
  const where = new Map<string, PinRef>();
  components.forEach((component, index) => {
    component.pins().forEach((pin, pinIndex) => where.set(pin.uuid, {component: index, pin: pinIndex}));
  });

  // Taken from the wires the board is drawing rather than from the pins' own lists, which also hold
  // arrangements the board knows nothing about — a clock drives itself through a connection that
  // exists only to make it tick.
  const connections: ConnectionData[] = [];
  for (const connection of board.connections.values()) {
    const source = where.get(connection.source.uuid);
    const sink = where.get(connection.sink.uuid);
    if (source && sink) {
      connections.push({source, sink});
    }
  }

  return {components: components.map(serializeComponent), connections};
}

/**
 * Everything about a board that is not a consequence of running it.
 *
 * Components, the wires between their pins, and the settings on both. Simulation time and the logic
 * states riding on the pins are left out: they follow from the components' own power-up state, so a
 * board reopened is a board freshly powered up rather than one caught mid-run.
 */
function serializeBoard(board: LogicBoard): BoardData {
  return {
    format: BOARD_FORMAT,
    version: BOARD_FORMAT_VERSION,
    name: board.name,
    ...serializeComponents(board, [...board.components.values()]),
  };
}

/** The type a file names, or nothing if this build has never heard of it. */
function partTypeNamed(name: string): PartType | undefined {
  const type = (PartType as unknown as Record<string, number | undefined>)[name];

  return typeof type === "number" ? type : undefined;
}

function applyPinData(board: LogicBoard, component: LogicComponent, pins: PinData[]) {
  const all = component.pins();

  for (const data of pins) {
    const pin = all[data.index];
    if (!pin) {
      continue;
    }
    if (data.netName) {
      netFor(board, data.netName).add(pin);
    }
    pin.portName = data.portName ?? "";
    pin.isPort = data.isPort ?? false;
  }
}

function applyComponentData(board: LogicBoard, component: LogicComponent, data: ComponentData) {
  // Merging is settled first because it decides how many pins there are and how wide each one is,
  // and the widths below are applied over the pins it leaves behind.
  component.isMerged = data.merged ?? false;
  component.width = data.width;
  component.fieldWidth = data.fieldWidth;
  component.delay = data.delay;

  component.geometry.position = new component.scope.Point(data.x, data.y);
  component.angle = data.angle;

  // Set after the widths, which decide how many toggles there are to set.
  if (component instanceof Switch) {
    component.toggles = data.toggles ?? 0;
  }

  applyPinData(board, component, data.pins ?? []);
}

/**
 * Puts a set of components onto a board, wired to each other, leaving what is there alone.
 *
 * Widths are restored before any wire is drawn: a pin that changes width drops the wire it was on,
 * so components have to reach their final shape while there is still nothing attached to lose.
 *
 * The board is not reset, so this can be used on one that is running.
 */
function addComponents(board: LogicBoard, data: ComponentSet): LogicComponent[] {
  const components = data.components.map(entry => {
    const type = partTypeNamed(entry.type);
    if (type === undefined) {
      throw new Error(`Unknown part type: ${entry.type}`);
    }

    const component = makeComponent({
      type,
      subtype: entry.subtype as GateType,
      scope: board.scope,
      board,
    });
    applyComponentData(board, component, entry);
    board.addComponent(component);

    return component;
  });

  for (const {source, sink} of data.connections) {
    const from = components[source.component]?.pins()[source.pin];
    const to = components[sink.component]?.pins()[sink.pin];
    if (!from || !to) {
      continue;
    }

    const connection = to.connectTo(from);
    if (connection) {
      board.addConnection(connection);
    }
  }

  return components;
}

/**
 * Rebuilds a board from a file, in place.
 *
 * The board is filled rather than replaced because everything already pointing at it — the panels,
 * the renderer, the simulation callbacks — is holding the instance itself.
 */
function loadBoard(board: LogicBoard, data: BoardData) {
  board.clear();
  board.name = data.name;

  addComponents(board, data);

  // Brings the board up from power-up rather than from whatever the wiring above happened to
  // propagate, which is what makes a loaded board equivalent to one just built by hand.
  board.stopSimulation();
  board.update();
  board.updateProperties();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Reads the text of a board file, refusing anything that is not one.
 *
 * A file on disk can be anything at all, and a half-understood one would load as a board with parts
 * of it quietly missing, so it is rejected whole instead.
 */
function parseBoardFile(text: string): BoardData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file is not a board: it is not valid JSON.");
  }

  if (!isObject(parsed) || parsed.format !== BOARD_FORMAT) {
    throw new Error("This file is not a board.");
  }
  if (parsed.version !== BOARD_FORMAT_VERSION) {
    throw new Error(`This board was written by a different version of Gates (file version ${parsed.version}).`);
  }
  if (!Array.isArray(parsed.components) || !Array.isArray(parsed.connections)) {
    throw new Error("This board is damaged: it is missing its components or its connections.");
  }

  return {
    format: BOARD_FORMAT,
    version: BOARD_FORMAT_VERSION,
    name: typeof parsed.name === "string" ? parsed.name : "untitled",
    components: parsed.components as ComponentData[],
    connections: parsed.connections as ConnectionData[],
  };
}

export {addComponents, loadBoard, parseBoardFile, serializeBoard, serializeComponents};
export type {BoardData, ComponentSet};
