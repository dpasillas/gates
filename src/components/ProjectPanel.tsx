import React from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Delete from "@mui/icons-material/Delete";
import DeveloperBoard from "@mui/icons-material/DeveloperBoard";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import Memory from "@mui/icons-material/Memory";

import {LogicBoard} from "../logic/LogicBoard";
import {PinType} from "../logic/LogicPin";
import {PackageComponent} from "../logic/PackageComponent";
import {Project} from "../logic/Project";
import "../css/ProjectPanel.css";

interface IProps {
  project: Project;
  onRename: () => void;
  onAddBoard: () => void;
  onImportBoard: () => void;
  onSelectBoard: (board: LogicBoard) => void;
  onDeleteBoard: (board: LogicBoard) => void;
  onAddPackage: () => void;
  onEditPackage: (pkg: PackageComponent) => void;
  onDeletePackage: (pkg: PackageComponent) => void;
}

interface IState {
  /** The packages showing their pins, by id. */
  expanded: ReadonlySet<string>;
}

/**
 * What the project holds.
 *
 * Boards for now. Components and interfaces get their own sections here once a board can be
 * packaged as one, which is why this is a list of sections rather than a single list.
 */
class ProjectPanel extends React.Component<IProps, IState> {
  state: IState = {expanded: new Set()};

  private toggle(pkg: PackageComponent) {
    const expanded = new Set(this.state.expanded);
    if (!expanded.delete(pkg.uuid)) {
      expanded.add(pkg.uuid);
    }
    this.setState({expanded});
  }

  /**
   * One pin of a package, as the contract a board would be built to.
   *
   * Named, said to be driven or read, and given its width, which is everything a board has to match
   * for the package to be put in front of it.
   */
  private renderPackagePin(pkg: PackageComponent, index: number) {
    const pin = pkg.declared[index];
    const kind = pin.pinType === PinType.OUTPUT ? "out" : "in";

    return (
      <div key={pin.uuid} className="project-pin-row">
        <span className={`project-pin-kind ${kind}`}>{kind}</span>
        <span className="project-pin-name">
          {pin.label?.trim() || <em className="project-pin-unnamed">unnamed</em>}
        </span>
        {pin.width > 1 && <span className="project-pin-width">{pin.width}-bit</span>}
        {pin.clock && <span className="project-pin-mark" title="Clock edge">clk</span>}
        {pin.not && <span className="project-pin-mark" title="Active low">low</span>}
      </div>
    );
  }

  renderPackage(pkg: PackageComponent) {
    const open = this.state.expanded.has(pkg.uuid);

    return (
      <div key={pkg.uuid}>
        <Box className="project-row"
             role="button"
             tabIndex={0}
             aria-expanded={open}
             sx={{"&:hover": {bgcolor: "action.hover"}}}
             onClick={() => this.toggle(pkg)}>
          {open
            ? <ExpandMore className="project-row-twisty" fontSize="inherit"/>
            : <ChevronRight className="project-row-twisty" fontSize="inherit"/>}
          <Memory className="project-row-icon" fontSize="inherit"/>
          <span className="project-row-name">{pkg.name || "untitled package"}</span>
          <span className="project-row-count">{pkg.declared.length}</span>
          <Button className="project-row-action" size="small"
                  aria-label={`Edit ${pkg.name}`}
                  onClick={e => {e.stopPropagation(); this.props.onEditPackage(pkg)}}>
            Edit
          </Button>
          <IconButton className="project-row-delete" size="small"
                      aria-label={`Delete ${pkg.name}`}
                      onClick={e => {e.stopPropagation(); this.props.onDeletePackage(pkg)}}>
            <Delete fontSize="inherit"/>
          </IconButton>
        </Box>
        {open && (pkg.declared.length > 0
          ? <div className="project-pins">
              {pkg.declared.map((_, index) => this.renderPackagePin(pkg, index))}
            </div>
          : <div className="project-pins empty">No pins on it yet</div>)}
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
             bgcolor: active ? "action.selected" : "transparent",
             borderLeftColor: active ? "primary.main" : "transparent",
             "&:hover": {bgcolor: "action.hover"},
           }}
           onClick={() => this.props.onSelectBoard(board)}>
        <DeveloperBoard className="project-row-icon" fontSize="inherit"/>
        <span className="project-row-name">{board.name}</span>
        {board.id === project.mainBoard.id &&
          <Box component="span" className="project-badge"
               sx={{color: "primary.main", borderColor: "primary.main"}}>MAIN</Box>}
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
        </div>
      </div>
    );
  }
}

export {ProjectPanel};
