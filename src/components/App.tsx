import React from 'react';
import Box from "@mui/material/Box"
import Snackbar from "@mui/material/Snackbar"
import {Theme, ThemeProvider} from "@mui/material/styles"

import {Sidebar} from "./Sidebar";
import {Properties} from "./Properties";
import {NET_NAME_FIELD} from "./PinProperties";
import {connectPins} from "../logic/nets";
import {partsFor} from "./partsCatalogue";
import {EditorTabs} from "./EditorTabs";
import {MenuBar} from "./MenuBar";
import {ProjectPanel} from "./ProjectPanel";
import {NameDialog, OpenProjectDialog, PickDialog} from "./ProjectDialogs";
import {ComponentDialog} from "./ComponentDialog";
import {PackageDialog} from "./PackageDialog";
import {buildMenus} from "./menus";
import {LogicBoard} from "../logic/LogicBoard";
import {GLOBAL_SCOPE} from "../Constants";
import {ComponentDefinition} from "../logic/ComponentDefinition";
import {PackageComponent} from "../logic/PackageComponent";
import {Project} from "../logic/Project";
import {ComponentSet} from "../logic/boardFile";
import {copySelection, duplicateSelection, pasteAnchor, pasteInto} from "../logic/clipboard";
import {createBoardFromSelection} from "../logic/boardFromSelection";
import {extractBoard, extractPackage} from "../logic/componentExtract";
import {Toolbar} from "./Toolbar";
import {exportBoard, importBoard} from "../storage/boardStore";
import {exportComponent, importComponent} from "../storage/componentStore";
import {importExported} from "../storage/exportedFile";
import {exportPackage, importPackage} from "../storage/packageStore";
import type {ImportedBoard} from "../storage/boardStore";
import type {ImportedComponent} from "../storage/componentStore";
import {
  exportProject,
  importProject,
  listProjects,
  openProject,
  reopenLastProject,
  saveProject,
  saveProjectAs,
  ProjectSummary,
} from "../storage/projectStore";
import {readSettings, writeSettings} from "../storage/settings";
import {ExportKind} from "../util/exportKind";
import {WireStyle} from "../util/wireStyle";
import {LightTheme} from "../Themes";
import {ThemeContext} from "../ThemeContext";
import '../css/App.css';

/** A question the app is waiting on an answer to before it can go on. */
interface NamePrompt {
  title: string;
  label: string;
  confirm: string;
  initial: string;
  submit: (name: string) => void;
}

interface IProps {}
interface IState {
  theme: Theme,
  setTheme: (theme: Theme) => void,
  /** What just happened, shown briefly along the bottom. */
  notice?: string,
  naming?: NamePrompt,
  /** The projects to choose between, while the open dialog is up. */
  opening?: ProjectSummary[],
  /** The package being authored, while the interface editor is up. */
  authoring?: PackageComponent,
  /** The board being packaged, while the binding dialog is up. */
  binding?: {board: LogicBoard, existing?: ComponentDefinition},
  /** What the toolbar's export button writes out. */
  exportKind: ExportKind,
  /** The kind being picked one of to export, while the chooser is up. */
  choosing?: "component" | "package",
}

const EXPORTABLE: ExportKind[] = ["board", "component", "package", "project"];

/** Whether the keyboard belongs to something being typed into rather than to the board. */
/**
 * The panels that can be left holding focus.
 *
 * A press outside the one holding it is the user going to work elsewhere, and it lets go.
 */
const PANELS = ".properties-content, .project-panel, .parts-panel";

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;

  return Boolean(element?.isContentEditable)
      || ["INPUT", "TEXTAREA", "SELECT"].includes(element?.tagName ?? "");
}

/**
 * Entry point to the app.
 */
class App extends React.Component<IProps , IState>{
  private project: Project = new Project();
  private readonly onKeyDown = this.handleKeyDown.bind(this);
  private readonly onMouseDown = this.handleMouseDown.bind(this);

  /**
   * What was last copied, as data rather than as a hold on the components.
   *
   * Kept here rather than in the browser's own clipboard, which cannot be read back without a
   * permission prompt and cannot be read at all from a menu.
   */
  private clipboard?: ComponentSet;

  /** Where the last paste landed, so that repeats at the same point step along instead of stacking. */
  private lastPaste?: {x: number, y: number, repeat: number};

  constructor(props: IProps) {
    super(props);
    this.state = {
      theme: LightTheme,
      setTheme: this.setTheme.bind(this),
      exportKind: readSettings().exportKind,
    }
  }

  private get board(): LogicBoard {
    return this.project.activeBoard;
  }

  setTheme(theme: Theme) {
    this.setState({theme: theme});
  }

  componentDidMount() {
    this.watch(this.project.boards);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("mousedown", this.onMouseDown, true);
    this.reopenLast();
  }

  componentWillUnmount() {
    this.project.boards.forEach(board => {board.updateApp = () => {}});
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("mousedown", this.onMouseDown, true);
  }

  /**
   * Hears about boards changing under their own steam.
   *
   * Every board is listened to, not only the one in front: a simulation left running on a board in
   * another tab still moves, and the toolbar reflects it.
   */
  private watch(boards: LogicBoard[]) {
    boards.forEach(board => {board.updateApp = () => this.setState({})});
  }

  /** Takes on a project in place of the one open, and starts listening to its boards. */
  private adopt(project: Project) {
    this.project.boards.forEach(board => {board.updateApp = () => {}});
    this.project = project;
    this.watch(project.boards);
  }

  /** Picks up where the last session left off, silently when there is nothing to pick up. */
  private async reopenLast() {
    const project = await reopenLastProject();
    if (project) {
      this.adopt(project);
      this.setState({notice: `Opened ${project.name}`});
    }
  }

  /** Runs something that touches storage, reporting whatever it has to say, including failure. */
  private async attempt(action: () => Promise<string | undefined>) {
    try {
      const notice = await action();
      if (notice) {
        this.setState({notice});
      }
    } catch (error) {
      this.setState({notice: error instanceof Error ? error.message : String(error)});
    }
    this.setState({});
  }

  /** Whether the project may be thrown away, asking first if there is anything in it to lose. */
  private mayDiscard(): boolean {
    return this.project.boards.every(board => board.components.size === 0)
        || window.confirm("Discard the project that is open?");
  }

  private get hasSelection(): boolean {
    return this.board.selectedComponents.size > 0 || this.board.selectedPins.size > 0;
  }

  private askName(prompt: NamePrompt) {
    this.setState({naming: prompt});
  }

  private handleNewProject() {
    if (!this.mayDiscard()) {
      return;
    }
    this.adopt(new Project());
    this.setState({notice: "Started a new project"});
  }

  private handleOpenProject() {
    this.attempt(async () => {
      this.setState({opening: await listProjects()});

      return undefined;
    });
  }

  private handleChooseProject(id: string) {
    this.setState({opening: undefined});
    if (!this.mayDiscard()) {
      return;
    }
    this.attempt(async () => {
      this.adopt(await openProject(id));

      return `Opened ${this.project.name}`;
    });
  }

  private handleSave() {
    if (this.project.saved) {
      this.attempt(async () => {
        await saveProject(this.project);

        return `Saved ${this.project.name}`;
      });

      return;
    }

    // A project has nowhere to be saved until it has a name, since its name is all the user has to
    // find it by again.
    this.askName({
      title: "Save Project",
      label: "Project name",
      confirm: "Save",
      initial: this.project.name,
      submit: name => this.attempt(async () => {
        this.project.name = name;
        await saveProject(this.project);

        return `Saved ${name}`;
      }),
    });
  }

  private handleSaveAs() {
    this.askName({
      title: "Save Project As",
      label: "Project name",
      confirm: "Save a Copy",
      initial: `${this.project.name} copy`,
      submit: name => this.attempt(async () => {
        await saveProjectAs(this.project, name);

        return `Saved ${name}`;
      }),
    });
  }

  private handleRenameProject() {
    this.askName({
      title: "Rename Project",
      label: "Project name",
      confirm: "Rename",
      initial: this.project.name,
      submit: name => {
        this.project.name = name;
        this.setState({});
      },
    });
  }

  /**
   * Renames a board.
   *
   * A board's name is what the tab and the component dialog call it and nothing else; components
   * built from it are unaffected, since what they hold is what the board is made of.
   */
  private handleRenameBoard(board: LogicBoard) {
    this.askName({
      title: "Rename Board",
      label: "Board name",
      confirm: "Rename",
      initial: board.name,
      submit: name => {
        board.name = name;
        this.setState({});
      },
    });
  }

  private handleAddBoard() {
    this.askName({
      title: "New Board",
      label: "Board name",
      confirm: "Create",
      initial: `board ${this.project.boards.length + 1}`,
      submit: name => {
        this.watch([this.project.addBoard(name)]);
        this.setState({});
      },
    });
  }

  /**
   * Takes what is selected onto a board of its own.
   *
   * Named before it is made rather than after: the board it makes is opened straight away, and a
   * tab that comes up already called what it holds is one less thing to go back and fix.
   */
  private handleCreateBoardFromSelection() {
    this.askName({
      title: "Create Board from Selection",
      label: "Board name",
      confirm: "Create",
      initial: `board ${this.project.boards.length + 1}`,
      submit: name => {
        const board = createBoardFromSelection(this.project, this.board, name);
        if (!board) {
          return;
        }
        this.watch([board]);
        this.setState({notice: `Created ${name}`});
      },
    });
  }

  /**
   * Opens the interface editor on a new package.
   *
   * Nothing joins the project until it is saved, so a package that was started and thought better
   * of leaves nothing behind to delete.
   */
  private handleAddPackage() {
    this.setState({authoring: new PackageComponent(
        {scope: GLOBAL_SCOPE, name: `package ${this.project.packages.length + 1}`})});
  }

  private handleEditPackage(pkg: PackageComponent) {
    this.setState({authoring: pkg});
  }

  /**
   * Takes what the editor was showing.
   *
   * A package keeps its identity while it is edited, so saving one that is already in the project
   * puts it back where it was rather than beside itself.
   */
  private handleSavePackage(saved: PackageComponent) {
    const at = this.project.packages.findIndex(pkg => pkg.uuid === saved.uuid);
    if (at < 0) {
      this.project.addPackage(saved);
    } else {
      this.project.packages[at] = saved;
    }
    this.setState({authoring: undefined, notice: `Saved ${saved.name}`});
  }

  /** Opens the binding dialog on the board in front. */
  private handlePackageBoard() {
    this.setState({binding: {board: this.board}});
  }

  private handleEditComponent(definition: ComponentDefinition) {
    const board = this.project.boards.find(other => other.id === definition.source.boardId);
    if (!board) {
      this.setState({notice: `${definition.name} was built from a board this project no longer has`});

      return;
    }

    this.setState({binding: {board, existing: definition}});
  }

  /**
   * Takes what the binding dialog was showing.
   *
   * The component is a copy of the board and the package it names, so the project gains something
   * whole rather than a set of references that could come apart later.
   */
  private handleSaveComponent(definition: ComponentDefinition) {
    this.project.addComponent(definition);
    this.setState({binding: undefined, notice: `Saved ${definition.name}`});
  }

  /**
   * Takes the board a component holds and puts it in the project, under a name the user gives.
   *
   * Named on the way out because the project may already have a board called this, and which one is
   * which is exactly what the user is about to need to know. The identity is not theirs to choose:
   * where the project has lost the board it comes back as itself and the component is bound to it
   * again, and where the project still has it this is a fork, since wanting a look at a working
   * component is not a reason to repoint it.
   */
  private handleExtractBoard(definition: ComponentDefinition) {
    this.askName({
      title: "Extract Board",
      label: "Board name",
      confirm: "Extract",
      initial: definition.source.boardName,
      submit: name => {
        const board = extractBoard(definition, this.project, name);
        this.watch([board]);
        this.setState({notice: `Extracted ${board.name}`});
      },
    });
  }

  private handleExtractPackage(definition: ComponentDefinition) {
    const pkg = extractPackage(definition, this.project);
    this.setState({notice: `Extracted ${pkg.name}`});
  }

  private handleDeleteComponent(definition: ComponentDefinition) {
    if (!window.confirm(`Delete ${definition.name}? Boards using it will not open until it is back.`)) {
      return;
    }

    this.project.removeComponent(definition);
    this.setState({});
  }

  private handleDeletePackage(pkg: PackageComponent) {
    if (!window.confirm(`Delete ${pkg.name}?`)) {
      return;
    }

    this.project.removePackage(pkg);
    this.setState({notice: `Deleted ${pkg.name}`});
  }

  private handleSelectBoard(board: LogicBoard) {
    this.project.show(board);
    this.setState({});
  }

  private handleCloseBoard(board: LogicBoard) {
    this.project.closeBoard(board);
    this.setState({});
  }

  private handleReorderTabs(moved: LogicBoard, index: number) {
    this.project.moveTabTo(moved, index);
    this.setState({});
  }

  private handleDeleteBoard(board: LogicBoard) {
    const empty = board.components.size === 0;
    if (!empty && !window.confirm(`Delete ${board.name} and everything on it?`)) {
      return;
    }

    board.updateApp = () => {};
    this.project.removeBoard(board);
    this.setState({notice: `Deleted ${board.name}`});
  }

  private handleExportBoard() {
    this.attempt(async () => `Exported ${await exportBoard(this.board)}`);
  }

  private handleImportBoard() {
    this.attempt(async () => {
      const imported = await importBoard();

      return imported && this.placeImportedBoard(imported);
    });
  }

  /** Puts a board that was read in into the project, and says what arrived. */
  private placeImportedBoard({board, components}: ImportedBoard): string {
    // An exported board carries the components it uses, since it left the project that had them.
    // Ones this project already holds under the same identity are the same component, and are
    // left alone rather than replaced by the copy that travelled.
    const gained = components.filter(made => !this.project.componentFor(made.uuid));
    gained.forEach(made => this.project.addComponent(made));
    this.watch([this.project.addBoard(board.name, board)]);

    return gained.length > 0
        ? `Added ${board.name} and ${gained.length} component${gained.length > 1 ? "s" : ""}`
        : `Added ${board.name}`;
  }

  /**
   * Brings in whatever the chosen file holds.
   *
   * The panel's one Import button: the file says what it is, so the user is not asked to.
   */
  private handleImport() {
    this.attempt(async () => {
      const imported = await importExported(this.project);
      if (!imported) {
        return undefined;
      }

      switch (imported.kind) {
        case "board":
          return this.placeImportedBoard(imported);
        case "component":
          return this.placeImportedComponent(imported);
        case "package":
          this.project.addPackage(imported.pkg);
          this.setState({});
          return `Added ${imported.pkg.name}`;
        case "project":
          if (!this.mayDiscard()) {
            return undefined;
          }
          this.adopt(imported.project);
          return `Opened ${imported.project.name}`;
      }
    });
  }

  private handleExportProject() {
    this.attempt(async () => `Exported ${await exportProject(this.project)}`);
  }

  private handleExportComponent(definition: ComponentDefinition) {
    this.attempt(async () => `Exported ${await exportComponent(definition, this.project)}`);
  }

  private handleExportPackage(pkg: PackageComponent) {
    this.attempt(async () => `Exported ${await exportPackage(pkg)}`);
  }

  /**
   * Asks which component or package to export, since unlike a board none is in front.
   *
   * With none to choose from there is nothing to ask, and the answer is the notice.
   */
  private handleChooseExport(kind: "component" | "package") {
    const held = kind === "component" ? this.project.components : this.project.packages;
    if (held.length === 0) {
      this.setState({notice: `There are no ${kind}s to export`});
      return;
    }
    this.setState({choosing: kind});
  }

  private handlePickedExport(id: string) {
    const kind = this.state.choosing;
    this.setState({choosing: undefined});
    if (kind === "component") {
      const definition = this.project.componentFor(id);
      if (definition) {
        this.handleExportComponent(definition);
      }
    } else if (kind === "package") {
      const pkg = this.project.packages.find(other => other.uuid === id);
      if (pkg) {
        this.handleExportPackage(pkg);
      }
    }
  }

  private handleImportComponent() {
    this.attempt(async () => {
      const imported = await importComponent(this.project);

      return imported && this.placeImportedComponent(imported);
    });
  }

  /** Puts a component that was read in into the project, and says what arrived. */
  private placeImportedComponent({definition, components}: ImportedComponent): string {
    // As with a board: what it carried is only added where the project has nothing by that
    // identity, while the component itself was asked for and always arrives.
    components.filter(made => !this.project.componentFor(made.uuid))
        .forEach(made => this.project.addComponent(made));
    this.project.addComponent(definition);
    this.setState({});

    return `Added ${definition.name}`;
  }

  private handleImportPackage() {
    this.attempt(async () => {
      const pkg = await importPackage(this.project);
      if (!pkg) {
        return undefined;
      }

      this.project.addPackage(pkg);
      this.setState({});

      return `Added ${pkg.name}`;
    });
  }

  private handleExport(kind: ExportKind) {
    switch (kind) {
      case "board":
        return this.handleExportBoard();
      case "project":
        return this.handleExportProject();
      default:
        return this.handleChooseExport(kind);
    }
  }

  private handleChooseExportKind(kind: ExportKind) {
    writeSettings({exportKind: kind});
    this.setState({exportKind: kind});
  }

  private handleImportProject() {
    if (!this.mayDiscard()) {
      return;
    }
    this.attempt(async () => {
      const project = await importProject();
      if (!project) {
        return undefined;
      }
      this.adopt(project);

      return `Opened ${project.name}`;
    });
  }

  private handleDelete() {
    this.board.deleteSelection();
    this.setState({});
  }

  private handleCopy() {
    this.clipboard = copySelection(this.board);
    // A fresh copy starts a fresh run of pastes, so the next one lands where it is aimed rather
    // than carrying on from where the previous copy's pastes had reached.
    this.lastPaste = undefined;
    this.setState({});
  }

  private handleCut() {
    this.handleCopy();
    this.board.deleteSelection();
    this.setState({});
  }

  private handlePaste() {
    if (!this.clipboard) {
      return;
    }

    const at = pasteAnchor(this.board);
    const landing = this.lastPaste?.x === at.x && this.lastPaste?.y === at.y
        ? this.lastPaste.repeat + 1
        : 0;

    pasteInto(this.board, this.clipboard, {...at, repeat: landing});
    this.lastPaste = {...at, repeat: landing};
    this.setState({});
  }

  /**
   * Wires the selected pins together and offers to name what they now form.
   *
   * The wires are only half of it: a net is worth a name, and the name is what lets the same net be
   * added to later without drawing to it. So the panel is brought up whether or not there was
   * anything to wire — a set of inputs has no output to drive it, and putting them on a named net
   * is exactly how that gets one.
   */
  private handleConnectPins() {
    // A selection that could not share a net wires nothing, and the panel about to come up says so
    // against the field itself — which is a better place for it than a notice that flies past.
    if (connectPins(this.board, [...this.board.selectedPins]) > 0) {
      this.board.update();
    }

    this.board.revealProperties();
    this.setState({});
    // The panel may only now be expanding, so the field is looked for after this render rather
    // than during it. Its contents are taken as well as the caret: the name a pin already carries
    // is what the user is most likely replacing, and selecting it means typing does that.
    window.setTimeout(() => {
      const field = document.getElementById(NET_NAME_FIELD);
      if (field instanceof HTMLInputElement) {
        field.focus();
        field.select();
      }
    }, 0);
  }

  /**
   * Puts down whatever the user had hold of: the caret in a panel field, and the selection.
   *
   * Left alone while a menu or dialog is up, where Escape already means "close this" and the
   * selection is not what is being escaped from.
   */
  /**
   * Lets go of whatever a panel was holding when the user goes to work somewhere else.
   *
   * The board suppresses the browser's own handling of a press, so that a drag cannot move focus
   * part-way through the gesture. That also means nothing takes focus off what a panel was left
   * holding: a field with the caret goes on swallowing the keys the board answers to, and a button
   * keeps its focus ring long after whatever it opened has been dealt with.
   *
   * Taken on the way down rather than on the way back up: the board stops a press from travelling
   * any further once it has one, so waiting for it to bubble here would be waiting for good.
   */
  private handleMouseDown(e: MouseEvent) {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement)) {
      return;
    }

    const holding = focused.closest(PANELS);
    // A press inside the same panel is the user still working there, so it keeps what it has.
    if (!holding || (e.target instanceof Element && e.target.closest(PANELS) === holding)) {
      return;
    }

    focused.blur();
  }

  private handleEscape() {
    if (document.querySelector(".MuiModal-root")) {
      return;
    }

    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused.closest(PANELS)) {
      focused.blur();
    }

    this.board.clearSelection();
    this.setState({});
  }

  private handleDuplicate() {
    duplicateSelection(this.board);
    this.setState({});
  }

  private handleWireStyle(style: WireStyle) {
    this.board.wireStyle = style;
    writeSettings({wireStyle: style});
    this.board.update();
    this.setState({});
  }

  private handleHighlightPorts() {
    this.board.highlightPorts = !this.board.highlightPorts;
    writeSettings({highlightPorts: this.board.highlightPorts});
    // Every pin decides for itself whether to fade or name itself, so they all have to be asked
    // again rather than only the board being redrawn around them.
    this.board.updateApp();
    this.setState({});
  }

  /**
   * The keys the board answers to.
   *
   * Ignored while a field has focus, where the same keys belong to the text being edited.
   */
  private handleKeyDown(e: KeyboardEvent) {
    // Before the check below, unlike every other key here: stepping out of a field is most of what
    // Escape is for, so it is the one key that has to reach this while a field has the caret.
    if (e.key === "Escape") {
      this.handleEscape();

      return;
    }

    if (isTyping(e.target)) {
      return;
    }

    if (e.key === "Delete") {
      e.preventDefault();
      this.handleDelete();

      return;
    }

    // One pin has nothing to be wired to, but naming it is the other half of what this does, and
    // that is worth reaching by the same key.
    if (e.key === " " && this.board.selectedPins.size > 0) {
      e.preventDefault();
      this.handleConnectPins();

      return;
    }

    if (!(e.ctrlKey || e.metaKey)) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case "s":
        e.preventDefault();
        if (e.shiftKey) {
          this.handleSaveAs();
        } else {
          this.handleSave();
        }
        break;
      case "o":
        e.preventDefault();
        this.handleOpenProject();
        break;
      case "c":
        e.preventDefault();
        this.handleCopy();
        break;
      case "x":
        e.preventDefault();
        this.handleCut();
        break;
      case "v":
        e.preventDefault();
        this.handlePaste();
        break;
      case "d":
        e.preventDefault();
        this.handleDuplicate();
        break;
      default:
    }
  }

  renderProjectView() {
    return (
      <ProjectPanel project={this.project}
                    onRename={this.handleRenameProject.bind(this)}
                    onAddBoard={this.handleAddBoard.bind(this)}
                    onImport={this.handleImport.bind(this)}
                    onSelectBoard={this.handleSelectBoard.bind(this)}
                    onRenameBoard={this.handleRenameBoard.bind(this)}
                    onDeleteBoard={this.handleDeleteBoard.bind(this)}
                    onExportBoard={board => this.attempt(
                        async () => `Exported ${await exportBoard(board)}`)}
                    onAddPackage={this.handleAddPackage.bind(this)}
                    onEditPackage={this.handleEditPackage.bind(this)}
                    onDeletePackage={this.handleDeletePackage.bind(this)}
                    onExportPackage={this.handleExportPackage.bind(this)}
                    onAddComponent={this.handlePackageBoard.bind(this)}
                    onEditComponent={this.handleEditComponent.bind(this)}
                    onDeleteComponent={this.handleDeleteComponent.bind(this)}
                    onExportComponent={this.handleExportComponent.bind(this)}
                    onExtractBoard={this.handleExtractBoard.bind(this)}
                    onExtractPackage={this.handleExtractPackage.bind(this)}/>
    );
  }

  render()
  {
    const deleteSelection = this.hasSelection ? this.handleDelete.bind(this) : undefined;
    // Copying takes components; a selection holding nothing but pins has nothing to take.
    const hasComponents = this.board.selectedComponents.size > 0;
    const editing = {
      cut: hasComponents ? this.handleCut.bind(this) : undefined,
      copy: hasComponents ? this.handleCopy.bind(this) : undefined,
      paste: this.clipboard ? this.handlePaste.bind(this) : undefined,
      duplicate: hasComponents ? this.handleDuplicate.bind(this) : undefined,
      createBoardFromSelection:
          hasComponents ? this.handleCreateBoardFromSelection.bind(this) : undefined,
    };
    const menus = buildMenus({
      newProject: this.handleNewProject.bind(this),
      openProject: this.handleOpenProject.bind(this),
      save: this.handleSave.bind(this),
      saveAs: this.handleSaveAs.bind(this),
      exportBoard: this.handleExportBoard.bind(this),
      exportComponent: () => this.handleChooseExport("component"),
      exportPackage: () => this.handleChooseExport("package"),
      exportProject: this.handleExportProject.bind(this),
      importBoard: this.handleImportBoard.bind(this),
      importComponent: this.handleImportComponent.bind(this),
      importPackage: this.handleImportPackage.bind(this),
      importProject: this.handleImportProject.bind(this),
      packageBoard: this.handlePackageBoard.bind(this),
      deleteSelection,
      ...editing,
      wireStyle: this.board.wireStyle,
      setWireStyle: this.handleWireStyle.bind(this),
      highlightPorts: this.board.highlightPorts,
      toggleHighlightPorts: this.handleHighlightPorts.bind(this),
    });

    return (
        <ThemeContext.Provider value={this.state}>
          <ThemeProvider theme={this.state.theme}>
            {/* A column, so that the row below the header gets the height the header leaves rather
                than the whole page's — which put the side panels' last 100 pixels off-screen. */}
            <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "column"}}>
              <div style={{flexShrink: 0}}>
                <MenuBar menus={menus} title={`${this.project.name} — ${this.board.name}`}/>
                <Toolbar board={this.board}
                         onSave={this.handleSave.bind(this)}
                         exportKind={this.state.exportKind}
                         exportable={EXPORTABLE}
                         onExport={this.handleExport.bind(this)}
                         onChooseExportKind={this.handleChooseExportKind.bind(this)}
                         onDelete={deleteSelection}
                         onCut={editing.cut}
                         onCopy={editing.copy}
                         onPaste={editing.paste}
                         onToggleHighlightPorts={this.handleHighlightPorts.bind(this)}/>
                <EditorTabs project={this.project}
                            onSelect={this.handleSelectBoard.bind(this)}
                            onClose={this.handleCloseBoard.bind(this)}
                            onAdd={this.handleAddBoard.bind(this)}
                            onReorder={this.handleReorderTabs.bind(this)}/>
              </div>
              {/* Relative so that the side panels, which overlay the board, anchor to this row. */}
              <Box sx={{bgcolor: 'background.default', width: "100%", flex: 1, minHeight: 0,
                        display: "flex", position: "relative"}}>
                <Sidebar parts={partsFor(this.project)} projectView={this.renderProjectView()}>
                </Sidebar>
                {this.board.render()}
                {/* Keyed with the board so that switching tabs gives the panel the new board to
                    report on rather than leaving it wired to the old one. Qualified, because the
                    editor beside it is keyed by the same board and siblings may not share a key. */}
                <Properties key={`properties-${this.board.id}`} board={this.board}/>
              </Box>
              {this.state.naming &&
                <NameDialog title={this.state.naming.title}
                            label={this.state.naming.label}
                            confirm={this.state.naming.confirm}
                            initial={this.state.naming.initial}
                            onCancel={() => this.setState({naming: undefined})}
                            onSubmit={name => {
                              const prompt = this.state.naming;
                              this.setState({naming: undefined});
                              prompt?.submit(name);
                            }}/>}
              {this.state.authoring &&
                <PackageDialog package={this.state.authoring}
                               title={this.project.packages.some(
                                   pkg => pkg.uuid === this.state.authoring?.uuid)
                                   ? "Edit Package" : "Create Package"}
                               onCancel={() => this.setState({authoring: undefined})}
                               onSave={this.handleSavePackage.bind(this)}/>}
              {this.state.binding &&
                <ComponentDialog board={this.state.binding.board}
                                 boards={this.project.boards}
                                 packages={this.project.packages}
                                 existing={this.state.binding.existing}
                                 onCancel={() => this.setState({binding: undefined})}
                                 onSave={this.handleSaveComponent.bind(this)}
                                 onCreatePackage={pkg => {
                                   this.project.addPackage(pkg);
                                   this.setState({});
                                 }}/>}
              {this.state.choosing &&
                <PickDialog title={`Export ${this.state.choosing === "component"
                                ? "Component" : "Package"}`}
                            confirm="Export"
                            items={this.state.choosing === "component"
                                ? this.project.components.map(made =>
                                    ({id: made.uuid, name: made.name || "untitled component"}))
                                : this.project.packages.map(pkg =>
                                    ({id: pkg.uuid, name: pkg.name || "untitled package"}))}
                            onCancel={() => this.setState({choosing: undefined})}
                            onPick={this.handlePickedExport.bind(this)}/>}
              <OpenProjectDialog open={Boolean(this.state.opening)}
                                 projects={this.state.opening ?? []}
                                 onCancel={() => this.setState({opening: undefined})}
                                 onOpen={this.handleChooseProject.bind(this)}/>
              <Snackbar open={Boolean(this.state.notice)}
                        autoHideDuration={4000}
                        message={this.state.notice}
                        onClose={() => this.setState({notice: undefined})}/>
            </div>
          </ThemeProvider>
        </ThemeContext.Provider>
    );
  }
}

export {App};
