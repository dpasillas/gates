import {Project} from "./Project";
import {parseBoardFile, serializeBoard, BoardData} from "./boardFile";

/** Tag every project manifest carries, so that a file of some other kind is rejected as one. */
const PROJECT_FORMAT = "gates.project";
/** Raised whenever the shape of the manifest changes. */
const PROJECT_FORMAT_VERSION = 1;

/** The directory boards are kept in, relative to the project. */
const BOARDS_DIRECTORY = "boards";

/** One file the project is made of. */
interface ProjectEntry {
  /** Which thing it is. Also what its file is named, so renaming it moves nothing. */
  id: string;
  /** What the thing in the file calls itself. */
  name: string;
  /** Where the file is, relative to the project directory, with forward slashes. */
  file: string;
}

/**
 * The manifest.
 *
 * A list of the project's files rather than their contents: each is its own file on disk, so that
 * two people working on different boards are not editing the same one.
 */
interface ProjectData {
  format: typeof PROJECT_FORMAT;
  version: number;
  id: string;
  name: string;
  boards: ProjectEntry[];
  /** Empty until boards can be packaged as components. */
  components: ProjectEntry[];
  /** Empty until interfaces exist. */
  interfaces: ProjectEntry[];
  /** Empty until the testbench exists. */
  tests: ProjectEntry[];
}

function boardEntry(id: string, name: string): ProjectEntry {
  return {id, name, file: `${BOARDS_DIRECTORY}/${id}.json`};
}

function serializeProject(project: Project): ProjectData {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_FORMAT_VERSION,
    id: project.id,
    name: project.name,
    boards: project.boards.map(board => boardEntry(board.id, board.name)),
    components: [],
    interfaces: [],
    tests: [],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEntry(value: unknown): value is ProjectEntry {
  return isObject(value)
      && typeof value.id === "string"
      && typeof value.name === "string"
      && typeof value.file === "string";
}

function entries(value: unknown): ProjectEntry[] {
  return Array.isArray(value) ? value.filter(isEntry) : [];
}

/**
 * Reads a manifest, refusing anything that is not one.
 *
 * The lists that are always empty for now are still read, so that a project written by a build that
 * has them keeps them when this one writes it back out.
 */
function parseProjectFile(text: string): ProjectData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This is not a project: its manifest is not valid JSON.");
  }

  if (!isObject(parsed) || parsed.format !== PROJECT_FORMAT) {
    throw new Error("This is not a Gates project.");
  }
  if (parsed.version !== PROJECT_FORMAT_VERSION) {
    throw new Error(`This project was written by a different version of Gates ` +
        `(file version ${parsed.version}).`);
  }

  return {
    format: PROJECT_FORMAT,
    version: PROJECT_FORMAT_VERSION,
    id: typeof parsed.id === "string" ? parsed.id : "",
    name: typeof parsed.name === "string" ? parsed.name : "Untitled Project",
    boards: entries(parsed.boards),
    components: entries(parsed.components),
    interfaces: entries(parsed.interfaces),
    tests: entries(parsed.tests),
  };
}

/** Tag a whole project carries when it travels as one file. */
const PROJECT_BUNDLE_FORMAT = "gates.project.bundle";
const PROJECT_BUNDLE_VERSION = 1;

/**
 * A project gathered into a single value.
 *
 * The stored form keeps each board in its own file, which is what makes a project readable and
 * mergeable. Leaving the app it has to be one thing to hand over, so the manifest and the boards
 * it names travel together.
 */
interface ProjectBundle {
  format: typeof PROJECT_BUNDLE_FORMAT;
  version: number;
  project: ProjectData;
  boards: BoardData[];
}

function serializeProjectBundle(project: Project): ProjectBundle {
  return {
    format: PROJECT_BUNDLE_FORMAT,
    version: PROJECT_BUNDLE_VERSION,
    project: serializeProject(project),
    boards: project.boards.map(serializeBoard),
  };
}

/** Reads a bundled project, refusing anything that is not one. */
function parseProjectBundle(text: string): ProjectBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This is not a project: it is not valid JSON.");
  }

  if (!isObject(parsed) || parsed.format !== PROJECT_BUNDLE_FORMAT) {
    throw new Error("This file is not a Gates project.");
  }
  if (parsed.version !== PROJECT_BUNDLE_VERSION) {
    throw new Error(`This project was written by a different version of Gates ` +
        `(file version ${parsed.version}).`);
  }
  if (!Array.isArray(parsed.boards)) {
    throw new Error("This project is damaged: it is missing its boards.");
  }

  return {
    format: PROJECT_BUNDLE_FORMAT,
    version: PROJECT_BUNDLE_VERSION,
    project: parseProjectFile(JSON.stringify(parsed.project)),
    boards: parsed.boards.map(board => parseBoardFile(JSON.stringify(board))),
  };
}

export {
  parseProjectBundle,
  parseProjectFile,
  serializeProject,
  serializeProjectBundle,
  BOARDS_DIRECTORY,
};
export type {ProjectBundle, ProjectData, ProjectEntry};
