import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPause, faStop, faPlay, faStepForward} from "@fortawesome/free-solid-svg-icons";
import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import IconButton from "@mui/material/IconButton"
import Stack from "@mui/material/Stack"

// import PlayArrow from "@mui/icons-material/PlayArrow";
// import Pause from "@mui/icons-material/Pause";
// import SkipNext from "@mui/icons-material/SkipNext";
// import Stop from "@mui/icons-material/Stop";

import Tooltip from "@mui/material/Tooltip"
import Save from "@mui/icons-material/Save";
import Delete from "@mui/icons-material/Delete";
import ContentCut from "@mui/icons-material/ContentCut";
import ContentCopy from "@mui/icons-material/ContentCopy";
import ContentPaste from "@mui/icons-material/ContentPaste";

import {LogicBoard} from "../logic/LogicBoard";
import {ToggleThemeButton} from "./ToggleThemeButton";
import {writeSettings} from "../storage/settings";
import {nextWireStyle, wireStyleLabel, WireStyle} from "../util/wireStyle";
import "../css/Toolbar.css";

/** A miniature of each wire style, drawn the way the style draws a wire. */
const WIRE_GLYPHS: Record<WireStyle, string> = {
  bezier: "M 1 13 C 6 13 10 3 15 3",
  orthogonal: "M 1 13 H 8 V 3 H 15",
  diagonal: "M 1 13 H 5 L 11 3 H 15",
};

interface IProps {
  board: LogicBoard;
  onSave: () => void;
  /** Absent while there is no selection to delete. */
  onDelete?: () => void;
  /** Absent while there are no components selected to take. */
  onCut?: () => void;
  onCopy?: () => void;
  /** Absent while nothing has been copied. */
  onPaste?: () => void;
}

interface IState {}

class Toolbar extends React.Component<IProps, IState> {
  /**
   * A button for an action that is not always available.
   *
   * The tooltip is wrapped because a disabled button reports no pointer events, and a tooltip that
   * never hears one never appears — including on the button that most needs to say what it is for.
   */
  action(label: string, hint: string, icon: React.ReactElement, run?: () => void) {
    return (
      <Tooltip title={hint}>
        <span>
          <IconButton onClick={run} disabled={!run} aria-label={label}>
            {icon}
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  render() {
    const running = this.props.board.simulationRunning;
    const stopped = !running && this.props.board.simulationStopped;
    return (
        <Stack className="toolbar"
               sx={{
                 backgroundColor: "background.default",
                 border: (theme) => `1px solid ${theme.palette.divider}`
               }}
               spacing={1}
               divider={<Divider orientation="vertical" variant="middle" flexItem/>}
               direction="row">
          <Box>
            <Tooltip title="Save (Ctrl+S)">
              <IconButton onClick={this.props.onSave} aria-label="Save">
                <Save fontSize="small"/>
              </IconButton>
            </Tooltip>
          </Box>
          <Box flexDirection="row">
            <IconButton className={running ? "pressed" : ""} onClick={this.onPlay.bind(this)}>
              {/*<PlayArrow className="default" sx={{position:"fixed"}}/>*/}
              {/*<Pause className="active"/>*/}
              <FontAwesomeIcon className="default" size="xs" icon={faPlay} style={{position: "fixed"}}/>
              <FontAwesomeIcon className="active" size="xs" icon={faPause}/>
            </IconButton>
            <IconButton onClick={this.onStop.bind(this)} disabled={stopped}>
              {/*<Stop/>*/}
              <FontAwesomeIcon size="xs" icon={faStop}/>
            </IconButton>
            <IconButton onClick={this.onStep.bind(this)} disabled={running}>
              {/*<SkipNext/>*/}
              <FontAwesomeIcon size="xs" icon={faStepForward}/>
            </IconButton>
            {/*<span>*/}
            {/*  {this.props.board.simulationCurrentTime}*/}
            {/*</span>*/}
          </Box>
          <Box>
            <Tooltip title={`Wire style: ${wireStyleLabel(this.props.board.wireStyle)}`}>
              <IconButton onClick={this.onCycleWireStyle.bind(this)}
                          aria-label={`Wire style: ${wireStyleLabel(this.props.board.wireStyle)}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                     strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={WIRE_GLYPHS[this.props.board.wireStyle]}/>
                </svg>
              </IconButton>
            </Tooltip>
          </Box>
          <Box>
            {this.action("Cut", "Cut (Ctrl+X)", <ContentCut fontSize="small"/>, this.props.onCut)}
            {this.action("Copy", "Copy (Ctrl+C)", <ContentCopy fontSize="small"/>, this.props.onCopy)}
            {this.action("Paste", "Paste (Ctrl+V)", <ContentPaste fontSize="small"/>,
                         this.props.onPaste)}
          </Box>
          <Box>
            {this.action("Delete selection", "Delete selection (Del)", <Delete fontSize="small"/>,
                         this.props.onDelete)}
          </Box>
          <Box>
            <ToggleThemeButton/>
          </Box>
        </Stack>
    );
  }

  onPlay() {
    const board = this.props.board;
    if (board.simulationRunning) {
      this.props.board.pauseSimulation();
    } else {
      this.props.board.startSimulation();
    }
    this.setState({})
  }

  onStop() {
    this.props.board.stopSimulation();
    this.setState({});
  }

  onStep() {
    this.props.board.advanceSimulation()
  }

  onCycleWireStyle() {
    this.props.board.wireStyle = nextWireStyle(this.props.board.wireStyle);
    writeSettings({wireStyle: this.props.board.wireStyle});
    // Every wire already on the board is redrawn, not just the ones made from here on.
    this.props.board.updateApp();
    this.setState({});
  }
}

export {Toolbar};