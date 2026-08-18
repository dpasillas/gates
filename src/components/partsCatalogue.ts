import {Part} from "./Part";
import {GateType} from "../enums/GateType";
import {PartType} from "../enums/PartType";

/** Every built-in part, by the category the parts panel lists it under. */
const PARTS: Map<string, Part[]> = new Map([
  ["Input", [
    new Part({type: PartType.INPUT, subtype: 0, label: "Clock"}),
    new Part({type: PartType.INPUT, subtype: 1, label: "Switch"}),
    new Part({type: PartType.INPUT, subtype: 2, label: "Ground"}),
    // TODO(dpasillas): Put the pull resistors back once user-drawn nets exist. Both are built and
    //   the net resolves them correctly, but the only way to share a line with the tri-state they
    //   are for is to wire two outputs together, which is not an interaction we want.
  ]],
  ["Output", [
    new Part({type: PartType.OUTPUT, subtype: 0, label: "Bulb"}),
    new Part({type: PartType.OUTPUT, subtype: 1, label: "7-Segment"}),
    new Part({type: PartType.OUTPUT, subtype: 2, label: "14-Segment"}),
    new Part({type: PartType.OUTPUT, subtype: 3, label: "16-Segment"}),
  ]],
  ["Gates", [
    new Part({type: PartType.GATE, subtype: GateType.AND, label: "AND"}),
    new Part({type: PartType.GATE, subtype: GateType.NAND, label: "NAND"}),
    new Part({type: PartType.GATE, subtype: GateType.OR, label: "OR"}),
    new Part({type: PartType.GATE, subtype: GateType.NOR, label: "NOR"}),
    new Part({type: PartType.GATE, subtype: GateType.XOR, label: "XOR"}),
    new Part({type: PartType.GATE, subtype: GateType.XNOR, label: "XNOR"}),
    new Part({type: PartType.GATE, subtype: GateType.BUF, label: "BUF"}),
    new Part({type: PartType.GATE, subtype: GateType.NOT, label: "NOT"}),
    new Part({type: PartType.GATE, subtype: GateType.TRI, label: "Tri-State"}),
  ]],
  ["Bus", [
    new Part({type: PartType.BUS, subtype: 0, label: "Splitter"}),
    new Part({type: PartType.BUS, subtype: 1, label: "Joiner"}),
  ]],
  ["Other", [
    new Part({type: PartType.COMPOSITE_BUILT_IN, subtype: 0, label: "Half-Adder"}),
    new Part({type: PartType.COMPOSITE_BUILT_IN, subtype: 1, label: "Adder"}),
  ]],
]);

export {PARTS};
