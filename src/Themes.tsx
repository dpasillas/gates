import {createTheme} from "@mui/material";
import grey from "@mui/material/colors/grey";

/**
 * Settings both themes share.
 *
 * A focus ring says where focus is; the ripple that pulses under it says nothing, and goes on
 * saying it. It is most obvious after a dialog: one hands focus back to whatever opened it, so a
 * button the user typed their way out of is left pulsing until something else takes focus.
 */
const shared = {
  components: {
    MuiButton: {defaultProps: {disableFocusRipple: true}},
    MuiIconButton: {defaultProps: {disableFocusRipple: true}},
    MuiToggleButton: {defaultProps: {disableFocusRipple: true}},
  },
};

export const DarkTheme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    background: {
      default: grey[900],
    }
  },
});

export const LightTheme = createTheme({
  ...shared,
  palette: {
    mode: 'light',
    background: {
      default: grey[200],
    }
  },
})