import React from "react";

import {LogicComponent, LogicComponentParams} from "./LogicComponent";
import {LogicPin, PinOrientation, PinType} from "./LogicPin";
import {PartType} from "../enums/PartType";
import {LogicConnection} from "./LogicConnection";
import {LogicState} from "./LogicState";
import {ComponentProperty} from "./ComponentProperty";

interface IParams extends Omit<LogicComponentParams, "type" | "width"> {}

class Clock extends LogicComponent {
  static clockPath: string = "M4,12L8,12L8,20L16,20L16,12L24,12L24,20L28,20"

  constructor(params: IParams) {
    super({
      ...params,
      label: "Clock",
      type: PartType.INPUT,
      delay: 10,
    });
    const [output] = this.outputPins
    // This hack ensures that the clock triggers itself to change.
    const selfConnection = new LogicConnection({source: output, sink: output})
    output.connections.set(output.uuid, selfConnection);
  }

  operate(): void {
    const s = this.outputPins[0].state.negated(1);
    this.postEvent(s);
  }

  /**
   * Length of one full cycle.
   *
   * The clock inverts its own output after every propagation delay, so a complete high-low cycle
   * takes two of them.
   */
  get period(): number {
    return this.delay * 2;
  }

  set period(period: number) {
    this.delay = period / 2;
  }

  protected specificProperties(): ComponentProperty[] {
    // Delay is an implementation detail here — the user-facing quantity is the period it produces.
    const inherited = super.specificProperties().filter(p => p.key !== "delay");

    return [
      ...inherited,
      {
        key: "period",
        label: "Period",
        value: this.period,
        editable: true,
        min: 2,
        setValue: (period: number) => {this.period = period},
      },
      {
        // Self-inversion on a fixed delay produces equal high and low phases, so duty cycle is not
        // yet something the model can express as anything but 50%.
        key: "dutyCycle",
        label: "Duty Cycle (%)",
        value: 50,
        editable: false,
        setValue: () => {},
      },
    ];
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
      board: this.board
    })
    pin.updateGeometry(new this.scope.Point(32, 16));
    return [pin];
  }

  extraRender(): React.ReactElement {
    return (
      <path className="decoration" d={Clock.clockPath} fill="none"/>
    );
  }

  reset() {
    const [output] = this.outputPins;
    output.setLogicState(new LogicState({v: 0}));
    output.updateNext(true);
    this.operate();
  }
}

export {Clock};