import GateType from "../enums/GateType";
import {Add, Tuple, TruthEntry, TruthTable, TruthTableEntry, TruthValue} from "./Types";

type UNARY_GATE_TYPES = GateType.BUF | GateType.NOT;
type NON_BINARY_GATE_TYPES = UNARY_GATE_TYPES | GateType.UNKNOWN;
export const BINARY_TRUTH_TABLES: Omit<Record<GateType, TruthTable<2>>, NON_BINARY_GATE_TYPES> = {
  [GateType.AND]: [
    [['0', '0'], '0'],
    [['0', '1'], '0'],
    [['0', 'x'], '0'],
    [['0', 'z'], '0'],
    [['1', '0'], '0'],
    [['1', '1'], '1'],
    [['1', 'x'], 'x'],
    [['1', 'z'], 'x'],
    [['x', '0'], '0'],
    [['x', '1'], 'x'],
    [['x', 'x'], 'x'],
    [['x', 'z'], 'x'],
    [['z', '0'], '0'],
    [['z', '1'], 'x'],
    [['z', 'x'], 'x'],
    [['z', 'z'], 'x'],
  ],
  [GateType.NAND]: [
    [['0', '0'], '1'],
    [['0', '1'], '1'],
    [['0', 'x'], '1'],
    [['0', 'z'], '1'],
    [['1', '0'], '1'],
    [['1', '1'], '0'],
    [['1', 'x'], 'x'],
    [['1', 'z'], 'x'],
    [['x', '0'], '1'],
    [['x', '1'], 'x'],
    [['x', 'x'], 'x'],
    [['x', 'z'], 'x'],
    [['z', '0'], '1'],
    [['z', '1'], 'x'],
    [['z', 'x'], 'x'],
    [['z', 'z'], 'x'],
  ],
  [GateType.OR]: [
    [['0', '0'], '0'],
    [['0', '1'], '1'],
    [['0', 'x'], 'x'],
    [['0', 'z'], 'x'],
    [['1', '0'], '1'],
    [['1', '1'], '1'],
    [['1', 'x'], '1'],
    [['1', 'z'], '1'],
    [['x', '0'], 'x'],
    [['x', '1'], '1'],
    [['x', 'x'], 'x'],
    [['x', 'z'], 'x'],
    [['z', '0'], 'x'],
    [['z', '1'], '1'],
    [['z', 'x'], 'x'],
    [['z', 'z'], 'x'],
  ],
  [GateType.NOR]: [
    [['0', '0'], '1'],
    [['0', '1'], '0'],
    [['0', 'x'], 'x'],
    [['0', 'z'], 'x'],
    [['1', '0'], '0'],
    [['1', '1'], '0'],
    [['1', 'x'], '0'],
    [['1', 'z'], '0'],
    [['x', '0'], 'x'],
    [['x', '1'], '0'],
    [['x', 'x'], 'x'],
    [['x', 'z'], 'x'],
    [['z', '0'], 'x'],
    [['z', '1'], '0'],
    [['z', 'x'], 'x'],
    [['z', 'z'], 'x'],
  ],
  [GateType.XOR]: [
    [['0', '0'], '0'],
    [['0', '1'], '1'],
    [['0', 'x'], 'x'],
    [['0', 'z'], 'x'],
    [['1', '0'], '1'],
    [['1', '1'], '0'],
    [['1', 'x'], 'x'],
    [['1', 'z'], 'x'],
    [['x', '0'], 'x'],
    [['x', '1'], 'x'],
    [['x', 'x'], 'x'],
    [['x', 'z'], 'x'],
    [['z', '0'], 'x'],
    [['z', '1'], 'x'],
    [['z', 'x'], 'x'],
    [['z', 'z'], 'x'],
  ],
  [GateType.XNOR]: [
    [['0', '0'], '1'],
    [['0', '1'], '0'],
    [['0', 'x'], 'x'],
    [['0', 'z'], 'x'],
    [['1', '0'], '0'],
    [['1', '1'], '1'],
    [['1', 'x'], 'x'],
    [['1', 'z'], 'x'],
    [['x', '0'], 'x'],
    [['x', '1'], 'x'],
    [['x', 'x'], 'x'],
    [['x', 'z'], 'x'],
    [['z', '0'], 'x'],
    [['z', '1'], 'x'],
    [['z', 'x'], 'x'],
    [['z', 'z'], 'x'],
  ],
};

export const UNARY_TRUTH_TABLES: Pick<Record<GateType, TruthTable<1>>, UNARY_GATE_TYPES> = {
  [GateType.BUF]: [
    [['0'], '0'],
    [['1'], '1'],
    [['x'], 'x'],
    [['z'], 'x'],
  ],
  [GateType.NOT]: [
    [['0'], '1'],
    [['1'], '0'],
    [['x'], 'x'],
    [['z'], 'x'],
  ],
}

const indexes = {
  '0': 0,
  '1': 1,
  'x': 2,
  'z': 3,
}

function lookup<W extends number>(truthTable: TruthTable<2, W>, input: [TruthValue, TruthValue]): TruthEntry<W> {
  let [i1, i2] = input;
  let index = indexes[i1] * 4 + indexes[i2]
  let [, output] = truthTable[index];
  return output;
}

export function cascadeTruthTable<N extends number>(bTable: TruthTable<2>, truthTable: TruthTable<N>): TruthTable<Add<N, 1>> {
  let truthValues: TruthValue[] = ['0', '1', 'x', 'z']
  let result: TruthTable<Add<N, 1>> = [];
  for (let truthValue of truthValues) {
    for(let [input, output] of truthTable) {
      let newOutput: TruthEntry<1> = lookup(bTable, [truthValue, output])
      // @ts-ignore
      let newInput: Tuple<Add<N, 1>, TruthValue> = [truthValue, ...input];
      let entry: TruthTableEntry<Add<N, 1>, 1> = [newInput, newOutput];
      result.push(entry);
    }
  }
  return result;
}

function mergeTruths<N extends number, W1 extends number, W2 extends number>(t1: Tuple<N, TruthEntry<W1>>, t2: Tuple<N, TruthEntry<W2>>): Tuple<N, TruthEntry<Add<W1, W2>>> {
  // @ts-ignore
  return t1.map((e: TruthEntry<W1>, i: number) => `${e}${(t2 as TruthEntry<W2>)[i]}`);
}

//TODO: Complete this function.
export function baseWidenTruthTable<N extends number, W extends number>(refTable: TruthTable<N>, truthTable: TruthTable<N, W>): TruthTable<N, Add<W, 1>> {
  let result: TruthTable<N, Add<W, 1>> = [];
  for (let [rinput, routput] of refTable) {
    for (let [input, output] of truthTable) {
      let newInput: Tuple<N, TruthEntry<Add<W, 1>>> = mergeTruths(rinput, input);
      // @ts-ignore
      let newOutput: TruthEntry<Add<W, 1>> = `${routput}${output}`;
      result.push([newInput, newOutput]);
    }
  }
  return result;
}