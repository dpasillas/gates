import {LogicBoard} from "./LogicBoard";
import {LogicComponent} from "./LogicComponent";
import {LogicPin} from "./LogicPin";
import {SubComponent} from "./SubComponent";
import {Switch} from "./Switch";
import {applySettings} from "./componentData";
import {netFor} from "./nets";
import {makeComponent} from "./componentFactory";
import {GateType} from "../enums/GateType";
import {PartType} from "../enums/PartType";
import type {ComponentFileData} from "./componentFile";
import type {ComponentData, ComponentSet, ConnectionData, PinData, PinRef}
    from "./componentData";

/** Tag every board file carries, so that a file of some other kind is rejected as one. */
const BOARD_FORMAT = "gates.board";
/** Raised whenever the shape of what is being read changes. */
const BOARD_FORMAT_VERSION = 1;

/** Decimal places kept for positions and angles. */
const PRECISION = 3;

interface BoardData extends ComponentSet {
  format: typeof BOARD_FORMAT;
  version: number;
  name: string;
  /**
   * The custom components this board uses, in full.
   *
   * Written when a board leaves its project, and absent inside one. A placement names its component
   * rather than carrying it, which is right while the two are filed together — but an exported
   * board has to open somewhere that has never heard of them, so the export takes them along.
   */
  library?: ComponentFileData[];
}

function round(value: number): number {
  const scale = 10 ** PRECISION;

  return Math.round(value * scale) / scale;
}

/** The pin's own settings, or nothing when it is carrying none of them. */
function serializePin(pin: LogicPin, index: number): PinData | undefined {
  if (!pin.netName && !pin.portName) {
    return undefined;
  }

  const data: PinData = {index};
  if (pin.netName) {
    data.netName = pin.netName;
  }
  if (pin.portName) {
    data.portName = pin.portName;
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

  if (component instanceof SubComponent && component.definitionId) {
    data.component = component.definitionId;
  }
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
    pin.portName = (data.portName ?? "").trim();
  }
}

function applyComponentData(board: LogicBoard, component: LogicComponent, data: ComponentData) {
  applySettings(component, data);
  applyPinData(board, component, data.pins ?? []);
}

/**
 * Places a custom component, refusing rather than quietly dropping it.
 *
 * A missing component takes a whole subcircuit out of the board with it, which read as a working
 * board with parts silently gone would be worse than not opening at all.
 */
function placementOf(board: LogicBoard, id: string): LogicComponent {
  const definition = board.library?.(id);
  if (!definition) {
    throw new Error(`This board uses a component the project does not have: ${id}`);
  }

  return new SubComponent({scope: board.scope, board, definition});
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

    const component = entry.component
        ? placementOf(board, entry.component)
        : makeComponent({
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
    // Absent in a board filed inside a project, which finds its components there instead.
    library: Array.isArray(parsed.library) ? parsed.library as ComponentFileData[] : undefined,
  };
}

export {addComponents, loadBoard, parseBoardFile, serializeBoard, serializeComponents,
        BOARD_FORMAT};
export type {BoardData, ComponentSet};
