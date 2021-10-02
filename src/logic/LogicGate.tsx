import paper from "paper";

import LogicComponent, {LogicComponentParams} from "./LogicComponent";
import PartType from "../enums/PartType";
import LogicPin, {PinOrientation, PinType} from "./LogicPin";
import GateType from "../enums/GateType";
import * as Constants from "../Constants";
import LogicState from "./LogicState";

/** Helper function which maps Gate types to svg paths.*/
function pathFromGateType(type: GateType) {
  switch (type) {
    case GateType.AND:
    case GateType.NAND:
      return Constants.AND_PATH;
    case GateType.OR:
    case GateType.NOR:
      return Constants.OR_PATH;
    case GateType.XOR:
    case GateType.XNOR:
      return Constants.XOR_PATH;
    case GateType.BUF:
    case GateType.NOT:
      return Constants.BUF_PATH;
    default:
      throw Error("Unsupported Gate Type")
  }
}

/** Helper function which indicates of a particular gate type is negated. */
function isNot(type: GateType) {
  switch (type) {
    case GateType.NAND:
    case GateType.NOR:
    case GateType.XNOR:
    case GateType.NOT:
      return true;
    case GateType.AND:
    case GateType.OR:
    case GateType.XOR:
    case GateType.BUF:
      return false;
    default:
      throw Error("Unsupported Gate Type")
  }
}

interface IParams extends Omit<LogicComponentParams, "flags" | "type"> {}

/** Primitive Logic Gates */
class LogicGate extends LogicComponent {
  static opFuncs: Record<GateType, () => LogicState> = {
    [GateType.AND]: LogicGate.prototype.opAnd,
    [GateType.NAND]: LogicGate.prototype.opNand,
    [GateType.OR]: LogicGate.prototype.opOr,
    [GateType.NOR]: LogicGate.prototype.opNor,
    [GateType.XOR]: LogicGate.prototype.opXor,
    [GateType.XNOR]: LogicGate.prototype.opXnor,
    [GateType.BUF]: LogicGate.prototype.opBuf,
    [GateType.NOT]: LogicGate.prototype.opNot,
    [GateType.UNKNOWN]: () => {throw new Error("Unsupported type")}
  }

  private readonly opFunc: () => LogicState;

  constructor(params: IParams) {
    super({flags: 0, type: PartType.GATE, fieldWidth: 2, ...params});
    this.opFunc = LogicGate.opFuncs[this.subtype].bind(this)
  }

  /* BEGIN logical gate implementations */
  opAnd(): LogicState {
    let value = this.bitMask();
    let unknown = 0;
    let high_impedance = 0;

    // Keep track of input zeroes so we can ignore errors from other pins at these outputs
    let zeroes = 0;

    for (let pin of this.inputPins) {
        // Count zeroes only if no error state exists for that bit.
        zeroes |= ~(pin.state.v | pin.state.x | pin.state.z)
        value &= pin.state.v;
        unknown |= pin.state.x;
        // Treat input z as unknown.
        unknown |= pin.state.z;
    }

    // An input zero sets the corresponding output bit to zero, so we clear the error states on these bits.
    // Because 0 AND X = 0
    unknown &= ~zeroes;

    return new LogicState({
      v: value,
      x: unknown,
      z: high_impedance,
    });
  }

  opNand(): LogicState {
    let state = this.opAnd();
    return state.negated(this.width);
  }

  opOr(): LogicState{
    let value = 0;
    let unknown = 0;
    let high_impedance = 0;

    for (let pin of this.inputPins) {
      value |= pin.state.v;
      unknown |= pin.state.x;
      // Treat input z as unknown.
      unknown |= pin.state.z;
    }

    // Unlike AND gates, we can use the value above to indicate an error-free one at an input.
    // An input one sets the corresponding output bit to one, so we clear the error states on these bits.
    // Because 1 OR X = 1
    unknown &= ~value;

    return new LogicState({
      v: value,
      x: unknown,
      z: high_impedance,
    });
  }

  opNor(): LogicState {
    let state = this.opOr();
    return state.negated(this.width);
  }

  opXor(): LogicState {
    let value = 0;
    let unknown = 0;
    let high_impedance = 0;

    for (let pin of this.inputPins) {
      value ^= pin.state.v;
      unknown |= pin.state.x;
      // Treat input z as unknown.
      unknown |= pin.state.z;
    }

    // We don't ignore errors at inputs for XOR because we need all inputs in every case to determine the output.

    return new LogicState({
      v: value & ~unknown,
      x: unknown,
      z: high_impedance,
    });
  }

  opXnor(): LogicState {
    let state = this.opXor();
    return state.negated(this.width);
  }

  opBuf(): LogicState {
    let [inputPin,] = this.inputPins;
    let value = inputPin.state.v;
    let unknown = inputPin.state.x | inputPin.state.z;
    let high_impedance = 0;

    return new LogicState({
      v: value,
      x: unknown,
      z: high_impedance
    })
  }

  opNot(): LogicState {
    let [inputPin,] = this.inputPins;
    let unknown = inputPin.state.x | inputPin.state.z;
    let value = ~inputPin.state.v & this.bitMask() & ~unknown;
    let high_impedance = 0;

    return new LogicState({
      v: value,
      x: unknown,
      z: high_impedance
    });
  }

  operate(): void {
    let logicState = this.opFunc();
    this.postEvent(logicState, this.outputPins[0])
  }


  setUpBody(): paper.Item {
    let {CompoundPath} = this.scope;
    return new CompoundPath(pathFromGateType(this.subtype))
  }

  setUpInputPins(fieldWidth: number): LogicPin[] {
    // Keep pins that fit within tne new field width to maintain old connections
    let inputPins = this.inputPins.slice(0, fieldWidth);
    let nuke = this.inputPins.slice(fieldWidth);
    nuke.forEach(p => p.remove());

    for (let i = this.fieldWidth; i < fieldWidth; ++i) {
      inputPins.push(new LogicPin({
        parent: this,
        pinType: PinType.INPUT,
        orientation: PinOrientation.LEFT,
        board: this.board,
      }))
    }

    let offset =
        fieldWidth === 2 ? 32 / 3 :
            fieldWidth === 3 ? 6 :
                2;
    let spacing =
        fieldWidth === 2 ? 32 / 3 :
            fieldWidth === 3 ? 10 :
                28 / 3;

    for (let i = 0; i < fieldWidth; ++i) {
      inputPins[i].updateGeometry(new paper.Point(0, offset + i * spacing));
    }

    return inputPins;
  }

  setUpOutputPins(): LogicPin[] {
    if (this.outputPins.length > 0) {
      return this.outputPins;
    }
    let pin = new LogicPin({
      parent: this,
      pinType: PinType.OUTPUT,
      orientation: PinOrientation.RIGHT,
      not: isNot(this.subtype),
      board: this.board,
    })
    pin.updateGeometry(new paper.Point(32, 16))

    return [pin];
  }
}

export default LogicGate;