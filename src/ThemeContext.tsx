import React from "react";
import {LightTheme} from "./Themes";
import {Theme} from "@mui/material";

// set the defaults
const ThemeContext = React.createContext({
  theme: LightTheme,
  setTheme: (theme: Theme) => {}
});

export default ThemeContext;
