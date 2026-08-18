import {LogicPin} from "./LogicPin";
import {LogicState} from "./LogicState";

interface IParams {
  pin: LogicPin,
  time: number,
  state: LogicState,
  then?: () => void,
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
  /** Run once the value has been put on the pin, for a component that is its own source of change. */
  then?: () => void;

  constructor(params: IParams) {
    this.pin = params.pin;
    this.time = params.time;
    this.state = params.state;
    this.then = params.then;
  }

  /** Records the value only. The board settles the lines once the whole batch has landed. */
  apply() {
    this.pin.drive(this.state);
    this.then?.();
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

export {LogicEvent};