import LogicGate from "./LogicGate";
import GateType from "../enums/GateType";
import {GLOBAL_SCOPE} from "../Constants";
import LogicState from "./LogicState";
import {TruthEntry, TruthTable} from "../test/Types";
import {BINARY_TRUTH_TABLES, UNARY_TRUTH_TABLES} from "../test/TruthTables";

function toLogicState<N extends number>(value: TruthEntry<N>): LogicState {
  if (value === 'x') {
    return new LogicState({x: 1})
  } else if (value === 'z') {
    return new LogicState({z: 1})
  } else if (value === '1') {
    return new LogicState({v: 1})
  } else if (value === '0') {
    return new LogicState({v: 0})
  }
  throw new Error();
}

function testLogicGateMatchesTruthTable<N extends number, W extends number>(gateType: GateType, truthTable: TruthTable<N, W>) {
  let output;
  const gate = new LogicGate({
    scope: GLOBAL_SCOPE,
    subtype: gateType,
  });
  gate.postEvent = (s) => {output = s}

  for (const entry of truthTable) {
    const [i, o] = entry;
    // @ts-ignore
    i.forEach((v: TruthEntry<W>, idx: number) => {
      gate.inputPins[idx].setLogicState(toLogicState(v))
    });
    expect(output).toEqual(toLogicState(o))
  }
}

function getNameFromValue(enumValue: GateType): string {
  // @ts-ignore
  const keys = Object.keys(GateType).filter(x => GateType[x] === enumValue);
  return keys[0]
}

function getTestName(gateType: GateType, fieldWidth: number, width: number): string {
  return `${width}-wide ${fieldWidth}-input ${getNameFromValue(gateType)} Gate matches truth table`;
}

type NaryGateTypes = GateType.AND | GateType.NAND | GateType.OR | GateType.NOR | GateType.XOR | GateType.XNOR;
function testNaryGatesMatchTruthTables() {
  const gateTypes: NaryGateTypes[] = [GateType.AND, GateType.NAND, GateType.OR, GateType.NOR, GateType.XOR, GateType.XNOR];
  for (const gateType of gateTypes) {
    const testName: string = getTestName(gateType, 2, 1);
    const truthTable: TruthTable<2> = BINARY_TRUTH_TABLES[gateType];
    test(testName, () => {
      testLogicGateMatchesTruthTable(gateType, truthTable)
    })
  }
}

type UnaryGateTypes = GateType.BUF | GateType.NOT;
function testUnaryGatesMatchTruthTables(width: number) {
  const gateTypes: UnaryGateTypes[] = [GateType.BUF, GateType.NOT]
  for (const gateType of gateTypes) {
    const testName: string = getTestName(gateType, 1, width);
    test(testName, () => {
      testLogicGateMatchesTruthTable(gateType, UNARY_TRUTH_TABLES[gateType])
    })
  }
}

testUnaryGatesMatchTruthTables(1);
testNaryGatesMatchTruthTables();