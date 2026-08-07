import {BusComponent} from "./BusComponent";
import {LogicComponentParams, UpdateGeometryParams} from "./LogicComponent";
import {LogicPin, PinType} from "./LogicPin";
import {LogicState} from "./LogicState";

interface IParams extends Omit<LogicComponentParams, "type"> {}

/** Breaks a bus out into one single-bit line per channel. */
class Splitter extends BusComponent {
  constructor(params: IParams) {
    super({...params, label: "Splitter"});
  }

  operate(): void {
    const {v, x, z} = this.inputPins[0].state;

    // Unsigned shifts: at a width of 32 the sign bit is set, and an arithmetic shift would smear it
    // across every channel above it.
    this.outputPins.forEach((pin, bit) => {
      this.postEvent(new LogicState({
        v: (v >>> bit) & 1,
        x: (x >>> bit) & 1,
        z: (z >>> bit) & 1,
      }), pin);
    });
  }

  setUpInputPins({width}: UpdateGeometryParams): LogicPin[] {
    return this.setUpBusPin(this.inputPins, PinType.INPUT, width);
  }

  setUpOutputPins({width}: UpdateGeometryParams): LogicPin[] {
    return this.setUpChannelPins(this.outputPins, PinType.OUTPUT, width);
  }
}

export {Splitter};
