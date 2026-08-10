import React from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Delete from "@mui/icons-material/Delete";
import DeveloperBoard from "@mui/icons-material/DeveloperBoard";

import {LogicBoard} from "../logic/LogicBoard";
import {Project} from "../logic/Project";
import "../css/ProjectPanel.css";

interface IProps {
  project: Project;
  onRename: () => void;
  onAddBoard: () => void;
  onImportBoard: () => void;
  onSelectBoard: (board: LogicBoard) => void;
  onDeleteBoard: (board: LogicBoard) => void;
}

/**
 * What the project holds.
 *
 * Boards for now. Components and interfaces get their own sections here once a board can be
 * packaged as one, which is why this is a list of sections rather than a single list.
 */
class ProjectPanel extends React.Component<IProps> {
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
          <Button size="small" variant="outlined" onClick={this.props.onImportBoard}>Import...</Button>
        </div>

        <Box className="project-section-label" sx={{color: "text.secondary"}}>Boards</Box>
        <div className="project-rows">
          {project.boards.map(board => this.renderBoard(board))}
        </div>
      </div>
    );
  }
}

export {ProjectPanel};
