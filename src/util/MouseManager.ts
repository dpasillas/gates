import OperableSet from "./OperableSet";
import LogicComponent from "../logic/LogicComponent";
import LogicPin, {PinType} from "../logic/LogicPin";
import paper from "paper";
import React from "react";
import LogicBoard from "../logic/LogicBoard";
import MouseEventMapping from "./MouseEventMapping";
import {MouseEventHandler, MouseEventName} from "./Types";


enum MouseAction {
  NONE,
  PAN,
  DRAG,
  SELECT,
  SELECT_APPEND,
  SELECT_XOR,
}


// Not enum because some mice may have additional buttons.
const BUTTON_LEFT = 0;
const BUTTON_MIDDLE = 1;
// eslint-disable-next-line -- Unused
const BUTTON_RIGHT = 2;
// eslint-disable-next-line -- Unused
const BUTTON_BROWSER_BACK = 3;
// eslint-disable-next-line -- Unused
const BUTTON_BROWSER_FORWARD = 4;


enum SelectionType {
  NONE,
  COMPONENT,
  PIN,
}


/**
 * Helper class for the Board component to manage non-trival mouse and touch interactions.
 * */
class MouseManager {
  private sPoint?: paper.Point;
  selectBox?: paper.Path;

  private mouseButton?: number;
  private targetComponent?: LogicComponent;
  private action: MouseAction = MouseAction.NONE;

  private handlers: Map<MouseEventName, MouseEventHandler> = new Map();

  private priorSelectionType: SelectionType = SelectionType.NONE;
  private priorSelection: OperableSet<LogicComponent | LogicPin> = new OperableSet();
  private currentSelection: OperableSet<LogicComponent | LogicPin> = new OperableSet();

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

  reset() {
    this.removeHandlers()
    this.mouseButton = undefined;
    this.action = MouseAction.NONE;

    if (this.selectBox) {
      this.selectBox.remove();
      this.selectBox = undefined;
      this.sPoint = undefined;
    }

    this.priorSelectionType = SelectionType.NONE;
    this.priorSelection.clear();
    this.currentSelection.clear();
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

    if (e.button === BUTTON_LEFT && !e.altKey) {
      this.currentSelection.clear()
      if (e.getModifierState("Shift") && this.priorSelection.size > 0) {
        this.action = MouseAction.SELECT_APPEND;
      } else if (e.getModifierState("Control") && this.priorSelection.size > 0) {
        this.action = MouseAction.SELECT_XOR;
      } else {
        this.action = MouseAction.SELECT
        board.clearSelection();
      }

      const {Path, Point, Rectangle, Size} = board.scope;
      const {x, y} = this.getViewCoordinates!(e);
      this.sPoint = new Point(x, y);
      let rect = new Rectangle(this.sPoint, new Size(0, 0))
      this.selectBox = new Path.Rectangle(rect)

      // Add handlers directly to the window to ensure that events aren't dropped once the cursor moves out of the
      // widget's rendered area.  Dropping these events would lead to an inconsistent mouse state.
      this.addHandler('mousemove', this.handleMouseMoveSelect.bind(this, board))
      this.addHandler('mouseup', this.handleMouseUp.bind(this, board))
    }

    if (e.button === BUTTON_MIDDLE || (e.button === 0 && e.altKey)) {
      this.action = MouseAction.PAN;
      // Add handlers directly to the window to ensure that events aren't dropped once the cursor moves out of the
      // widget's rendered area.  Dropping these events would lead to an inconsistent mouse state.
      this.addHandler('mousemove', this.handleMouseMovePan.bind(this, board))
      this.addHandler('mouseup', this.handleMouseUp.bind(this, board))
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

    let selected = board.selectedComponents;

    if (e.getModifierState("Control")) {
      if (target.selected) {
        target.selected = false
        selected.delete(target)
      } else {
        target.selected = true
        selected.add(target)
      }
    } else if (e.getModifierState("Shift")) {
      if (!target.selected) {
        target.selected = true
        selected.add(target)
      }
    } else if (!selected.has(target)) {
      board.clearSelection()
      target.selected = true
      selected.add(target)
    } else {
      if (!target.selected) {
        target.selected = true
        selected.add(target)
      }
    }

    // Add handlers directly to the window to ensure that events aren't dropped once the cursor moves out of the
    // widget's rendered area.  Dropping these events would lead to an inconsistent mouse state.
    this.addHandler('mousemove', this.handleMouseMoveDrag.bind(this, board))
    this.addHandler('mouseup', this.handleMouseUp.bind(this, board))
  }

  handlePinMouseDown(board: LogicBoard, target: LogicPin, e:React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    // TODO: Drag-and-drop connections
    e.stopPropagation();
    e.preventDefault();

    let pins = board.selectedPins;

    let numOutputs = 0;
    pins.forEach((pin) => {numOutputs += (pin.pinType === PinType.OUTPUT) ? 1 : 0})
    if (numOutputs <= 1) {
      for(let pin of pins) {
        this.makeConnection(board, pin, target);
      }
    }

    target.selected = true;
    board.selectedPins.add(target)
  }

  makeConnection(board: LogicBoard, a: LogicPin, b: LogicPin) {
    let connection = a.connectTo(b);
    if (connection) {
      board.addConnection(connection);
      board.update();
    }
  }

  handleMouseUp(board: LogicBoard, e: React.MouseEvent<SVGElement> | MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (e.button !== this.mouseButton) {
      return
    }

    this.reset()
    if (board.selectedComponents.size > 0) {
      this.priorSelectionType = SelectionType.COMPONENT;
      this.priorSelection.addAll(board.selectedComponents)
    } else if (board.selectedPins.size > 0) {
      this.priorSelectionType = SelectionType.PIN;
      this.priorSelection.addAll(board.selectedPins)
    }

    // Required to remove the selection box without re-rendering the entire board.
    // TODO: refactor the selection box as a widget so it can be updated independently of the rest of the board.
    board.update()
  }

  handleMouseMoveSelect(board: LogicBoard, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    let {x, y} = this.getViewCoordinates!(e);

    e.stopPropagation();
    e.preventDefault();

    if (this.sPoint === undefined || this.selectBox === undefined)
      throw new Error('Invalid mouse state (select mousemove).');

    const [sx, sy] = [this.sPoint.x, this.sPoint.y]

    if (x === sx && y === sy) {
      for (let s of this.selectBox.segments) {
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

    board.selectedComponents.clear();
    board.selectedPins.clear();

    let components = [...board.components.values()];
    let pins = [...board.pins.values()];

    if (this.action === MouseAction.SELECT) {
      this.currentSelection.clear();

      for (let component of components) {
        if (component.collides(this.selectBox)) {
          this.currentSelection.add(component);
        }
      }

      if (this.currentSelection.size > 0) {
        board.selectedComponents.clear();
        board.selectedComponents.addAll(this.currentSelection as Set<LogicComponent>);
      } else {
        let pins = [...board.pins.values()];

        for (let pin of pins) {
          if (pin.collides(this.selectBox)) {
            this.currentSelection.add(pin);
          }
        }

        board.selectedPins.clear();
        board.selectedPins.addAll(this.currentSelection as Set<LogicPin>)
      }
    } else {
      this.currentSelection.clear()

      if (this.priorSelectionType === SelectionType.COMPONENT) {
        let components = [...board.components.values()];
        for (let component of components) {
          if (component.collides(this.selectBox)) {
            this.currentSelection.add(component);
          }
        }

        if (this.action === MouseAction.SELECT_APPEND) {
          board.selectedComponents.addAll(this.currentSelection.union(this.priorSelection) as Set<LogicComponent>);
        } else if (this.action === MouseAction.SELECT_XOR) {
          board.selectedComponents.addAll(this.currentSelection.xor(this.priorSelection) as Set<LogicComponent>);
        } else {
          throw new Error("Inconsistent selection state");
        }
      } else if (this.priorSelectionType === SelectionType.PIN) {
        let pins = [...board.pins.values()];
        for (let pin of pins) {
          if (pin.collides(this.selectBox)) {
            this.currentSelection.add(pin);
          }
        }

        if (this.action === MouseAction.SELECT_APPEND) {
          board.selectedPins.addAll(this.currentSelection.union(this.priorSelection) as Set<LogicPin>);
        } else if (this.action === MouseAction.SELECT_XOR) {
          board.selectedPins.addAll(this.currentSelection.xor(this.priorSelection) as Set<LogicPin>);
        } else {
          throw new Error("Inconsistent selection state");
        }
      } else {
        throw new Error("Inconsistent selection state");
      }
    }

    if (board.selectedComponents.size > 0) {
      for (let component of components) {
        component.selected = board.selectedComponents.has(component);
      }

      for (let pin of pins) {
        pin.selected = false
      }
    } else if (board.selectedPins.size > 0) {
      for (let pin of pins) {
        pin.selected = board.selectedPins.has(pin)
      }

      for (let component of components) {
        component.selected = false;
      }
    } else {
      for (let component of components) {
        component.selected = false;
      }

      for (let pin of pins) {
        pin.selected = false
      }
    }

    // This update is required to update the selection box.
    // TODO: refactor the selection box as a widget so it can be updated independently of the rest of the board.
    board.update();
    board.updateProperties();
  }

  handleMouseMovePan(board: LogicBoard, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    let {dx, dy} = this.getViewCoordinates!(e)

    board.viewBox = {
      top: board.viewBox.top - dy,
      left: board.viewBox.left - dx,
      width: board.viewBox.width,
      height: board.viewBox.height,
    }

    board.update()
  }

  handleMouseMoveDrag(board: LogicBoard, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    let {dx, dy} = this.getViewCoordinates!(e)

    if (!this.targetComponent?.selected) {
      this.targetComponent!.selected = true;
      board.selectedComponents.add(this.targetComponent!)
    }

    for (let component of board.selectedComponents) {
      component.translate(new paper.Point(dx, dy))
    }

  }

  isSelect(): boolean {
    let {SELECT, SELECT_APPEND, SELECT_XOR} = MouseAction;
    return [SELECT, SELECT_APPEND, SELECT_XOR].includes(this.action)
  }

  getSelection<T extends LogicComponent | LogicPin>(current: OperableSet<T>): OperableSet<T> {
    if (this.action === MouseAction.SELECT_APPEND) {
      return current.union(this.priorSelection as OperableSet<T>)
    } else if (this.action === MouseAction.SELECT_XOR) {
      return current.symmetricDifference(this.priorSelection as OperableSet<T>)
    }
    throw new Error("Inconsistent Selection State");
  }
}

export default MouseManager;