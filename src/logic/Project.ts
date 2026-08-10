import {v4 as uuidv4} from "uuid";

import {LogicBoard} from "./LogicBoard";

/** What a project is called before it has been given a name of its own. */
const UNTITLED_PROJECT = "Untitled Project";

/**
 * Everything the user is working on, and where it is kept.
 *
 * A project is a directory of files with a manifest listing them. Boards are the only kind of file
 * so far; components, interfaces and tests join them later, which is why the manifest names them
 * separately rather than keeping one undifferentiated list.
 */
class Project {
  /**
   * Identity that survives being renamed or moved.
   *
   * Written into the manifest, and used as the name of the directory the project is stored in, so
   * that renaming a project moves nothing.
   */
  id: string = uuidv4();

  /**
   * What the project calls itself.
   *
   * Not required to match anything on disk: files are named by identity, and this is only what the
   * user sees.
   */
  name: string = UNTITLED_PROJECT;

  /** The boards in the project, in the order the panel lists them. */
  boards: LogicBoard[];

  /**
   * The boards with an editor tab open, in tab order.
   *
   * Which boards are open is about what the user is doing rather than what the project holds, so it
   * is not written to the manifest.
   */
  openBoardIds: string[];

  /** Which tab is in front. */
  activeBoardId: string;

  /** Where the project is stored, once it has been written. */
  directory?: FileSystemDirectoryHandle;

  constructor(board: LogicBoard = new LogicBoard()) {
    this.boards = [board];
    this.openBoardIds = [board.id];
    this.activeBoardId = board.id;
  }

  /**
   * The board being edited.
   *
   * Falls back to the first rather than returning nothing: the editor always has a board, and a
   * missing active id means the one it pointed at has gone.
   */
  get activeBoard(): LogicBoard {
    return this.boards.find(board => board.id === this.activeBoardId) ?? this.boards[0];
  }

  /**
   * The board the project is named for, shown as MAIN and used for its picture.
   *
   * The first one, which is the one a new project starts with.
   */
  get mainBoard(): LogicBoard {
    return this.boards[0];
  }

  /** The boards with a tab open, in tab order. */
  openBoards(): LogicBoard[] {
    return this.openBoardIds
        .map(id => this.boards.find(board => board.id === id))
        .filter((board): board is LogicBoard => board !== undefined);
  }

  /** Whether the project has a place in storage to be saved back to. */
  get saved(): boolean {
    return this.directory !== undefined;
  }

  /** Brings a board to the front, opening a tab for it if it has none. */
  show(board: LogicBoard) {
    if (!this.openBoardIds.includes(board.id)) {
      this.openBoardIds = [...this.openBoardIds, board.id];
    }
    this.activeBoardId = board.id;
  }

  /** Adds a board to the project and shows it. */
  addBoard(name: string, board: LogicBoard = new LogicBoard()): LogicBoard {
    board.name = name;
    this.boards.push(board);
    this.show(board);

    return board;
  }

  /**
   * Closes a board's tab, leaving the board in the project.
   *
   * The last tab stays open: the editor has nothing to show without one, and a board that is in the
   * project but not on screen is what the project panel is for.
   */
  closeBoard(board: LogicBoard) {
    if (this.openBoardIds.length < 2) {
      return;
    }

    const at = this.openBoardIds.indexOf(board.id);
    this.openBoardIds = this.openBoardIds.filter(id => id !== board.id);

    if (this.activeBoardId === board.id) {
      // The neighbour on the side the closed tab came from, which is where the eye already is.
      this.activeBoardId = this.openBoardIds[Math.min(at, this.openBoardIds.length - 1)];
    }
  }

  /**
   * Moves a tab to a place in the row, in the order the user drags them into.
   *
   * The index counts the other tabs, the moved one having been lifted out of the row first, which
   * is the position the gap opened for it appears at.
   *
   * Tab order is only tab order: it says nothing about which board the project is named for, so the
   * panel's list and the main board are left where they are.
   */
  moveTabTo(moved: LogicBoard, index: number) {
    if (!this.openBoardIds.includes(moved.id)) {
      return;
    }

    const ids = this.openBoardIds.filter(id => id !== moved.id);
    ids.splice(Math.min(Math.max(index, 0), ids.length), 0, moved.id);
    this.openBoardIds = ids;
  }

  /** Whether a board can be taken out of the project. */
  canRemove(board: LogicBoard): boolean {
    return board.id !== this.mainBoard.id;
  }

  /**
   * Takes a board out of the project entirely.
   *
   * The main board stays: it is what the project is named for and what its picture is of. Removing
   * the last board with a tab open would leave the editor with nothing to show, so the main board
   * is opened to take its place.
   */
  removeBoard(board: LogicBoard) {
    if (!this.canRemove(board)) {
      return;
    }

    const at = this.openBoardIds.indexOf(board.id);
    this.boards = this.boards.filter(other => other.id !== board.id);
    this.openBoardIds = this.openBoardIds.filter(id => id !== board.id);

    if (this.openBoardIds.length === 0) {
      this.openBoardIds = [this.mainBoard.id];
    }
    if (this.activeBoardId === board.id) {
      const next = Math.min(Math.max(at, 0), this.openBoardIds.length - 1);
      this.activeBoardId = this.openBoardIds[next];
    }
  }
}

export {Project};
