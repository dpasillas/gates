import * as paper from "paper";

import {GLOBAL_SCOPE} from "../Constants";
import {ComponentDefinition} from "./ComponentDefinition";
import {packageFrom, parsePackageFile, serializePackage} from "./packageFile";
import type {PackageData} from "./packageFile";
import type {ComponentSet} from "./boardFile";
import type {DefinitionSource, PortBinding} from "./ComponentDefinition";

/** Tag every component file carries, so that a file of some other kind is rejected as one. */
const COMPONENT_FORMAT = "gates.component";
/** Raised whenever the shape of what is being read changes. */
const COMPONENT_FORMAT_VERSION = 1;

/** One package pin and the board port it answers to. */
interface BindingData {
  /** The package pin's id, which is what survives the pin being renamed or moved. */
  pin: string;
  port: string;
  channel?: number;
}

/**
 * A component as it is written down.
 *
 * Named for the file rather than for the thing, since a *placed* component's row in a board file is
 * its own shape and goes by `ComponentData`.
 *
 * The package and the board's contents are here in full rather than named: a component holds what
 * it was built from, so a saved one can never find its board changed underneath it. `source` says
 * where the copies came from, which is only ever used to offer a refresh.
 */
interface ComponentFileData {
  format: typeof COMPONENT_FORMAT;
  version: number;
  id: string;
  name: string;
  packaging: PackageData;
  contents: ComponentSet;
  binding: BindingData[];
  source: DefinitionSource;
  /**
   * The components placed on this one's board, in full.
   *
   * Written when a component leaves its project on its own, and absent inside one — or inside a
   * board's export, which carries every component the board reaches in one flat list.
   */
  library?: ComponentFileData[];
}

function serializeComponentDefinition(definition: ComponentDefinition): ComponentFileData {
  return {
    format: COMPONENT_FORMAT,
    version: COMPONENT_FORMAT_VERSION,
    id: definition.uuid,
    name: definition.name,
    packaging: serializePackage(definition.packaging),
    contents: definition.contents,
    binding: [...definition.binding].map(([pin, bound]) => {
      const data: BindingData = {pin, port: bound.port};
      if (bound.channel !== undefined) {
        data.channel = bound.channel;
      }

      return data;
    }),
    source: definition.source,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** The bindings a file lists, skipping any that names no pin or no port. */
function bindingFrom(value: unknown): Map<string, PortBinding> {
  if (!Array.isArray(value)) {
    return new Map();
  }

  const binding = new Map<string, PortBinding>();
  for (const entry of value) {
    if (!isObject(entry) || !text(entry.pin) || !text(entry.port)) {
      continue;
    }

    binding.set(text(entry.pin), typeof entry.channel === "number"
        ? {port: text(entry.port), channel: entry.channel}
        : {port: text(entry.port)});
  }

  return binding;
}

function sourceFrom(value: unknown): DefinitionSource {
  const from = isObject(value) ? value : {};

  return {
    boardId: text(from.boardId),
    boardName: text(from.boardName, "board"),
    boardHash: text(from.boardHash),
    packageId: text(from.packageId),
    packageHash: text(from.packageHash),
  };
}

/** What a file says it holds, or nothing when it holds no parts at all. */
function contentsFrom(value: unknown): ComponentSet {
  const from = isObject(value) ? value : {};

  return {
    components: Array.isArray(from.components) ? from.components : [],
    connections: Array.isArray(from.connections) ? from.connections : [],
  };
}

function componentFrom(data: ComponentFileData,
                       scope: paper.PaperScope = GLOBAL_SCOPE): ComponentDefinition {
  return new ComponentDefinition({
    uuid: data.id,
    name: data.name,
    packaging: packageFrom(data.packaging, scope),
    contents: contentsFrom(data.contents),
    binding: bindingFrom(data.binding),
    source: sourceFrom(data.source),
  });
}

/** Reads a component file, refusing anything that is not one. */
function parseComponentFile(input: string): ComponentFileData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("This is not a component: it is not valid JSON.");
  }

  if (!isObject(parsed) || parsed.format !== COMPONENT_FORMAT) {
    throw new Error("This file is not a Gates component.");
  }
  if (parsed.version !== COMPONENT_FORMAT_VERSION) {
    throw new Error(`This component was written by a different version of Gates ` +
        `(file version ${parsed.version}).`);
  }
  if (!isObject(parsed.packaging)) {
    throw new Error("This component is damaged: it is missing its packaging.");
  }

  const data: ComponentFileData = {
    format: COMPONENT_FORMAT,
    version: COMPONENT_FORMAT_VERSION,
    id: text(parsed.id),
    name: text(parsed.name, "untitled"),
    packaging: parsePackageFile(JSON.stringify(parsed.packaging)),
    contents: contentsFrom(parsed.contents),
    binding: Array.isArray(parsed.binding) ? parsed.binding as BindingData[] : [],
    source: sourceFrom(parsed.source),
  };
  if (Array.isArray(parsed.library)) {
    // Each checked as a file of its own, so a damaged passenger is refused in the same words as
    // one arriving alone.
    data.library = parsed.library.map(entry => parseComponentFile(JSON.stringify(entry)));
  }

  return data;
}

export {
  componentFrom,
  parseComponentFile,
  serializeComponentDefinition,
  COMPONENT_FORMAT,
};
export type {BindingData, ComponentFileData};
