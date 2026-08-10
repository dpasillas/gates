import React from "react";

import {Board} from "../components/Board";
import {LogicComponent} from "./LogicComponent";
import {LogicConnection} from "./LogicConnection";
import paper from "paper";
import { v4 as uuidv4 } from "uuid";
import { makeAndSetupScope } from "../util/PaperHelp";
import {LogicState} from "./LogicState";
import {LogicPin} from "./LogicPin";
import {BinarySearchTree} from "../BinarySearchTree";
import {LogicEvent} from "./LogicEvent";
import {OperableSet} from "../util/OperableSet";
import { ViewBox } from "../util/Types";
import { smallestEnclosingCircle } from "../util/enclosingCircle";
import { normalizeAngleOffset } from "../util/angle";
import { WireStyle } from "../util/wireStyle";
import { readSettings } from "../storage/settings";
import { mergeProperties, MergedProperty } from "../util/mergeProperties";

/**
 *
 */
class LogicBoard {
  private _viewBox: ViewBox = {
    left: 0,
    top: 0,
    width: 800,
    height: 600,
  };

  /**
   * Identity that survives being renamed.
   *
   * The board's file is named after this rather than after the board, so that renaming a board does
   * not leave its old file behind or collide with another board's. Reassigned when a board is read
   * back out of a project, which is the only way a board keeps the file it was written to.
   */
  id: string = uuidv4();

  /** What the board is called. Free text: it is not what its file is named. */
  name: string = "untitled";

  /** All components which should be rendered on screen */
  components: Map<string, LogicComponent> = new Map();
  /** All connections which may be rendered */
  connections: Map<string, LogicConnection> = new Map();
  /** All pins which may be rendered */
  pins: Map<string, LogicPin> = new Map();

  readonly selectedComponents: OperableSet<LogicComponent> = new OperableSet();
  readonly selectedPins: OperableSet<LogicPin> = new OperableSet();

  /** Paper scope for this board used to compute geometry, and intersections */
  scope: paper.PaperScope = makeAndSetupScope();
  /** All pending logical events on the board **/
  simulation: BinarySearchTree<LogicEvent> = new BinarySearchTree<LogicEvent>({ cmp: (a, b) => a.cmp(b) });
  simulationTimerId: number = -1;
  simulationCurrentTime: number = 0;
  /** Controls how frequently the simulation is updated **/
  simulationIntervalMs: number = 25;
  /** Controls how many time units pass per simulation interval **/
  simulationStepSize: number = 1;
  updateApp: () => void = () => { };
  /** Set by the properties panel, which draws itself from the selection. */
  onPropertiesChanged: () => void = () => { };
  /**
   * Brings the properties panel up without the user having opened it.
   *
   * Used by the context menu, which shows the properties of whatever was right-clicked. The panel
   * stays up until the selection goes away or the user closes it.
   */
  revealProperties: () => void = () => { };
  update: () => void = () => { };

  /**
   * Says that the selection, or something about it, has changed.
   *
   * The app is told as well as the panel: the toolbar offers actions that apply to a selection, and
   * has to know when there stops being one to apply them to.
   */
  updateProperties() {
    this.onPropertiesChanged();
    this.updateApp();
  }

  /**
   * How wires are drawn, for every connection on the board rather than per connection.
   *
   * Held here so that changing it redraws what is already there, not just what is drawn next. It is
   * not part of a board's file: it changes nothing about the circuit, so it is a preference of
   * whoever is looking at it rather than something to carry to whoever opens it next.
   */
  wireStyle: WireStyle = readSettings().wireStyle;

  temporaryConnection?: { source: LogicPin, currentPos: paper.Point };

  /**
   * What a multiple selection turns about, and how far it has been turned.
   *
   * Held rather than recomputed so that turning a selection repeatedly pivots about one fixed
   * point. Recomputing would nominally give the same answer — rotating a set of points about the
   * centre of its enclosing circle leaves that centre where it is — but only to within rounding,
   * and the error would accumulate over a drag of the dial.
   */
  private selectionPivot?: {members: string, centre: paper.Point, turned: number};

  /** Identity of the current selection, so a change of membership can be noticed. */
  private selectionMembers(): string {
    return [...this.selectedComponents].map(c => c.uuid).sort().join(",");
  }

  /**
   * The pivot for the current selection, computed on first use.
   *
   * The centre is that of the smallest circle enclosing the components' own centres, which sits in
   * the middle of the selection's extent rather than being pulled around by how the components are
   * distributed within it.
   */
  private pivotForSelection() {
    const members = this.selectionMembers();

    if (!this.selectionPivot || this.selectionPivot.members !== members) {
      const centres = [...this.selectedComponents].map(c => c.geometry.position);
      const {centre} = smallestEnclosingCircle(centres.map(({x, y}) => ({x, y})));

      this.selectionPivot = {
        members,
        centre: new this.scope.Point(centre.x, centre.y),
        turned: 0,
      };
    }

    return this.selectionPivot;
  }

  /**
   * Forgets the pivot, so the next turn is taken about a freshly measured centre.
   *
   * Called when the selection moves. Turning does not invalidate it — that is the whole point of
   * keeping it — but anything that shifts the components underneath it does.
   */
  invalidateSelectionPivot() {
    this.selectionPivot = undefined;
  }

  /** How far the selection has been turned from where it stood when it was selected. */
  get selectionRotation(): number {
    return normalizeAngleOffset(this.pivotForSelection().turned);
  }

  /**
   * Turns the whole selection to the given offset from where it started.
   *
   * Each component turns about the shared centre, which both swings it around the group and turns
   * it on the spot, so the selection moves as one piece.
   */
  set selectionRotation(turned: number) {
    const pivot = this.pivotForSelection();
    // Taken the shortest way round, so that winding the dial past half a turn keeps going the way
    // it was going rather than unwinding almost all the way back.
    const delta = normalizeAngleOffset(turned - pivot.turned);
    if (delta === 0) {
      return;
    }

    for (const component of this.selectedComponents) {
      component.geometry.rotate(delta, pivot.centre);
      component.update();
    }

    // A wire's shape follows the pins at both ends, and only one end may have moved.
    for (const component of this.selectedComponents) {
      component.pins()
          .flatMap(pin => [...pin.connections.values()])
          .forEach(connection => connection.update());
    }

    pivot.turned = normalizeAngleOffset(turned);
    this.update();
  }

  /**
   * The rows the properties panel shows for the current selection.
   *
   * A single component is described by its own properties. Several are described by what they have
   * in common, except that turning them is offered as an amount to turn by rather than an angle to
   * set: components at different angles have no shared angle to show, and setting them all to one
   * value would flatten the arrangement rather than rotate it.
   */
  selectionProperties(): MergedProperty[] {
    const components = [...this.selectedComponents];
    const merged = mergeProperties(components.map(c => c.properties()));

    if (components.length < 2) {
      return merged;
    }

    return merged.map(property => property.key !== "angle" ? property : {
      key: "angle",
      label: "Rotate By",
      value: this.selectionRotation,
      editable: true,
      apply: (turned: number) => {this.selectionRotation = turned},
    });
  }

  setTemporaryConnection(source: LogicPin, currentPos: paper.Point) {
    this.temporaryConnection = { source, currentPos };
    this.update();
  }

  clearTemporaryConnection() {
    this.temporaryConnection = undefined;
    this.update();
  }

  get viewBox(): ViewBox {
    return this._viewBox!
  }

  set viewBox(viewbox: ViewBox) {
    this._viewBox = viewbox;
  }

  /**
   * Keyed by the board's identity so that switching tabs builds a new editor.
   *
   * The editor hands the board its redraw callback as it mounts, which only happens if React treats
   * a different board as a different element rather than as the same one with new props. The key is
   * qualified because the panel beside it is keyed by the same board, and two siblings sharing a
   * key leave React unable to tell which of them it is replacing.
   */
  render(): React.ReactElement {
    return (
      <Board key={`board-${this.id}`} board={this} />
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
    const event = new LogicEvent({
      pin: pin,
      time: this.simulationCurrentTime + delay,
      state: state
    });
    // console.log(`Posting event at time (${this.simulationCurrentTime}) for target time (${event.time})`)
    this.simulation.insert(event);
  }

  startSimulation() {
    if (this.simulationTimerId === -1) {
      this.simulationTimerId = setInterval(this.advanceSimulation.bind(this), this.simulationIntervalMs);
    }
  }

  stopSimulation() {
    this.pauseSimulation();
    this.simulation.clear();
    // Important that the simulation time is set to 0 before components are reset
    this.simulationCurrentTime = 0;
    this.components.forEach(c => c.reset());
    // console.log(this.simulation)
  }

  pauseSimulation() {
    if (this.simulationTimerId !== -1) {
      clearInterval(this.simulationTimerId);
      this.simulationTimerId = -1;
    }
  }

  advanceSimulation() {
    const current = this.simulationCurrentTime;
    const target = current + this.simulationStepSize;
    // TODO(dpasillas): Modify Binary Tree to remove need to check first() on every loop.
    while (this.simulation.size() && this.simulation.first()!.time <= target) {
      const event = this.simulation.popFirst()!;
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

  /**
   * Removes the selected components, and unwires the selected pins.
   *
   * The two are different things to delete: a component goes away entirely, while a pin belongs to
   * its component and can only lose what it is attached to. Pins of a component being removed are
   * left to it, since disconnecting them separately would be undone a moment later anyway.
   */
  deleteSelection(): {components: number, pins: number} {
    const components = [...this.selectedComponents];
    const going = new Set(components.flatMap(component => component.pins()).map(pin => pin.uuid));
    const pins = [...this.selectedPins].filter(pin => !going.has(pin.uuid));

    for (const component of components) {
      component.remove();
    }
    for (const pin of pins) {
      pin.disconnect();
    }

    this.clearSelection();
    this.update();

    return {components: components.length, pins: pins.length};
  }

  /** Takes everything off the board and stops the simulation, leaving it as it starts up. */
  clear() {
    this.stopSimulation();

    // Removing a component takes its pins and their wires with it, which drains all three maps.
    for (const component of [...this.components.values()]) {
      component.remove();
    }
    this.components.clear();
    this.connections.clear();
    this.pins.clear();

    this.clearSelection();
  }

  clearSelection() {
    for (const c of this.selectedComponents) {
      c.selected = false;
    }
    this.selectedComponents.clear()

    for (const p of this.selectedPins) {
      p.selected = false;
    }
    this.selectedPins.clear()

    this.invalidateSelectionPivot();

    // The properties panel renders from the selection, so it has to hear about this here rather
    // than relying on every caller to remember.
    this.updateProperties();
  }
}

export {LogicBoard};