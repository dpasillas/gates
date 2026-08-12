/** Whether a component being placed lands on the grid, and how coarse that grid is. */
type SnapMode = "off" | "fine" | "coarse";

/**
 * How far apart the positions a component can be placed on are, in board units.
 *
 * The fine spacing matches the finest line the board draws its grid with, so a snapped component
 * sits on a line the user can see rather than on one they have to take on trust. The coarse spacing
 * is four of those, which is half the distance between the heavy lines.
 */
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

/** How far apart the positions a mode places on are, or zero while it places anywhere. */
function snapSizeFor(mode: SnapMode): number {
  return SNAP_SIZES[mode];
}

/** What the mode is called, for the button that changes it. */
function snapModeLabel(mode: SnapMode): string {
  return mode === "off" ? "off" : `every ${SNAP_SIZES[mode]}`;
}

/** The mode after this one, wrapping round to the start. */
function nextSnapMode(mode: SnapMode): SnapMode {
  return SNAP_MODES[(SNAP_MODES.indexOf(mode) + 1) % SNAP_MODES.length];
}

/**
 * The nearest grid position to a coordinate.
 *
 * A size of zero leaves the coordinate alone, so that callers placing something can snap it without
 * first asking whether snapping is on.
 */
function snapTo(value: number, size: number): number {
  if (size <= 0) {
    return value;
  }

  const snapped = Math.round(value / size) * size;

  // Rounding just below the origin gives negative zero, which the properties panel would show as
  // "-0" for a component sitting exactly on the axis.
  return snapped === 0 ? 0 : snapped;
}

export {isSnapMode, nextSnapMode, snapModeLabel, snapSizeFor, snapTo, SNAP_MODES, SNAP_SIZES};
export type {SnapMode};
