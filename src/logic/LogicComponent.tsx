import React from "react";
import paper from "paper";
import {v4 as uuidv4} from 'uuid';

import {PartType} from "../enums/PartType";
import {GateType} from "../enums/GateType";
import {LogicPin} from "./LogicPin";
import {Component, GateEventHandlers, GateProps} from "../components/Component";
import {LogicState} from "./LogicState";
import {LogicBoard} from "./LogicBoard";
import {ComponentProperty} from "./ComponentProperty";
import {bitMask} from "../util/bits";
import {normalizeAngle} from "../util/angle";
import {shapeFor} from "../util/shapeCache";
import {leaveNet} from "./nets";


/**
 * Indicates how the component may be interacted with in the UI.
 *
 * Associated state for any of these parameters should be placed in LogicComponentParams.
 * These fields are intended to be set
 *  */
export interface InteractionParams {
  adjustableWidth?: boolean;
  adjustableFieldWidth?: boolean;
  minWidth?: number;
  maxWidth?: number;
  minFieldWidth?: number;
  maxFieldWidth?: number;
  canMerge?: boolean;
  isMux?: boolean;
  hasDelay?: boolean;
}

export interface LogicComponentParams {
  /** Human-readable name of this kind of component, shown in the properties panel. */
  label?: string;
  /** The type of the component, required for serialization */
  type: PartType;
  /** The subtype of the component, required for serialization */
  subtype: GateType;
  /** The scope in which this component will be rendered and interacted with. */
  scope: paper.PaperScope;
  /**
   * The number of input pins, excluding control pins.
   *
   * The specific meaning of this field depends on the specific LogicComponent implementation.
   * */
  fieldWidth?: number;
  /** The number of bits of data handled on a single pin, excluding control pins. */
  width?: number;
  /**
   * The propagation delay of this component
   *
   * More specifically, the amount of time it takes for a change in one or more of the inputs of this component to be
   * reflected in the outputs.
   * */
  delay?: number;
  /** The logical board where rendering and interaction are done, and where logical events will be handled. */
  board?: LogicBoard;

  /** Indicates if pins are merged.  This only has effect if the component can be merged. */
  isMerged?: boolean;
}

interface LogicComponentFullParams extends InteractionParams, LogicComponentParams {}

export interface UpdateGeometryParams {
  fieldWidth: number,
  width: number,
}


/**
 * Base class for all logical components which may or may not be rendered
 *
 * A logical component is any object which may send or receive logical signals.
 * */
abstract class LogicComponent {
  private __fieldWidth: number = -1;
  private __width: number = -1;
  private __d: string = "";
  private __shapeKey: string = "";
  /** The unique id of this component, used for rendering, and serialization */
  readonly uuid: string;
  /** Human-readable name of this kind of component, e.g. "AND" or "Clock". */
  readonly label: string;
  readonly type: PartType;
  readonly subtype: GateType;
  readonly scope: paper.PaperScope;
  board?: LogicBoard;
  /**
   * The propagation delay of this component
   *
   * More specifically, the amount of time it takes for a change in one or more of the inputs of this component to be
   * reflected in the outputs.
   * */
  delay: number;

  readonly adjustableWidth: boolean;
  readonly adjustableFieldWidth: boolean;
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly minFieldWidth: number;
  readonly maxFieldWidth: number;
  readonly canMerge: boolean;
  private __isMerged: boolean;
  readonly isMux: boolean;
  readonly hasDelay: boolean;

  /** The shape of this component used for rendering and interactions */
  body!: paper.Item;
  /** A grouping of this component's body and pins which stores translation and rotation information. */
  geometry!: paper.Item;
  inputPins: LogicPin[] = [];
  outputPins: LogicPin[] = [];
  /**
   * Callback which triggers a re-render on the rendered object
   */
  updateSelf?: () => void;

  protected constructor(params: LogicComponentFullParams) {

    this.uuid = uuidv4();
    this.label = params.label ?? "Component";
    this.scope = params.scope
    this.type = params.type;
    this.subtype = params.subtype;
    this.delay = params.delay ?? 1;

    this.adjustableWidth = params.adjustableWidth ?? false;
    this.adjustableFieldWidth = params.adjustableFieldWidth ?? false;
    this.minWidth = params.minWidth ?? 1;
    this.maxWidth = params.maxWidth ?? 32;
    this.minFieldWidth = params.minFieldWidth ?? 1;
    this.maxFieldWidth = params.maxFieldWidth ?? 1;
    this.canMerge = params.canMerge ?? false;
    // Assigned directly rather than through the setter, which rebuilds geometry that does not exist
    // yet at this point in construction.
    this.__isMerged = (params.isMerged ?? false) && this.canMerge;
    this.isMux = params.isMux ?? false;
    this.hasDelay = params.hasDelay ?? true;

    this.board = params.board;

    const width = params.width ?? 1;
    const fieldWidth = params.fieldWidth ?? 0;

    this.updateGeometry({width, fieldWidth});

    this.__fieldWidth = params.fieldWidth ?? 0;
    this.__width = params.width ?? 1;

    this.reset();
  }

  private makeUpdateGeometryParams(params: Partial<UpdateGeometryParams>): UpdateGeometryParams {
    return {
      fieldWidth: params.fieldWidth ?? this.fieldWidth,
      width: params.width ?? this.width,
    }
  }

  /** Handler for updating this component's body and pins in response to property updates */
  updateGeometry(params: Partial<UpdateGeometryParams>) {
    const fullParams = this.makeUpdateGeometryParams(params);
    // Taken from the parameters, not the fields: the width setters assign their field only after
    // this returns, so reading them here would key the new geometry under the old size.
    this.__shapeKey =
        `${this.type}/${this.subtype}/${fullParams.width}/${fullParams.fieldWidth}/${this.isMerged}`;
    const {Group} = this.scope;
    // Read against the old body, before the pivot moves under it.
    const placedAt = this.geometry?.position.clone();
    let selected = false;
    if (this.body) {
      this.body.remove();
      selected = this.body.selected;
    }
    this.body = this.setUpBody(fullParams);
    this.body.selected = selected;

    if (!this.geometry) {
      this.geometry = new Group();
      this.geometry.applyMatrix = false;
    }

    // The component is anchored at the centre of its body, so `geometry.position` is that centre and
    // placing a component is a matter of setting it. Pins are deliberately excluded: they stick out
    // asymmetrically and come and go, and an anchor that shifted when a pin appeared would drag the
    // component with it.
    //
    // Expressed as a pivot rather than by moving the geometry, so that bodies, pins and the
    // decorations drawn by extraRender all stay in the natural coordinates they are authored in.
    this.geometry.pivot = this.body.bounds.center;

    // A component that changes size stays where it was put, growing evenly about its centre rather
    // than sprawling out of one corner. Without this the body would keep its old corner and the
    // centre — the point the component is placed and reported by — would slide as it grew.
    if (placedAt) {
      this.geometry.position = placedAt;
    }

    // What each surviving pin was carrying before, so that a change of width can be noticed below.
    const carried = new Map(this.pins().map(pin => [pin.uuid, pin.width]));

    this.setUpPins(fullParams);
    this.geometry.addChild(this.body);
    this.geometry.addChildren(this.pins().map(p => p.geometry as paper.Item));

    // A pin that changed width can no longer be on the net or the wire it was on: both join pins of
    // one width, and the pin at the far end has not changed with it.
    for (const pin of this.pins()) {
      const before = carried.get(pin.uuid);
      if (before !== undefined && before !== pin.width) {
        pin.disconnect();
        leaveNet(pin);
      }
    }

    // Rebuilding moves pins about, and a wire is drawn from the pins at its ends, so every wire
    // still attached has to be redrawn from where its pins have ended up.
    this.pins()
        .flatMap(pin => [...pin.connections.values()])
        .forEach(connection => connection.update());

    this.__d = shapeFor(`body:${this.__shapeKey}`,
        () => (this.body.exportSVG() as SVGElement).getAttribute('d')!);

    this.body.data = {
      type: 'Component',
      logic: this,
      geometry: this.geometry,
    }
  }

  /**
   * Creates a bitmask of the specified width
   *
   * If no width is specified, defaults to this component's width.
   * */
  bitMask(numBits?: number): number {
    return bitMask(numBits ?? this.width);
  }

  /** Returns all pins associated with this component */
  pins(): LogicPin[] {
    return [
        ...this.inputPins,
        ...this.outputPins,
    ]
  }

  /**
   * Removes all logical pins on this component
   *
   * Removed pins are disconnected from all other pins, and all events associated with the pin are purged.
   * */
  clearPins() {
    //TODO(dpasillas): remove logic events associated with pins
    for (const pin of this.pins()) {
      pin.remove();
    }

    this.inputPins = [];
    this.outputPins = [];
  }

  /** Sets up all pins required for this component */
  setUpPins(params: UpdateGeometryParams) {
    this.inputPins = [...this.setUpInputPins(params), ...this.setUpSelectorPins(params)];
    this.outputPins = this.setUpOutputPins(params);
  }

  /** Virtual method to set up input pins */
  setUpInputPins(params: UpdateGeometryParams): LogicPin[] {
    return [];
  }

  /** Virtual method to set up output pins. */
  setUpOutputPins(params: UpdateGeometryParams): LogicPin[] {
    return [];
  }

  /** Virtual method to set up selector pins, as required for -plexer type ICs. */
  setUpSelectorPins(params: UpdateGeometryParams): LogicPin[] {
    return []
  }

  collides(select: paper.Item): boolean {
    const matrix = this.geometry.matrix;
    const imatrix = matrix.inverted();
    const body = this.body;
    select.transform(imatrix)
    const isSelected = body.intersects(select) || select.contains(body.position) || body.contains(select.position)
    select.transform(matrix)
    return isSelected
  }

  set fieldWidth(fieldWidth: number) {
    if (this.__fieldWidth === fieldWidth) {
      return;
    }
    this.updateGeometry({fieldWidth})
    this.__fieldWidth = fieldWidth
    this.updateSelf && this.updateSelf();
  }

  get fieldWidth(): number {
    return this.__fieldWidth;
  }

  set width(width: number) {
    if (this.__width === width) {
      return;
    }
    this.updateGeometry({width});
    this.__width = width;
    this.updateSelf && this.updateSelf();
  }

  get width() {
    return this.__width;
  }

  get isMerged(): boolean {
    return this.__isMerged;
  }

  /**
   * Collapses this component's per-bit pins into one bussed pin, or expands them again.
   *
   * Unlike the width setters, the new value is stored before the rebuild: pin layout is a direct
   * function of it, so {@link setUpPins} has to see the value it is building for.
   */
  set isMerged(isMerged: boolean) {
    if (!this.canMerge || this.__isMerged === isMerged) {
      return;
    }
    this.__isMerged = isMerged;
    this.clearPins();
    this.updateGeometry({});
    this.reset();
    this.updateSelf && this.updateSelf();
  }

  /**
   * Properties specific to this kind of component, shown above its position in the panel.
   *
   * Subclasses override this to add or replace rows; the position is appended by
   * {@link properties} so that it always sorts last.
   */
  protected specificProperties(): ComponentProperty[] {
    const properties: ComponentProperty[] = [{
      key: "width",
      label: "Bit Width",
      value: this.width,
      // Components which do not declare an adjustable width are pinned to whatever they were built
      // with, so the row still shows but cannot be edited.
      editable: this.adjustableWidth,
      min: this.minWidth,
      max: this.maxWidth,
      setValue: (width: number) => {this.width = width},
    }];

    if (this.adjustableFieldWidth) {
      properties.push({
        key: "fieldWidth",
        label: "Inputs",
        value: this.fieldWidth,
        editable: true,
        min: this.minFieldWidth,
        max: this.maxFieldWidth,
        setValue: (fieldWidth: number) => {this.fieldWidth = fieldWidth},
      });
    }

    if (this.canMerge) {
      properties.push({
        key: "merged",
        // Not "inputs": the same option collapses a switch's outputs onto one bus.
        label: "Merge Pins",
        kind: "boolean",
        value: this.isMerged ? 1 : 0,
        editable: true,
        setValue: (merged: number) => {this.isMerged = merged !== 0},
      });
    }

    if (this.hasDelay) {
      properties.push({
        key: "delay",
        label: "Delay",
        value: this.delay,
        editable: true,
        min: 1,
        setValue: (delay: number) => {this.delay = delay},
      });
    }

    return properties;
  }

  /**
   * How far the component is turned, in degrees, about the centre of its body.
   *
   * Reported as a single turn from zero, so that the panel does not jump between 350 and -10 for
   * the same orientation. A selection of several components is turned by an offset rather than set
   * to an angle, and reports that offset the shorter way round instead.
   */
  get angle(): number {
    return normalizeAngle(this.geometry.rotation);
  }

  set angle(angle: number) {
    this.geometry.rotation = angle;
    this.update();
    // Wires leave a pin along the pin, so turning a component changes every wire attached to it.
    this.pins()
        .flatMap(pin => [...pin.connections.values()])
        .forEach(connection => connection.update());
  }

  /** Every property surfaced in the properties panel, with placement pinned last. */
  properties(): ComponentProperty[] {
    // The centre of the body, which is the point the component is anchored and placed by.
    const {x, y} = this.geometry.position;

    return [
      ...this.specificProperties(),
      {key: "x", label: "X", value: x, editable: false, precision: 1, setValue: () => {}},
      {key: "y", label: "Y", value: y, editable: false, precision: 1, setValue: () => {}},
      {
        // Deliberately unbounded. Bounds are a clamp in the panel, not a wrap, so a limit at zero
        // would stop the angle winding backwards past it while it wound forwards past 360 freely.
        // Any value is meaningful here; the getter brings it back into a single turn.
        key: "angle",
        label: "Angle",
        value: this.angle,
        editable: true,
        setValue: (angle: number) => {this.angle = angle},
      },
    ];
  }

  /** Path description of the component's body */
  get d() {
    return this.__d;
  }

  /** Everything that decides the shape of this component's body and where its pins sit. */
  get shapeKey(): string {
    return this.__shapeKey;
  }

  get selected() {
    return this.body.selected;
  }

  set selected(selected: boolean) {
    if (this.body.selected !== selected) {
      this.body.selected = selected;
      this.update()
    }
  }

  translate(delta: paper.Point) {
    this.geometry.translate(delta);
    // Moving a component moves the centre its selection turns about. Turning deliberately does not
    // invalidate that centre, so that repeated turns share one pivot.
    this.board?.invalidateSelectionPivot();
    this.update();
    this.pins()
        .flatMap(pin => [...pin.connections.values()])
        .forEach(connection => connection.update());
  }

  /** Sets the specified logical state on the specified pin after the propagation delay. */
  postEvent(state: LogicState, pin?: LogicPin, then?: () => void) {
    pin = pin ?? this.outputPins[0];
    this.board?.postEvent(state, pin, this.delay, then);
  }

  /** Delete this component, and all associated pins/connections */
  remove() {
    this.clearPins();
    delete this.body.data.logic;
    this.body.remove();
    this.geometry.remove();
    this.board?.removeComponent(this.uuid);
  }

  /**
   * Virtual method to perform additional drawing on top of the base component
   *
   * For example, this may be used to draw pin labels, light from activated bulbs, or the interactive part of a button.
   * */
  extraRender(): React.ReactElement {
    return <></>;
  }

  /** Maps this logical component to a React Component */
  render(handlers?: GateEventHandlers): React.ReactElement {
    return (
        <Component
            key={this.uuid}
            {...this.getRenderParams(handlers)}/>
    );
  }

  /** Triggers a re-render */
  update() {
    this.updateSelf && this.updateSelf();
  }

  /** Specifies required properties for rendering */
  getRenderParams(handlers?: GateEventHandlers): Required<GateProps> {
    return {
      type: this.subtype,
      logicComponent: this,
      scope: this.scope,
      handlers: {
        onGateMouseDown: handlers?.onGateMouseDown?.bind(undefined, this),
        onGateMouseUp: handlers?.onGateMouseUp?.bind(undefined, this),
        onGateMouseMove: handlers?.onGateMouseMove?.bind(undefined, this),
        onGateContextMenu: handlers?.onGateContextMenu?.bind(undefined, this),
        onPinMouseDown: handlers?.onPinMouseDown,
        onPinMouseUp: handlers?.onPinMouseUp,
        onPinMouseMove: handlers?.onPinMouseMove,
        onPinContextMenu: handlers?.onPinContextMenu,
      }
    }
  }



  /** Sets up the shape of this component */
  abstract setUpBody(params: UpdateGeometryParams): paper.Item
  /** Performs a logical operation */
  abstract operate(): void
  /** Returns the component to its initial state at power up */
  reset() {
    for (const pin of this.pins()) {
      pin.reset();
    }
  }
}

export {LogicComponent};