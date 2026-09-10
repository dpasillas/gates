import React from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import {alpha} from "@mui/material/styles";
import ChevronRight from "@mui/icons-material/ChevronRight";
import Delete from "@mui/icons-material/Delete";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Unarchive from "@mui/icons-material/Unarchive";

import {BoardIcon, ComponentIcon, PackageIcon} from "./PanelIcons";

import {LogicBoard} from "../logic/LogicBoard";
import {PackageComponent} from "../logic/PackageComponent";
import {Project} from "../logic/Project";
import {linkage} from "../logic/ComponentDefinition";
import type {ComponentDefinition} from "../logic/ComponentDefinition";
import "../css/ProjectPanel.css";

interface IProps {
  project: Project;
  onRename: () => void;
  onAddBoard: () => void;
  onImportBoard: () => void;
  onSelectBoard: (board: LogicBoard) => void;
  onRenameBoard: (board: LogicBoard) => void;
  onDeleteBoard: (board: LogicBoard) => void;
  onAddPackage: () => void;
  onEditPackage: (pkg: PackageComponent) => void;
  onDeletePackage: (pkg: PackageComponent) => void;
  onAddComponent: () => void;
  onEditComponent: (definition: ComponentDefinition) => void;
  onDeleteComponent: (definition: ComponentDefinition) => void;
  onExtractBoard: (definition: ComponentDefinition) => void;
  onExtractPackage: (definition: ComponentDefinition) => void;
}

interface IState {
  /** The components showing what they hold, by id. */
  expanded: ReadonlySet<string>;
}

/**
 * What the project holds.
 *
 * Boards, packages and components, each their own section: a package with no board bound to it is
 * a whole thing, and so is a board with no package in front of it.
 */
class ProjectPanel extends React.Component<IProps, IState> {
  state: IState = {expanded: new Set()};

  private toggle(id: string) {
    const expanded = new Set(this.state.expanded);
    if (!expanded.delete(id)) {
      expanded.add(id);
    }
    this.setState({expanded});
  }

  renderPackage(pkg: PackageComponent) {
    return (
      <Box key={pkg.uuid} className="project-row"
           sx={{"&:hover": {bgcolor: "action.hover"}}}>
        <PackageIcon className="project-row-icon"/>
        <span className="project-row-name">{pkg.name || "untitled package"}</span>
        <Button className="project-row-action" size="small"
                aria-label={`Edit ${pkg.name}`}
                onClick={() => this.props.onEditPackage(pkg)}>
          Edit
        </Button>
        <IconButton className="project-row-delete" size="small"
                    aria-label={`Delete ${pkg.name}`}
                    onClick={() => this.props.onDeletePackage(pkg)}>
          <Delete fontSize="inherit"/>
        </IconButton>
      </Box>
    );
  }

  /**
   * One of the two things a component holds, and the way to take it back out.
   *
   * Named rather than shown: a package could be drawn here, but a board could not without an editor
   * that refuses to edit, and a row that showed one and named the other would read as an oversight.
   */
  private renderHeld(
      definition: ComponentDefinition, kind: "Board" | "Package", name: string,
      Icon: typeof BoardIcon, extract: (definition: ComponentDefinition) => void) {
    const shown = name || `untitled ${kind.toLowerCase()}`;

    return (
      <Box className="project-held-row" sx={{"&:hover": {bgcolor: "action.hover"}}}>
        <Icon className="project-row-icon" title={kind}/>
        <span className="project-row-name" title={shown}>{shown}</span>
        <IconButton className="project-held-extract" size="small"
                    aria-label={`Extract ${kind.toLowerCase()} from ${definition.name}`}
                    title={`Extract ${kind.toLowerCase()}`}
                    onClick={() => extract(definition)}>
          <Unarchive fontSize="inherit"/>
        </IconButton>
      </Box>
    );
  }

  /**
   * One component, what it holds, and whether what it was built from has moved on since.
   *
   * A component holds copies of its board and its package, so BEHIND is never a broken state — only
   * a note that the board it was built from has changed since that copy was taken. Opening the row
   * shows those copies, which are otherwise the one thing in the project nothing can reach.
   */
  renderComponent(definition: ComponentDefinition) {
    const open = this.state.expanded.has(definition.uuid);

    return (
      <div key={definition.uuid}>
        <Box className="project-row"
             role="button"
             tabIndex={0}
             aria-expanded={open}
             sx={{"&:hover": {bgcolor: "action.hover"}}}
             onClick={() => this.toggle(definition.uuid)}>
          {open
            ? <ExpandMore className="project-row-twisty" fontSize="inherit"/>
            : <ChevronRight className="project-row-twisty" fontSize="inherit"/>}
          <ComponentIcon className="project-row-icon"/>
          <span className="project-row-name">{definition.name || "untitled component"}</span>
          {linkage(definition, this.props.project) === "stale" &&
            <Box component="span" className="project-badge"
                 sx={{color: "warning.main", borderColor: "warning.main"}}
                 title="The board or package this was built from has changed since">BEHIND</Box>}
          <Button className="project-row-action" size="small"
                  aria-label={`Edit ${definition.name}`}
                  onClick={e => {e.stopPropagation(); this.props.onEditComponent(definition)}}>
            Edit
          </Button>
          <IconButton className="project-row-delete" size="small"
                      aria-label={`Delete ${definition.name}`}
                      onClick={e => {e.stopPropagation(); this.props.onDeleteComponent(definition)}}>
            <Delete fontSize="inherit"/>
          </IconButton>
        </Box>
        {open &&
          <div className="project-held">
            {this.renderHeld(definition, "Board", definition.source.boardName, BoardIcon,
                             this.props.onExtractBoard)}
            {this.renderHeld(definition, "Package", definition.packaging.name, PackageIcon,
                             this.props.onExtractPackage)}
          </div>}
      </div>
    );
  }

  renderBoard(board: LogicBoard) {
    const {project} = this.props;
    const active = board.id === project.activeBoardId;

    return (
      <Box key={board.id}
           className={`project-row${active ? " active" : ""}`}
           role="button"
           tabIndex={0}
           aria-current={active}
           sx={{
             "&:hover": {bgcolor: "action.hover"},
             // The current board is marked by a pill inset in its row rather than a bar at the
             // edge, where it met the rail's own bar. Blue while the panel holds the keyboard;
             // grey once the user has gone to work on the board.
             "&.active::before": {bgcolor: "action.selected"},
             ".project-panel:focus-within &.active::before": {
               bgcolor: theme => alpha(theme.palette.primary.main, 0.14),
             },
           }}
           onClick={() => this.props.onSelectBoard(board)}>
        <BoardIcon className="project-row-icon"/>
        <span className="project-row-name">{board.name}</span>
        {board.id === project.mainBoard.id &&
          <Box component="span" className="project-badge"
               sx={{color: "primary.main", borderColor: "primary.main"}}>MAIN</Box>}
        <Button className="project-row-action" size="small"
                aria-label={`Rename ${board.name}`}
                onClick={e => {e.stopPropagation(); this.props.onRenameBoard(board)}}>
          Rename
        </Button>
        {project.canRemove(board) &&
          <IconButton className="project-row-delete" size="small"
                      aria-label={`Delete ${board.name}`}
                      onClick={e => {e.stopPropagation(); this.props.onDeleteBoard(board)}}>
            <Delete fontSize="inherit"/>
          </IconButton>}
      </Box>
    );
  }

  render() {
    const {project} = this.props;

    return (
      <div className="project-panel">
        <div className="project-header">
          <Typography className="project-name" variant="subtitle2" title={project.name}>
            {project.name}
          </Typography>
          {/* Cased through sx rather than the stylesheet: a button's own styles are applied after
              this file's, and would put the label back into capitals. */}
          <Button className="project-rename" size="small"
                  sx={{textTransform: "none"}}
                  onClick={this.props.onRename}>
            Rename
          </Button>
        </div>

        <div className="project-actions">
          <Button size="small" variant="outlined" onClick={this.props.onAddBoard}>+ Board</Button>
          <Button size="small" variant="outlined"
                  onClick={this.props.onAddPackage}>+ Package</Button>
          <Button size="small" variant="outlined"
                  onClick={this.props.onAddComponent}>+ Component</Button>
          <Button size="small" variant="outlined" onClick={this.props.onImportBoard}>Import...</Button>
        </div>

        <div className="project-rows">
          <Box className="project-section-label" sx={{color: "text.secondary"}}>Boards</Box>
          {project.boards.map(board => this.renderBoard(board))}

          <Box className="project-section-label" sx={{color: "text.secondary"}}>Packages</Box>
          {project.packages.length === 0
            ? <div className="project-empty">
                Nothing packaged yet. A package is the symbol and the pins a board is put behind.
              </div>
            : project.packages.map(pkg => this.renderPackage(pkg))}

          <Box className="project-section-label" sx={{color: "text.secondary"}}>Components</Box>
          {project.components.length === 0
            ? <div className="project-empty">
                Nothing built yet. A component is a package bound to a board, and is what you place.
              </div>
            : project.components.map(made => this.renderComponent(made))}
        </div>
      </div>
    );
  }
}

export {ProjectPanel};
