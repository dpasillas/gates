/**
 * Handing the browser something to show under the cursor during a drag.
 *
 * `setDragImage` photographs an element as the page has it laid out, so an element the page never
 * paints yields no image at all — one parked off-screen, or clipped away by a panel's overflow, is
 * photographed as nothing. The copy therefore goes on the body, inside the viewport, behind
 * everything the app draws.
 *
 * The photograph is taken during the `setDragImage` call, so the copy can be taken away as soon as
 * that returns.
 */

function parkForDragImage<T extends HTMLElement | SVGElement>(node: T): T {
  node.style.position = "fixed";
  node.style.top = "0";
  node.style.left = "0";
  node.style.zIndex = "-1";
  node.style.pointerEvents = "none";
  document.body.appendChild(node);

  return node;
}

/** Takes the copy away, once the browser has had its picture. */
function releaseDragImage(node: Element) {
  window.setTimeout(() => node.remove(), 0);
}

export {parkForDragImage, releaseDragImage};
