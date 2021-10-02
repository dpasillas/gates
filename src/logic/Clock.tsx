import React from "react";

import LogicComponent, {LogicComponentParams} from "./LogicComponent";
import LogicPin, {PinOrientation, PinType} from "./LogicPin";
import PartType from "../enums/PartType";
import LogicConnection from "./LogicConnection";

interface IParams extends Omit<LogicComponentParams, "flags" | "type" | "width"> {}

class Clock extends LogicComponent {
  static clockPath: string = "M4,12L8,12L8,20L16,20L16,12L24,12L24,20L28,20"

  constructor(params: IParams) {
    super({...params, type: PartType.INPUT, flags: 0});
    let [output] = this.outputPins
    // This hack ensures that the clock triggers itself to change.
    let selfConnection = new LogicConnection({source: output, sink: output})
    output.connections.set(output.uuid, selfConnection);
  }

  operate(): void {
    let s = this.outputPins[0].state.negated(1);
    this.postEvent(s);
  }

  setUpBody(fieldWidth: number): paper.Item {
    let {Path, Point, Size} = this.scope;
    return new Path.Rectangle(new Point(0, 0), new Size(32, 32));

  }

  setUpOutputPins(fieldWidth: number): LogicPin[] {
    let pin = new LogicPin({
      parent: this,
      pinType: PinType.OUTPUT,
      orientation: PinOrientation.RIGHT,
      board: this.board
    })
    pin.updateGeometry(new this.scope.Point(32, 16));
    return [pin];
  }

  extraRender(): React.ReactElement[] {
    return [
      <path key={0} d={Clock.clockPath} fill="none"/>
    ];
  }
}

export default Clock;