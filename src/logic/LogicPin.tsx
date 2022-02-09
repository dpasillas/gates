import {v4 as uuidv4} from 'uuid';
import LogicComponent from "./LogicComponent";
import * as Constants from "../Constants";
import Pin, {PinEventHandlers, PinProps} from "../components/Pin";
import React from "react";
import LogicState from "./LogicState";
import LogicConnection from "./LogicConnection";
import * as paper from "paper";
import LogicBoard from "./LogicBoard";

export enum PinOrientation {
  UNKNOWN,
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

/** Indicates whether a pin receives or sends logic signals */
export enum PinType {
  UNKNOWN,
  INPUT,
  OUTPUT,
}

interface IParams {
  /** LogicComponent which receives or sends signals from this pin */
  parent: LogicComponent,
  /** Indicates whether this pin receives or sends logic signals */
  pinType: PinType,
  /** Rendering hint to show a pin as negated */
  not?: boolean,
  /** The number of bits of data which may be received or transmitted by this pin */
  width?: number,
  /** Direction in which the pin is mounted on the parent */
  orientation?: PinOrientation,
  /** The board which processes events, and optionally renders this pin */
  board?: LogicBoard,
  label?: string,
}

/**
 * Logical representation of a pin which may or may not be rendered
 *
 * A pin is any input or output to/from a LogicComponent
 * */
class LogicPin {
  private parent: LogicComponent;
  private connectionAnchor?: paper.Point;
  readonly uuid: string;
  board?: LogicBoard;
  width: number;
  geometry?: paper.PathItem;
  not: boolean;
  orientation: PinOrientation;
  pinType: PinType;
  state: LogicState;
  label?: string;
  connections: Map<string /* UUID of connected pin */, LogicConnection> = new Map<string, LogicConnection>();
  /**
   * Callback which triggers a re-render on the rendered object
   */
  updateSelf?: () => void;

  constructor(params: IParams) {
    this.uuid = uuidv4();
    this.parent = params.parent;
    this.width = params.width ?? 1;
    this.orientation = params.orientation ?? PinOrientation.LEFT;
    this.pinType = params.pinType;
    this.not = params.not ?? false;
    this.state = new LogicState({});
    this.board = params.board;
    this.label = params.label;

    this.board?.addPin(this);
  }

  /** Helper function which causes logic states to propagate */
  setLogicState(state: LogicState) {
    this.state = state;
    switch (this.pinType) {
      case PinType.INPUT:
        this.parent.operate();
        break;
      case PinType.OUTPUT:
        this.updateNext();
        break;
      default:
        throw new Error();
    }
  }

  /** Updates all pins with connections leading from this pin */
  updateNext(force: boolean = false) {
    if (this.pinType !== PinType.OUTPUT) {
      throw new Error();
    }

    for (let connection of this.connections.values()) {
      connection.update();
      let inputPin = connection.sink;
      // No need to simulate events which won't affect the output
      if (force || this.state.ne(inputPin.state)) {
        inputPin.setLogicState(this.state)
      }
      // This ensures that self referencing components (such as Clock) operates appropriately
      inputPin.parent.operate();
    }
  }

  /** Removes all connections associated with this pin */
  disconnect() {
    this.connections.forEach((c) => c.remove());
    this.connections.clear();
  }

  /** Indicates whether this pin may be connected to another */
  canConnect(other: LogicPin) {
    if (this.width !== other.width) {
      return false;
    }

    switch (this.pinType) {
      case PinType.INPUT:
        return other.pinType === PinType.OUTPUT;
      case PinType.OUTPUT:
        return other.pinType === PinType.INPUT;
    }

    return false;
  }

  /** Creates a connection between this pin with another */
  connectTo(other: LogicPin): LogicConnection | null {
    if (!this.canConnect(other)) {
      return null;
    }

    if (this.pinType === PinType.INPUT) {
      if (this.isConnectedTo(other)) {
        return null;
      } else {
        this.disconnect()
      }
      let connection = new LogicConnection({source: other, sink: this, board: this.board})
      this.connections.set(connection.uuid, connection);
      other.connections.set(connection.uuid, connection);
      this.setLogicState(other.state);
      return connection;
    } else {
      return other.connectTo(this);
    }
  }

  /** Tests if connection exists between this pin and another */
  isConnectedTo(other: LogicPin): boolean {
    return this.connections.has(other.uuid);
  }

  remove() {
    this.disconnect()
    this.geometry?.remove();
    delete this.geometry?.data.logic
    this.board?.removePin(this.uuid);
  }

  renderLabel(i: number): React.ReactElement | undefined {
    if (!this.label) {
      return undefined;
    }

    let textClass: string;
    switch (this.orientation) {
      case PinOrientation.UP:
        textClass = "top";
        break;
      case PinOrientation.DOWN:
        textClass = "bottom";
        break;
      case PinOrientation.LEFT:
        textClass = "left";
        break;
      case PinOrientation.RIGHT:
        textClass = "right";
        break;
      default:
        textClass = "";
    }

    let [text, subscript] = this.label.split("__");
    return (
        <text key={i} className={textClass} x={this.pos.x} y={this.pos.y}>
          {text}
          {subscript && <tspan>{subscript}</tspan>}
        </text>
    );
  }

  render(handlers?: PinEventHandlers): React.ReactElement {
    return (
        <Pin key={this.uuid}
             {...this.getRenderParams(handlers)}
        />
    )
  }

  getRenderParams(handlers?: PinEventHandlers): PinProps {
    return {
      pin: this,
      type: this.pinType,
      handlers: {
        onPinMouseUp: handlers?.onPinMouseUp?.bind(undefined, this),
        onPinMouseDown: handlers?.onPinMouseDown?.bind(undefined, this),
        onPinMouseMove: handlers?.onPinMouseMove?.bind(undefined, this),
        onPinContextMenu: handlers?.onPinContextMenu?.bind(undefined, this),
      }
    }
  }

  /** Places the pin at a location on the parent, and subtracts the parent's body from its geometry. */
  updateGeometry(pos: paper.Point) {
    if(this.geometry) {
      this.geometry.remove()
    }
    let {CompoundPath, Path, Point} = this.parent.scope;
    let pin;
    if (this.not) {
      pin = new CompoundPath(Constants.NOT_PIN_PATH)
    } else {
      pin = new Path(Constants.PIN_PATH);
    }
    pin.pivot = new Point(0, 0);

    switch (this.orientation) {
      case PinOrientation.UP:
        pin.rotate(-90);
        this.connectionAnchor = new Point(0, -18);
        break;
      case PinOrientation.DOWN:
        pin.rotate(90);
        this.connectionAnchor = new Point(0, 18);
        break;
      case PinOrientation.LEFT:
        pin.rotate(180);
        this.connectionAnchor = new Point(-18, 0);
        break;
      case PinOrientation.RIGHT:
        this.connectionAnchor = new Point(18, 0);
        break;
      default:
        throw new Error("Unknown pin orientation")
    }

    pin.translate(pos);
    this.geometry = pin.subtract(this.parent.body as paper.PathItem);
    pin.remove();
    this.geometry.data.type = 'Pin'
    this.geometry.data.logical = this;
  }

  /** Triggers a re-render */
  update() {
    this.updateSelf && this.updateSelf();
  }

  /** Maps a point from local coordinates to svg coordinates */
  transform(p: paper.Point): paper.Point {
    return this.parent.geometry.matrix.transform(p);
  }

  get rotation(): number {
    return this.parent.geometry.rotation;
  }

  get pos(): paper.Point {
    return this.geometry!.position
  }

  get selected(): boolean {
    return this.geometry?.selected ?? false;
  }

  set selected(selected) {
    if (this.geometry && this.geometry.selected !== selected) {
      this.geometry.selected = selected
      this.update()
    }
  }

  /**
   * Returns a tuple containing a point near the end of the pin, and the direction the pin is pointing
   *
   * This information is used to render connections, and interaction aids.
   * */
  get anchor(): [paper.Point, paper.Point] {
    return [
      this.pos.add(this.connectionAnchor!),
      this.connectionAnchor!.rotate(this.rotation, new this.parent.scope.Point(0, 0)).divide(18)]
  }

  collides(select: paper.Item): boolean {
    let body = this.geometry!
    let matrix = body.parent.matrix;
    let imatrix = matrix.inverted();
    select.transform(imatrix)
    let isSelected = body.intersects(select) || select.contains(body.position) || body.contains(select.position)
    select.transform(matrix)
    return isSelected;
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

  /** Returns a pin to its default state */
  reset() {
    // If a connection to an input pin already exists, it will be handled by the output pin.
    if (this.pinType === PinType.INPUT && this.connections.size !== 0) {
        return
    }

    if (this.pinType === PinType.INPUT) {
      this.setLogicState(new LogicState({z: this.bitMask()}))
      this.parent.operate();
    } else {
      this.setLogicState(new LogicState({x: this.bitMask()}))
      this.updateNext(true);
    }
  }
}

export default LogicPin;