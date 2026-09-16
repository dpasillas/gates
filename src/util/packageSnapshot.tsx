import ReactDOM from "react-dom";

import boardCss from "../css/Board.css?raw";
import packageCss from "../css/Package.css?raw";
import {PackageComponent} from "../logic/PackageComponent";
import {badge, element, rasterize, snapshotSize, PADDING} from "./boardSnapshot";
import {ViewBox} from "./Types";

/**
 * A picture of a package symbol, for the file a package or a component is exported as.
 *
 * A component's picture is of its package too, since the symbol is what the user sees of it; the
 * badge is what tells the two files apart.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** The symbol with room around it. */
function symbolBounds(pkg: PackageComponent): ViewBox {
  const box = pkg.geometry.bounds;

  return {
    left: box.left - PADDING,
    top: box.top - PADDING,
    width: box.width + 2 * PADDING,
    height: box.height + 2 * PADDING,
  };
}

/**
 * Remembers the redraw callbacks the package and its pins hold, and hands back a way to put them
 * back — drawing the symbol a second time would otherwise steal them from the dialog showing it.
 */
function captureRedraws(pkg: PackageComponent): () => void {
  const holders: Array<{updateSelf?: () => void}> = [pkg, ...pkg.pins()];
  const saved = holders.map(holder => [holder, holder.updateSelf] as const);

  return () => saved.forEach(([holder, callback]) => {holder.updateSelf = callback});
}

/** Draws the symbol somewhere off the page and hands its markup to the caller. */
function withDrawnSymbol<T>(pkg: PackageComponent, take: (drawn: SVGSVGElement) => T): T {
  const restore = captureRedraws(pkg);
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:600px";
  document.body.appendChild(container);

  try {
    ReactDOM.render(<svg className="package-symbol">{pkg.render()}</svg>, container);
    const drawn = container.querySelector("svg.package-symbol");
    if (!drawn) {
      throw new Error("The package could not be drawn.");
    }

    return take(drawn as SVGSVGElement);
  } finally {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    restore();
  }
}

/** The symbol drawn against the box that fits it, badged with what the file holds. */
function symbolSvg(pkg: PackageComponent,
                   bounds: ViewBox,
                   size: {width: number, height: number},
                   label: string): SVGSVGElement {
  return withDrawnSymbol(pkg, drawn => {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("xmlns", SVG_NS);
    svg.setAttribute("viewBox", `${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`);
    svg.setAttribute("width", String(size.width));
    svg.setAttribute("height", String(size.height));

    // Carried as text because an image loaded from a source of its own gets no styles from the page
    // that made it.
    const style = document.createElementNS(SVG_NS, "style");
    style.textContent = `${boardCss}\n${packageCss}`;
    svg.appendChild(style);

    svg.appendChild(element("rect", {
      x: String(bounds.left),
      y: String(bounds.top),
      width: String(bounds.width),
      height: String(bounds.height),
      fill: "lightgray",
    }));

    // A pin stays selected after the dialog that was editing it closes, and that is about what the
    // user was doing rather than what the package is.
    for (const node of drawn.querySelectorAll("g.component")) {
      const copy = node.cloneNode(true) as SVGElement;
      copy.classList.remove("selected");
      copy.querySelectorAll(".selected").forEach(inner => inner.classList.remove("selected"));
      svg.appendChild(copy);
    }
    svg.appendChild(badge(bounds, size, label));

    return svg;
  });
}

/** A PNG of the symbol, fitted to it and badged. */
async function symbolPng(pkg: PackageComponent, label: string): Promise<Uint8Array> {
  const bounds = symbolBounds(pkg);
  const size = snapshotSize(bounds);

  return rasterize(symbolSvg(pkg, bounds, size, label), size);
}

export {symbolBounds, symbolPng, symbolSvg};
