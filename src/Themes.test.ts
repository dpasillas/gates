import {DarkTheme, LightTheme} from './Themes';

/**
 * A focus ring says where focus is; the ripple pulsing under it says nothing, and goes on saying
 * it. It shows most after a dialog, which hands focus back to whatever opened it — so a button the
 * user typed their way out of is left pulsing until something else takes focus.
 *
 * Asserted on the themes rather than on a rendered button: the pulse only appears where the
 * browser judges focus to be keyboard-driven, which jsdom never does, so a test over the markup
 * would pass whether or not this were set.
 */
describe('both themes', () => {
  test.each([['light', LightTheme], ['dark', DarkTheme]])('leave the focus ripple off in %s', (
      _name, theme) => {
    expect(theme.components?.MuiButton?.defaultProps?.disableFocusRipple).toBe(true);
    expect(theme.components?.MuiIconButton?.defaultProps?.disableFocusRipple).toBe(true);
    expect(theme.components?.MuiToggleButton?.defaultProps?.disableFocusRipple).toBe(true);
  });
});
