import {createTheme} from "@mui/material";
import grey from "@mui/material/colors/grey";

export const DarkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: grey[900],
    }
  },
});

export const LightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: grey[200],
    }
  },
})