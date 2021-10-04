import React from 'react';
import '../css/App.css';
import Sidebar from "./Sidebar";
import PartsDrawer from "./PartsDrawer";
import Part from "./Part";
import PartType from "../enums/PartType";
import GateType from "../enums/GateType";
import LogicBoard from "../logic/LogicBoard";

interface IProps {}
interface IState {}

/**
 * Entry point to the app.
 */
class App extends React.Component<IProps , IState>{
  private board: LogicBoard = new LogicBoard();

  render()
  {
    return (
        <div style={{width: "100%", height: "100%"}}>
          <div>Menu/Toolbars</div>
          <div style={{width: "100%", height: "100%"}}>
            <Sidebar content={
              <PartsDrawer parts={[
                new Part({type: PartType.GATE, subtype: GateType.AND, label:"AND"}),
                new Part({type: PartType.GATE, subtype: GateType.NAND, label:"NAND"}),
                new Part({type: PartType.GATE, subtype: GateType.OR, label:"OR"}),
                new Part({type: PartType.GATE, subtype: GateType.NOR, label:"NOR"}),
                new Part({type: PartType.GATE, subtype: GateType.XOR, label:"XOR"}),
                new Part({type: PartType.GATE, subtype: GateType.XNOR, label:"XNOR"}),
                new Part({type: PartType.GATE, subtype: GateType.BUF, label:"BUF"}),
                new Part({type: PartType.GATE, subtype: GateType.NOT, label:"NOT"}),
                new Part({type: PartType.OUTPUT, subtype: 0, label:"Bulb"}),
                new Part({type: PartType.INPUT, subtype: 1, label:"Switch"}),
              ]}/>
            }/>
            {this.board.render()}
          </div>
        </div>
    );
  }
}

export default App;
