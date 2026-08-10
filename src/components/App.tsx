import React from 'react';
import Box from "@mui/material/Box"
import Snackbar from "@mui/material/Snackbar"
import {Theme, ThemeProvider} from "@mui/material/styles"

import {Sidebar} from "./Sidebar";
import {Properties} from "./Properties";
import {PARTS} from "./partsCatalogue";
import {EditorTabs} from "./EditorTabs";
import {MenuBar} from "./MenuBar";
import {ProjectPanel} from "./ProjectPanel";
import {NameDialog, OpenProjectDialog} from "./ProjectDialogs";
import {buildMenus} from "./menus";
import {LogicBoard} from "../logic/LogicBoard";
import {Project} from "../logic/Project";
import {Toolbar} from "./Toolbar";
import {exportBoard, importBoard} from "../storage/boardStore";
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
import {writeSettings} from "../storage/settings";
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
}

/** Whether the keyboard belongs to something being typed into rather than to the board. */
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

  constructor(props: IProps) {
    super(props);
    this.state = {
      theme: LightTheme,
      setTheme: this.setTheme.bind(this),
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
    this.reopenLast();
  }

  componentWillUnmount() {
    this.project.boards.forEach(board => {board.updateApp = () => {}});
    window.removeEventListener("keydown", this.onKeyDown);
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
      const board = await importBoard();
      if (!board) {
        return undefined;
      }
      this.watch([this.project.addBoard(board.name, board)]);

      return `Added ${board.name}`;
    });
  }

  private handleExportProject() {
    this.attempt(async () => `Exported ${await exportProject(this.project)}`);
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

  private handleWireStyle(style: WireStyle) {
    this.board.wireStyle = style;
    writeSettings({wireStyle: style});
    this.board.update();
    this.setState({});
  }

  /**
   * The keys the board answers to.
   *
   * Ignored while a field has focus, where the same keys belong to the text being edited.
   */
  private handleKeyDown(e: KeyboardEvent) {
    if (isTyping(e.target)) {
      return;
    }

    if (e.key === "Delete") {
      e.preventDefault();
      this.handleDelete();

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
      default:
    }
  }

  renderProjectView() {
    return (
      <ProjectPanel project={this.project}
                    onRename={this.handleRenameProject.bind(this)}
                    onAddBoard={this.handleAddBoard.bind(this)}
                    onImportBoard={this.handleImportBoard.bind(this)}
                    onSelectBoard={this.handleSelectBoard.bind(this)}
                    onDeleteBoard={this.handleDeleteBoard.bind(this)}/>
    );
  }

  render()
  {
    const deleteSelection = this.hasSelection ? this.handleDelete.bind(this) : undefined;
    const menus = buildMenus({
      newProject: this.handleNewProject.bind(this),
      openProject: this.handleOpenProject.bind(this),
      save: this.handleSave.bind(this),
      saveAs: this.handleSaveAs.bind(this),
      exportBoard: this.handleExportBoard.bind(this),
      exportProject: this.handleExportProject.bind(this),
      importBoard: this.handleImportBoard.bind(this),
      importProject: this.handleImportProject.bind(this),
      deleteSelection,
      wireStyle: this.board.wireStyle,
      setWireStyle: this.handleWireStyle.bind(this),
    });

    return (
        <ThemeContext.Provider value={this.state}>
          <ThemeProvider theme={this.state.theme}>
            <div style={{width: "100%", height: "100%"}}>
              <div>
                <MenuBar menus={menus} title={`${this.project.name} — ${this.board.name}`}/>
                <Toolbar board={this.board}
                         onSave={this.handleSave.bind(this)}
                         onDelete={deleteSelection}/>
                <EditorTabs project={this.project}
                            onSelect={this.handleSelectBoard.bind(this)}
                            onClose={this.handleCloseBoard.bind(this)}
                            onAdd={this.handleAddBoard.bind(this)}
                            onReorder={this.handleReorderTabs.bind(this)}/>
              </div>
              {/* Relative so that the side panels, which overlay the board, anchor to this row. */}
              <Box sx={{bgcolor: 'background.default', width: "100%", height: "100%", display: "flex",
                        position: "relative"}}>
                <Sidebar parts={PARTS} projectView={this.renderProjectView()}>
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
