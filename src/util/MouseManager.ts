import OperableSet from "./OperableSet";
import LogicComponent from "../logic/LogicComponent";
import LogicPin from "../logic/LogicPin";
import paper from "paper";
import React from "react";
import LogicBoard from "../logic/LogicBoard";
import MouseEventMapping from "./MouseEventMapping";
import { MouseEventHandler, MouseEventName } from "./Types";


enum MouseAction {
  NONE,
  PAN,
  DRAG,
  SELECT,
  SELECT_APPEND,
  SELECT_XOR,
  CONNECT,
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
  private pPoint?: paper.Point;
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

  reset(board: any) {
    this.removeHandlers()
    this.mouseButton = undefined;
    this.action = MouseAction.NONE;

    if (this.selectBox) {
      this.selectBox.remove();
      this.selectBox = undefined;
      this.sPoint = undefined;
      this.pPoint = undefined;
    }

    this.priorSelectionType = SelectionType.NONE;
    this.priorSelection.clear();
    this.currentSelection.clear();
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

      const { Path, Point, Rectangle, Size } = board.scope;
      const { x, y } = this.getViewCoordinates!(e);
      this.sPoint = new Point(x, y);
      const rect = new Rectangle(this.sPoint, new Size(0, 0))
      this.selectBox = new Path.Rectangle(rect)
      this.pPoint = this.sPoint;

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
      const { x, y } = this.getViewCoordinates!(e);
      this.pPoint = new board.scope.Point(x, y);
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
    this.pPoint = new board.scope.Point(x, y);

    const selected = board.selectedComponents;

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

  handlePinMouseDown(board: LogicBoard, target: LogicPin, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    // Drag-and-drop connections
    e.stopPropagation();
    e.preventDefault();

    this.mouseButton = e.button;

    // Start connection drag
    this.action = MouseAction.CONNECT;
    this.targetComponent = target as unknown as LogicComponent; // Hack because targetComponent is LogicComponent type but we store Pin
    const { x, y } = this.getViewCoordinates!(e);
    this.pPoint = new board.scope.Point(x, y);

    // Add handlers directly to the window to ensure that events aren't dropped
    this.addHandler('mousemove', this.handleMouseMoveConnect.bind(this, board))
    this.addHandler('mouseup', this.handleMouseUp.bind(this, board))

    // Select the pin as well
    target.selected = true;
    board.selectedPins.add(target)
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

      // Find if we dropped on a pin
      for (const pin of board.pins.values()) {
        if (pin !== sourcePin && pin.isOver(point)) {
          if (sourcePin.canConnect(pin)) {
            this.makeConnection(board, sourcePin, pin);
          }
          break;
        }
      }
    }

    if (board.selectedComponents.size > 0) {
      this.priorSelectionType = SelectionType.NONE; // Changed to NONE to avoid sticky state issues
      this.priorSelection.addAll(board.selectedComponents)
    } else if (board.selectedPins.size > 0) {
      this.priorSelectionType = SelectionType.NONE;
      this.priorSelection.addAll(board.selectedPins)
    }

    this.reset(board)
    this.pPoint = undefined;
  }

  handleMouseMoveConnect(board: LogicBoard, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    const { x, y } = this.getViewCoordinates!(e);
    const point = new paper.Point(x, y);
    if (!this.targetComponent || (this.targetComponent as any).pinType === undefined) {
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

    board.selectedComponents.clear();
    board.selectedPins.clear();

    const components = [...board.components.values()];
    const pins = [...board.pins.values()];

    if (this.action === MouseAction.SELECT) {
      this.currentSelection.clear();

      for (const component of components) {
        if (component.collides(this.selectBox)) {
          this.currentSelection.add(component);
        }
      }

      if (this.currentSelection.size > 0) {
        board.selectedComponents.clear();
        board.selectedComponents.addAll(this.currentSelection as Set<LogicComponent>);
      } else {
        const pins = [...board.pins.values()];

        for (const pin of pins) {
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
        const components = [...board.components.values()];
        for (const component of components) {
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
        const pins = [...board.pins.values()];
        for (const pin of pins) {
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
      for (const component of components) {
        component.selected = board.selectedComponents.has(component);
      }

      for (const pin of pins) {
        pin.selected = false
      }
    } else if (board.selectedPins.size > 0) {
      for (const pin of pins) {
        pin.selected = board.selectedPins.has(pin)
      }

      for (const component of components) {
        component.selected = false;
      }
    } else {
      for (const component of components) {
        component.selected = false;
      }

      for (const pin of pins) {
        pin.selected = false
      }
    }

    // This update is required to update the selection box.
    // TODO: refactor the selection box as a widget so it can be updated independently of the rest of the board.
    board.update();
    board.updateProperties();
  }

  handleMouseMovePan(board: LogicBoard, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    const { x, y } = this.getViewCoordinates!(e)
    const currentPoint = new board.scope.Point(x, y);

    if (this.pPoint) {
      const dx = currentPoint.x - this.pPoint.x;
      const dy = currentPoint.y - this.pPoint.y;

      board.viewBox = {
        top: board.viewBox.top - dy,
        left: board.viewBox.left - dx,
        width: board.viewBox.width,
        height: board.viewBox.height,
      }
    }

    this.pPoint = currentPoint;
    board.update()
  }

  handleMouseMoveDrag(board: LogicBoard, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
    const { x, y } = this.getViewCoordinates!(e)
    const currentPoint = new board.scope.Point(x, y);

    if (!this.targetComponent?.selected) {
      this.targetComponent!.selected = true;
      board.selectedComponents.add(this.targetComponent!)
    }

    if (this.pPoint) {
      const dx = currentPoint.x - this.pPoint.x;
      const dy = currentPoint.y - this.pPoint.y;

      for (const component of board.selectedComponents) {
        component.translate(new board.scope.Point(dx, dy))
      }
    }

    this.pPoint = currentPoint;
  }

  isSelect(): boolean {
    const { SELECT, SELECT_APPEND, SELECT_XOR } = MouseAction;
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