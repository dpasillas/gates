import {LogicComponent} from "./LogicComponent";
import {Switch} from "./Switch";

/**
 * The shape a component takes when it is written down, and how it is put back.
 *
 * Its own module because both the board reader and {@link SubComponent} build components from this
 * data, and the board reader also builds subcomponents — which would have the two importing each
 * other if the shapes lived with the reader.
 */

/** Anything a pin carries that the component it belongs to does not already determine. */
interface PinData {
  /** Where the pin sits in its component's pin list, which the component's type and widths fix. */
  index: number;
  netName?: string;
  /** Present only when the pin is exposed: a port is a name, so the name is the whole statement. */
  portName?: string;
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
  /**
   * Which component in the project this was placed from, for a custom one.
   *
   * The only thing a placement of a custom component adds. A component is a whole thing in its own
   * file, so a placement names it rather than repeating it — the two are in one project and travel
   * together, and forty placements of one component should not be forty copies of its board.
   */
  component?: string;
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

/**
 * Everything about a component that is not its identity, its type, or where it is wired.
 *
 * Split from the pin data beside it in the file because this half needs no board: a component being
 * built to run inside a subcomponent takes all of it, and none of the names.
 */
function applySettings(component: LogicComponent, data: ComponentData) {
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
}

export {applySettings};
export type {ComponentData, ComponentSet, ConnectionData, PinData, PinRef};
