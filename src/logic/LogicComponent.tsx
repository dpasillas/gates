import React from "react";
import paper from "paper";
import {v4 as uuidv4} from 'uuid';

import PartType from "../enums/PartType";
import GateType from "../enums/GateType";
import LogicPin from "./LogicPin";
import Component, {GateEventHandlers, GateProps} from "../components/Component";
import LogicState from "./LogicState";
import LogicBoard from "./LogicBoard";


const MAX_FLAGS = 32

/**
 * Bit flags indicating rendering hints and allowable user interactions
 *
 * This was imported from a previous logic simulator project, and may be subject to change.
 * */
enum LogicFlag {
  VariableShape = 0x00000001,  // 1 << 0
  IBussable = 0x00000002,      // 1 << 1
  OBussable = 0x00000004,      // 1 << 2
  SingleOutput = 0x00000008,   // 1 << 3
  MergingPins = 0x00000010,    // 1 << 4
  Mux = 0x00000020,            // 1 << 5
  Bussed = 0x00000040,         // 1 << 6
}


export interface LogicComponentParams {
  /** Rendering and interaction hints as specified by LogicFlag */
  flags: number;
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
  /** The logical board where rendering and interaction are done, and where logical events will be handled. */
  board?: LogicBoard;
}

/**
 * Base class for all logical components which may or may not be rendered
 *
 * A logical component is any object which may send or receive logical signals.
 * */
abstract class LogicComponent {
  private __fieldWidth: number = 0;
  private __width: number;
  private __d: string = "";
  private flags: number;
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
  /** The shape of this component used for rendering and interactions */
  body!: paper.Item;
  /** A grouping of this component's body and pins which stores translation and rotation information. */
  geometry!: paper.Item;
  inputPins: LogicPin[] = [];
  outputPins: LogicPin[] = [];

  protected constructor(params: LogicComponentParams) {

    this.uuid = uuidv4();
    this.scope = params.scope
    this.flags = params.flags;
    this.type = params.type;
    this.subtype = params.subtype;
    this.delay = 1;
    this.__width = params.width ?? 1;

    this.board = params.board;

    this.fieldWidth = params.fieldWidth ?? 0;
  }

  /** Handler for updating this component's body and pins in response to property updates */
  updateGeometry(fieldWidth: number) {
    let {Group, Point} = this.scope;
    if (this.body) {
      this.body.remove()
    }
    this.body = this.setUpBody(fieldWidth);

    if (!this.geometry) {
      this.geometry = new Group();
      this.geometry.pivot = new Point(0, 0);
      this.geometry.applyMatrix = false;
    }

    this.setUpPins(fieldWidth);
    this.geometry.addChild(this.body);
    this.geometry.addChildren(this.pins().map(p => p.geometry as paper.Item));

    this.__d = (this.body.exportSVG() as SVGElement).getAttribute('d')!;

    this.body.data = {
      type: 'Component',
      logic: this,
      geometry: this.geometry,
    }
  }

  /** Checks if a property indicated by a LogicFlag is set */
  hasProperty(flag: LogicFlag): boolean {
    return (this.flags & flag) !== 0;
  }

  /** Sets a property indicated by a LogicFlag */
  setProperty(flag: LogicFlag): void {
    this.flags |= flag;
  }

  /** Unsets a property indicated by a LogicFlag */
  clearProperty(flag: LogicFlag): void {
    this.flags &= this.bitMask(MAX_FLAGS) ^ flag;
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
  setUpPins(fieldWidth: number) {
    this.inputPins = [...this.setUpInputPins(fieldWidth), ...this.setUpSelectorPins(fieldWidth)];
    this.outputPins = this.setUpOutputPins(fieldWidth);
  }

  /** Virtual method to set up input pins */
  setUpInputPins(fieldWidth: number): LogicPin[] {
    return [];
  }

  /** Virtual method to set up output pins. */
  setUpOutputPins(fieldWidth: number): LogicPin[] {
    return [];
  }

  /** Virtual method to set up selector pins, as required for -plexer type ICs. */
  setUpSelectorPins(fieldWidth: number): LogicPin[] {
    return []
  }

  set fieldWidth(fieldWidth: number) {
    this.updateGeometry(fieldWidth)
    this.__fieldWidth = fieldWidth
  }

  get fieldWidth(): number {
    return this.__fieldWidth;
  }

  set width(width: number) {
    // TODO(dpasillas): update geometry in response to width changes.
    if (this.__width === width) {
      return;
    }
    this.__width = width;
  }

  get width() {
    return this.__width;
  }

  /** Path description of the component's body */
  get d() {
    return this.__d;
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
  extraRender(): React.ReactElement[] {
    return [];
  }

  /** Maps this logical component to a React Component */
  render(handlers?: GateEventHandlers): React.ReactElement {
    return (
        <Component
            key={this.uuid}
            {...this.getRenderParams(handlers)}/>
    );
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
  abstract setUpBody(fieldWidth: number): paper.Item
  /** Performs a logical operation */
  abstract operate(): void
}

export default LogicComponent;