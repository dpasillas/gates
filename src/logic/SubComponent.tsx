import React from "react";
import * as paper from "paper";

import {LogicComponent, LogicComponentParams} from "./LogicComponent";
import {LogicPin} from "./LogicPin";
import {Net} from "./Net";
import {PackageComponent} from "./PackageComponent";
import {applySettings} from "./componentData";
import {makeComponent} from "./componentFactory";
import {PartType} from "../enums/PartType";
import {GateType} from "../enums/GateType";
import type {ComponentDefinition, ComponentLibrary} from "./ComponentDefinition";
import type {ComponentSet} from "./componentData";

/**
 * A board, put behind a package, placed as one part.
 *
 * It draws as the package it was given, so what a user authored is what lands on the board. What it
 * does comes from the board it was made from, whose parts run in the same simulation as everything
 * around them rather than in one of their own — there is one queue, one clock and one set of lines.
 *
 * Those parts are hosted rather than placed: they are in none of the collections that mean "on the
 * board", so nothing draws, hit-tests, photographs or files them, and no editor action can reach
 * them. A pin of the subcomponent is on the same line as the pins that answer to its port inside,
 * bonded rather than wired, so unwiring the outside cannot take the inside apart.
 */

interface IParams extends Omit<LogicComponentParams, "type" | "subtype"> {
  /**
   * The component being placed, which carries all three of the below.
   *
   * How one arrives on a board. The three are still taken separately so that a packaging can be
   * placed on its own, which is what the authoring editor previews.
   */
  definition?: ComponentDefinition;
  /** What it is drawn as, and what its pins are. */
  packaging?: PackageComponent;
  /** What it does: the components and wiring of the board it was made from. */
  inside?: ComponentSet;
  /**
   * Which port inside answers to each pin outside, keyed by the *declared* pin's identity.
   *
   * Declared rather than placed because a placement's pins are its own — two placements of one
   * packaging must not share a pin uuid, since the board keys its pins by that.
   *
   * Absent for a pin means the port of the same name, which is what a package derived from a board
   * gives and what most bindings come to anyway.
   */
  binding?: Map<string, string>;
  /** Where a component placed on the board inside finds what it was built from. */
  library?: ComponentLibrary;
}

class SubComponent extends LogicComponent {
  packaging!: PackageComponent;

  /** The parts inside, kept here as well so that they go when the subcomponent does. */
  readonly inner: LogicComponent[] = [];

  private binding: Map<string, string> = new Map();

  /** Which component in the project this was placed from, when it came from one. */
  readonly definitionId?: string;

  /** The declared pin each of this instance's own pins mirrors, by uuid. */
  private declaredBy: Map<string, string> = new Map();

  constructor(params: IParams) {
    const packaging = params.definition?.packaging ?? params.packaging;
    if (!packaging) {
      throw new Error("A subcomponent needs a packaging, or a component that carries one.");
    }

    super({...params, type: PartType.COMPOSITE_CUSTOM, subtype: 0,
           label: params.definition?.name || packaging.name || "Component"});
    this.packaging = packaging;
    this.definitionId = params.definition?.uuid;
    this.binding = params.binding ?? params.definition?.ports ?? new Map();

    // Drawn a second time now that the packaging is known: the base constructor ran before this
    // class's fields existed and had nothing to draw.
    this.updateGeometry({});
    this.linkPins();

    const inside = params.inside ?? params.definition?.contents;
    if (inside) {
      this.fill(inside, params.library ?? this.board?.library);
      this.powerUp();
    }
  }

  /**
   * Brings it up as though the simulation had just been reset.
   *
   * Nothing else does: the base constructor resets before this class has any pins, and the lines
   * joining the outside to the inside are made later still. Left out, a component just placed reads
   * as a settled zero on every pin — which is not what its board would have read, and is not a
   * value anything put there.
   */
  private powerUp() {
    this.brought.forEach(component => component.reset());
    const pins = this.pins();
    pins.forEach(pin => pin.reset());
    pins.forEach(pin => pin.net?.settle(true));
  }

  /**
   * Ties each pin back to the one it mirrors.
   *
   * Done here rather than while mirroring because the base constructor draws before this class's
   * fields exist, so anything the mirroring wrote would be thrown away by the field initialisers.
   */
  private linkPins() {
    this.declaredBy = new Map();
    ([[this.packaging.inputs, this.inputPins], [this.packaging.outputs, this.outputPins]] as const)
        .forEach(([declared, mine]) => declared.forEach((from, index) => {
          if (mine[index]) {
            this.declaredBy.set(mine[index].uuid, from.uuid);
          }
        }));
  }

  /** What each pin outside is called inside, which is its own label unless something says otherwise. */
  private portFor(pin: LogicPin): string {
    const declared = this.declaredBy.get(pin.uuid);

    return (declared && this.binding.get(declared)) ?? pin.label ?? "";
  }

  operate() {
    // Nothing to do: a pin outside and the line it answers to inside are one line, so a value
    // arriving at the boundary is already on both sides of it.
  }

  /** Identifies the drawing, which is the packaging's and nothing of this instance's. */
  protected shapeKeyFor(): string {
    return this.packaging
        ? `subcomponent/${this.packaging.interfaceHash}`
        : "subcomponent/empty";
  }

  setUpBody(): paper.Item {
    if (!this.packaging) {
      return new this.scope.Path.Rectangle(
          new this.scope.Point(0, 0), new this.scope.Size(32, 32));
    }

    // Asked of the packaging, which is what works out the outline and where the pins on it sit.
    return this.packaging.setUpBody();
  }

  /**
   * One pin for each the packaging declares, in its place.
   *
   * Built here rather than borrowed from the packaging: several subcomponents can share one
   * packaging, and each needs pins of its own to wire and to carry a value.
   */
  private mirror(declared: LogicPin[], existing: LogicPin[]): LogicPin[] {
    return declared.map((from, index) => {
      const pin = existing[index] ?? new LogicPin({
        parent: this,
        pinType: from.pinType,
        width: from.width,
        not: from.not,
        orientation: from.orientation,
        board: this.board,
        label: from.label,
      });

      pin.showLabel = from.showLabel;
      pin.labelBold = from.labelBold;
      pin.clock = from.clock;
      pin.updateGeometry(new this.scope.Point(from.pos.x, from.pos.y));

      return pin;
    });
  }

  setUpInputPins(): LogicPin[] {
    return this.packaging ? this.mirror(this.packaging.inputs, this.inputPins) : [];
  }

  setUpOutputPins(): LogicPin[] {
    return this.packaging ? this.mirror(this.packaging.outputs, this.outputPins) : [];
  }

  /** The packaging's own decoration, drawn against this instance's body. */
  extraRender(): React.ReactElement {
    return this.packaging ? this.packaging.extraRender() : <></>;
  }

  /**
   * Builds what is inside and ties it to the pins outside.
   *
   * The parts are built attached to nothing, then handed to the board to run. Their port names are
   * dropped on the way: an instance is derived from its packaging rather than authored, so a name
   * there would duplicate what the packaging already holds, and two instances sharing one would
   * clash over it.
   */
  private fill(inside: ComponentSet, library?: ComponentLibrary) {
    const {components, ports} = build(this.scope, inside, library);
    this.inner.push(...components);
    this.brought.forEach(component => this.board?.host(component));

    for (const pin of this.pins()) {
      const carrying = ports.get(this.portFor(pin)) ?? [];
      if (carrying.length === 0) {
        continue;
      }

      // What the line is at is decided inside, so the pin outside carries it rather than driving
      // it. Marked before it joins the line, which is what decides how it is grouped there.
      pin.passive = true;
      const line = pin.net ?? new Net();
      line.add(pin);
      carrying.forEach(inner => line.bond(inner.net ?? lineFor(inner)));
    }
  }

  /**
   * Everything this brings to the board it lands on.
   *
   * A component built on a board that itself had components on it holds subcomponents of its own,
   * and those bring parts too. All of them run in the one simulation however deep they sit.
   */
  get brought(): LogicComponent[] {
    return this.inner.flatMap(component => component instanceof SubComponent
        ? [component, ...component.brought]
        : [component]);
  }

  /** Takes the parts inside with it, so nothing is left running on a board it has left. */
  remove() {
    const brought = this.brought;
    brought.forEach(component => component.remove());
    this.board?.hosted.forEach((component, uuid) => {
      if (brought.includes(component)) {
        this.board?.hosted.delete(uuid);
      }
    });
    super.remove();
  }
}

/** The component a placement names, refusing to build one that would be a different part. */
function definitionNamed(library: ComponentLibrary | undefined, id: string): ComponentDefinition {
  const found = library?.(id);
  if (!found) {
    throw new Error(`This board uses a component the project does not have: ${id}`);
  }

  return found;
}

/** Puts a pin on a line of its own, for one that is not wired to anything inside. */
function lineFor(pin: LogicPin): Net {
  const line = new Net();
  line.add(pin);

  return line;
}

/**
 * The parts of a board, built attached to nothing.
 *
 * No board is given, so nothing registers itself anywhere: the caller decides what runs them. The
 * wiring between them is made the same way the board's own reader makes it.
 */
function build(scope: paper.PaperScope, data: ComponentSet, library?: ComponentLibrary)
    : {components: LogicComponent[], ports: Map<string, LogicPin[]>} {
  const components = data.components.map(entry => {
    const type = (PartType as unknown as Record<string, number | undefined>)[entry.type];
    if (type === undefined) {
      throw new Error(`Unknown part type: ${entry.type}`);
    }

    // A component placed on the board inside is looked up rather than carried: it is in the same
    // project, so the one copy the project holds is the one every placement of it builds from.
    const made = entry.component
        ? new SubComponent({scope, definition: definitionNamed(library, entry.component), library})
        : makeComponent({type, subtype: entry.subtype as GateType, scope});
    applySettings(made, entry);

    return made;
  });

  const ports = new Map<string, LogicPin[]>();
  data.components.forEach((entry, index) => {
    const all = components[index].pins();
    for (const pin of entry.pins ?? []) {
      const at = all[pin.index];
      if (at && pin.portName) {
        ports.set(pin.portName, [...(ports.get(pin.portName) ?? []), at]);
      }
    }
  });

  for (const {source, sink} of data.connections) {
    const from = components[source.component]?.pins()[source.pin];
    const to = components[sink.component]?.pins()[sink.pin];
    if (from && to) {
      to.connectTo(from);
    }
  }

  return {components, ports};
}

export {SubComponent};
export type {IParams as SubComponentParams};
