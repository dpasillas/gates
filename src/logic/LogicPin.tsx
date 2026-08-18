import { v4 as uuidv4 } from 'uuid';
import {LogicComponent} from "./LogicComponent";
import * as Constants from "../Constants";
import {Pin, PinEventHandlers, PinProps} from "../components/Pin";
import React from "react";
import {LogicState} from "./LogicState";
import {LogicConnection} from "./LogicConnection";
import * as paper from "paper";
import {LogicBoard} from "./LogicBoard";
import {bitMask} from "../util/bits";
import {shapeFor} from "../util/shapeCache";
import {driveOnto, Net} from "./Net";

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
  /**
   * Radius of the circle a connection attaches to.
   *
   * This is both what gets drawn and what a drop is tested against, so the target a user aims at is
   * the target they actually hit. Pins on the denser components sit closer together than twice this,
   * so the circles can still overlap and the caller has to pick the nearest rather than the first
   * one in range.
   */
  static readonly ANCHOR_RADIUS = 5;

  private parent: LogicComponent;
  private connectionAnchor?: paper.Point;
  readonly uuid: string;
  board?: LogicBoard;
  width: number;
  geometry?: paper.PathItem;
  /** Path data for the renderer, held so that drawing does not export it from paper every time. */
  d: string = "";
  not: boolean;
  orientation: PinOrientation;
  pinType: PinType;
  /** The value on the line this pin is on, which is what its component reads. */
  state: LogicState;
  /** What this pin puts on that line. Meaningless on a pin that only listens. */
  driven: LogicState;
  label?: string;
  /** The line this pin is on. Absent until it is wired to something or named. */
  net?: Net;

  /** What this pin is called on the board, which is the name of the line it is on. */
  get netName(): string {
    return this.net?.name ?? "";
  }
  /** The name this pin is exposed under when the board is used as a component. */
  portName: string = "";
  /** Whether this pin is exposed at all. A port must be named, and named uniquely. */
  isPort: boolean = false;
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
    this.driven = new LogicState({});
    this.board = params.board;
    this.label = params.label;

    this.board?.addPin(this);
  }

  /** Puts a value on this pin and lets it take effect at once. */
  setLogicState(state: LogicState) {
    switch (this.pinType) {
      case PinType.INPUT:
        this.receive(state);
        break;
      case PinType.OUTPUT:
        this.drive(state);
        this.net?.settle();
        break;
      default:
        throw new Error();
    }
  }

  /**
   * Records what this pin is putting on its line, without working out what the line is at.
   *
   * The board settles the line once every event sharing that instant has landed, so a line with
   * more than one driver changing at once resolves once rather than passing through orderings.
   */
  drive(state: LogicState) {
    this.driven = state;

    if (this.net) {
      this.board?.markSettling(this.net);
    } else {
      this.state = state;
    }
  }

  /** Takes the value its line settled to. */
  receive(state: LogicState) {
    this.state = state;
    this.parent.operate();
  }

  /** Removes every wire attached to this pin. */
  disconnect() {
    for (const connection of [...this.connections.values()]) {
      connection.remove();
    }
  }

  /** Whether this pin puts a value on its net. Bidirectional pins will answer yes to both. */
  get drives(): boolean {
    return this.pinType === PinType.OUTPUT;
  }

  /** Whether this pin reads the value on its net. */
  get listens(): boolean {
    return this.pinType === PinType.INPUT;
  }

  /**
   * Indicates whether this pin may be connected to another.
   *
   * TODO(dpasillas): Two outputs sharing a line is what a pull resistor against a tri-state needs,
   *   and the net resolves one from any number of drivers already. Wiring them directly is not the
   *   way in — see the user-drawn nets task.
   */
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
      const connection = new LogicConnection({ source: other, sink: this, board: this.board })
      this.connections.set(other.uuid, connection);
      other.connections.set(this.uuid, connection);
      driveOnto(other, this);
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
    // A pin that is gone cannot still be on a line. Membership is what the line resolves from, so
    // leaving it would keep a deleted component driving.
    this.net?.remove(this);
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

    const [text, subscript] = this.label.split("__");
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
    if (this.geometry) {
      this.geometry.remove()
    }
    const { CompoundPath, Point } = this.parent.scope;

    let rotation: number;
    switch (this.orientation) {
      case PinOrientation.UP:
        rotation = -90;
        this.connectionAnchor = new Point(0, -18);
        break;
      case PinOrientation.DOWN:
        rotation = 90;
        this.connectionAnchor = new Point(0, 18);
        break;
      case PinOrientation.LEFT:
        rotation = 180;
        this.connectionAnchor = new Point(-18, 0);
        break;
      case PinOrientation.RIGHT:
        rotation = 0;
        this.connectionAnchor = new Point(18, 0);
        break;
      default:
        throw new Error("Unknown pin orientation")
    }

    // Where the pin meets the body decides how much of it the body cuts away, so its placement is
    // part of what identifies the shape.
    this.d = shapeFor(`pin:${this.parent.shapeKey}|${this.not}|${rotation}|${pos.x},${pos.y}`,
        () => this.clipToBody(pos, rotation));

    this.geometry = new CompoundPath(this.d);
    // The boolean result this path stands in for carried the pin's own pivot, which sits where the
    // pin meets the body rather than in the middle of what survived the cut. `position` is read
    // through the pivot, and anchor points — where wires attach — are measured from it.
    this.geometry.pivot = pos;
    this.geometry.data.type = 'Pin'
    this.geometry.data.logical = this;
  }

  /** The pin with its component's body taken out of it, as path data. */
  private clipToBody(pos: paper.Point, rotation: number): string {
    const { CompoundPath, Path, Point } = this.parent.scope;
    const pin = this.not
        ? new CompoundPath(Constants.NOT_PIN_PATH)
        : new Path(Constants.PIN_PATH);

    pin.pivot = new Point(0, 0);
    pin.rotate(rotation);
    pin.translate(pos);

    const clipped = pin.subtract(this.parent.body as paper.PathItem);
    pin.remove();
    const d = (clipped.exportSVG() as SVGElement).getAttribute('d') ?? "";
    clipped.remove();

    return d;
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
    const body = this.geometry!
    const matrix = body.parent.matrix;
    const imatrix = matrix.inverted();
    select.transform(imatrix)
    const isSelected = body.intersects(select) || select.contains(body.position) || body.contains(select.position)
    select.transform(matrix)
    return isSelected;
  }

  /** How far the given board point is from where a connection would attach. */
  distanceTo(point: paper.Point): number {
    const [anchor,] = this.anchor
    return this.transform(anchor).getDistance(point)
  }

  /**
   * Whether a board point is close enough to drop a connection on this pin.
   *
   * The circle at the end of the pin adds to what the pin already covers rather than standing in
   * for it: it is there to make the point a wire attaches to easier to hit than the width of the
   * pin allows, so aiming at the pin itself has to work too.
   */
  isOver(point: paper.Point): boolean {
    return this.distanceTo(point) < LogicPin.ANCHOR_RADIUS || this.covers(point);
  }

  /** Whether a board point falls on the pin as drawn. */
  covers(point: paper.Point): boolean {
    if (!this.geometry) {
      return false;
    }

    // The pin's geometry is held in its component's frame, which is where the point has to be
    // brought to be compared against it.
    const local = this.parent.geometry.matrix.inverted().transform(point);

    return this.geometry.contains(local);
  }

  /**
   * Creates a bitmask of the specified width
   *
   * If no width is specified, defaults to this component's width.
   * */
  bitMask(numBits?: number): number {
    return bitMask(numBits ?? this.width);
  }

  /** Returns a pin to its default state */
  reset() {
    // If a connection to an input pin already exists, it will be handled by the output pin.
    if (this.pinType === PinType.INPUT && this.connections.size !== 0) {
      return
    }

    if (this.pinType === PinType.INPUT) {
      this.setLogicState(new LogicState({ z: this.bitMask() }))
      this.parent.operate();
    } else {
      this.driven = new LogicState({ x: this.bitMask() });
      this.state = this.driven;
      // Forced: listeners are still holding whatever they had before the reset.
      this.net?.settle(true);
    }
  }
}

export {LogicPin};