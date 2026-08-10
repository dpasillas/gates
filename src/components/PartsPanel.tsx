import React from "react";
import Box from "@mui/material/Box"
import ClickAwayListener from "@mui/material/ClickAwayListener"
import IconButton from "@mui/material/IconButton"
import InputBase from "@mui/material/InputBase"
import Paper from "@mui/material/Paper"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import Check from "@mui/icons-material/Check";
import Search from "@mui/icons-material/Search";
import Settings from "@mui/icons-material/Settings";

import {Part} from "./Part";
import {PartsDrawer} from "./PartsDrawer";
import "../css/PartsDrawer.css"

/**
 * How many parts the Recent section holds.
 *
 * Three to a row, so this is two rows of them.
 */
const RECENT_LIMIT = 6;

const RECENT = "Recent";

interface IProps {
  parts: Map<string, Part[]>;
}

interface IState {
  filter: string;
  optionsOpen: boolean;
  showRecent: boolean;
  /** Most recently reached for first. */
  recent: Part[];
}

/**
 * The parts panel: a filter over collapsible categories of parts to drag onto the board.
 */
class PartsPanel extends React.Component<IProps, IState> {
  constructor(props: Readonly<IProps>) {
    super(props);
    this.state = {
      filter: "",
      optionsOpen: false,
      showRecent: true,
      recent: [],
    };
  }

  /** Moves a part to the front of the recent list, dropping the oldest if that overflows it. */
  recordUse(part: Part) {
    this.setState(state => ({
      recent: [part, ...state.recent.filter(other => other !== part)].slice(0, RECENT_LIMIT),
    }));
  }

  /** The categories to show, in order, holding only the parts the filter admits. */
  sections(): Array<[string, Part[]]> {
    const query = this.state.filter.trim().toLowerCase();
    const admits = (part: Part) => !query || part.label.toLowerCase().includes(query);

    const all: Array<[string, Part[]]> = [];
    if (this.state.showRecent && this.state.recent.length > 0) {
      all.push([RECENT, this.state.recent]);
    }
    all.push(...this.props.parts);

    return all
      .map(([label, parts]): [string, Part[]] => [label, parts.filter(admits)])
      .filter(([, parts]) => parts.length > 0);
  }

  renderOptions() {
    return (
      <ClickAwayListener onClickAway={() => this.setState({optionsOpen: false})}>
        <Paper elevation={8} className="parts-options" sx={{borderRadius: "6px"}}>
          <Box className="parts-options-caption" sx={{color: "text.secondary"}}>Sections</Box>
          <Box component="button" type="button" className="parts-option"
               role="menuitemcheckbox" aria-checked={this.state.showRecent}
               sx={{color: "text.primary", "&:hover": {bgcolor: "action.hover"}}}
               onClick={() => this.setState(state => ({showRecent: !state.showRecent}))}>
            <span>{RECENT}</span>
            {this.state.showRecent && <Check fontSize="small" color="primary"/>}
          </Box>
        </Paper>
      </ClickAwayListener>
    );
  }

  render() {
    const sections = this.sections();
    const filtering = this.state.filter.trim().length > 0;

    return (
      <Box className="parts-panel">
        <Box className="parts-header" sx={{bgcolor: "background.paper"}}>
          <Typography variant="subtitle2" sx={{color: "text.secondary"}}>Parts</Typography>
          <Tooltip title="Parts panel options">
            <IconButton size="small" aria-label="Parts panel options"
                        onClick={() => this.setState(state => ({optionsOpen: !state.optionsOpen}))}>
              <Settings fontSize="small"/>
            </IconButton>
          </Tooltip>
          {this.state.optionsOpen && this.renderOptions()}
        </Box>

        <Box className="parts-filter">
          <Box className="parts-filter-field">
            <Search fontSize="small" sx={{color: "text.secondary"}}/>
            <InputBase fullWidth
                       inputProps={{"aria-label": "Filter parts"}}
                       placeholder="Filter parts..."
                       sx={{fontSize: 13}}
                       value={this.state.filter}
                       onChange={e => this.setState({filter: e.target.value})}/>
          </Box>
        </Box>

        <Box className="parts-sections">
          {sections.map(([label, parts]) => (
            // Sections are opened by the filter rather than by the user, so a section closed
            // before the search would otherwise hide the very parts that matched it.
            <PartsDrawer key={label} label={label} parts={parts} forceOpen={filtering}
                         onPartDragStart={part => this.recordUse(part)}/>
          ))}
          {sections.length === 0 &&
            <Typography className="parts-empty" sx={{color: "text.secondary"}}>
              No parts match "{this.state.filter.trim()}".
            </Typography>}
        </Box>
      </Box>
    );
  }
}

export {PartsPanel};
