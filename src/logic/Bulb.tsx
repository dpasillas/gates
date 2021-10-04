import paper from "paper/dist/paper-core";
import React from "react";

import LogicComponent, {LogicComponentParams} from "./LogicComponent";
import {BULB_PATH} from "../Constants";
import PartType from "../enums/PartType";
import LogicPin, {PinOrientation, PinType} from "./LogicPin";

interface IParams extends Omit<LogicComponentParams, "flags" | "type"> {
}

/** Light Bulb implementation */
class Bulb extends LogicComponent {
  on: boolean = false;
  constructor(params: IParams) {
    super({...params, type: PartType.OUTPUT, flags: 0});
  }

  operate(): void {
    this.on = this.inputPins[0].state.v === 1;
  }

  /** Renders the glow of the bulb if the bulb is in the on state */
  extraRender(): React.ReactElement[] {
    // TODO: Render the glow on top of all other components.
    //   SVG renders elements in document order.
    let display = this.on ? "auto" : "none"
    return [
        <circle key={0} className={"bulb-glow"} cx={16} cy={16} r={32} display={display}/>
    ];
  }

  setUpBody(): paper.Item {
    return new this.scope.Path(BULB_PATH);
  }

  setUpInputPins(fieldWidth: number): LogicPin[] {
    let {bottom} = this.body.bounds;
    let pin = new LogicPin({
      parent: this,
      pinType: PinType.INPUT,
      orientation: PinOrientation.DOWN,
      board: this.board
    });

    pin.updateGeometry(new paper.Point(16, bottom));
    return [pin];
  }

  /** No-op */
  reset() {
  }

}

export default Bulb;