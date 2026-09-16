import {v4 as uuidv4} from "uuid";

import {downloadBytes, uploadFile} from "./files";
import {carriedText, IMPORT_ACCEPT} from "./boardStore";
import {componentFrom, parseComponentFile, serializeComponentDefinition}
    from "../logic/componentFile";
import type {ComponentDefinition} from "../logic/ComponentDefinition";
import type {ComponentFileData} from "../logic/componentFile";
import type {Project} from "../logic/Project";
import {sanitizeFileName} from "../util/fileName";
import {symbolPng} from "../util/packageSnapshot";
import {withChunk, BOARD_CHUNK} from "../util/png";

/**
 * A component on its own, outside a project.
 *
 * Exported as a picture of its package's symbol with its data carried inside, as a board is. A
 * component already holds its board and its package, so the data is nearly self-contained; the one
 * thing it can name without carrying is another component placed on its board, and an export takes
 * those along the way an exported board does.
 */

/** The kind is in the name so a folder of exports can be read at a glance; nothing relies on it. */
const COMPONENT_SUFFIX = ".gtsc.png";

/**
 * Every component placed inside this one, and inside those, in full.
 *
 * Walked from the project rather than from a board: a definition's contents name their components,
 * and only the project can say what those names mean.
 */
function carriedBy(definition: ComponentDefinition, project: Project): ComponentFileData[] {
  const found = new Map<string, ComponentDefinition>();
  const pending = definition.contents.components
      .map(entry => entry.component)
      .filter((id): id is string => Boolean(id));

  while (pending.length > 0) {
    const id = pending.pop()!;
    if (found.has(id) || id === definition.uuid) {
      continue;
    }

    const inner = project.componentFor(id);
    if (!inner) {
      continue;
    }

    found.set(id, inner);
    for (const entry of inner.contents.components) {
      if (entry.component) {
        pending.push(entry.component);
      }
    }
  }

  return [...found.values()].map(serializeComponentDefinition);
}

/** The component as it is written down, carrying the components it places when it has any. */
function componentText(definition: ComponentDefinition, project: Project): string {
  const carried = carriedBy(definition, project);
  const data = serializeComponentDefinition(definition);
  const filed = carried.length > 0 ? {...data, library: carried} : data;

  return `${JSON.stringify(filed, undefined, 2)}\n`;
}

function exportFileName(definition: ComponentDefinition): string {
  return `${sanitizeFileName(definition.name, "component")}${COMPONENT_SUFFIX}`;
}

/**
 * Hands the user a picture of the component's symbol with the component inside it.
 *
 * Returns the name it was offered under. The badge says it is a component, since a package's
 * picture is of the same symbol.
 */
async function exportComponent(definition: ComponentDefinition, project: Project): Promise<string> {
  const image = await symbolPng(definition.packaging, `COMPONENT · ${definition.name}`);
  const data = new TextEncoder().encode(componentText(definition, project));
  const name = exportFileName(definition);

  downloadBytes(name, withChunk(image, BOARD_CHUNK, data), "image/png");

  return name;
}

/** A component read out of a file, and the components it brought with it. */
interface ImportedComponent {
  definition: ComponentDefinition;
  /** The ones placed inside it, which the project may or may not already hold. */
  components: ComponentDefinition[];
}

/**
 * The component a file holds.
 *
 * Where the project already holds the identity the file names, the read one is a copy under an
 * identity of its own: the user asked for what is in the file, and the component that is already
 * there may be what they mean to compare it with.
 */
function readComponent(text: string, project: Project): ImportedComponent {
  const data = parseComponentFile(text);
  const components = (data.library ?? []).map(entry => componentFrom(entry));
  const taken = project.componentFor(data.id) !== undefined;
  const definition = componentFrom(taken
      ? {...data, id: uuidv4(), name: `${data.name} copy`}
      : data);

  return {definition, components};
}

/** Reads a component out of a file the user chooses, or nothing if they changed their mind. */
async function importComponent(project: Project): Promise<ImportedComponent | undefined> {
  const picked = await uploadFile(IMPORT_ACCEPT);
  if (!picked) {
    return undefined;
  }

  return readComponent(carriedText(picked.bytes), project);
}

export {componentText, exportComponent, importComponent, readComponent, COMPONENT_SUFFIX};
export type {ImportedComponent};
