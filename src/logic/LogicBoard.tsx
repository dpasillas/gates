import React from "react";

import Board from "../components/Board";
import LogicComponent from "./LogicComponent";
import LogicConnection from "./LogicConnection";
import paper from "paper/dist/paper-core";
import {makeAndSetupScope} from "../util/PaperHelp";
import LogicState from "./LogicState";
import LogicPin from "./LogicPin";
import BinarySearchTree from "../BinarySearchTree";
import LogicEvent from "./LogicEvent";

/**
 *
 */
class LogicBoard {
  /** All components which should be rendered on screen */
  components: Map<string, LogicComponent> = new Map();
  /** All connections which may be rendered */
  connections: Map<string, LogicConnection> = new Map();
  /** All pins which may be rendered */
  pins: Map<string, LogicPin> = new Map();

  selectedComponents: LogicComponent[] = [];
  selectedPins: LogicPin[] = [];

  /** Paper scope for this board used to compute geometry, and intersections */
  scope: paper.PaperScope = makeAndSetupScope();
  /** All pending logical events on the board **/
  simulation: BinarySearchTree<LogicEvent> = new BinarySearchTree<LogicEvent>({cmp: (a, b) => a.cmp(b)});
  simulationTimerId: number = -1;
  simulationCurrentTime: number = 0;
  /** Controls how frequently the simulation is updated **/
  simulationIntervalMs: number = 25;
  /** Controls how many time units pass per simulation interval **/
  simulationStepSize: number = 1;
  updateApp: Function = () => {};
  updateProperties: () => void = () => {};

  render(): React.ReactElement {
    return (
        <Board board={this}/>
    )
  }

  /**
   * Updates a pin at a simulated time in the future.
   *
   * @param state - The new logical state of the pin
   * @param pin - The pin to be updated
   * @param delay - The amount of time from the current time before the pin's state should be updated.
   */
  postEvent(state: LogicState, pin: LogicPin, delay: number) {
    let event = new LogicEvent({
      pin: pin,
      time: this.simulationCurrentTime + delay,
      state: state
    });
    console.log(`Posting event at time (${this.simulationCurrentTime}) for target time (${event.time})`)
    this.simulation.insert(event);
  }

  startSimulation() {
    if (this.simulationTimerId === -1) {
      // @ts-ignore
      this.simulationTimerId = setInterval(this.advanceSimulation.bind(this), this.simulationIntervalMs);
    }
  }

  stopSimulation() {
    this.pauseSimulation();
    this.simulation.clear();
    // Important that the simulation time is set to 0 before components are reset
    this.simulationCurrentTime = 0;
    this.components.forEach(c => c.reset());
    console.log(this.simulation)
  }

  pauseSimulation() {
    if (this.simulationTimerId !== -1) {
      clearInterval(this.simulationTimerId);
      this.simulationTimerId = -1;
    }
  }

  advanceSimulation() {
    let current = this.simulationCurrentTime;
    let target = current + this.simulationStepSize;
    // TODO(dpasillas): Modify Binary Tree to remove need to check first() on every loop.
    while (this.simulation.size() && this.simulation.first()!.time <= target) {
      let event = this.simulation.popFirst()!;
      // Update the time so that operations triggered by this event use the correct reference time.
      this.simulationCurrentTime = event.time;
      event.apply();
    }
    this.simulationCurrentTime = target;
    // TODO(dpasillas): Remove this call once we've identified where the simulation state may be referenced, and
    //                  appropriate channels have been created to send the data where it's needed.
    //
    // This call re-renders the entire app, which may be needlessly expensive.
    this.updateApp();
  }

  get simulationRunning() {
    return this.simulationTimerId !== -1;
  }

  get simulationPaused() {
    return !this.simulationRunning && this.simulationCurrentTime !== 0;
  }

  get simulationStopped() {
    return !this.simulationRunning && this.simulationCurrentTime === 0;
  }

  /** Tracks a component to be rendered */
  addComponent(component: LogicComponent) {
    this.components.set(component.uuid, component)
  }

  /** Tracks a connection to be rendered */
  addConnection(connection: LogicConnection) {
    this.connections.set(connection.uuid, connection)
  }

  /** Tracks a pin to be rendered */
  addPin(pin: LogicPin) {
    this.pins.set(pin.uuid, pin);
  }

  /** Removes a component from being tracked and rendered */
  removeComponent(uuid: string) {
    this.components.delete(uuid);
  }

  /** Removes a connection from being tracked and rendered */
  removeConnection(uuid: string) {
    this.connections.delete(uuid);
  }

  /** Removes a connection from being tracked and rendered */
  removePin(uuid: string) {
    this.pins.delete(uuid);
  }

}

export default LogicBoard;