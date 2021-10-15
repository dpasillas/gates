import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPause, faStop, faPlay, faStepForward} from "@fortawesome/free-solid-svg-icons";
import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import IconButton from "@mui/material/IconButton"
import Stack from "@mui/material/Stack"

import PlayArrow from "@mui/icons-material/PlayArrow";
import Pause from "@mui/icons-material/Pause";
import SkipNext from "@mui/icons-material/SkipNext";
import Stop from "@mui/icons-material/Stop";
import Brightness4 from "@mui/icons-material/Brightness4";

import LogicBoard from "../logic/LogicBoard";
import ToggleThemeButton from "./ToggleThemeButton";
import "../css/Toolbar.css";

interface IProps {
  board: LogicBoard;
}

interface IState {}

class Toolbar extends React.Component<IProps, IState> {
  render() {
    let running = this.props.board.simulationRunning;
    let stopped = !running && this.props.board.simulationStopped;
    return (
        <Stack className="toolbar"
               sx={{
                 backgroundColor: "background.default",
                 border: (theme) => `1px solid ${theme.palette.divider}`
               }}
               spacing={1}
               divider={<Divider orientation="vertical" variant="middle" flexItem/>}
               direction="row">
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
            <ToggleThemeButton/>
          </Box>
        </Stack>
    );
  }

  onPlay() {
    let board = this.props.board;
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
}

export default Toolbar;