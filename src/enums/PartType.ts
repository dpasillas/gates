
enum PartType {
  UNKNOWN,
  GATE,
  INPUT,
  OUTPUT,
  COMPOSITE_BUILT_IN,
  COMPOSITE_CUSTOM,
  /** Structural components which rearrange bits between buses and single-bit lines. */
  BUS
}

export {PartType};

