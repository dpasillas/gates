
enum PartType {
  UNKNOWN,
  GATE,
  INPUT,
  OUTPUT,
  COMPOSITE_BUILT_IN,
  COMPOSITE_CUSTOM,
  /** Structural components which rearrange bits between buses and single-bit lines. */
  BUS,
  /** A symbol and the pins on it: what a board is put behind to become a component. */
  PACKAGE,
}

export {PartType};

