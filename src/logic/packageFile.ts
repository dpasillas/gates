import * as paper from "paper";

import {GLOBAL_SCOPE} from "../Constants";
import {PinOrientation, PinType} from "./LogicPin";
import {CornerMark, PackageDivider, PackageGroup, PackageShape} from "../enums/Packaging";
import {PackageComponent} from "./PackageComponent";

/** Tag every package file carries, so that a file of some other kind is rejected as one. */
const PACKAGE_FORMAT = "gates.package";
/** Raised whenever the shape of what is being read changes. */
const PACKAGE_FORMAT_VERSION = 1;

/**
 * A pin as it is written down.
 *
 * The enums travel as numbers rather than names: unlike `PartType`, whose members are read out of
 * files written by other builds, these are ours and only grow at the end.
 */
interface PackagePinData {
  id: string;
  label: string;
  type: number;
  width: number;
  side: number;
  not?: boolean;
  clock?: boolean;
  showLabel?: boolean;
  labelBold?: boolean;
  group?: number;
}

interface PackageData {
  format: typeof PACKAGE_FORMAT;
  version: number;
  id: string;
  name: string;
  shape: number;
  orientation: number;
  divider: number;
  cornerMark: number;
  pins: PackagePinData[];
}

function serializePackage(pkg: PackageComponent): PackageData {
  return {
    format: PACKAGE_FORMAT,
    version: PACKAGE_FORMAT_VERSION,
    id: pkg.uuid,
    name: pkg.name,
    shape: pkg.shape,
    orientation: pkg.facing,
    divider: pkg.divider,
    cornerMark: pkg.cornerMark,
    pins: pkg.declared.map(pin => {
      const data: PackagePinData = {
        id: pin.uuid,
        label: pin.label ?? "",
        type: pin.pinType,
        width: pin.width,
        side: pin.orientation,
      };

      if (pin.not) {
        data.not = true;
      }
      if (pin.clock) {
        data.clock = true;
      }
      if (!pin.showLabel) {
        data.showLabel = false;
      }
      if (pin.labelBold) {
        data.labelBold = true;
      }
      if (pin.group !== PackageGroup.FIRST) {
        data.group = pin.group;
      }

      return data;
    }),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** The member the number names, or the fallback when it names none of them. */
function member<T extends number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

const SIDES = [PinOrientation.LEFT, PinOrientation.RIGHT, PinOrientation.UP, PinOrientation.DOWN];

/**
 * Rebuilds a package from its file.
 *
 * Built in the shared scope by default: a package belongs to the project rather than to a board,
 * and is drawn wherever it is shown rather than on one.
 */
function packageFrom(data: PackageData, scope: paper.PaperScope = GLOBAL_SCOPE): PackageComponent {
  const pkg = new PackageComponent({scope, name: data.name});
  pkg.uuid = data.id || pkg.uuid;
  pkg.shape = member(data.shape, [PackageShape.RECTANGLE, PackageShape.TRAPEZOID],
                     PackageShape.RECTANGLE);
  pkg.facing = member(data.orientation, SIDES, PinOrientation.RIGHT);
  pkg.divider = member(data.divider,
                       [PackageDivider.NONE, PackageDivider.VERTICAL, PackageDivider.HORIZONTAL],
                       PackageDivider.NONE);
  pkg.cornerMark = member(data.cornerMark,
                          [CornerMark.NONE, CornerMark.TOP_LEFT, CornerMark.TOP_RIGHT,
                           CornerMark.BOTTOM_LEFT, CornerMark.BOTTOM_RIGHT],
                          CornerMark.NONE);

  for (const entry of data.pins) {
    if (!isObject(entry) || typeof entry.id !== "string") {
      continue;
    }

    const pin = pkg.declarePin({
      pinType: member(entry.type, [PinType.INPUT, PinType.OUTPUT], PinType.INPUT),
      label: typeof entry.label === "string" ? entry.label : "",
      width: typeof entry.width === "number" && entry.width > 0 ? entry.width : 1,
      orientation: member(entry.side, SIDES, PinOrientation.LEFT),
      not: entry.not === true,
      // Read after the pins are in, so that a file marking two clocks keeps only the first.
      clock: false,
      showLabel: entry.showLabel !== false,
      labelBold: entry.labelBold === true,
      group: member(entry.group, [PackageGroup.FIRST, PackageGroup.SECOND], PackageGroup.FIRST),
    });
    pin.uuid = entry.id;
  }

  const clocked = data.pins.findIndex(entry => entry.clock === true);
  if (clocked >= 0) {
    pkg.setClockPin(pkg.declared[clocked]);
  }
  pkg.rebuild();

  return pkg;
}

/** Reads the text of a package file, refusing anything that is not one. */
function parsePackageFile(text: string): PackageData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This is not a package: it is not valid JSON.");
  }

  if (!isObject(parsed) || parsed.format !== PACKAGE_FORMAT) {
    throw new Error("This file is not a Gates package.");
  }
  if (parsed.version !== PACKAGE_FORMAT_VERSION) {
    throw new Error(`This package was written by a different version of Gates `
        + `(file version ${parsed.version}).`);
  }

  return {
    format: PACKAGE_FORMAT,
    version: PACKAGE_FORMAT_VERSION,
    id: typeof parsed.id === "string" ? parsed.id : "",
    name: typeof parsed.name === "string" ? parsed.name : "",
    shape: typeof parsed.shape === "number" ? parsed.shape : PackageShape.RECTANGLE,
    orientation: typeof parsed.orientation === "number"
        ? parsed.orientation
        : PinOrientation.RIGHT,
    divider: typeof parsed.divider === "number" ? parsed.divider : PackageDivider.NONE,
    cornerMark: typeof parsed.cornerMark === "number" ? parsed.cornerMark : CornerMark.NONE,
    pins: Array.isArray(parsed.pins) ? parsed.pins as PackagePinData[] : [],
  };
}

/** A working copy, which is what a dialog edits so that cancelling leaves the original alone. */
function copyOf(pkg: PackageComponent): PackageComponent {
  return packageFrom(serializePackage(pkg), pkg.scope);
}

export {copyOf, packageFrom, parsePackageFile, serializePackage, PACKAGE_FORMAT};
export type {PackageData, PackagePinData};
