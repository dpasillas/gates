import React from "react"

import {LogicComponent, LogicComponentParams} from "./LogicComponent";
import {LogicPin, PinOrientation, PinType} from "./LogicPin";
import {PartType} from "../enums/PartType";
import {LogicState} from "./LogicState";

interface IParams extends Omit<LogicComponentParams, "type" | "width"> {}

/** The subtype that pulls a line up. Anything else pulls it down. */
const PULL_UP = 3;

/** Kept clear on every side of whatever is drawn inside, so the two components read alike. */
const EDGE = 6;

/** The straight ends of the resistor, short so that most of its height is the winding. */
const STUB = 3;

/**
 * A resistor tying a line to a level, weakly.
 *
 * Weakly is the whole point: anything actually driving the line wins, and the pull only decides
 * where nothing else does — which is what makes it useful against a tri-state that has let go.
 */
class PullResistor extends LogicComponent {
  constructor(params: IParams) {
    super({
      ...params,
      label: params.subtype === PULL_UP ? "Pull Up" : "Pull Down",
      type: PartType.INPUT,
      hasDelay: false,
    });
  }

  private get pullsUp(): boolean {
    return this.subtype === PULL_UP;
  }

  /** The level this holds the line at, on every channel, weakly. */
  private pull(): LogicState {
    const mask = this.bitMask();

    return new LogicState({v: this.pullsUp ? mask : 0, w: mask});
  }

  operate(): void {
    this.outputPins[0].setLogicState(this.pull());
  }

  reset(): void {
    // Not super.reset(), which would put the output at unknown: a resistor is always pulling.
    this.outputPins[0].setLogicState(this.pull());
  }

  setUpBody(): paper.Item {
    const {Path, Point, Size} = this.scope;

    return new Path.Rectangle(new Point(0, 0), new Size(32, 32));
  }

  setUpOutputPins(): LogicPin[] {
    const pin = new LogicPin({
      parent: this,
      pinType: PinType.OUTPUT,
      orientation: PinOrientation.RIGHT,
      board: this.board,
    });
    pin.updateGeometry(new this.scope.Point(32, 16));

    return [pin];
  }

  /**
   * A resistor standing on end, with the level it ties to written beside it.
   *
   * Symbolic and centred, clear of every edge: it says what the component is rather than drawing the
   * wiring inside it, so it does not reach for the output pin. The digit sits off to the right, at
   * the end the line is pulled towards, leaving the resistor its full height.
   */
  extraRender(): React.ReactElement {
    const from = EDGE + STUB, to = 32 - EDGE - STUB;
    const resistor = `M16,${EDGE} v${STUB}
                      M16,${from} l4,1 l-8,2.4 l8,2.4 l-8,2.4 l8,2.4 l-8,2.4 l4,1
                      M16,${to} v${STUB}`;
    // Positioned against the digits as they render rather than against their metrics: the two sit
    // differently within their advance, so neither lands where a shared formula would put it.
    const digit = this.pullsUp ? {text: "1", x: 28, y: 13} : {text: "0", x: 27.5, y: 26};

    return (
      <>
        <path className="decoration" d={resistor} fill="none"/>
        <text x={digit.x} y={digit.y} textAnchor="end">{digit.text}</text>
      </>
    );
  }
}

export {PullResistor};
