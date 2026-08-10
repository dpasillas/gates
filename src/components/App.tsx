import React from 'react';
import Box from "@mui/material/Box"
import {Theme, ThemeProvider} from "@mui/material/styles"

import {Sidebar} from "./Sidebar";
import {Properties} from "./Properties";
import {PARTS} from "./partsCatalogue";
import {LogicBoard} from "../logic/LogicBoard";
import {Toolbar} from "./Toolbar";
import {LightTheme} from "../Themes";
import {ThemeContext} from "../ThemeContext";
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

  constructor(props: IProps) {
    super(props);
    this.state = {
      theme: LightTheme,
      setTheme: this.setTheme.bind(this),
    }
  }

  setTheme(theme: Theme) {
    this.setState({theme: theme});
  }

  componentDidMount() {
    this.board.updateApp = () => this.setState({});
  }

  componentWillUnmount() {
    this.board.updateApp = () => {};
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
              {/* Relative so that the side panels, which overlay the board, anchor to this row. */}
              <Box sx={{bgcolor: 'background.default', width: "100%", height: "100%", display: "flex",
                        position: "relative"}}>
                <Sidebar parts={PARTS}>
                </Sidebar>
                {this.board.render()}
                <Properties board={this.board}/>
              </Box>
            </div>
          </ThemeProvider>
        </ThemeContext.Provider>
    );
  }
}

export {App};
