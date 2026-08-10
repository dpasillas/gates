import {LogicComponent} from "../logic/LogicComponent";
import {parkForDragImage} from "./dragImage";

/** Blank space left around a component in its parts-panel preview. */
const PREVIEW_PADDING = 2;

interface Hotspot {
  readonly x: number;
  readonly y: number;
}

/**
 * Where the cursor sits within a part's drag image, in pixels from the preview's top-left.
 *
 * The preview draws the component at its natural size, so board units and pixels agree, but its
 * origin is the padded corner of the component's bounds rather than the board origin. The hotspot
 * is the point the drop will place the component by — the centre of its body — expressed in that
 * frame, so the ghost under the cursor sits exactly where the component will land.
 */
function dragImageHotspot(component: LogicComponent): Hotspot {
  const {left, top} = component.geometry.bounds;
  const anchor = component.geometry.position;

  return {
    x: anchor.x - left + PREVIEW_PADDING,
    y: anchor.y - top + PREVIEW_PADDING,
  };
}

/**
 * A copy of a part's drawing at its natural size, put where the browser will actually draw it.
 */
function makeDragGhost(drawing: SVGSVGElement, width: number, height: number): SVGSVGElement {
  const ghost = drawing.cloneNode(true) as SVGSVGElement;

  ghost.setAttribute("width", String(width));
  ghost.setAttribute("height", String(height));

  return parkForDragImage(ghost);
}

export {dragImageHotspot, makeDragGhost, PREVIEW_PADDING};
export type {Hotspot};
