type SnapMode = "off" | "fine" | "coarse";

/** Fine matches the board's finest drawn gridline, so a snapped component lands on a visible one. */
const SNAP_SIZES: Record<SnapMode, number> = {
  off: 0,
  fine: 10,
  coarse: 40,
};

/** The order the toolbar button steps through. */
const SNAP_MODES: SnapMode[] = ["off", "fine", "coarse"];

function isSnapMode(value: unknown): value is SnapMode {
  return SNAP_MODES.includes(value as SnapMode);
}

function snapSizeFor(mode: SnapMode): number {
  return SNAP_SIZES[mode];
}

function snapModeLabel(mode: SnapMode): string {
  return mode === "off" ? "off" : `every ${SNAP_SIZES[mode]}`;
}

function nextSnapMode(mode: SnapMode): SnapMode {
  return SNAP_MODES[(SNAP_MODES.indexOf(mode) + 1) % SNAP_MODES.length];
}

/** Size zero returns the coordinate untouched, so callers placing something need no branch. */
function snapTo(value: number, size: number): number {
  if (size <= 0) {
    return value;
  }

  const snapped = Math.round(value / size) * size;

  // Rounding below the origin gives negative zero, which the properties panel shows as "-0".
  return snapped === 0 ? 0 : snapped;
}

export {isSnapMode, nextSnapMode, snapModeLabel, snapSizeFor, snapTo, SNAP_MODES, SNAP_SIZES};
export type {SnapMode};
