import {v4 as uuidv4} from "uuid";

import {LogicBoard} from "./LogicBoard";
import {PackageComponent} from "./PackageComponent";
import {SubComponent} from "./SubComponent";
import {digest} from "./hash";
import {serializeComponents} from "./boardFile";
import {copyOf} from "./packageFile";
import type {ComponentSet} from "./boardFile";

/**
 * A package bound to a board: the thing a user places.
 *
 * It holds its board and its package rather than pointing at them. A component is a contract, and a
 * contract that changes underneath whoever is holding it is not one — so a saved component is
 * always internally consistent, with no broken state to represent and no guarded editing of the
 * boards it was built from. Costing nothing in size is what makes that affordable: placements
 * reference the component, so there is one copy per component rather than one per placement.
 *
 * Falling behind is what happens instead of breaking. What it was built from is recorded by
 * identity and by content, so the project can say the board or the package has moved on since; a
 * refresh takes a new copy when the user asks for one, and never on its own.
 */

/** Which board port one pin of the package answers to. */
interface PortBinding {
  /** The port's name on the board. */
  port: string;
  /**
   * Which channel of it, for a pin narrower than the port it is bound to.
   *
   * Absent takes the whole port, which is what a pin as wide as the port does.
   */
  channel?: number;
}

/**
 * What the component was built from.
 *
 * Identity says which board and package; content says which version of them. Neither is used to
 * find anything the component needs to run — it carries all of that — so a source that has been
 * deleted or was never in this project costs the component nothing.
 */
interface DefinitionSource {
  boardId: string;
  /** What that board was called, so the copy can be named when it is taken back out. */
  boardName: string;
  boardHash: string;
  packageId: string;
  packageHash: string;
}

/**
 * Where a placement finds the component it names.
 *
 * A placement refers to its component by id rather than carrying it, because the two are in one
 * project and travel together. Only the component itself holds copies, and only of the board and
 * package outside the project's component list.
 */
type ComponentLibrary = (id: string) => ComponentDefinition | undefined;

/** How a component stands to what it was built from. */
type Linkage =
    /** Nothing it was built from has moved on. */
    "current"
    /** The board or the package has changed since. A refresh takes the new one. */
    | "stale";

class ComponentDefinition {
  /** Identity that survives renaming. What a placement refers to. */
  uuid: string = uuidv4();

  /** What the parts panel and the project panel call it. */
  name: string;

  /** The symbol and the contract, copied. */
  packaging: PackageComponent;

  /** The board's parts and wiring, copied. */
  contents: ComponentSet;

  /** Which port answers to each package pin, by the pin's uuid. */
  binding: Map<string, PortBinding>;

  source: DefinitionSource;

  constructor(params: {
    name: string,
    packaging: PackageComponent,
    contents: ComponentSet,
    binding?: Map<string, PortBinding>,
    source: DefinitionSource,
    uuid?: string,
  }) {
    this.name = params.name;
    this.packaging = params.packaging;
    this.contents = params.contents;
    this.binding = params.binding ?? new Map();
    this.source = params.source;
    this.uuid = params.uuid ?? this.uuid;
  }

  /**
   * What each package pin is called on the board inside.
   *
   * The shape {@link SubComponent} wants: it knows its pins and needs the port each one answers to.
   */
  get ports(): Map<string, string> {
    return new Map([...this.binding].map(([pin, bound]) => [pin, bound.port]));
  }

  /** Package pins with no port bound to them, which is what makes a component incomplete. */
  get unbound(): string[] {
    return this.packaging.declared
        .filter(pin => !this.binding.get(pin.uuid)?.port)
        .map(pin => pin.label || "unnamed pin");
  }
}

/**
 * The digest a board is known by.
 *
 * Over what the board is made of, which is the same thing a component holds a copy of — not over
 * its file, which also carries the board's name. Renaming a board changes nothing about what a
 * component built from it does, and marking every one of them as behind for it would be noise.
 */
function boardHash(board: LogicBoard): string {
  return digest(JSON.stringify(serializeComponents(board, [...board.components.values()])));
}

/**
 * Takes the copy.
 *
 * The package is copied rather than referenced for the same reason the board is: an author who goes
 * back to the package editor afterwards is editing the project's package, not this component's.
 */
function defineComponent(params: {
  name?: string,
  /** The identity being redefined, when this is an edit of a component the project holds. */
  uuid?: string,
  board: LogicBoard,
  packaging: PackageComponent,
  binding?: Map<string, PortBinding>,
  /**
   * The copy of the board to keep rather than take afresh.
   *
   * Renaming a component, or binding it differently, is not a reason to take a new copy of the
   * board behind it — that is what a refresh is for, and it is asked for on its own.
   */
  held?: {contents: ComponentSet, boardHash: string},
}): ComponentDefinition {
  const packaging = copyOf(params.packaging);

  const made = new ComponentDefinition({
    uuid: params.uuid,
    name: params.name ?? (params.packaging.name || params.board.name),
    packaging,
    contents: params.held?.contents
        ?? serializeComponents(params.board, [...params.board.components.values()]),
    binding: params.binding ?? bindByName(packaging, params.board),
    source: {
      boardId: params.board.id,
      boardName: params.board.name,
      boardHash: params.held?.boardHash ?? boardHash(params.board),
      packageId: params.packaging.uuid,
      packageHash: params.packaging.interfaceHash,
    },
  });
  if (containsItself(made, id => params.board.library?.(id))) {
    throw new Error(`${params.board.name} has this component on it, so building from it would `
        + `make the component contain itself.`);
  }

  return made;
}

/**
 * Whether a component's contents reach a placement of it, however deep.
 *
 * Such a component resolves to itself for ever, so one is never allowed to exist: not built, not
 * read from a file. The lookup says what the names inside it mean, which depends on where it is
 * being judged — a project's components, or the ones a file brought along.
 */
function containsItself(definition: ComponentDefinition,
                        lookup: (id: string) => ComponentDefinition | undefined): boolean {
  const seen = new Set<string>();
  const pending = definition.contents.components
      .map(entry => entry.component)
      .filter((named): named is string => Boolean(named));

  while (pending.length > 0) {
    const at = pending.pop()!;
    if (at === definition.uuid) {
      return true;
    }
    if (seen.has(at)) {
      continue;
    }

    seen.add(at);
    for (const entry of lookup(at)?.contents.components ?? []) {
      if (entry.component) {
        pending.push(entry.component);
      }
    }
  }

  return false;
}

/**
 * Whether a board already holds a placement of this component, however deep.
 *
 * What stops a component being built on a board that uses it. Placing one is harmless — a component
 * carries a copy of its board, and that copy has no placement in it — but a component whose board
 * holds one of itself resolves to itself for ever the moment it is built.
 */
function usesComponent(board: LogicBoard, id: string): boolean {
  const seen = new Set<string>();
  const pending = [...board.components.values()]
      .filter((component): component is SubComponent => component instanceof SubComponent)
      .map(component => component.definitionId)
      .filter((named): named is string => Boolean(named));

  while (pending.length > 0) {
    const at = pending.pop()!;
    if (at === id) {
      return true;
    }
    if (seen.has(at)) {
      continue;
    }

    seen.add(at);
    for (const entry of board.library?.(at)?.contents.components ?? []) {
      if (entry.component) {
        pending.push(entry.component);
      }
    }
  }

  return false;
}

/**
 * The obvious binding: every pin to the port sharing its name.
 *
 * What **auto** produces, and the starting point the binding dialog offers for a package the user
 * chose. Pins whose name matches no port are left unbound rather than guessed at.
 */
function bindByName(packaging: PackageComponent, board: LogicBoard): Map<string, PortBinding> {
  const names = new Set(
      [...board.pins.values()].filter(pin => pin.isPort).map(pin => pin.portName));

  return new Map(packaging.declared
      .filter(pin => pin.label && names.has(pin.label))
      .map(pin => [pin.uuid, {port: pin.label!}]));
}

/**
 * How the component stands to the project it is in.
 *
 * Judged only on what the project actually holds. A source it does not — a packaging derived by
 * **auto**, which belongs to the component rather than to the project, or a board since deleted —
 * cannot have moved on, so it says nothing either way rather than making the whole component
 * unreadable.
 *
 * Compares digests for now. That is a placeholder and a coarse one — it cannot say what changed,
 * and it is tripped by moving a part, which is the most common edit anyone makes. What it should
 * become is the board raising the mark when an action that could break the binding is saved.
 */
function linkage(definition: ComponentDefinition,
                 project: {boards: LogicBoard[], packages: PackageComponent[]}): Linkage {
  const board = project.boards.find(other => other.id === definition.source.boardId);
  const packaging = project.packages.find(other => other.uuid === definition.source.packageId);
  const moved = (board && boardHash(board) !== definition.source.boardHash)
      || (packaging && packaging.interfaceHash !== definition.source.packageHash);

  return moved ? "stale" : "current";
}

export {
  ComponentDefinition,
  bindByName,
  boardHash,
  containsItself,
  defineComponent,
  linkage,
  usesComponent,
};
export type {ComponentLibrary, DefinitionSource, Linkage, PortBinding};
