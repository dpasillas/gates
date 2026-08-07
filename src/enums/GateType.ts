
enum GateType {
  UNKNOWN,
  AND,
  NAND,
  OR,
  NOR,
  XOR,
  XNOR,
  BUF,
  NOT,
  /** Tri-state buffer: a BUF whose output can be released to high impedance. */
  TRI,
}

export {GateType};