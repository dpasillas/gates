import React from "react";
import "../css/Toolbar.css";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPause,
  faStop,
  faPlay,
  faStepForward,
} from "@fortawesome/free-solid-svg-icons";
import LogicBoard from "../logic/LogicBoard";

interface IProps {
  board: LogicBoard;
}

interface IState {}

class Toolbar extends React.Component<IProps, IState> {
  render() {
    let running = this.props.board.simulationRunning;
    let stopped = !running && this.props.board.simulationStopped;
    return (
        <div className="toolbar" role="toolbar">
          <div className="group">
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
            <div>
              {this.props.board.simulationCurrentTime}
            </div>
          </div>
        </div>
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