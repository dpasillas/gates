import {OperableSet} from "./OperableSet";
import {LogicComponent} from "../logic/LogicComponent";
import {LogicPin} from "../logic/LogicPin";
import paper from "paper";
import React from "react";
import {LogicBoard} from "../logic/LogicBoard";
import {MouseEventMapping} from "./MouseEventMapping";
import { MouseEventHandler, MouseEventName } from "./Types";
import { SelectionMode, selectionModeFor } from "./selectionMode";
import { snapTo } from "./grid";
import { connectPins, wouldConnect } from "../logic/nets";


enum MouseAction {
  NONE,
  PAN,
  DRAG,
  SELECT,
  CONNECT,
}


// Not enum because some mice may have additional buttons.
const BUTTON_LEFT = 0;
const BUTTON_MIDDLE = 1;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BUTTON_RIGHT = 2;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BUTTON_BROWSER_BACK = 3;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BUTTON_BROWSER_FORWARD = 4;


/**
 * Helper class for the Board component to manage non-trival mouse and touch interactions.
 * */
class MouseManager {
  private sPoint?: paper.Point;
  /**
   * Where the pointer was when a component was picked up, and where that component was standing.
   *
   * A drag is measured from these rather than from the previous position of the pointer. Snapping
   * means the component does not go exactly where the pointer went, so the difference between one
   * move and the next is not the distance the component should travel: a run of moves too small to
   * reach the next grid position would each round away to nothing and the component would never
   * move at all, however far the pointer had been carried.
   */
  private grabPoint?: paper.Point;
  private grabOrigin?: paper.Point;
  /**
   * The board coordinate grabbed at the start of a pan.
   *
   * Panning moves the viewBox, so board coordinates measured during a pan are expressed in a frame
   * that is itself moving; differencing successive positions in that frame yields the wrong delta.
   * This anchor is captured once and never updated, so each move can solve for the viewBox which
   * keeps the grabbed point under the cursor.
   */
  private panAnchor?: paper.Point;
  selectBox?: paper.Path;

  private mouseButton?: number;
  private targetComponent?: LogicComponent;
  private action: MouseAction = MouseAction.NONE;

  private handlers: Map<MouseEventName, MouseEventHandler> = new Map();

  /** How the interaction under way combines what it picks up with what was already selected. */
  private mode: SelectionMode = SelectionMode.REPLACE;
  /**
   * What was selected when the current interaction began.
   *
   * A rubber band is redrawn on every move, so each move has to build its answer from the selection
   * the band started with rather than from the one the previous move left behind.
   */
  private priorComponents: OperableSet<LogicComponent> = new OperableSet();
  private priorPins: OperableSet<LogicPin> = new OperableSet();

  // This needs to be computed by the mounted board because we need the bounding box of the mounted component on screen.
  getViewCoordinates?: (e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) => MouseEventMapping;

  addHandler(name: MouseEventName, handler: MouseEventHandler) {
    if (this.handlers.has(name)) {
      throw new Error(`Cannot assign multiple handlers for ${name}`)
    }

    this.handlers.set(name, handler)
    window.addEventListener(name, handler)
  }

  removeHandlers() {
    this.handlers.forEach((handler, key) => {
      window.removeEventListener(key, handler)
    })
    this.handlers.clear()
  }

  reset(board: LogicBoard) {
    this.removeHandlers()
    this.mouseButton = undefined;
    this.action = MouseAction.NONE;
    this.panAnchor = undefined;
    this.grabPoint = undefined;
    this.grabOrigin = undefined;

    if (this.selectBox) {
      this.selectBox.remove();
      this.selectBox = undefined;
      this.sPoint = undefined;
    }

    this.mode = SelectionMode.REPLACE;
    this.priorComponents.clear();
    this.priorPins.clear();
    board.update()
  }

  handleBoardMouseDown(board: LogicBoard, e: React.MouseEvent<SVGElement> | MouseEvent) {
    if (e.button > 2) {
      return
    }

    e.preventDefault();
    e.stopPropagation();

    if (this.action !== MouseAction.NONE) {
      return
    }

    this.mouseButton = e.button

    if (e.button === BUTTON_LEFT) {
      this.action = MouseAction.SELECT;
      this.mode = selectionModeFor(e);
      this.priorComponents = new OperableSet(board.selectedComponents);
      this.priorPins = new OperableSet(board.selectedPins);

      // A plain press on the board is the start of a new selection, so what was selected goes now
      // rather than once the band has been drawn. The other modes build on what is there, and it
      // has to stay on screen while they do.
      //
      // Asked first because clearing re-renders the app whether or not there was anything to clear,
      // which put that cost on every press of the button on an empty board.
      if (this.mode === SelectionMode.REPLACE
          && (this.priorComponents.size > 0 || this.priorPins.size > 0)) {
        board.clearSelection();
      }

      const { Path, Point, Rectangle, Size } = board.scope;
      const { x, y } = this.getViewCoordinates!(e);
      this.sPoint = new Point(x, y);
      const rect = new Rectangle(this.sPoint, new Size(0, 0))
      this.selectBox = new Path.Rectangle(rect)

      // Add handlers directly to the window to ensure that events aren't dropped once the cursor moves out of the
      // widget's rendered area.  Dropping these events would lead to an inconsistent mouse state.
      this.addHandler('mousemove', this.handleMouseMoveSelect.bind(this, board))
      this.addHandler('mouseup', this.handleMouseUp.bind(this, board))
    }

    // Middle mouse only. Alt with the left button used to pan as well, and now takes things out of
    // the selection instead.
    if (e.button === BUTTON_MIDDLE) {
      this.action = MouseAction.PAN;
      // Add handlers directly to the window to ensure that events aren't dropped once the cursor moves out of the
      // widget's rendered area.  Dropping these events would lead to an inconsistent mouse state.
      this.addHandler('mousemove', this.handleMouseMovePan.bind(this, board))
      this.addHandler('mouseup', this.handleMouseUp.bind(this, board))
      const { x, y } = this.getViewCoordinates!(e);
      this.panAnchor = new board.scope.Point(x, y);
    }
  }

  handleGateMouseDown(board: LogicBoard,
    target: LogicComponent,
    e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {

    if (e.button !== 0) {
      return
    }

    e.preventDefault();
    e.stopPropagation();

    if (this.action !== MouseAction.NONE) {
      return
    }

    this.mouseButton = e.button;
    this.targetComponent = target;
    const { x, y } = this.getViewCoordinates!(e);
    this.grabPoint = new board.scope.Point(x, y);
    this.grabOrigin = target.geometry.position.clone();

    // Clicking a component selects it, which the properties panel renders from. Installing the
    // selection is what tells the panel; the click is only reported directly when it leaves the
    // selection as it stands and so installs nothing.
    const next = MouseManager.clicked(selectionModeFor(e), board.selectedComponents, target,
        board.selectedPins.size > 0);
    if (next) {
      board.setSelectedComponents(next);
    } else {
      board.updateProperties();
    }

    // Add handlers directly to the window to ensure that events aren't dropped once the cursor moves out of the
    // widget's rendered area.  Dropping these events would lead to an inconsistent mouse state.
    //
    // Only what is selected can be dragged, so a click that took the component out of the selection
    // leaves it where it is rather than putting it straight back.
    if (target.selected) {
      this.addHandler('mousemove', this.handleMouseMoveDrag.bind(this, board))
    }
    this.addHandler('mouseup', this.handleMouseUp.bind(this, board))
  }

  /**
   * What clicking one thing leaves selected, or nothing if it leaves the selection as it stands.
   *
   * A plain click on something already selected keeps the whole selection, so that a group can be
   * picked up by any of its members without first falling apart. Anything else it lands on becomes
   * the selection on its own — which is also what a modifier does when what is selected is of the
   * other kind, since the two cannot be selected together and so cannot be added to each other.
   */
  private static clicked<T>(mode: SelectionMode, selected: OperableSet<T>, target: T,
      otherKindSelected: boolean): OperableSet<T> | undefined {
    const one = new OperableSet<T>([target]);

    if (mode === SelectionMode.SUBTRACT) {
      return selected.has(target) ? selected.difference(one) : undefined;
    }

    if (otherKindSelected) {
      return one;
    }

    switch (mode) {
      case SelectionMode.ADD:
        return selected.union(one);
      case SelectionMode.TOGGLE:
        return selected.symmetricDifference(one);
      case SelectionMode.REPLACE:
        return selected.has(target) ? undefined : one;
    }
  }

  handlePinMouseDown(board: LogicBoard, target: LogicPin, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    if (e.button !== BUTTON_LEFT) {
      return
    }

    // Drag-and-drop connections
    e.stopPropagation();
    e.preventDefault();

    // A press arriving while an interaction is already running would attach a second set of window
    // handlers over the first, which addHandler refuses. That happens whenever a release goes
    // astray, as it does when the button comes up outside the window.
    if (this.action !== MouseAction.NONE) {
      return
    }

    this.mouseButton = e.button;

    const mode = selectionModeFor(e);

    // With connect-on-click on, a plain click on a pin the selection can reach joins them instead
    // of selecting it. The selection stays, so an output can be clicked out to one input after
    // another without being picked up again each time.
    if (board.connectOnClick && mode === SelectionMode.REPLACE
        && wouldConnect([...board.selectedPins], target)) {
      if (connectPins(board, [...board.selectedPins, target]) > 0) {
        board.update();
      }
      board.updateProperties();

      return;
    }

    const next = MouseManager.clicked(mode, board.selectedPins, target,
        board.selectedComponents.size > 0);
    if (next) {
      board.setSelectedPins(next);
    } else {
      board.updateProperties();
    }

    // A held modifier means the click is editing the selection, so it does not also start drawing a
    // wire from the pin it lands on. That leaves nothing running once the click is over, so it
    // takes no handlers either: the release has nothing to finish.
    if (mode !== SelectionMode.REPLACE) {
      return
    }

    this.action = MouseAction.CONNECT;
    this.targetComponent = target as unknown as LogicComponent; // Hack because targetComponent is LogicComponent type but we store Pin

    // Add handlers directly to the window to ensure that events aren't dropped
    this.addHandler('mousemove', this.handleMouseMoveConnect.bind(this, board))
    this.addHandler('mouseup', this.handleMouseUp.bind(this, board))
  }

  makeConnection(board: LogicBoard, a: LogicPin, b: LogicPin) {
    const connection = a.connectTo(b);
    if (connection) {
      board.addConnection(connection);
      board.update();
    }
  }

  handleMouseUp(board: LogicBoard, e: React.MouseEvent<SVGElement> | MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (this.action === MouseAction.CONNECT) {
      board.clearTemporaryConnection();
      // Check for drop
      const { x, y } = this.getViewCoordinates!(e);
      const point = new paper.Point(x, y);

      const sourcePin = this.targetComponent as unknown as LogicPin;

      // The pin nearest the drop, out of those it could legally connect to.
      let target: LogicPin | undefined;
      let targetDistance = Infinity;

      for (const pin of board.pins.values()) {
        if (pin === sourcePin || !sourcePin.canConnect(pin) || !pin.isOver(point)) {
          continue;
        }

        const distance = pin.distanceTo(point);
        if (distance < targetDistance) {
          targetDistance = distance;
          target = pin;
        }
      }

      if (target) {
        this.makeConnection(board, sourcePin, target);
      }
    }

    this.reset(board)
  }

  handleMouseMoveConnect(board: LogicBoard, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    const { x, y } = this.getViewCoordinates!(e);
    const point = new paper.Point(x, y);
    // During a connection drag targetComponent holds a pin, not a component; see handleMouseDownConnect.
    if (!this.targetComponent || !('pinType' in this.targetComponent)) {
      return;
    }
    board.setTemporaryConnection(this.targetComponent as unknown as LogicPin, point);
  }

  handleMouseMoveSelect(board: LogicBoard, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    const { x, y } = this.getViewCoordinates!(e);

    e.stopPropagation();
    e.preventDefault();

    if (this.sPoint === undefined || this.selectBox === undefined)
      throw new Error('Invalid mouse state (select mousemove).');

    const [sx, sy] = [this.sPoint.x, this.sPoint.y]

    if (x === sx && y === sy) {
      for (const s of this.selectBox.segments) {
        s.point = this.sPoint;
      }
    }

    if (x <= sx) {
      this.selectBox.segments[0].point.x = x
      this.selectBox.segments[1].point.x = x
      this.selectBox.segments[2].point.x = sx
      this.selectBox.segments[3].point.x = sx
    }
    if (x >= sx) {
      this.selectBox.segments[0].point.x = sx
      this.selectBox.segments[1].point.x = sx
      this.selectBox.segments[2].point.x = x
      this.selectBox.segments[3].point.x = x
    }
    if (y <= sy) {
      this.selectBox.segments[0].point.y = sy
      this.selectBox.segments[1].point.y = y
      this.selectBox.segments[2].point.y = y
      this.selectBox.segments[3].point.y = sy
    }
    if (y >= sy) {
      this.selectBox.segments[0].point.y = y
      this.selectBox.segments[1].point.y = sy
      this.selectBox.segments[2].point.y = sy
      this.selectBox.segments[3].point.y = y
    }

    this.applyBand(board);

    // This update is required to update the selection box.
    // TODO: refactor the selection box as a widget so it can be updated independently of the rest of the board.
    //
    // Only the box. Whether the selection changed is applyBand's to report, and telling the panel
    // again here re-rendered the whole app a second time on every move of the pointer.
    board.update();
  }

  /** Everything the band currently encloses, of one kind. */
  private enclosed<T extends {collides(select: paper.Item): boolean}>(items: Iterable<T>): OperableSet<T> {
    const hit = new OperableSet<T>();
    for (const item of items) {
      if (item.collides(this.selectBox!)) {
        hit.add(item);
      }
    }

    return hit;
  }

  /**
   * Works the band's current extent into the selection.
   *
   * With a modifier held, the kind of thing already selected is the kind the band picks up: what it
   * is being added to or taken from decides, since a selection cannot hold both. Without one, or
   * with nothing to build on, components win wherever the band covers any, and pins are offered
   * only where it covers none — a pin sits on the edge of its component, so a band drawn over a
   * circuit almost always covers both.
   */
  private applyBand(board: LogicBoard) {
    const building = this.mode !== SelectionMode.REPLACE
        && (this.priorComponents.size > 0 || this.priorPins.size > 0);

    if (!building) {
      const components = this.enclosed(board.components.values());
      if (components.size > 0) {
        MouseManager.selectComponents(board, components);
      } else {
        MouseManager.selectPins(board, this.enclosed(board.pins.values()));
      }
    } else if (this.priorComponents.size > 0) {
      MouseManager.selectComponents(board,
          this.combine(this.priorComponents, this.enclosed(board.components.values())));
    } else {
      MouseManager.selectPins(board, this.combine(this.priorPins, this.enclosed(board.pins.values())));
    }
  }

  /**
   * Installs a selection, unless it is the one already in place.
   *
   * The band works out the whole selection afresh on every move of the pointer, and most of those
   * moves stretch it across empty board and arrive at the answer it already had. Installing it
   * again re-renders the app, which is far and away the most expensive thing a move can do.
   */
  private static selectComponents(board: LogicBoard, next: OperableSet<LogicComponent>) {
    if (board.selectedPins.size === 0 && next.equals(board.selectedComponents)) {
      return;
    }

    board.setSelectedComponents(next);
  }

  private static selectPins(board: LogicBoard, next: OperableSet<LogicPin>) {
    if (board.selectedComponents.size === 0 && next.equals(board.selectedPins)) {
      return;
    }

    board.setSelectedPins(next);
  }

  /** Puts what the band encloses together with what was selected when it was started. */
  private combine<T>(prior: OperableSet<T>, hit: OperableSet<T>): OperableSet<T> {
    switch (this.mode) {
      case SelectionMode.ADD:
        return prior.union(hit);
      case SelectionMode.SUBTRACT:
        return prior.difference(hit);
      case SelectionMode.TOGGLE:
        return prior.symmetricDifference(hit);
      default:
        return hit;
    }
  }

  handleMouseMovePan(board: LogicBoard, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    if (!this.panAnchor) {
      return;
    }

    // rx and ry are relative to the viewport rather than the viewBox, so they stay meaningful as
    // the viewBox moves beneath the cursor.
    const { rx, ry } = this.getViewCoordinates!(e);
    const { width, height } = board.viewBox;

    board.viewBox = {
      top: this.panAnchor.y - ry * height,
      left: this.panAnchor.x - rx * width,
      width: width,
      height: height,
    }

    board.update()
  }

  handleMouseMoveDrag(board: LogicBoard, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    if (!this.targetComponent?.selected) {
      this.targetComponent!.selected = true;
      board.selectedComponents.add(this.targetComponent!)
    }

    if (!this.grabPoint || !this.grabOrigin) {
      return;
    }

    const { x, y } = this.getViewCoordinates!(e)

    // Where the component the user took hold of would stand if it followed the pointer exactly,
    // and then where it is allowed to stand.
    const size = board.snapSize;
    const target = new board.scope.Point(
        snapTo(this.grabOrigin.x + (x - this.grabPoint.x), size),
        snapTo(this.grabOrigin.y + (y - this.grabPoint.y), size));

    // The rest of the selection travels the same distance, so a group keeps its shape and only the
    // component actually being carried is put on the grid.
    const here = this.targetComponent!.geometry.position;
    const dx = target.x - here.x;
    const dy = target.y - here.y;
    if (dx === 0 && dy === 0) {
      return;
    }

    for (const component of board.selectedComponents) {
      component.translate(new board.scope.Point(dx, dy))
    }

    // Only the panel needs telling: the components redraw themselves as they translate, so a
    // full board update on every mouse move would be wasted work.
    board.updateProperties();
  }

}

export {MouseManager};