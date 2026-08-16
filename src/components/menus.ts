import {MenuItemSpec, MenuSpec} from "./MenuBar";
import {WIRE_STYLES, WireStyle} from "../util/wireStyle";

/**
 * What the menu bar offers.
 *
 * The whole structure is listed, including everything the app cannot do yet — those items come out
 * disabled, because an item is given a place here when it is designed rather than when it is built,
 * and moving it in later would move everything around it.
 */

/** The actions that exist. Anything not named here is listed disabled. */
interface MenuCommands {
  newProject: () => void;
  openProject: () => void;
  save: () => void;
  saveAs: () => void;
  exportBoard: () => void;
  exportProject: () => void;
  importBoard: () => void;
  importProject: () => void;
  /** Absent while there is no selection to delete. */
  deleteSelection?: () => void;
  /** Absent while there are no components selected to take. */
  cut?: () => void;
  copy?: () => void;
  duplicate?: () => void;
  /** Absent while nothing has been copied. */
  paste?: () => void;
  wireStyle: WireStyle;
  setWireStyle: (style: WireStyle) => void;
  highlightPorts: boolean;
  toggleHighlightPorts: () => void;
}

function fileMenu(commands: MenuCommands): MenuItemSpec[] {
  return [
    {label: "New Project...", run: commands.newProject},
    {label: "Open Project...", shortcut: "Ctrl+O", run: commands.openProject},
    {label: "Save", shortcut: "Ctrl+S", separated: true, run: commands.save},
    {label: "Save As...", shortcut: "Ctrl+Shift+S", run: commands.saveAs},
    {
      label: "Export",
      items: [
        {label: "Board...", run: commands.exportBoard},
        {label: "Component..."},
        {label: "Package..."},
        {label: "Entire Project...", run: commands.exportProject},
      ],
    },
    // Not in the design's File menu, which only exports. Anything that can be written and not read
    // back is a one-way door.
    {
      label: "Import",
      items: [
        {label: "Board...", run: commands.importBoard},
        {label: "Project...", run: commands.importProject},
      ],
    },
    {label: "Save Image...", separated: true},
    {label: "Settings..."},
    {label: "Print...", shortcut: "Ctrl+P"},
    {label: "Delete File...", separated: true, danger: true},
  ];
}

function editMenu(commands: MenuCommands): MenuItemSpec[] {
  return [
    {label: "Undo", shortcut: "Ctrl+Z"},
    {label: "Redo", shortcut: "Ctrl+Y"},
    {label: "Cut", shortcut: "Ctrl+X", separated: true, run: commands.cut},
    {label: "Copy", shortcut: "Ctrl+C", run: commands.copy},
    {label: "Paste", shortcut: "Ctrl+V", run: commands.paste},
    {label: "Duplicate Selection", shortcut: "Ctrl+D", separated: true, run: commands.duplicate},
    {label: "Select All", shortcut: "Ctrl+A"},
    {label: "Delete Selection", shortcut: "Del", run: commands.deleteSelection},
    {
      label: "Rotate",
      separated: true,
      items: [
        {label: "Rotate Clockwise"},
        {label: "Rotate Counterclockwise"},
      ],
    },
    {label: "Create Board from Selection...", separated: true},
    {label: "Package Board as Component..."},
  ];
}

function viewMenu(commands: MenuCommands): MenuItemSpec[] {
  return [
    {
      label: "Wire Style",
      items: WIRE_STYLES.map(({style, label}) => ({
        label,
        checked: commands.wireStyle === style,
        run: () => commands.setWireStyle(style),
      })),
    },
    {
      label: "Wires",
      items: [
        {label: "Show All"},
        {label: "Hide Named-Pin Wires"},
        {label: "Hide All"},
      ],
    },
    {label: "Show Pin Names", separated: true},
    {label: "Show Values"},
    {
      label: "Highlight Ports",
      checked: commands.highlightPorts,
      run: commands.toggleHighlightPorts,
    },
    {label: "Show Status Bar"},
    {label: "Zoom In", shortcut: "Ctrl+=", separated: true},
    {label: "Zoom Out", shortcut: "Ctrl+-"},
    {label: "Fit in View"},
    {label: "Snap to Grid", separated: true},
    {
      label: "Timing Panel",
      items: [
        {label: "Docked"},
        {label: "Floating"},
      ],
    },
    {label: "Parts: Show Recent"},
  ];
}

function buildMenus(commands: MenuCommands): MenuSpec[] {
  return [
    {label: "File", items: fileMenu(commands)},
    {label: "Edit", items: editMenu(commands)},
    {label: "View", items: viewMenu(commands)},
  ];
}

export {buildMenus};
export type {MenuCommands};
