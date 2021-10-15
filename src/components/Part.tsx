import GateType from "../enums/GateType";
import LogicComponent from "../logic/LogicComponent";
import LogicGate from "../logic/LogicGate";
import PartType from "../enums/PartType";
import {GLOBAL_SCOPE} from "../Constants";
import LogicBoard from "../logic/LogicBoard";
import Bulb from "../logic/Bulb";
import Clock from "../logic/Clock";
import Switch from "../logic/Switch";
import paper from "paper";
import Adder from "../logic/Adder";
import Ground from "../logic/Ground";

interface PartParams {
  type: PartType,
  subtype: GateType,
  label?: string;
}

/**
 * Part is a factory class used to generate logic components.
 */
class Part {
  readonly subtype: GateType;
  readonly type: PartType;
  readonly label: string;
  static data?: Part;
  component: LogicComponent;

  constructor(params: PartParams) {
    this.type = params.type;
    this.subtype = params.subtype;
    this.label = params.label ?? "<NO LABEL>";
    this.component = this.make();
  }

  make(board?: LogicBoard): LogicComponent {
    let scope = board?.scope ?? GLOBAL_SCOPE;
    switch (this.type) {
      case PartType.GATE:
        return new LogicGate({subtype: this.subtype, scope: scope, board: board});
      case PartType.OUTPUT:
        return new Bulb({subtype: 0, board: board, scope: scope});
      case PartType.INPUT:
        return this.makeInput(this.subtype, scope, board);
      case PartType.COMPOSITE_BUILT_IN:
        return this.makeComposite(this.subtype, scope, board);

      default:
        throw new Error("Unsupported Part Type");
    }
  }

  makeInput(subtype: number, scope: paper.PaperScope, board?: LogicBoard) {
    switch (subtype){
      case 0:
        return new Clock({board: board, scope: scope, subtype: 0})
      case 1:
        return new Switch({subtype: 1, board: board, scope: scope})
      case 2:
        return new Ground({subtype: 2, board: board, scope: scope})
      default:
        throw new Error("Unsupported Part Type");
    }
  }

  makeComposite(subtype: number, scope: paper.PaperScope, board?: LogicBoard) {
    switch (subtype) {
      // Intentional fall through
      case 0: // Half Adder
      case 1: // Full Adder
            return new Adder({subtype: this.subtype, scope: scope, board: board});
      default:
        throw new Error("Unsupported Component Type")
    }
  }
}

export default Part;