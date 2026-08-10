import {GateType} from "../enums/GateType";
import {LogicComponent} from "../logic/LogicComponent";
import {PartType} from "../enums/PartType";
import {GLOBAL_SCOPE} from "../Constants";
import {LogicBoard} from "../logic/LogicBoard";
import {makeComponent} from "../logic/componentFactory";

interface PartParams {
  type: PartType,
  subtype: GateType,
  label?: string;
  userDefined?: boolean;
}

/**
 * Part is a factory class used to generate logic components.
 */
class Part {
  readonly subtype: GateType;
  readonly type: PartType;
  readonly label: string;
  /** Whether this part came from the user's own subcircuit rather than the built-in set. */
  readonly userDefined: boolean;
  static data?: Part;
  component: LogicComponent;

  constructor(params: PartParams) {
    this.type = params.type;
    this.subtype = params.subtype;
    this.label = params.label ?? "<NO LABEL>";
    this.userDefined = params.userDefined ?? false;
    this.component = this.make();
  }

  make(board?: LogicBoard): LogicComponent {
    return makeComponent({
      type: this.type,
      subtype: this.subtype,
      scope: board?.scope ?? GLOBAL_SCOPE,
      board,
    });
  }
}

export {Part};
