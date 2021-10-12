import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPause, faStop, faPlay, faStepForward} from "@fortawesome/free-solid-svg-icons";
import Box from "@mui/material/Box"
import MuiDivider from "@mui/material/Divider"
import Stack from "@mui/material/Stack"
import {styled} from "@mui/material/styles";

import LogicBoard from "../logic/LogicBoard";
import ToggleThemeButton from "./ToggleThemeButton";
import "../css/Toolbar.css";

const Divider = styled(MuiDivider)({
  height: "75%",
});

interface IProps {
  board: LogicBoard;
}

interface IState {}

class Toolbar extends React.Component<IProps, IState> {
  render() {
    let running = this.props.board.simulationRunning;
    let stopped = !running && this.props.board.simulationStopped;
    return (
        <Stack className="toolbar" spacing={1} direction="row">
          <Divider orientation="vertical"/>
          <Box flexDirection="row">
            <button className={running ? "pressed" : ""} onClick={this.onPlay.bind(this)}>
              <FontAwesomeIcon className="default" icon={faPlay} style={{position: "fixed"}}/>
              <FontAwesomeIcon className="active" icon={faPause}/>
            </button>
            <button onClick={this.onStop.bind(this)} {...{disabled: stopped}}>
              <FontAwesomeIcon icon={faStop}/>
            </button>
            <button onClick={this.onStep.bind(this)} {...{disabled: running}}>
              <FontAwesomeIcon icon={faStepForward}/>
            </button>
            <span>
              {this.props.board.simulationCurrentTime}
            </span>
          </Box>
          <Divider orientation="vertical"/>
          <Box>
            <ToggleThemeButton/>
          </Box>
          <Divider orientation="vertical"/>
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