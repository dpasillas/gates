import paper from "paper";

import {LogicComponent, LogicComponentParams, UpdateGeometryParams} from "./LogicComponent";
import {LogicPin, PinOrientation, PinType} from "./LogicPin";
import {LogicState} from "./LogicState";
import {PartType} from "../enums/PartType";
import {GateType} from "../enums/GateType";
import * as Constants from "../Constants";

interface IParams extends Omit<LogicComponentParams, "type" | "subtype"> {}

/**
 * A buffer whose output can be released.
 *
 * While the enable pin is high the component behaves like a plain buffer; while it is low the output
 * is driven to high impedance rather than to a value, which is what lets several of these share a
 * line without one of them deciding it.
 */
class TriStateBuffer extends LogicComponent {
  constructor(params: IParams) {
    super({
      ...params,
      label: "Tri-State",
      type: PartType.GATE,
      subtype: GateType.TRI,
      adjustableWidth: true,
    });
  }

  /** The data pin. Set up by {@link setUpInputPins}, so it always precedes the enable pin. */
  private get dataPin(): LogicPin {
    return this.inputPins[0];
  }

  /** The enable pin. Set up by {@link setUpSelectorPins}, so it always follows the data pin. */
  private get enablePin(): LogicPin {
    return this.inputPins[1];
  }

  operate(): void {
    const enable = this.enablePin.state;

    // An enable that is unknown or floating means the component cannot tell whether it is driving,
    // which is a stronger statement than either driving or releasing — so the output is unknown.
    if (enable.x || enable.z) {
      this.postEvent(new LogicState({x: this.bitMask()}), this.outputPins[0]);
      return;
    }

    if (!(enable.v & 1)) {
      this.postEvent(new LogicState({z: this.bitMask()}), this.outputPins[0]);
      return;
    }

    const data = this.dataPin.state;
    this.postEvent(new LogicState({
      v: data.v,
      // A floating input reaching an enabled buffer is indeterminate at the output, not passed on
      // as float: the buffer is driving.
      x: data.x | data.z,
    }), this.outputPins[0]);
  }

  setUpBody(): paper.Item {
    return new this.scope.CompoundPath(Constants.BUF_PATH);
  }

  setUpInputPins({width}: UpdateGeometryParams): LogicPin[] {
    const [existing] = this.inputPins;
    const pin = existing ?? new LogicPin({
      parent: this,
      pinType: PinType.INPUT,
      orientation: PinOrientation.LEFT,
      board: this.board,
      width: width,
    });

    if (existing && width !== this.width) {
      existing.disconnect();
      existing.width = width;
    }
    pin.updateGeometry(new paper.Point(0, 16));

    return [pin];
  }

  /**
   * The enable pin.
   *
   * It is a control input rather than data, so it stays one bit wide however wide the buffer gets,
   * and it enters from the top where it will not be mistaken for the signal path.
   */
  setUpSelectorPins(): LogicPin[] {
    const pin = this.inputPins[1] ?? new LogicPin({
      parent: this,
      pinType: PinType.INPUT,
      orientation: PinOrientation.UP,
      board: this.board,
    });
    // The body is a triangle, so its upper edge at the midpoint has already descended to y = 8.
    pin.updateGeometry(new paper.Point(16, 8));

    return [pin];
  }

  setUpOutputPins({width}: UpdateGeometryParams): LogicPin[] {
    const [existing] = this.outputPins;
    if (existing) {
      if (width !== this.width) {
        existing.disconnect();
        existing.width = width;
      }
      existing.updateGeometry(new paper.Point(32, 16));
      return [existing];
    }

    const pin = new LogicPin({
      parent: this,
      pinType: PinType.OUTPUT,
      orientation: PinOrientation.RIGHT,
      board: this.board,
      width: width,
    });
    pin.updateGeometry(new paper.Point(32, 16));

    return [pin];
  }
}

export {TriStateBuffer};
