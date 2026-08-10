import ReactDOM from "react-dom";

import boardCss from "../css/Board.css?raw";
import {LogicBoard} from "../logic/LogicBoard";
import {ViewBox} from "./Types";

/**
 * A picture of a board, taken without disturbing it.
 *
 * The export shows the whole circuit rather than whatever happens to be on screen, so it is drawn
 * against its own box. That box is never given to the board: what the user is looking at is theirs,
 * and taking a snapshot is not a reason to move it.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** Space left around the components, in board units. */
const PADDING = 24;

/** Longest side of the image, in pixels. */
const MAX_SIZE = 1200;

/** How much bigger than the board units the image may be drawn, so a small circuit is still sharp. */
const MAX_SCALE = 4;

/** What is drawn for a board with nothing on it. */
const EMPTY_BOX: ViewBox = {left: -100, top: -75, width: 200, height: 150};

/** The badge marking what kind of file the picture is, measured in pixels of the finished image. */
const BADGE = {
  margin: 14,
  height: 24,
  radius: 6,
  padding: 10,
  fontSize: 13,
  /** How wide a character runs, as a fraction of its size, for sizing the badge to its text. */
  characterWidth: 0.58,
  fill: "#1976d2",
};

/** The area holding every component, with room around it. */
function snapshotBounds(board: LogicBoard): ViewBox {
  const components = [...board.components.values()];
  if (components.length === 0) {
    return {...EMPTY_BOX};
  }

  const box = components
      .map(component => component.geometry.bounds)
      .reduce((all, bounds) => all.unite(bounds));

  return {
    left: box.left - PADDING,
    top: box.top - PADDING,
    width: box.width + 2 * PADDING,
    height: box.height + 2 * PADDING,
  };
}

/** The size the image is drawn at, big enough to read and bounded so it stays a preview. */
function snapshotSize(bounds: ViewBox): {width: number, height: number} {
  const scale = Math.min(MAX_SCALE, MAX_SIZE / bounds.width, MAX_SIZE / bounds.height);

  return {
    width: Math.max(1, Math.round(bounds.width * scale)),
    height: Math.max(1, Math.round(bounds.height * scale)),
  };
}

function element(name: string, attributes: Record<string, string>): SVGElement {
  const made = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    made.setAttribute(key, value);
  }

  return made;
}

/**
 * Remembers every redraw callback on a board, and hands back a way to put them all back.
 *
 * Rendering a board hands each component, pin and wire a fresh callback pointing at the tree that
 * was just made. Drawing a board a second time to photograph it therefore steals those callbacks
 * from the tree the user is looking at, which afterwards stops redrawing itself.
 */
function captureRedraws(board: LogicBoard): () => void {
  const holders: Array<{updateSelf?: () => void}> = [
    ...board.components.values(),
    ...board.pins.values(),
    ...board.connections.values(),
  ];
  const saved = holders.map(holder => [holder, holder.updateSelf] as const);
  const redraw = board.update;

  return () => {
    saved.forEach(([holder, callback]) => {holder.updateSelf = callback});
    board.update = redraw;
  };
}

/**
 * Draws a board somewhere off the page and hands its markup to the caller.
 *
 * Drawn rather than copied from the page so that any board can be photographed, not only the one in
 * front. The tree is taken down and every callback it stole put back before this returns.
 */
function withDrawnBoard<T>(board: LogicBoard, take: (drawn: SVGSVGElement) => T): T {
  const restore = captureRedraws(board);
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:600px";
  document.body.appendChild(container);

  try {
    ReactDOM.render(board.render(), container);
    const drawn = container.querySelector("svg.board");
    if (!drawn) {
      throw new Error("The board could not be drawn.");
    }

    return take(drawn as SVGSVGElement);
  } finally {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    restore();
  }
}

/** The mark saying what kind of file this picture holds. */
function badge(bounds: ViewBox, size: {width: number, height: number}, label: string): SVGElement {
  // The badge is a label on the image rather than a thing on the board, so it is sized in the
  // finished image's pixels and converted back into the units the drawing is made in.
  const unit = bounds.width / size.width;
  const width = (BADGE.padding * 2 + label.length * BADGE.fontSize * BADGE.characterWidth) * unit;

  const group = document.createElementNS(SVG_NS, "g");
  group.appendChild(element("rect", {
    x: String(bounds.left + BADGE.margin * unit),
    y: String(bounds.top + BADGE.margin * unit),
    width: String(width),
    height: String(BADGE.height * unit),
    rx: String(BADGE.radius * unit),
    fill: BADGE.fill,
  }));

  const text = element("text", {
    x: String(bounds.left + (BADGE.margin + BADGE.padding) * unit),
    y: String(bounds.top + (BADGE.margin + BADGE.height / 2) * unit),
    fill: "#ffffff",
    "font-family": "sans-serif",
    "font-size": String(BADGE.fontSize * unit),
    "font-weight": "600",
    "dominant-baseline": "central",
  });
  text.textContent = label;
  group.appendChild(text);

  return group;
}

/**
 * The board redrawn against the given box.
 *
 * The rulers are left out — they are an overlay measured in screen pixels rather than part of the
 * board — as is the selection, which is about what the user is doing rather than what they built.
 */
function snapshotSvg(board: LogicBoard,
                     bounds: ViewBox,
                     size: {width: number, height: number},
                     label?: string): SVGSVGElement {
  return withDrawnBoard(board, drawn => {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("xmlns", SVG_NS);
    svg.setAttribute("viewBox", `${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`);
    svg.setAttribute("width", String(size.width));
    svg.setAttribute("height", String(size.height));

    // Carried as text because an image loaded from a source of its own gets no styles from the page
    // that made it.
    const style = document.createElementNS(SVG_NS, "style");
    style.textContent = boardCss;
    svg.appendChild(style);

    const defs = drawn.querySelector("defs");
    if (defs) {
      svg.appendChild(defs.cloneNode(true));
    }

    const box = {
      x: String(bounds.left),
      y: String(bounds.top),
      width: String(bounds.width),
      height: String(bounds.height),
    };
    svg.appendChild(element("rect", {...box, fill: "lightgray"}));
    svg.appendChild(element("rect", {...box, fill: "url(#grid)"}));
    svg.appendChild(element("path", {
      class: "axis",
      d: `M ${bounds.left} 0 H ${bounds.left + bounds.width} `
          + `M 0 ${bounds.top} V ${bounds.top + bounds.height}`,
    }));

    for (const node of drawn.querySelectorAll("g.connection, g.component")) {
      const copy = node.cloneNode(true) as SVGElement;
      copy.classList.remove("selected");
      copy.querySelectorAll(".selected").forEach(inner => inner.classList.remove("selected"));
      svg.appendChild(copy);
    }

    if (label) {
      svg.appendChild(badge(bounds, size, label));
    }

    return svg;
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The board could not be drawn as an image."));
    image.src = url;
  });
}

async function rasterize(svg: SVGSVGElement,
                         size: {width: number, height: number}): Promise<Uint8Array> {
  const markup = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([markup], {type: "image/svg+xml;charset=utf-8"}));

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("The board could not be drawn as an image.");
    }
    context.drawImage(image, 0, 0, size.width, size.height);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      throw new Error("The board could not be drawn as an image.");
    }

    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * A PNG of the whole board, fitted to what is on it.
 *
 * The label, where given, marks what the picture is carrying — a board on its own looks the same as
 * a board that is one of several in a project, so the file says which it is.
 */
async function snapshotPng(board: LogicBoard, label?: string): Promise<Uint8Array> {
  const bounds = snapshotBounds(board);
  const size = snapshotSize(bounds);

  return rasterize(snapshotSvg(board, bounds, size, label), size);
}

export {snapshotBounds, snapshotPng, snapshotSize, snapshotSvg, EMPTY_BOX, PADDING};
