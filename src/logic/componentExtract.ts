import {v4 as uuidv4} from "uuid";

import {LogicBoard} from "./LogicBoard";
import {PackageComponent} from "./PackageComponent";
import {Project} from "./Project";
import {addComponents} from "./boardFile";
import {copyOf} from "./packageFile";
import type {ComponentDefinition} from "./ComponentDefinition";

/**
 * Taking back out what a component holds.
 *
 * A component carries copies of the board and the package it was built from, which is what makes it
 * a whole thing and what leaves those copies unreachable. Extracting puts one back in the project as
 * something of its own, so it can be looked at and edited the ordinary way.
 *
 * Whether that is a restore or a copy is decided by the project rather than asked about. A component
 * whose board the project no longer has — one that arrived with an imported board, or whose board
 * was deleted — gets it back under the identity it names, and is bound to it again with nothing
 * further to do. One whose board is still there is being forked, and the copy takes an identity of
 * its own: quietly repointing a working component because someone wanted a look would be worse than
 * the extra step of choosing it.
 */

/** Whether the project is missing the thing this names, which is what makes taking it out a restore. */
function restoring(taken: string[], id: string): boolean {
  return !taken.includes(id);
}

/** A name that says the copy is one, for a thing the project already has under that name. */
function copyName(name: string): string {
  return `${name} copy`;
}

/**
 * Puts the board a component holds into the project under the given name, and shows it.
 *
 * The name is the caller's, since the project may already have a board going by the one recorded
 * here and telling them apart is the point. The identity is not: it is reused where the project has
 * lost the board, which is what makes that case a restore.
 *
 * Pointed at the project's components before it is filled: the copy may itself hold placements, and
 * those name the components they were built from rather than carrying them.
 */
function extractBoard(definition: ComponentDefinition, project: Project,
                      name: string): LogicBoard {
  const back = restoring(project.boards.map(board => board.id), definition.source.boardId);
  const board = new LogicBoard();
  if (back) {
    board.id = definition.source.boardId;
  }

  project.adopt(board);
  addComponents(board, definition.contents);
  // Brought up from power-up rather than from whatever the wiring above propagated, which is what
  // makes an extracted board equivalent to the same one opened from a file.
  board.stopSimulation();

  return project.addBoard(name.trim() || definition.source.boardName, board);
}

/** Puts the packaging a component holds into the project. */
function extractPackage(definition: ComponentDefinition, project: Project): PackageComponent {
  const back = restoring(project.packages.map(pkg => pkg.uuid), definition.packaging.uuid);
  const pkg = copyOf(definition.packaging);
  if (!back) {
    pkg.uuid = uuidv4();
    pkg.name = copyName(pkg.name);
  }

  return project.addPackage(pkg);
}

export {extractBoard, extractPackage};
