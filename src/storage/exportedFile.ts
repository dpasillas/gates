import {uploadFile} from "./files";
import {carriedText, readBoard, IMPORT_ACCEPT} from "./boardStore";
import {readComponent} from "./componentStore";
import {readPackage} from "./packageStore";
import {projectFromBundle} from "./projectStore";
import {BOARD_FORMAT} from "../logic/boardFile";
import {COMPONENT_FORMAT} from "../logic/componentFile";
import {PACKAGE_FORMAT} from "../logic/packageFile";
import {parseProjectBundle, PROJECT_BUNDLE_FORMAT} from "../logic/projectFile";
import type {ImportedBoard} from "./boardStore";
import type {ImportedComponent} from "./componentStore";
import type {PackageComponent} from "../logic/PackageComponent";
import type {Project} from "../logic/Project";

/**
 * Whatever Gates exported, brought back in.
 *
 * Every export says what it is in its data, so one door serves all of them: the project panel's
 * Import asks for a file and finds out what kind it was afterwards, rather than asking the user to
 * know first.
 */

type Imported =
    | {kind: "board"} & ImportedBoard
    | {kind: "component"} & ImportedComponent
    | {kind: "package", pkg: PackageComponent}
    | {kind: "project", project: Project};

/** What a file says it is, or nothing where it does not say. */
function formatOf(text: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(text);

    return typeof parsed === "object" && parsed !== null
        ? (parsed as {format?: unknown}).format as string | undefined
        : undefined;
  } catch {
    return undefined;
  }
}

/** Reads whichever kind of thing the text holds, refusing anything Gates did not write. */
function readExported(text: string, project: Project): Imported {
  switch (formatOf(text)) {
    case BOARD_FORMAT:
      return {kind: "board", ...readBoard(text)};
    case COMPONENT_FORMAT:
      return {kind: "component", ...readComponent(text, project)};
    case PACKAGE_FORMAT:
      return {kind: "package", pkg: readPackage(text, project)};
    case PROJECT_BUNDLE_FORMAT:
      return {kind: "project", project: projectFromBundle(parseProjectBundle(text))};
    default:
      throw new Error("This file is not something Gates exported.");
  }
}

/** Reads an export out of a file the user chooses, or nothing if they changed their mind. */
async function importExported(project: Project): Promise<Imported | undefined> {
  const picked = await uploadFile(IMPORT_ACCEPT);

  return picked && readExported(carriedText(picked.bytes), project);
}

export {importExported, readExported};
export type {Imported};
