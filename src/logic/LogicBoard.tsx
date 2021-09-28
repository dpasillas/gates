import React from "react";

import Board from "../components/Board";
import LogicComponent from "./LogicComponent";
import LogicConnection from "./LogicConnection";
import paper from "paper/dist/paper-core";
import {makeAndSetupScope} from "../util/PaperHelp";
import LogicState from "./LogicState";
import LogicPin from "./LogicPin";

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