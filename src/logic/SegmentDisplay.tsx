import paper from "paper";
import React from "react";

import {LogicComponent, LogicComponentParams} from "./LogicComponent";
import {LogicPin, PinOrientation, PinType} from "./LogicPin";
import {ComponentProperty} from "./ComponentProperty";
import {PartType} from "../enums/PartType";
import {GateType} from "../enums/GateType";
import {DIGIT_HEIGHT, DIGIT_WIDTH, SegmentCount, segmentPaths} from "../util/segments";

/** Width of the display body: the leaning digit plus a narrow bezel. */
const BODY_WIDTH = 46;
/** Distance from the top and bottom edges to the outermost pin. */
const EDGE = 5;
/** Distance between adjacent pins on the same side. */
const PIN_SPACING = 8;

/** How a segment is drawn, given the state of the input driving it. */
type SegmentState = "on" | "off" | "error";

interface IParams extends Omit<LogicComponentParams, "type" | "width"> {}

/** Maps the part subtype to the layout it selects. */
function segmentCount(subtype: GateType): SegmentCount {
  switch (subtype) {
    case 1:
      return 7;
    case 2:
      return 14;
    case 3:
      return 16;
    default:
      throw new Error(`Unsupported segment display subtype(${subtype})`);
  }
}

/** How a single bit of input should light its segment. */
function stateOf(v: number, x: number, z: number): SegmentState {
  if (x) {
    return "error";
  }
  // A segment nothing is driving simply does not light, which is what the hardware does too.
  if (z) {
    return "off";
  }

  return v ? "on" : "off";
}

/**
 * A 7-, 14-, or 16-segment display.
 *
 * Each segment is driven by its own bit. Those bits normally arrive on one pin each, but the
 * component can also take them together on a single bussed pin, which is the difference between
 * wiring a display by hand and hanging one off a decoder.
 */
class SegmentDisplay extends LogicComponent {
  constructor(params: IParams) {
    super({
      ...params,
      label: `${segmentCount(params.subtype)}-Segment`,
      type: PartType.OUTPUT,
      canMerge: true,
      // A display only ever consumes, so there is no output for a delay to apply to.
      hasDelay: false,
    });
  }

  /**
   * How many segments this display has.
   *
   * Derived from the subtype rather than stored, because the body is built during construction of
   * the base class, before any field of this class could have been assigned.
   */
  get segments(): SegmentCount {
    return segmentCount(this.subtype);
  }

  /** Number of pins on the left edge. A 7-segment display puts them all on one side. */
  private get leftPinCount(): number {
    const count = this.segments;
    return count === 7 ? count : count / 2;
  }

  private get bodyHeight(): number {
    const perSide = Math.max(this.leftPinCount, this.segments - this.leftPinCount);
    return 2 * EDGE + (perSide - 1) * PIN_SPACING;
  }

  /** Top-left of the digit within the body. */
  private get digitOrigin(): paper.Point {
    return new paper.Point((BODY_WIDTH - DIGIT_WIDTH) / 2, (this.bodyHeight - DIGIT_HEIGHT) / 2);
  }

  /** How each segment should be drawn, in bit order. */
  private segmentStates(): SegmentState[] {
    const count = this.segments;

    if (this.isMerged) {
      const pin = this.inputPins[0];
      if (!pin) {
        return new Array(count).fill("off");
      }
      const {v, x, z} = pin.state;
      // Unsigned shifts: a 16-bit-wide bus never sets the sign bit, but the same expression is used
      // for every layout, so it should not depend on that.
      return Array.from({length: count},
                        (_, bit) => stateOf((v >>> bit) & 1, (x >>> bit) & 1, (z >>> bit) & 1));
    }

    return this.inputPins.map(pin => stateOf(pin.state.v & 1, pin.state.x & 1, pin.state.z & 1));
  }

  protected specificProperties(): ComponentProperty[] {
    // The bit width of a display is a consequence of how it is wired, not something to set: one bit
    // per pin when the pins are separate, and the whole word when they are merged.
    return super.specificProperties().map(property =>
      property.key === "width"
        ? {...property, value: this.isMerged ? this.segments : 1}
        : property);
  }

  operate(): void {
    this.update();
  }

  extraRender(): React.ReactElement {
    const {x, y} = this.digitOrigin;
    const states = this.segmentStates();

    return (
      <g className="decoration" transform={`translate(${x} ${y})`}>
        {segmentPaths(this.segments).map((d, i) => (
          <path key={i} className={`segment ${states[i]}`} d={d}/>
        ))}
      </g>
    );
  }

  setUpBody(): paper.Item {
    const {Path, Point, Size} = this.scope;
    return new Path.Rectangle(new Point(0, 0), new Size(BODY_WIDTH, this.bodyHeight));
  }

  setUpInputPins(): LogicPin[] {
    // Merging changes how many pins exist and how wide they are, so nothing survives the switch.
    this.inputPins.forEach(pin => pin.remove());

    const count = this.segments;

    if (this.isMerged) {
      const pin = new LogicPin({
        parent: this,
        pinType: PinType.INPUT,
        orientation: PinOrientation.LEFT,
        board: this.board,
        width: count,
      });
      pin.updateGeometry(new paper.Point(0, this.bodyHeight / 2));

      return [pin];
    }

    const leftCount = this.leftPinCount;

    return Array.from({length: count}, (_, i) => {
      const onLeft = i < leftCount;
      const pin = new LogicPin({
        parent: this,
        pinType: PinType.INPUT,
        orientation: onLeft ? PinOrientation.LEFT : PinOrientation.RIGHT,
        board: this.board,
      });
      const row = onLeft ? i : i - leftCount;
      pin.updateGeometry(new paper.Point(onLeft ? 0 : BODY_WIDTH, EDGE + row * PIN_SPACING));

      return pin;
    });
  }
}

export {SegmentDisplay};
export type {SegmentState};
