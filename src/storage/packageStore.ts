import {v4 as uuidv4} from "uuid";

import {downloadBytes, uploadFile} from "./files";
import {carriedText, IMPORT_ACCEPT} from "./boardStore";
import {packageFrom, parsePackageFile, serializePackage} from "../logic/packageFile";
import {PackageComponent} from "../logic/PackageComponent";
import type {Project} from "../logic/Project";
import {sanitizeFileName} from "../util/fileName";
import {symbolPng} from "../util/packageSnapshot";
import {withChunk, BOARD_CHUNK} from "../util/png";

/**
 * A package on its own, outside a project.
 *
 * Exported as a picture of its symbol with its data carried inside, as a board is: the file
 * previews as the symbol wherever images preview, and opens as the package here. A package names
 * nothing else, so the data is the package and nothing more.
 */

/** The kind is in the name so a folder of exports can be read at a glance; nothing relies on it. */
const PACKAGE_SUFFIX = ".gtspk.png";

/** The package as it is written down. */
function packageText(pkg: PackageComponent): string {
  return `${JSON.stringify(serializePackage(pkg), undefined, 2)}\n`;
}

function exportFileName(pkg: PackageComponent): string {
  return `${sanitizeFileName(pkg.name, "package")}${PACKAGE_SUFFIX}`;
}

/**
 * Hands the user a picture of the symbol with the package inside it.
 *
 * Returns the name it was offered under. The badge says it is a package, since a component's
 * picture is of the same symbol.
 */
async function exportPackage(pkg: PackageComponent): Promise<string> {
  const image = await symbolPng(pkg, `PACKAGE · ${pkg.name}`);
  const data = new TextEncoder().encode(packageText(pkg));
  const name = exportFileName(pkg);

  downloadBytes(name, withChunk(image, BOARD_CHUNK, data), "image/png");

  return name;
}

/**
 * The package a file holds.
 *
 * Where the project already holds the identity the file names, the read one is a copy under an
 * identity of its own, as with a component.
 */
function readPackage(text: string, project: Project): PackageComponent {
  const data = parsePackageFile(text);
  const taken = project.packages.some(other => other.uuid === data.id);

  return packageFrom(taken ? {...data, id: uuidv4(), name: `${data.name} copy`} : data);
}

/** Reads a package out of a file the user chooses, or nothing if they changed their mind. */
async function importPackage(project: Project): Promise<PackageComponent | undefined> {
  const picked = await uploadFile(IMPORT_ACCEPT);
  if (!picked) {
    return undefined;
  }

  return readPackage(carriedText(picked.bytes), project);
}

export {exportPackage, importPackage, packageText, readPackage, PACKAGE_SUFFIX};
