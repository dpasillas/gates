import {DEFAULT_WIRE_STYLE, WIRE_STYLES, WireStyle} from "../util/wireStyle";
import {isSnapMode, SnapMode} from "../util/grid";

/**
 * Preferences that belong to this browser rather than to any board.
 *
 * Anything that changes how the app behaves without changing what is on the board lives here, so
 * that opening a board somewhere else does not carry one person's view settings onto another
 * person's screen.
 */

const KEY = "gates.settings";

/** A project the user has had open, enough of it to offer reopening. */
interface RecentProject {
  /** Which project it is, and the name of its directory in storage. */
  id: string;
  /** What the project calls itself. */
  name: string;
  /** When it was last opened, so the list can be ordered without depending on its order. */
  openedAt: number;
}

interface Settings {
  wireStyle: WireStyle;
  /** Whether a component being placed lands on the grid, and how coarse that grid is. */
  snapMode: SnapMode;
  /** Whether clicking a pin the selection can reach wires it up instead of selecting it. */
  connectOnClick: boolean;
  /** Most recently opened first. */
  recentProjects: RecentProject[];
}

const DEFAULTS: Settings = {
  wireStyle: DEFAULT_WIRE_STYLE,
  snapMode: "off",
  connectOnClick: false,
  recentProjects: [],
};

/** How many projects the recent list remembers. */
const RECENT_PROJECT_LIMIT = 10;

function isWireStyle(value: unknown): value is WireStyle {
  return WIRE_STYLES.some(entry => entry.style === value);
}

function isRecentProject(value: unknown): value is RecentProject {
  const project = value as RecentProject;

  return typeof project?.name === "string"
      && typeof project?.id === "string"
      && typeof project?.openedAt === "number";
}

/**
 * The stored settings, with anything missing or unrecognised replaced by its default.
 *
 * Storage is shared with older and newer builds of the app and can be edited by hand, so every
 * field is checked rather than trusted.
 */
function readSettings(): Settings {
  let stored: unknown;
  try {
    const text = window.localStorage.getItem(KEY);
    stored = text ? JSON.parse(text) : undefined;
  } catch {
    // Storage can be unavailable or hold something that is not ours. Either way the defaults are
    // the answer, and refusing to start over a preference would be worse.
    return {...DEFAULTS};
  }

  const settings = (stored ?? {}) as Partial<Settings>;

  return {
    wireStyle: isWireStyle(settings.wireStyle) ? settings.wireStyle : DEFAULTS.wireStyle,
    snapMode: isSnapMode(settings.snapMode) ? settings.snapMode : DEFAULTS.snapMode,
    connectOnClick: typeof settings.connectOnClick === "boolean"
        ? settings.connectOnClick
        : DEFAULTS.connectOnClick,
    recentProjects: Array.isArray(settings.recentProjects)
        ? settings.recentProjects.filter(isRecentProject).slice(0, RECENT_PROJECT_LIMIT)
        : [],
  };
}

/** Changes some settings and leaves the rest, returning everything as it now stands. */
function writeSettings(patch: Partial<Settings>): Settings {
  const settings = {...readSettings(), ...patch};

  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Nothing can be done about storage being full or blocked, and the setting still applies for
    // as long as the page is open.
  }

  return settings;
}

/** Moves a project to the front of the recent list, dropping the oldest if that overflows it. */
function rememberProject(project: Omit<RecentProject, "openedAt">): Settings {
  const {recentProjects} = readSettings();
  const others = recentProjects.filter(other => other.id !== project.id);

  return writeSettings({
    recentProjects: [{...project, openedAt: Date.now()}, ...others].slice(0, RECENT_PROJECT_LIMIT),
  });
}

/** Takes a project off the recent list, for when its directory is no longer there. */
function forgetProject(id: string): Settings {
  return writeSettings({
    recentProjects: readSettings().recentProjects.filter(other => other.id !== id),
  });
}

/** The project to reopen on startup, if there is one. */
function mostRecentProject(): RecentProject | undefined {
  return readSettings().recentProjects[0];
}

export {
  forgetProject,
  mostRecentProject,
  readSettings,
  rememberProject,
  writeSettings,
  RECENT_PROJECT_LIMIT,
};
export type {RecentProject, Settings};
