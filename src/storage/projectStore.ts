import {v4 as uuidv4} from "uuid";

import {
  canStoreProjects,
  directoryIn,
  fileIn,
  readText,
  requestPersistence,
  root,
  subdirectories,
  writeText,
} from "./opfs";
import {downloadBytes, uploadFile} from "./files";
import {forgetProject, mostRecentProject, readSettings, rememberProject} from "./settings";
import {boardText, carriedText, IMPORT_ACCEPT} from "./boardStore";
import {loadBoard, parseBoardFile} from "../logic/boardFile";
import {LogicBoard} from "../logic/LogicBoard";
import {Project} from "../logic/Project";
import {
  BOARDS_DIRECTORY,
  parseProjectBundle,
  parseProjectFile,
  serializeProject,
  serializeProjectBundle,
  ProjectBundle,
  ProjectData,
} from "../logic/projectFile";
import {snapshotPng} from "../util/boardSnapshot";
import {withChunk, BOARD_CHUNK} from "../util/png";
import {sanitizeFileName} from "../util/fileName";

/**
 * Projects in origin-private storage.
 *
 * A project is a directory named after its id, holding a manifest and a file per board. Names are
 * kept in the manifest rather than used as file names, so renaming anything writes one line instead
 * of moving files about.
 */

/** Where all projects are kept, inside the store. */
const PROJECTS_DIRECTORY = "projects";

/** The manifest, which is what makes a directory a project. */
const MANIFEST = "project.json";

/** Enough of a project to offer opening it. */
interface ProjectSummary {
  id: string;
  name: string;
  /** When it was last open here, if it has been. */
  openedAt?: number;
}

function projects() {
  return root().then(store => directoryIn(store, PROJECTS_DIRECTORY));
}

/** Walks a path from the manifest, refusing one that tries to lead out of the project. */
async function fileAt(home: FileSystemDirectoryHandle, path: string): Promise<FileSystemFileHandle> {
  const parts = path.split("/");
  const name = parts.pop();

  if (!name || parts.some(part => !part || part === "." || part === "..")) {
    throw new Error(`This project names a file outside itself: ${path}`);
  }

  let directory = home;
  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part);
  }

  return directory.getFileHandle(name);
}

/**
 * Writes the manifest and every board beside it.
 *
 * Board files are named by id, so a board that has been renamed overwrites its own file rather than
 * leaving the old one behind.
 */
async function writeInto(project: Project, home: FileSystemDirectoryHandle) {
  const boards = await directoryIn(home, BOARDS_DIRECTORY);

  for (const board of project.boards) {
    await writeText(await fileIn(boards, `${board.id}.json`), boardText(board));
  }

  await writeText(await fileIn(home, MANIFEST),
                  `${JSON.stringify(serializeProject(project), undefined, 2)}\n`);

  project.directory = home;
  rememberProject({id: project.id, name: project.name});
}

/**
 * Writes the project to the store.
 *
 * Persistence is asked for on the way, since a project the browser may reclaim is worth asking
 * about only once there is a project to lose.
 */
async function saveProject(project: Project): Promise<void> {
  if (!canStoreProjects()) {
    throw new Error("This browser cannot store projects.");
  }

  await requestPersistence();
  await writeInto(project, await directoryIn(await projects(), project.id));
}

/**
 * Writes the project as a new one, leaving what was already stored where it was.
 *
 * The project in hand becomes the copy: it takes a new identity and a new name, so what follows is
 * edited in the duplicate rather than in the original.
 */
async function saveProjectAs(project: Project, name: string): Promise<void> {
  project.id = uuidv4();
  project.name = name;
  project.directory = undefined;

  await saveProject(project);
}

/** A project holding these boards, showing them all, named and identified by its manifest. */
function assemble(data: ProjectData, boards: LogicBoard[]): Project {
  const project = new Project(boards[0]);
  project.id = data.id || project.id;
  project.name = data.name;

  // A manifest can name no boards at all, and the editor has to be showing something.
  if (boards.length > 0) {
    project.boards = boards;
    project.openBoardIds = boards.map(board => board.id);
    project.activeBoardId = boards[0].id;
  }

  return project;
}

/**
 * Reads a project directory.
 *
 * Each board takes back the identity its manifest entry gives it, which is what its file is named
 * after: a board that came back as a new board would be written to a new file and leave its old one
 * behind.
 */
async function readProject(home: FileSystemDirectoryHandle): Promise<Project> {
  const data = parseProjectFile(await readText(await home.getFileHandle(MANIFEST)));

  const boards: LogicBoard[] = [];
  for (const entry of data.boards) {
    const board = new LogicBoard();
    loadBoard(board, parseBoardFile(await readText(await fileAt(home, entry.file))));
    board.id = entry.id || board.id;
    boards.push(board);
  }

  const project = assemble(data, boards);
  project.directory = home;
  rememberProject({id: project.id, name: project.name});

  return project;
}

/** Opens a stored project by its id. */
async function openProject(id: string): Promise<Project> {
  return readProject(await (await projects()).getDirectoryHandle(id));
}

/** Every project in the store, most recently opened first and the rest by name. */
async function listProjects(): Promise<ProjectSummary[]> {
  if (!canStoreProjects()) {
    return [];
  }

  const opened = new Map(readSettings().recentProjects.map(p => [p.id, p.openedAt]));

  const found: ProjectSummary[] = [];
  for (const home of await subdirectories(await projects())) {
    try {
      const data = parseProjectFile(await readText(await home.getFileHandle(MANIFEST)));
      found.push({id: data.id || home.name, name: data.name, openedAt: opened.get(data.id)});
    } catch {
      // A directory that is not a readable project is not one to offer.
    }
  }

  return found.sort((a, b) =>
      (b.openedAt ?? 0) - (a.openedAt ?? 0) || a.name.localeCompare(b.name));
}

/**
 * Reopens whatever was open last.
 *
 * A project that is no longer in the store is dropped from the recent list rather than being
 * offered again.
 */
async function reopenLastProject(): Promise<Project | undefined> {
  const recent = mostRecentProject();
  if (!recent || !canStoreProjects()) {
    return undefined;
  }

  try {
    return await openProject(recent.id);
  } catch {
    forgetProject(recent.id);

    return undefined;
  }
}

/** What an exported project is called, and what marks it as one in the picture. */
const PROJECT_SUFFIX = ".gtsp.png";

/**
 * Hands the user the whole project as a picture of its main board.
 *
 * The picture is of the main board because that is what the project looks like; the badge says it
 * is a project, since a board on its own would otherwise look exactly the same.
 */
async function exportProject(project: Project): Promise<string> {
  const image = await snapshotPng(project.mainBoard, `PROJECT · ${project.name}`);
  const bundle = `${JSON.stringify(serializeProjectBundle(project), undefined, 2)}\n`;
  const name = `${sanitizeFileName(project.name, "project")}${PROJECT_SUFFIX}`;

  downloadBytes(name, withChunk(image, BOARD_CHUNK, new TextEncoder().encode(bundle)), "image/png");

  return name;
}

/**
 * The project a file holds.
 *
 * It keeps the identity it was exported under, so bringing back an export of a project that is
 * already stored here saves over that one rather than leaving two of it. Nothing is written until
 * the user saves, so the choice is still theirs.
 */
function projectFromBundle(bundle: ProjectBundle): Project {
  const boards = bundle.boards.map(data => {
    const board = new LogicBoard();
    loadBoard(board, data);

    return board;
  });

  bundle.project.boards.forEach((entry, i) => {
    if (boards[i] && entry.id) {
      boards[i].id = entry.id;
    }
  });

  return assemble(bundle.project, boards);
}

/** Reads a project out of a file the user chooses, or nothing if they change their mind. */
async function importProject(): Promise<Project | undefined> {
  const picked = await uploadFile(IMPORT_ACCEPT);
  if (!picked) {
    return undefined;
  }

  return projectFromBundle(parseProjectBundle(carriedText(picked.bytes)));
}

export {
  exportProject,
  importProject,
  listProjects,
  openProject,
  projectFromBundle,
  readProject,
  reopenLastProject,
  saveProject,
  saveProjectAs,
  writeInto,
  MANIFEST,
};
export type {ProjectSummary};
