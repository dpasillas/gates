import {addComponents, serializeComponents, ComponentSet} from "./boardFile";
import {LogicBoard} from "./LogicBoard";
import {LogicComponent} from "./LogicComponent";
import {ViewBox} from "../util/Types";

/**
 * Copying and pasting part of a board.
 *
 * A copy is a set of components and the wires among them, taken as plain data rather than as a hold
 * on the components themselves. It is therefore a snapshot: moving, editing or deleting what was
 * copied does not change what will be pasted.
 *
 * What travels is the same shape a board file holds, and it is put back by the same code, so a
 * pasted component and a component read out of a file cannot come out different.
 */

/** How far each repeat of a paste is nudged, so that copies do not stack out of sight. */
const CASCADE = 20;

/** Where a paste would land, and how many have already landed there. */
interface PasteAnchor {
  x: number;
  y: number;
  /** How many pastes have already been made here without the point moving. */
  repeat?: number;
}

/**
 * What was copied.
 *
 * Net and port names are left behind. A name is a way of describing a connection, so carrying one
 * over would wire the copy to something outside it — and for an output, which is the net rather
 * than a listener on it, would take that net away from the component it was copied from. The wiring
 * inside the copy survives regardless, being carried as connections in its own right.
 */
function copySelection(board: LogicBoard): ComponentSet | undefined {
  const components = [...board.selectedComponents];
  if (components.length === 0) {
    return undefined;
  }

  const copied = serializeComponents(board, components);

  return {
    ...copied,
    components: copied.components.map(({pins, ...rest}) => rest),
  };
}

/** The middle of what was copied, in the coordinates it was copied from. */
function centreOf(copied: ComponentSet): {x: number, y: number} {
  const xs = copied.components.map(component => component.x);
  const ys = copied.components.map(component => component.y);

  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

/** The middle of what the user is looking at, for a paste with nowhere better to go. */
function centreOfView(view: ViewBox): {x: number, y: number} {
  return {x: view.left + view.width / 2, y: view.top + view.height / 2};
}

/**
 * Where a paste should land.
 *
 * Under the pointer when it is over the board, since that is where the user is pointing. Otherwise
 * in the middle of what they are looking at, which is the best guess available when the paste came
 * from a menu or from the keyboard with the pointer somewhere else entirely.
 */
function pasteAnchor(board: LogicBoard): {x: number, y: number} {
  return board.pointer ?? centreOfView(board.viewBox);
}

/**
 * Puts a copy on the board, centred on the anchor.
 *
 * Repeats at an anchor that has not moved are stepped along, so that pasting twice without pointing
 * somewhere new leaves two copies rather than one on top of another.
 *
 * The pasted components become the selection, so that what was just put down is what moves next.
 */
function pasteInto(board: LogicBoard, copied: ComponentSet, anchor: PasteAnchor): LogicComponent[] {
  const from = centreOf(copied);
  const step = CASCADE * (anchor.repeat ?? 0);
  const dx = anchor.x + step - from.x;
  const dy = anchor.y + step - from.y;

  const placed = addComponents(board, {
    ...copied,
    components: copied.components.map(component => ({
      ...component,
      x: component.x + dx,
      y: component.y + dy,
    })),
  });

  board.clearSelection();
  for (const component of placed) {
    component.selected = true;
    board.selectedComponents.add(component);
  }
  board.invalidateSelectionPivot();
  board.update();
  board.updateProperties();

  return placed;
}

/**
 * Copies the selection and puts the copy down beside it, leaving the clipboard alone.
 *
 * Beside rather than under the pointer: duplicating is about making another one of these, here,
 * where pasting is about putting something down where you are pointing.
 */
function duplicateSelection(board: LogicBoard): LogicComponent[] {
  const copied = copySelection(board);
  if (!copied) {
    return [];
  }

  return pasteInto(board, copied, {...centreOf(copied), repeat: 1});
}

export {centreOfView, copySelection, duplicateSelection, pasteAnchor, pasteInto, CASCADE};
export type {PasteAnchor};
