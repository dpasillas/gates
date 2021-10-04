import LogicPin from "./LogicPin";
import LogicState from "./LogicState";

interface IParams {
  pin: LogicPin,
  time: number,
  state: LogicState,
}

/**
 * Class representing an update to a pin due to the operation of a LogicComponent
 *
 * For use in a priority queue to enable logic simulation
 * */
class LogicEvent {
  pin: LogicPin;
  time: number;
  state: LogicState

  constructor(params: IParams) {
    this.pin = params.pin;
    this.time = params.time;
    this.state = params.state;
  }

  apply() {
    this.pin.setLogicState(this.state);
  }

  cmp(other: LogicEvent): number {
    if (this.time === other.time) {
      return this.pin.uuid.localeCompare(other.pin.uuid);
    } else {
      return this.time - other.time;
    }
  }

  // TODO: add comparators
}

export default LogicEvent;