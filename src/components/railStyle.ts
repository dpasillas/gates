import {SxProps} from "@mui/system";
import {Theme} from "@mui/material/styles";

/**
 * Width of a side rail, in pixels.
 *
 * The rail is narrow because its tabs stack a vertical label above an icon rather than sitting
 * side by side. Panels which slide out from behind a rail offset themselves by this much.
 */
const RAIL_WIDTH = 32;

/**
 * Shared geometry for a rail tab, so both rails read as one control.
 *
 * The axes are set explicitly rather than inherited: Tab lays out as a column and ToggleButton as a
 * row, so the same alignment property would mean opposite things in the two rails.
 */
const railTabSx: SxProps<Theme> = {
  minWidth: 0,
  width: `${RAIL_WIDTH}px`,
  minHeight: "100px",
  padding: "14px 0",
  flexDirection: "column",
  // Content hugs the bottom of the tab, which keeps labels of differing lengths aligned...
  justifyContent: "flex-end",
  // ...while staying centred across the width of the rail.
  alignItems: "center",
};

/** Vertical label stacked above its icon, matching the rail tab layout. */
const railLabelSx: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "9px",
};

/**
 * Bottom-to-top label, for the left rail.
 *
 * The rail is too narrow for horizontal text, and each edge of the window turns its labels so they
 * lean into the panel they open.
 */
const railTextUpSx: SxProps<Theme> = {
  writingMode: "vertical-rl",
  textOrientation: "mixed",
  transform: "rotate(180deg)",
};

/** Top-to-bottom label, for the right rail. */
const railTextDownSx: SxProps<Theme> = {
  writingMode: "vertical-rl",
  textOrientation: "mixed",
};

export {RAIL_WIDTH, railTabSx, railLabelSx, railTextUpSx, railTextDownSx};
