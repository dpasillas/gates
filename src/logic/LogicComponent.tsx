import React from "react";
import paper from "paper";
import {v4 as uuidv4} from 'uuid';

import PartType from "../enums/PartType";
import GateType from "../enums/GateType";
import LogicPin from "./LogicPin";
import Component, {GateEventHandlers, GateProps} from "../components/Component";
import LogicState from "./LogicState";
import LogicBoard from "./LogicBoard";


/**
 * Indicates how the component may be interacted with in the UI.
 *
 * Associated state for any of these parameters should be placed in LogicComponentParams.
 * These fields are intended to be set
 *  */
export interface InteractionParams {
  adjustableWidth?: boolean;
  adjustableFieldWidth?: boolean;
  minFieldWidth?: number;
  maxFieldWidth?: number;
  canMerge?: boolean;
  isMux?: boolean;
  hasDelay?: boolean;
}

export interface LogicComponentParams {
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
  /** The unique id of this component, used for rendering, and serialization */
  readonly uuid: string;
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
  readonly minFieldWidth: number;
  readonly maxFieldWidth: number;
  readonly canMerge: boolean;
  isMerged: boolean;
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
    this.scope = params.scope
    this.type = params.type;
    this.subtype = params.subtype;
    this.delay = params.delay ?? 1;

    this.adjustableWidth = params.adjustableWidth ?? false;
    this.adjustableFieldWidth = params.adjustableFieldWidth ?? false;
    this.minFieldWidth = params.minFieldWidth ?? 1;
    this.maxFieldWidth = params.maxFieldWidth ?? 1;
    this.canMerge = params.canMerge ?? false;
    this.isMerged = (params.isMerged ?? false) && this.canMerge;
    this.isMux = params.isMux ?? false;
    this.hasDelay = params.hasDelay ?? true;

    this.board = params.board;

    let width = params.width ?? 1;
    let fieldWidth = params.fieldWidth ?? 0;

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
    let fullParams = this.makeUpdateGeometryParams(params);
    let {Group, Point} = this.scope;
    let selected = false;
    if (this.body) {
      this.body.remove();
      selected = this.body.selected;
    }
    this.body = this.setUpBody(fullParams);
    this.body.selected = selected;

    if (!this.geometry) {
      this.geometry = new Group();
      this.geometry.pivot = new Point(0, 0);
      this.geometry.applyMatrix = false;
    }

    this.setUpPins(fullParams);
    this.geometry.addChild(this.body);
    this.geometry.addChildren(this.pins().map(p => p.geometry as paper.Item));

    this.__d = (this.body.exportSVG() as SVGElement).getAttribute('d')!;

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
    numBits = numBits ?? this.width;
    return (1 << numBits) - 1;
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
    for (let pin of this.pins()) {
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
    let matrix = this.geometry.matrix;
    let imatrix = matrix.inverted();
    let body = this.body;
    select.transform(imatrix)
    let isSelected = body.intersects(select) || select.contains(body.position) || body.contains(select.position)
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

  /** Path description of the component's body */
  get d() {
    return this.__d;
  }

  get selected() {
    return this.body.selected;
  }

  set selected(selected: boolean) {
    this.body.selected = selected;
  }

  translate(delta: paper.Point) {
    console.log("translate")
    this.geometry.translate(delta);
    this.update();
    this.pins()
        .flatMap(pin => [...pin.connections.values()])
        .forEach(connection => connection.update());
  }

  /** Sets the specified logical state on the specified pin after the propagation delay. */
  postEvent(state: LogicState, pin?: LogicPin) {
    pin = pin ?? this.outputPins[0];
    this.board?.postEvent(state, pin, this.delay);
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
    for (let pin of this.pins()) {
      pin.reset();
    }
  }
}

export default LogicComponent;