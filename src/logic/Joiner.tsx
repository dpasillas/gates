import {BusComponent} from "./BusComponent";
import {LogicComponentParams, UpdateGeometryParams} from "./LogicComponent";
import {LogicPin, PinType} from "./LogicPin";
import {LogicState} from "./LogicState";

interface IParams extends Omit<LogicComponentParams, "type"> {}

/** Gathers single-bit lines into one bus. */
class Joiner extends BusComponent {
  constructor(params: IParams) {
    super({...params, label: "Joiner"});
  }

  operate(): void {
    let v = 0;
    let x = 0;
    let z = 0;

    this.inputPins.forEach((pin, bit) => {
      v |= (pin.state.v & 1) << bit;
      x |= (pin.state.x & 1) << bit;
      z |= (pin.state.z & 1) << bit;
    });

    this.postEvent(new LogicState({v, x, z}), this.outputPins[0]);
  }

  setUpInputPins({width}: UpdateGeometryParams): LogicPin[] {
    return this.setUpChannelPins(this.inputPins, PinType.INPUT, width);
  }

  setUpOutputPins({width}: UpdateGeometryParams): LogicPin[] {
    return this.setUpBusPin(this.outputPins, PinType.OUTPUT, width);
  }
}

export {Joiner};
