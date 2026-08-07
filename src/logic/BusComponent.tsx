import paper from "paper";
import React from "react";

import {LogicComponent, LogicComponentParams, UpdateGeometryParams} from "./LogicComponent";
import {LogicPin, PinOrientation, PinType} from "./LogicPin";
import {PartType} from "../enums/PartType";

/**
 * Distance between adjacent single-bit pins on the channel side.
 *
 * Each pin carries a five-unit hit circle at its tip, so anything tighter than this makes
 * neighbouring channels overlap where the user grabs them.
 */
const PIN_SPACING = 12;
/** Space above the first channel and below the last. */
const MARGIN = 6;
/** How far the body extends between the bus side and the channel side. */
const BODY_WIDTH = 12;

interface IParams extends Omit<LogicComponentParams, "type"> {}

/**
 * Shared behaviour of the components which convert between a bus and its individual bits.
 *
 * Splitter and Joiner are mirror images: same body, same channel layout, same width semantics, with
 * only the direction of the pins and of the data differing. Everything that does not depend on that
 * direction lives here.
 */
abstract class BusComponent extends LogicComponent {
  protected constructor(params: IParams) {
    super({
      ...params,
      type: PartType.BUS,
      // The bit width is the whole point of these components, so it is always adjustable. One
      // channel would make the component a no-op, hence a floor of two.
      width: params.width ?? 2,
      adjustableWidth: true,
      minWidth: 2,
      maxWidth: 32,
    });
  }

  /** Height of the body needed to hold the given number of channels. */
  protected static bodyHeight(width: number): number {
    return 2 * MARGIN + (width - 1) * PIN_SPACING;
  }

  /**
   * Vertical position of the pin carrying the given bit.
   *
   * The least significant bit sits at the bottom, matching how buses are conventionally drawn and
   * how the predecessor project laid these out.
   */
  protected static channelY(bit: number, width: number): number {
    return MARGIN + (width - 1 - bit) * PIN_SPACING;
  }

  /** Vertical centre of the body, where the bus pin attaches. */
  protected static busY(width: number): number {
    return BusComponent.bodyHeight(width) / 2;
  }

  /**
   * Builds the single-bit pins, one per channel.
   *
   * Existing pins are kept where the new width still has a channel for them, so that narrowing and
   * re-widening a component does not silently drop wiring the user cannot see.
   */
  protected setUpChannelPins(existing: LogicPin[], pinType: PinType, width: number): LogicPin[] {
    const orientation = pinType === PinType.INPUT ? PinOrientation.LEFT : PinOrientation.RIGHT;
    const x = pinType === PinType.INPUT ? 0 : BODY_WIDTH;

    const pins = existing.slice(0, width);
    existing.slice(width).forEach(p => p.remove());

    while (pins.length < width) {
      pins.push(new LogicPin({
        parent: this,
        pinType: pinType,
        orientation: orientation,
        board: this.board,
        width: 1,
      }));
    }

    pins.forEach((pin, bit) => {
      pin.updateGeometry(new paper.Point(x, BusComponent.channelY(bit, width)));
    });

    return pins;
  }

  /**
   * Builds the pin carrying the whole bus.
   *
   * A width change makes the old connection illegal — pins may only join pins of equal width — so
   * it is dropped rather than left dangling at a stale width.
   */
  protected setUpBusPin(existing: LogicPin[], pinType: PinType, width: number): LogicPin[] {
    const orientation = pinType === PinType.INPUT ? PinOrientation.LEFT : PinOrientation.RIGHT;
    const x = pinType === PinType.INPUT ? 0 : BODY_WIDTH;

    const [pin] = existing;
    if (pin) {
      if (pin.width !== width) {
        pin.disconnect();
        pin.width = width;
      }
      pin.updateGeometry(new paper.Point(x, BusComponent.busY(width)));
      return [pin];
    }

    const created = new LogicPin({
      parent: this,
      pinType: pinType,
      orientation: orientation,
      board: this.board,
      width: width,
    });
    created.updateGeometry(new paper.Point(x, BusComponent.busY(width)));

    return [created];
  }

  /**
   * A chevron marking which way the data runs.
   *
   * Both components read left to right, and their bodies are otherwise bare rectangles that look
   * the same from either side, so without this there is nothing to say which edge is the input.
   */
  extraRender(): React.ReactElement {
    const y = this.body.bounds.height / 2;

    return (
      <path className="decoration" fill="none"
            d={`M 3.5 ${y - 4} L 8.5 ${y} L 3.5 ${y + 4}`}/>
    );
  }

  setUpBody({width}: UpdateGeometryParams): paper.Item {
    const {Path, Point, Size} = this.scope;
    return new Path.Rectangle(new Point(0, 0), new Size(BODY_WIDTH, BusComponent.bodyHeight(width)));
  }
}

export {BusComponent};
