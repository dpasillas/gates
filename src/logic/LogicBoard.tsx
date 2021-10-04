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
  updateFunc: Function = () => {};

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
    this.simulation.insert(event);
  }

  startSimulation() {
    if (this.simulationTimerId === -1) {
      // @ts-ignore
      this.simulationTimerId = setInterval(this.advanceSimulation.bind(this), this.simulationIntervalMs);
    }
  }

  stopSimulation() {
    if (this.simulationTimerId !== -1) {
      clearInterval(this.simulationTimerId);
      this.simulationTimerId = -1;
      this.simulation.clear();
      this.simulationCurrentTime = 0;
      this.components.forEach(c => c.reset());
      this.components.forEach(c => c.operate());
    }
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
    this.updateFunc();
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

  /** Removes a component from being tracked and rendered */
  removeComponent(uuid: string) {
    this.components.delete(uuid);
  }

  /** Removes a connection from being tracked and rendered */
  removeConnection(uuid: string) {
    this.connections.delete(uuid);
  }
}

export default LogicBoard;