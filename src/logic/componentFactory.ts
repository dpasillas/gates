import paper from "paper";

import {Adder} from "./Adder";
import {Bulb} from "./Bulb";
import {Clock} from "./Clock";
import {Ground} from "./Ground";
import {Joiner} from "./Joiner";
import {LogicBoard} from "./LogicBoard";
import {LogicComponent} from "./LogicComponent";
import {LogicGate} from "./LogicGate";
import {SegmentDisplay} from "./SegmentDisplay";
import {Splitter} from "./Splitter";
import {Switch} from "./Switch";
import {TriStateBuffer} from "./TriStateBuffer";
import {GateType} from "../enums/GateType";
import {PartType} from "../enums/PartType";

interface ComponentSpec {
  type: PartType;
  /** What the type selects between. Its meaning depends on the type. */
  subtype: GateType;
  scope: paper.PaperScope;
  board?: LogicBoard;
}

function makeOutput(subtype: number, scope: paper.PaperScope, board?: LogicBoard): LogicComponent {
  switch (subtype) {
    case 0:
      return new Bulb({subtype: 0, scope, board});
    // Intentional fall through: the subtype selects the segment layout.
    case 1:
    case 2:
    case 3:
      return new SegmentDisplay({subtype, scope, board});
    default:
      throw new Error(`Unsupported output subtype: ${subtype}`);
  }
}

function makeInput(subtype: number, scope: paper.PaperScope, board?: LogicBoard): LogicComponent {
  switch (subtype) {
    case 0:
      return new Clock({subtype: 0, scope, board});
    case 1:
      return new Switch({subtype: 1, scope, board});
    case 2:
      return new Ground({subtype: 2, scope, board});
    default:
      throw new Error(`Unsupported input subtype: ${subtype}`);
  }
}

function makeBus(subtype: number, scope: paper.PaperScope, board?: LogicBoard): LogicComponent {
  switch (subtype) {
    case 0:
      return new Splitter({subtype: 0, scope, board});
    case 1:
      return new Joiner({subtype: 1, scope, board});
    default:
      throw new Error(`Unsupported bus subtype: ${subtype}`);
  }
}

function makeComposite(subtype: number, scope: paper.PaperScope, board?: LogicBoard): LogicComponent {
  switch (subtype) {
    // Intentional fall through: the subtype selects half-adder or full adder.
    case 0:
    case 1:
      return new Adder({subtype, scope, board});
    default:
      throw new Error(`Unsupported composite subtype: ${subtype}`);
  }
}

/**
 * Builds the component a type and subtype select.
 *
 * The parts panel and the board loader both arrive at a component this way, so the mapping lives
 * here rather than in either of them: a part dropped on the board and the same part read back out
 * of a file have to be the same thing.
 */
function makeComponent({type, subtype, scope, board}: ComponentSpec): LogicComponent {
  switch (type) {
    case PartType.GATE:
      // Tri-state buffering is not something a primitive gate can express, so it has its own
      // component even though it belongs with the gates in the parts list.
      return subtype === GateType.TRI
        ? new TriStateBuffer({scope, board})
        : new LogicGate({subtype, scope, board});
    case PartType.OUTPUT:
      return makeOutput(subtype, scope, board);
    case PartType.INPUT:
      return makeInput(subtype, scope, board);
    case PartType.BUS:
      return makeBus(subtype, scope, board);
    case PartType.COMPOSITE_BUILT_IN:
      return makeComposite(subtype, scope, board);
    default:
      throw new Error(`Unsupported part type: ${PartType[type] ?? type}`);
  }
}

export {makeComponent};
export type {ComponentSpec};
