import {downloadBytes, uploadFile} from "./files";
import {loadBoard, parseBoardFile, serializeBoard} from "../logic/boardFile";
import {LogicBoard} from "../logic/LogicBoard";
import {SubComponent} from "../logic/SubComponent";
import {componentFrom, serializeComponentDefinition} from "../logic/componentFile";
import type {ComponentDefinition} from "../logic/ComponentDefinition";
import type {ComponentFileData} from "../logic/componentFile";
import {snapshotPng} from "../util/boardSnapshot";
import {isPng, readChunk, withChunk, BOARD_CHUNK} from "../util/png";
import {sanitizeFileName} from "../util/fileName";

/**
 * A board on its own, outside a project.
 *
 * Exported as a picture of itself with its data carried inside: the file previews as the circuit it
 * holds wherever images preview, and opens as that circuit here. Since projects live in storage the
 * user cannot see, this is also how a board leaves the browser at all.
 */

/**
 * What an exported board is called.
 *
 * The kind is in the name as well as in the file, purely so that a folder of exports can be read at
 * a glance — nothing here relies on it, and a renamed file still opens.
 */
const BOARD_SUFFIX = ".gtsb.png";

/** What the file dialog offers when something exported is being brought back in. */
const IMPORT_ACCEPT = "image/png,.png,application/json,.json";

/**
 * Every component the board uses, and every component those use, written out in full.
 *
 * A board inside a project names its components and finds them there. One that has been exported
 * has left the project, so it takes them with it — otherwise it opens somewhere that has never
 * heard of them and cannot be built at all. Walked to the bottom, since a component made from a
 * board that had components on it names those in turn.
 */
function carriedComponents(board: LogicBoard): ComponentFileData[] {
  const found = new Map<string, ComponentDefinition>();
  const pending = [...board.components.values()]
      .filter((component): component is SubComponent => component instanceof SubComponent)
      .map(component => component.definitionId)
      .filter((id): id is string => Boolean(id));

  while (pending.length > 0) {
    const id = pending.pop()!;
    if (found.has(id)) {
      continue;
    }

    const definition = board.library?.(id);
    if (!definition) {
      continue;
    }

    found.set(id, definition);
    for (const entry of definition.contents.components) {
      if (entry.component) {
        pending.push(entry.component);
      }
    }
  }

  return [...found.values()].map(serializeComponentDefinition);
}

/** The board as it is written down, carrying its components when it has any. */
function boardText(board: LogicBoard): string {
  const carried = carriedComponents(board);
  const data = serializeBoard(board);
  const filed = carried.length > 0 ? {...data, library: carried} : data;

  return `${JSON.stringify(filed, undefined, 2)}\n`;
}

/** The name an exported file is offered under. */
function exportFileName(board: LogicBoard): string {
  return `${sanitizeFileName(board.name, "board")}${BOARD_SUFFIX}`;
}

/**
 * Hands the user a picture of the board with the board inside it.
 *
 * Returns the name it was offered under. The browser decides where a download lands, so there is no
 * location to remember and nothing to save back to afterwards.
 */
async function exportBoard(board: LogicBoard): Promise<string> {
  const image = await snapshotPng(board);
  const data = new TextEncoder().encode(boardText(board));
  const name = exportFileName(board);

  downloadBytes(name, withChunk(image, BOARD_CHUNK, data), "image/png");

  return name;
}

/** What a file is carrying, whether it is a picture holding it or the plain data. */
function carriedText(bytes: Uint8Array): string {
  if (!isPng(bytes)) {
    return new TextDecoder().decode(bytes);
  }

  const carried = readChunk(bytes, BOARD_CHUNK);
  if (!carried) {
    throw new Error("This image does not have anything from Gates in it.");
  }

  return new TextDecoder().decode(carried);
}

/** A board read out of a file, and the components it brought with it. */
interface ImportedBoard {
  board: LogicBoard;
  components: ComponentDefinition[];
}

/**
 * Reads a board out of a file the user chooses.
 *
 * Returns the board, or nothing if they changed their mind. A file that is not a board throws
 * rather than producing half of one.
 */
async function importBoard(): Promise<ImportedBoard | undefined> {
  const picked = await uploadFile(IMPORT_ACCEPT);

  return picked && readBoard(carriedText(picked.bytes));
}

/** The board a file holds, and the components it brought with it. */
function readBoard(text: string): ImportedBoard {
  const data = parseBoardFile(text);
  // Built before the board that names them: an exported board carries its own components, so until
  // these exist there is nothing for it to look them up in.
  const components = (data.library ?? []).map(entry => componentFrom(entry));
  const board = new LogicBoard();
  board.library = id => components.find(made => made.uuid === id);
  loadBoard(board, data);

  return {board, components};
}

export {boardText, carriedText, exportBoard, importBoard, readBoard, IMPORT_ACCEPT};
export type {ImportedBoard};
