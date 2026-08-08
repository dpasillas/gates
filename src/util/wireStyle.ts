/**
 * The ways a wire can be drawn between two pins.
 *
 * - `bezier` — one smooth curve from pin to pin.
 * - `orthogonal` — runs along the cardinal directions only, turning square corners.
 * - `diagonal` — the same, with the corners cut, so it may also run at forty-five degrees.
 */
type WireStyle = "bezier" | "orthogonal" | "diagonal";

/** The order the toolbar cycles through, and the name shown for each. */
const WIRE_STYLES: ReadonlyArray<{style: WireStyle, label: string}> = [
  {style: "bezier", label: "Curved"},
  {style: "orthogonal", label: "Square"},
  {style: "diagonal", label: "Angled"},
];

/** The style after this one, wrapping round at the end. */
function nextWireStyle(style: WireStyle): WireStyle {
  const at = WIRE_STYLES.findIndex(entry => entry.style === style);

  return WIRE_STYLES[(at + 1) % WIRE_STYLES.length].style;
}

/** The name shown for a style. */
function wireStyleLabel(style: WireStyle): string {
  return WIRE_STYLES.find(entry => entry.style === style)!.label;
}

export {WIRE_STYLES, nextWireStyle, wireStyleLabel};
export type {WireStyle};
