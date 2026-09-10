import React from "react";
import * as paper from "paper";

import {LogicComponent, LogicComponentParams, UpdateGeometryParams} from "./LogicComponent";
import {LogicPin, PinOrientation, PinType} from "./LogicPin";
import {digest} from "./hash";
import {CornerMark, PackageDivider, PackageGroup, PackageShape} from "../enums/Packaging";
import {PartType} from "../enums/PartType";
import "../css/Package.css";

/**
 * A symbol and the contract it draws.
 *
 * Everything a component looks like from the outside: its outline, and the pins on it with their
 * names, widths and places. A component built to it is a package bound to a board, and delegates
 * its drawing here, so the symbol a user authors is the symbol that ends up on the board.
 *
 * A `LogicComponent` rather than a description of one, so that authoring it, previewing it and
 * placing it are all the same object drawn by the same renderer. It holds no logic of its own —
 * a package says what a part looks like, not what it does.
 */

/**
 * Distance between adjacent pins along an edge, and the space kept between the outermost pin and
 * whatever the run ends at — a corner, or a divider, which is an edge as far as a pin is concerned.
 *
 * The rule the bus components size their bodies by, so a package sits beside them without looking
 * foreign and neighbouring hit circles never overlap.
 */
const PIN_SPACING = 12;
const EDGE_MARGIN = 6;

/** Smallest a rectangle is drawn, and the smallest a trapezoid's far edge is: the size of a gate. */
const MIN_BODY = 32;

/** Shortest a trapezoid's near edge is drawn, so that it stays an edge rather than a point. */
const MIN_SHORT_EDGE = 16;

/** The acute angle a trapezoid's slant makes with the edge it runs from, in degrees. */
const TAPER_ANGLE = 60;

/** How far in a slant runs for every unit it runs along, which is what that angle comes to. */
const TAPER = Math.tan((90 - TAPER_ANGLE) * Math.PI / 180);

/** Shallowest a trapezoid is drawn, which is what the two minimum edges leave between them. */
const MIN_DEPTH = (MIN_BODY - MIN_SHORT_EDGE) / 2 / TAPER;

/** Shortest a run either side of a divider is drawn, so the line is never against a corner. */
const MIN_RUN = 2 * EDGE_MARGIN;

/** How far the corner mark's centre sits in from the corner it marks. */
const MARK_INSET = 6;
const MARK_RADIUS = 2;

/** The four edges, in the order a symbol is read. */
const SIDES = [PinOrientation.LEFT, PinOrientation.RIGHT, PinOrientation.UP, PinOrientation.DOWN];

type Point = [number, number];

interface Corners {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}

/** What is worked out once per rebuild and read by the pins as they are placed. */
interface Layout {
  width: number;
  height: number;
  corners: Corners;
  /** How far along the edges it crosses the divider sits. */
  divider: number;
  placed: Map<LogicPin, Point>;
}

interface IParams extends Omit<LogicComponentParams, "type" | "subtype"> {
  name?: string;
}

/** Keeps a tangent from spilling seventeen digits into a path. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** How much edge a run of pins needs, or nothing at all when there are none in it. */
function spanFor(count: number): number {
  return count > 0 ? 2 * EDGE_MARGIN + (count - 1) * PIN_SPACING : 0;
}

class PackageComponent extends LogicComponent {
  /**
   * What the package is called, which is written above the symbol.
   *
   * Its own field rather than the component's label: a label names a kind of part in the properties
   * panel, and every package is the same kind.
   */
  name: string = "";

  shape: PackageShape = PackageShape.RECTANGLE;

  /**
   * Which way a trapezoid points.
   *
   * Meaningless for a rectangle, which is the same shape whichever way it is turned, and kept
   * rather than cleared so that shape can be changed back and forth without losing the choice.
   */
  facing: PinOrientation = PinOrientation.RIGHT;

  divider: PackageDivider = PackageDivider.NONE;
  cornerMark: CornerMark = CornerMark.NONE;

  /**
   * The pins as declared, in the order they were declared.
   *
   * Kept apart from `inputPins` and `outputPins`, which are rebuilt from this on every change: a
   * pin whose role is changed has to be found somewhere that does not depend on its role.
   */
  declared: LogicPin[] = [];

  private layout?: Layout;

  constructor(params: IParams) {
    super({...params, type: PartType.PACKAGE, subtype: 0, label: "Package"});
    this.name = params.name ?? "";

    // Built a second time now that this class's own fields exist. The first pass ran inside the
    // base constructor, before any of them were assigned, and drew the empty body they describe.
    this.rebuild();
  }

  /** Redraws the symbol against what has been declared since it was last drawn. */
  rebuild() {
    this.updateGeometry({});
    this.update();
  }

  operate() {
    // A package says what a part looks like. What it does comes from the board bound to it.
  }

  /** Identifies the drawing, which is everything about the package that decides it. */
  protected shapeKeyFor(): string {
    return `package/${this.interfaceHash}`;
  }

  get inputs(): LogicPin[] {
    return this.onIt.filter(pin => pin.pinType === PinType.INPUT);
  }

  get outputs(): LogicPin[] {
    return this.onIt.filter(pin => pin.pinType === PinType.OUTPUT);
  }

  /** The pin a clocked part built to this package is clocked by. */
  get clockPin(): LogicPin | undefined {
    return this.onIt.find(pin => pin.clock);
  }

  /**
   * Marks a pin as the clock, taking the mark off whichever pin held it.
   *
   * A part has one clock, and a symbol drawing two edge marks says nothing about which of them the
   * part is actually clocked by.
   */
  setClockPin(clock: LogicPin | undefined) {
    this.onIt.forEach(pin => {pin.clock = pin === clock});
  }

  /** Declares a pin and puts it on the symbol. */
  declarePin(pin: Partial<LogicPin> & {pinType: PinType}): LogicPin {
    const declared = new LogicPin({
      parent: this,
      pinType: pin.pinType,
      width: pin.width ?? 1,
      not: pin.not ?? false,
      orientation: pin.orientation
          ?? (pin.pinType === PinType.OUTPUT ? PinOrientation.RIGHT : PinOrientation.LEFT),
      label: pin.label ?? "",
    });
    declared.clock = pin.clock ?? false;
    declared.showLabel = pin.showLabel ?? true;
    declared.labelBold = pin.labelBold ?? false;
    declared.group = pin.group ?? PackageGroup.FIRST;
    this.declared = [...this.declared, declared];
    this.rebuild();

    return declared;
  }

  /** Takes a pin off the symbol. */
  removePin(pin: LogicPin) {
    this.declared = this.declared.filter(other => other !== pin);
    this.rebuild();
  }

  /**
   * What has been declared so far.
   *
   * Read through here rather than off the field, because the base constructor draws the body once
   * before any of this class's fields exist. That first pass sees nothing declared, which is the
   * empty body it should draw; the constructor draws again once the fields are in.
   */
  private get onIt(): LogicPin[] {
    return this.declared ?? [];
  }

  /** The pins on one edge, in the order they are drawn along it. */
  pinsOn(side: PinOrientation): LogicPin[] {
    return this.onIt.filter(pin => this.sideOf(pin) === side);
  }

  /**
   * Which edge a pin belongs to.
   *
   * A pin sits on one of four, so an orientation naming none of them is read as the left, which is
   * where an input starts out. Anything else would leave the pin off the symbol without saying so.
   */
  private sideOf(pin: LogicPin): PinOrientation {
    return SIDES.includes(pin.orientation) ? pin.orientation : PinOrientation.LEFT;
  }

  /** Whether an edge is one of the two a trapezoid tapers along. */
  isSlanted(side: PinOrientation): boolean {
    if (this.shape !== PackageShape.TRAPEZOID) {
      return false;
    }

    return this.acrossThePoint
        ? side === PinOrientation.UP || side === PinOrientation.DOWN
        : side === PinOrientation.LEFT || side === PinOrientation.RIGHT;
  }

  /** Whether an edge is one of the two a divider crosses, and so is split into two runs. */
  isDivided(side: PinOrientation): boolean {
    if (this.shape !== PackageShape.RECTANGLE) {
      return false;
    }

    const vertical = side === PinOrientation.LEFT || side === PinOrientation.RIGHT;

    return vertical
        ? this.divider === PackageDivider.HORIZONTAL
        : this.divider === PackageDivider.VERTICAL;
  }

  /** Whether the trapezoid's parallel edges are the two running down the body. */
  private get acrossThePoint(): boolean {
    return this.facing === PinOrientation.LEFT || this.facing === PinOrientation.RIGHT;
  }

  /**
   * How much of a divided edge each run needs, before any slack is shared out.
   *
   * A run is padded from the line exactly as it is padded from a corner, so the divider is the edge
   * of a body as far as the pins beside it are concerned.
   */
  private runsOn(side: PinOrientation): [number, number] {
    const pins = this.pinsOn(side);
    const span = (group: PackageGroup) =>
        Math.max(MIN_RUN, spanFor(pins.filter(pin => pin.group === group).length));

    return [span(PackageGroup.FIRST), span(PackageGroup.SECOND)];
  }

  /** How much edge one side needs for what sits on it, ignoring anything dividing it. */
  private needs(side: PinOrientation): number {
    return spanFor(this.pinsOn(side).length);
  }

  /**
   * How long two facing edges have to be.
   *
   * A divider is one line crossing both of them, so the run before it has to clear whichever of the
   * two needs more of it, and the run after likewise. Asking each edge only to fit its own two runs
   * lets one edge push the line past where the other still needs it.
   */
  private extentAcross(a: PinOrientation, b: PinOrientation): number {
    if (!this.isDivided(a)) {
      return Math.max(this.needs(a), this.needs(b));
    }

    const runs = [this.runsOn(a), this.runsOn(b)];

    return Math.max(...runs.map(run => run[0])) + Math.max(...runs.map(run => run[1]));
  }

  /**
   * How big the body has to be for everything on it to keep its spacing and its padding.
   *
   * Each dimension starts at its floor and grows only for what is on the edges running along it, so
   * a package with one busy edge stays narrow across it.
   *
   * A trapezoid's parallel edges differ by the taper, which the depth sets: lengthening the far edge
   * to fit its pins lengthens the near one with it, and the reverse. The depth grows only for the
   * pins on the slants, whose spacing is measured across the body rather than along the slant.
   */
  private bodySize(): {width: number, height: number} {
    const left = this.needs(PinOrientation.LEFT);
    const right = this.needs(PinOrientation.RIGHT);
    const up = this.needs(PinOrientation.UP);
    const down = this.needs(PinOrientation.DOWN);

    if (this.shape !== PackageShape.TRAPEZOID) {
      return {
        width: Math.ceil(Math.max(
            MIN_BODY, this.extentAcross(PinOrientation.UP, PinOrientation.DOWN))),
        height: Math.ceil(Math.max(
            MIN_BODY, this.extentAcross(PinOrientation.LEFT, PinOrientation.RIGHT))),
      };
    }

    const far = {
      [PinOrientation.RIGHT]: left, [PinOrientation.LEFT]: right,
      [PinOrientation.DOWN]: up, [PinOrientation.UP]: down,
    }[this.facing as PinOrientation.RIGHT] ?? left;
    const near = {
      [PinOrientation.RIGHT]: right, [PinOrientation.LEFT]: left,
      [PinOrientation.DOWN]: down, [PinOrientation.UP]: up,
    }[this.facing as PinOrientation.RIGHT] ?? right;
    const slants = this.acrossThePoint ? [up, down] : [left, right];

    const depth = Math.ceil(Math.max(MIN_DEPTH, ...slants));
    const taper = 2 * depth * TAPER;
    const parallel = Math.ceil(Math.max(MIN_BODY, far, near + taper, MIN_SHORT_EDGE + taper));

    return this.acrossThePoint
        ? {width: depth, height: parallel}
        : {width: parallel, height: depth};
  }

  /** The body's four corners, clockwise from the top left. */
  private cornersOf(width: number, height: number): Corners {
    if (this.shape !== PackageShape.TRAPEZOID) {
      return {tl: [0, 0], tr: [width, 0], br: [width, height], bl: [0, height]};
    }

    const across = round(width * TAPER);
    const down = round(height * TAPER);

    switch (this.facing) {
      case PinOrientation.LEFT:
        return {tl: [0, across], tr: [width, 0], br: [width, height], bl: [0, height - across]};
      case PinOrientation.UP:
        return {tl: [down, 0], tr: [width - down, 0], br: [width, height], bl: [0, height]};
      case PinOrientation.DOWN:
        return {tl: [0, 0], tr: [width, 0], br: [width - down, height], bl: [down, height]};
      default:
        return {tl: [0, 0], tr: [width, across], br: [width, height - across], bl: [0, height]};
    }
  }

  /**
   * How far along the edges it crosses the divider sits.
   *
   * Where the runs need less than the body gives them, the slack is shared out evenly, which puts
   * the line down the middle of a body with nothing on those edges.
   */
  private dividerAt(width: number, height: number): number {
    const vertical = this.divider === PackageDivider.VERTICAL;
    const extent = vertical ? width : height;
    const crossed = vertical
        ? [PinOrientation.UP, PinOrientation.DOWN]
        : [PinOrientation.LEFT, PinOrientation.RIGHT];

    // Both crossed edges share one line, so it has to clear whichever of them needs more.
    const first = Math.max(...crossed.map(side => this.runsOn(side)[0]));
    const second = Math.max(...crossed.map(side => this.runsOn(side)[1]));

    return round(first + Math.max(0, extent - first - second) / 2);
  }

  /** Where a run of pins sits along part of an edge, measured along the edge itself. */
  private placeRun(pins: LogicPin[], from: Point, to: Point, start: number, end: number,
                   into: Map<LogicPin, Point>) {
    if (pins.length === 0) {
      return;
    }

    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    const first = start + ((end - start) - (pins.length - 1) * PIN_SPACING) / 2;

    pins.forEach((pin, index) => {
      const at = (first + index * PIN_SPACING) / length;
      into.set(pin, [round(from[0] + dx * at), round(from[1] + dy * at)]);
    });
  }

  /** Where every pin meets the body. */
  private placeAll(corners: Corners, divider: number): Map<LogicPin, Point> {
    const edges: Record<number, [Point, Point]> = {
      [PinOrientation.LEFT]: [corners.tl, corners.bl],
      [PinOrientation.RIGHT]: [corners.tr, corners.br],
      [PinOrientation.UP]: [corners.tl, corners.tr],
      [PinOrientation.DOWN]: [corners.bl, corners.br],
    };

    const placed = new Map<LogicPin, Point>();
    for (const side of SIDES) {
      const [from, to] = edges[side];
      const pins = this.pinsOn(side);
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]);

      if (!this.isDivided(side)) {
        this.placeRun(pins, from, to, 0, length, placed);
        continue;
      }

      this.placeRun(pins.filter(pin => pin.group === PackageGroup.FIRST),
                    from, to, 0, divider, placed);
      this.placeRun(pins.filter(pin => pin.group === PackageGroup.SECOND),
                    from, to, divider, length, placed);
    }

    return placed;
  }

  setUpBody(): paper.Item {
    const {width, height} = this.bodySize();
    const corners = this.cornersOf(width, height);
    const divider = this.dividerAt(width, height);
    this.layout = {width, height, corners, divider, placed: this.placeAll(corners, divider)};

    const {Path, Point} = this.scope;
    const outline = new Path([corners.tl, corners.tr, corners.br, corners.bl]
        .map(([x, y]) => new Point(x, y)));
    outline.closed = true;

    return outline;
  }

  /** Puts the declared pins where the layout said, which is what makes a role change move one. */
  private place(pins: LogicPin[]): LogicPin[] {
    pins.forEach(pin => {
      const at = this.layout?.placed.get(pin) ?? [0, 0];
      pin.updateGeometry(new this.scope.Point(at[0], at[1]));
    });

    return pins;
  }

  setUpInputPins(_params: UpdateGeometryParams): LogicPin[] {
    return this.place(this.inputs);
  }

  setUpOutputPins(_params: UpdateGeometryParams): LogicPin[] {
    return this.place(this.outputs);
  }

  /**
   * What is drawn on the body beyond its outline.
   *
   * The divider and the corner mark belong to a rectangle: a trapezoid already says which way it
   * points by its shape, and a line across a body whose edges are not parallel meets them at a
   * different length on each side.
   */
  extraRender(): React.ReactElement {
    const layout = this.layout;
    if (!layout) {
      return <></>;
    }

    const {width, height, divider} = layout;
    const rectangular = this.shape === PackageShape.RECTANGLE;

    return (
      <g className="decoration">
        {rectangular && this.divider === PackageDivider.VERTICAL &&
          <path className="package-divider" d={`M${divider},0 V${height}`}/>}
        {rectangular && this.divider === PackageDivider.HORIZONTAL &&
          <path className="package-divider" d={`M0,${divider} H${width}`}/>}
        {rectangular && this.renderCornerMark(width, height)}
        {this.onIt.map(pin => this.renderClockMark(pin))}
      </g>
    );
  }

  private renderCornerMark(width: number, height: number): React.ReactElement | undefined {
    const at = {
      [CornerMark.TOP_LEFT]: [MARK_INSET, MARK_INSET],
      [CornerMark.TOP_RIGHT]: [width - MARK_INSET, MARK_INSET],
      [CornerMark.BOTTOM_LEFT]: [MARK_INSET, height - MARK_INSET],
      [CornerMark.BOTTOM_RIGHT]: [width - MARK_INSET, height - MARK_INSET],
    }[this.cornerMark as CornerMark.TOP_LEFT];

    return at && <circle className="package-corner" cx={at[0]} cy={at[1]} r={MARK_RADIUS}/>;
  }

  /**
   * The chevron against the pin a part built to this package is clocked by.
   *
   * Left off a slanted edge, which gives the mark no square direction to point from.
   */
  private renderClockMark(pin: LogicPin): React.ReactElement | undefined {
    const at = this.layout?.placed.get(pin);
    if (!pin.clock || !at || this.isSlanted(this.sideOf(pin))) {
      return undefined;
    }

    const [x, y] = at;
    const reach = 8;
    const lip = 4;
    const d = {
      [PinOrientation.LEFT]: `M${x},${y - lip} L${x + reach},${y} L${x},${y + lip}`,
      [PinOrientation.RIGHT]: `M${x},${y - lip} L${x - reach},${y} L${x},${y + lip}`,
      [PinOrientation.UP]: `M${x - lip},${y} L${x},${y + reach} L${x + lip},${y}`,
      [PinOrientation.DOWN]: `M${x - lip},${y} L${x},${y - reach} L${x + lip},${y}`,
    }[this.sideOf(pin) as PinOrientation.LEFT];

    return <path key={pin.uuid} className="package-clock" d={d}/>;
  }

  /** Every reason the package is not finished, in the order they should be put right. */
  get problems(): string[] {
    const problems: string[] = [];

    const unlabelled = this.onIt.filter(pin => !pin.label?.trim()).length;
    if (unlabelled > 0) {
      problems.push(unlabelled === 1
          ? "1 pin still needs a label"
          : `${unlabelled} pins still need labels`);
    }

    const seen = new Set<string>();
    const repeated = new Set<string>();
    for (const pin of this.onIt) {
      const label = pin.label?.trim() ?? "";
      if (label && seen.has(label)) {
        repeated.add(label);
      }
      seen.add(label);
    }
    repeated.forEach(label => problems.push(`Two pins are both called "${label}"`));

    if (this.onIt.length === 0) {
      problems.push("A package needs at least one pin");
    }

    return problems;
  }

  /**
   * What this package is, without saying which package it is.
   *
   * Two packages with the same contract and the same symbol produce the same text, whatever their
   * identity: pin identity is left out for the same reason. An import comparing hashes is asking
   * whether it already has this package, not whether it has this copy of it.
   */
  private get canonical(): string {
    const pins = this.onIt.map(pin =>
        [pin.label?.trim() ?? "", pin.pinType, pin.width, pin.orientation, pin.not ? 1 : 0,
         pin.clock ? 1 : 0, pin.showLabel ? 1 : 0, pin.labelBold ? 1 : 0, pin.group].join(","));

    return [this.name?.trim() ?? "", this.shape, this.facing, this.divider, this.cornerMark,
            ...pins].join("\n");
  }

  /**
   * What identifies this package's contract.
   *
   * Changing it is what tells a placement it has to be redrawn, and what tells an import that the
   * package it is carrying is not the one already here under that name.
   */
  get interfaceHash(): string {
    return digest(this.canonical);
  }
}

export {PackageComponent};
