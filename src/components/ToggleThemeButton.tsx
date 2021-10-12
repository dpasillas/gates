import React from "react"
import ThemeContext from "../ThemeContext";
import {IconButton} from "@mui/material";
import {DarkTheme, LightTheme} from "../Themes";
import Brightness4 from "@mui/icons-material/Brightness4";
import Brightness7 from "@mui/icons-material/Brightness7";

interface IProps{}
interface IState{}

class ToggleThemeButton extends React.Component<IProps, IState> {
  render() {
    return (
    <ThemeContext.Consumer>
      {({theme, setTheme}) => (
          <IconButton sx={{ ml: 1 }} onClick={() => setTheme(theme.palette.mode === 'dark' ? LightTheme : DarkTheme)} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7/> : <Brightness4/>}
          </IconButton>
      )}
    </ThemeContext.Consumer>
    )
  }
}

export default ToggleThemeButton;