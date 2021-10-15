import React from 'react';
import Box from "@mui/material/Box"
import {Theme, ThemeProvider} from "@mui/material/styles"

import Sidebar from "./Sidebar";
import Part from "./Part";
import PartType from "../enums/PartType";
import GateType from "../enums/GateType";
import LogicBoard from "../logic/LogicBoard";
import Toolbar from "./Toolbar";
import {LightTheme} from "../Themes";
import ThemeContext from "../ThemeContext";
import '../css/App.css';

interface IProps {}
interface IState {
  theme: Theme,
  setTheme: (theme: Theme) => void,
}

/**
 * Entry point to the app.
 */
class App extends React.Component<IProps , IState>{
  private board: LogicBoard = new LogicBoard();
  private parts: Map<string, Part[]> = new Map([
      ["Input", [
        new Part({type: PartType.INPUT, subtype: 0, label: "Clock"}),
        new Part({type: PartType.INPUT, subtype: 1, label: "Switch"}),
        new Part({type: PartType.INPUT, subtype: 2, label: "Ground"}),
      ]],
      ["Output", [
        new Part({type: PartType.OUTPUT, subtype: 0, label:"Bulb"}),
      ]],
      ["Gates", [
        new Part({type: PartType.GATE, subtype: GateType.AND, label:"AND"}),
        new Part({type: PartType.GATE, subtype: GateType.NAND, label:"NAND"}),
        new Part({type: PartType.GATE, subtype: GateType.OR, label:"OR"}),
        new Part({type: PartType.GATE, subtype: GateType.NOR, label:"NOR"}),
        new Part({type: PartType.GATE, subtype: GateType.XOR, label:"XOR"}),
        new Part({type: PartType.GATE, subtype: GateType.XNOR, label:"XNOR"}),
        new Part({type: PartType.GATE, subtype: GateType.BUF, label:"BUF"}),
        new Part({type: PartType.GATE, subtype: GateType.NOT, label:"NOT"}),
      ]],
      ["Other", [
        new Part({type: PartType.COMPOSITE_BUILT_IN, subtype: 0, label: "Half-Adder"}),
        new Part({type: PartType.COMPOSITE_BUILT_IN, subtype: 1, label: "Adder"}),
      ]]
  ]);

  constructor(props: IProps) {
    super(props);
    this.state = {
      theme: LightTheme,
      setTheme: this.setTheme.bind(this),
    }
  }

  setTheme(theme: Theme) {
    console.log(`Setting theme (${theme.palette.mode})...`)
    this.setState({theme: theme});
  }

  componentDidMount() {
    this.board.updateFunc = () => this.setState({})
  }

  componentWillUnmount() {
    this.board.updateFunc = () => {};
  }

  render()
  {
    return (
        <ThemeContext.Provider value={this.state}>
          <ThemeProvider theme={this.state.theme}>
            <div style={{width: "100%", height: "100%"}}>
              <div>
                Menu
                <Toolbar board={this.board}/>
              </div>
              <Box sx={{bgcolor: 'background.default', width: "100%", height: "100%", display: "flex"}}>
                <Sidebar parts={this.parts}>
                </Sidebar>
                {this.board.render()}
              </Box>
            </div>
          </ThemeProvider>
        </ThemeContext.Provider>
    );
  }
}

export default App;
