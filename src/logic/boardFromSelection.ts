import {centreOfView, copySelection, pasteInto} from "./clipboard";
import {LogicBoard} from "./LogicBoard";
import {Project} from "./Project";

/**
 * Makes a board of its own out of part of another one.
 *
 * Where the packaging flow starts: a section of a circuit becomes a board, and a board is what can
 * then be packaged as a component.
 *
 * The section is copied rather than moved. Cutting it out would change what the board it came from
 * does, and the circuit it was taken from is usually still wanted as it stands — the one that has
 * been proved to work — while the copy is what gets pared down into a part.
 *
 * Nothing is made when nothing is selected, rather than an empty board being added that the user
 * then has to take out again.
 */
function createBoardFromSelection(
    project: Project, source: LogicBoard, name: string): LogicBoard | undefined {
  const copied = copySelection(source);
  if (!copied) {
    return undefined;
  }

  const board = project.addBoard(name);
  // Onto the middle of the new board's view rather than the coordinates it was copied from, which
  // may be nowhere near what a board fresh out of the box is looking at.
  pasteInto(board, copied, centreOfView(board.viewBox));

  return board;
}

export {createBoardFromSelection};
