import GateType from "../enums/GateType";
import LogicComponent from "../logic/LogicComponent";
import LogicGate from "../logic/LogicGate";
import PartType from "../enums/PartType";
import {GLOBAL_SCOPE} from "../Constants";
import LogicBoard from "../logic/LogicBoard";
import Bulb from "../logic/Bulb";

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
        return new Bulb({subtype: 0, board: board, scope: scope})
      default:
        throw Error("Unsupported Part Type");
    }
  }
}

export default Part;