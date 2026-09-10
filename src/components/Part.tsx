import {GateType} from "../enums/GateType";
import {LogicComponent} from "../logic/LogicComponent";
import {PartType} from "../enums/PartType";
import {GLOBAL_SCOPE} from "../Constants";
import {LogicBoard} from "../logic/LogicBoard";
import {SubComponent} from "../logic/SubComponent";
import {makeComponent} from "../logic/componentFactory";
import type {ComponentDefinition, ComponentLibrary} from "../logic/ComponentDefinition";

interface PartParams {
  type: PartType,
  subtype: GateType,
  label?: string;
  userDefined?: boolean;
  /** The component this part places, for one the user built rather than one built in. */
  definition?: ComponentDefinition;
  /** Where a component placed on the board inside finds what it was built from. */
  library?: ComponentLibrary;
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
  readonly definition?: ComponentDefinition;
  readonly library?: ComponentLibrary;
  static data?: Part;
  component: LogicComponent;

  constructor(params: PartParams) {
    this.type = params.type;
    this.subtype = params.subtype;
    this.label = params.label ?? "<NO LABEL>";
    this.userDefined = params.userDefined ?? false;
    this.definition = params.definition;
    this.library = params.library;
    this.component = this.preview();
  }

  /**
   * The drawing in the panel.
   *
   * A custom component is drawn from its package alone, with nothing built inside it: what the tile
   * shows is the symbol, and building a whole circuit to draw one would cost the panel every part
   * of every component the project holds.
   */
  private preview(): LogicComponent {
    return this.definition
        ? new SubComponent({scope: GLOBAL_SCOPE, packaging: this.definition.packaging})
        : this.make();
  }

  make(board?: LogicBoard): LogicComponent {
    if (this.definition) {
      return new SubComponent({
        scope: board?.scope ?? GLOBAL_SCOPE,
        board,
        definition: this.definition,
        library: this.library,
      });
    }

    return makeComponent({
      type: this.type,
      subtype: this.subtype,
      scope: board?.scope ?? GLOBAL_SCOPE,
      board,
    });
  }
}

export {Part};
