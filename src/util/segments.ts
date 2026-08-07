/**
 * Geometry for 7-, 14-, and 16-segment displays.
 *
 * The three layouts are the same drawing at different levels of subdivision: 14 segments is 7 with
 * the middle bar split and the star added, and 16 is 14 with the top and bottom bars split too. So
 * rather than storing three sets of polygons, each segment is described by the two nodes it spans
 * and the polygons are generated from that.
 */

interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Proportions follow the displays in the predecessor project: a digit roughly twice as tall as it
 * is wide, and a one-in-six lean.
 */
/** Width of the digit itself, before the slant is applied. */
const DIGIT_WIDTH = 24;
/** Height of the digit itself. */
const DIGIT_HEIGHT = 48;
/** Horizontal shift per unit of vertical distance from the digit's centre. */
const SLANT = 1 / 6;

/**
 * Bar thickness as a fraction of the digit's width, per layout.
 *
 * The displays this copies draw a 7-segment digit with fat bars that all but touch, and the denser
 * layouts with much thinner ones — which they have to, since sixteen bars of the same weight would
 * leave the lit digit a solid block.
 */
const THICKNESS_RATIO: Readonly<Record<SegmentCount, number>> = {
  7: 0.26,
  14: 0.115,
  16: 0.115,
};

const W = DIGIT_WIDTH;
const H = DIGIT_HEIGHT;

/** The nine points every segment runs between. */
const NODES = {
  topLeft: {x: 0, y: 0},
  topMiddle: {x: W / 2, y: 0},
  topRight: {x: W, y: 0},
  midLeft: {x: 0, y: H / 2},
  midMiddle: {x: W / 2, y: H / 2},
  midRight: {x: W, y: H / 2},
  bottomLeft: {x: 0, y: H},
  bottomMiddle: {x: W / 2, y: H},
  bottomRight: {x: W, y: H},
} as const;

/**
 * Every segment that appears in any of the three layouts, named as they conventionally are.
 *
 * Naming follows the usual convention: a-g are the seven bars of a 7-segment digit, the numbered
 * variants are the halves a layout splits them into, and h-m are the diagonals and centre bars of
 * the star.
 */
const SEGMENTS: Readonly<Record<string, readonly [Point, Point]>> = {
  a: [NODES.topLeft, NODES.topRight],
  a1: [NODES.topLeft, NODES.topMiddle],
  a2: [NODES.topMiddle, NODES.topRight],
  b: [NODES.topRight, NODES.midRight],
  c: [NODES.midRight, NODES.bottomRight],
  d: [NODES.bottomLeft, NODES.bottomRight],
  d1: [NODES.bottomLeft, NODES.bottomMiddle],
  d2: [NODES.bottomMiddle, NODES.bottomRight],
  e: [NODES.midLeft, NODES.bottomLeft],
  f: [NODES.topLeft, NODES.midLeft],
  g: [NODES.midLeft, NODES.midRight],
  g1: [NODES.midLeft, NODES.midMiddle],
  g2: [NODES.midMiddle, NODES.midRight],
  h: [NODES.topLeft, NODES.midMiddle],
  i: [NODES.topMiddle, NODES.midMiddle],
  j: [NODES.topRight, NODES.midMiddle],
  k: [NODES.midMiddle, NODES.bottomRight],
  l: [NODES.midMiddle, NODES.bottomMiddle],
  m: [NODES.midMiddle, NODES.bottomLeft],
};

/** The number of segments a display may have. */
type SegmentCount = 7 | 14 | 16;

/** Segment names in bit order, least significant first. */
const LAYOUTS: Readonly<Record<SegmentCount, readonly string[]>> = {
  7: ["a", "b", "c", "d", "e", "f", "g"],
  14: ["a", "b", "c", "d", "e", "f", "g1", "g2", "h", "i", "j", "k", "l", "m"],
  16: ["a1", "a2", "b", "c", "d1", "d2", "e", "f",
       "g1", "g2", "h", "i", "j", "k", "l", "m"],
};

/** Half a layout's bar thickness, which is also the length of each tapered end. */
function halfThickness(count: SegmentCount): number {
  return (THICKNESS_RATIO[count] * W) / 2;
}

/** Leans the digit to the right, about its own vertical centre so it stays put horizontally. */
function slanted({x, y}: Point): Point {
  return {x: x + SLANT * (H / 2 - y), y: y};
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Draws one segment as a bar with tapered ends.
 *
 * The taper brings each end to a point at the node it runs to, so that segments meeting at a node
 * mitre against each other the way the bars of a real display do.
 *
 * Where a bar ends against the side of another instead — the centre verticals of a 14-segment
 * display, which arrive partway along its unbroken top and bottom bars — the tip is left to overlap.
 * It lands exactly where the display this copies carved a notch, and since the star is drawn after
 * the outer ring, the overlapping tip paints the same wedge the notch would have left.
 */
function bar([from, to]: readonly [Point, Point], t: number): string {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;

  const start = from;
  const end = to;

  // Where the bar reaches full thickness, one tip-length in from each end.
  const shoulderStart = {x: start.x + ux * t, y: start.y + uy * t};
  const shoulderEnd = {x: end.x - ux * t, y: end.y - uy * t};

  // Offset to either side of the bar.
  const nx = -uy * t;
  const ny = ux * t;

  const points: Point[] = [
    {x: shoulderStart.x + nx, y: shoulderStart.y + ny},
    {x: shoulderEnd.x + nx, y: shoulderEnd.y + ny},
    end,
    {x: shoulderEnd.x - nx, y: shoulderEnd.y - ny},
    {x: shoulderStart.x - nx, y: shoulderStart.y - ny},
    start,
  ];

  const [first, ...rest] = points.map(slanted);

  return [
    `M ${round(first.x)} ${round(first.y)}`,
    ...rest.map(p => `L ${round(p.x)} ${round(p.y)}`),
    "Z",
  ].join(" ");
}

/**
 * How far the drawn segments reach past the nominal digit box, on every side.
 *
 * The box is described by the centrelines the bars run along, so each bar hangs half its thickness
 * outside it, and the lean carries the top and bottom rows further out still.
 */
function digitOverhang(count: SegmentCount): {x: number, y: number} {
  return {
    x: halfThickness(count) + SLANT * (H / 2),
    y: halfThickness(count),
  };
}

/** Segment names for a layout, in bit order. */
function segmentNames(count: SegmentCount): readonly string[] {
  return LAYOUTS[count];
}

/**
 * Path data for each segment of a layout, in bit order.
 *
 * Coordinates are relative to the top-left of the digit; the caller positions the digit within the
 * component body.
 */
function segmentPaths(count: SegmentCount): string[] {
  const t = halfThickness(count);

  return LAYOUTS[count].map(name => bar(SEGMENTS[name], t));
}

export {segmentNames, segmentPaths, digitOverhang, DIGIT_WIDTH, DIGIT_HEIGHT, SLANT};
export type {SegmentCount};
