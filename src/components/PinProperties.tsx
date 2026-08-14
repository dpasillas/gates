import React from "react";

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Check from "@mui/icons-material/Check";
import InfoOutlined from "@mui/icons-material/InfoOutlined";

import {LogicBoard} from "../logic/LogicBoard";
import {LogicPin, PinType} from "../logic/LogicPin";
import {checkNetName, checkPortName, isConnectableGroup, setNetName, setPort} from "../logic/nets";

/** Shown in place of a value when the selection does not agree on one. */
const MIXED = "-";

/** The net name field, named so that the board can put the caret in it. */
const NET_NAME_FIELD = "pin-net-name";

/** How pins are joined, which nothing else on screen says. */
const CONNECT_HINT = "Select an output and the inputs it should drive, then press Space to wire "
    + "them together and name the net.";

/**
 * Commits a field on Enter, where its own button would have.
 *
 * Enter in a lone text field usually means "that is my answer", and here the answer is only taken
 * once the button beside it is pressed. Reading the same disabled state the button does keeps the
 * two from disagreeing about whether the value can be applied at all.
 */
function applyOnEnter(disabled: boolean, apply: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || disabled) {
      return;
    }
    e.preventDefault();
    apply();
  };
}

interface IProps {
  board: LogicBoard;
  pins: LogicPin[];
  /** Called once something has been applied, so the panel can re-read what it changed. */
  onApplied: () => void;
}

interface IState {
  netName: string;
  portName: string;
  isPort: boolean;
  /**
   * What the pins said when the fields were last filled from them.
   *
   * The fields hold a draft rather than the pins themselves, since neither is applied until it is
   * committed. Keeping what the draft was taken from is what tells a value the user has typed and
   * not yet applied apart from one that has since changed underneath them.
   */
  taken: Values;
}

/** The three things the fields describe, as they stand on the pins. */
interface Values {
  netName: string;
  portName: string;
  isPort: boolean;
}

/** What the fields would hold if they were filled from the pins now. */
function valuesOf(pins: LogicPin[]): Values {
  const [pin] = pins;

  return {
    netName: shared(pins, p => p.netName) ?? "",
    portName: pin?.portName ?? "",
    isPort: pin?.isPort ?? false,
  };
}

/** The value every pin agrees on, or undefined where they differ. */
function shared<T>(pins: LogicPin[], of: (pin: LogicPin) => T): T | undefined {
  const values = new Set(pins.map(of));

  return values.size === 1 ? [...values][0] : undefined;
}

/** One labelled row, matching the layout the component properties use. */
function Row({label, children}: {label: string, children: React.ReactNode}) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {children}
    </Stack>
  );
}

/**
 * The properties of the selected pins.
 *
 * Pins have a fixed set of properties, unlike components, so these are laid out directly rather
 * than described by the property system the components share.
 *
 * The two editable ones are applied by a button rather than as they are typed: both rewire or
 * rename things elsewhere on the board, which is not something to do to a half-typed name.
 */
class PinProperties extends React.Component<IProps, IState> {
  constructor(props: Readonly<IProps>) {
    super(props);

    const taken = valuesOf(props.pins);
    this.state = {...taken, taken};
  }

  /**
   * Fills the fields again when the pins change underneath them.
   *
   * Wiring a pin up moves it onto the net its driver is on, which the panel has to show: it was
   * reading the pins once, when it was built, so a name changed by anything but the panel itself
   * sat there stale until the panel was rebuilt.
   *
   * A draft the user is part-way through typing survives, since only a value that has moved on the
   * pins replaces it.
   */
  static getDerivedStateFromProps(props: IProps, state: IState): Partial<IState> | null {
    const now = valuesOf(props.pins);
    const {taken} = state;

    if (now.netName === taken.netName && now.portName === taken.portName
        && now.isPort === taken.isPort) {
      return null;
    }

    return {...now, taken: now};
  }

  /** A net takes one output at most, so a selection with two describes no possible net. */
  netEditable(): boolean {
    return this.props.pins.length === 1 || isConnectableGroup(this.props.pins);
  }

  applyNetName() {
    setNetName(this.props.board, this.props.pins, this.state.netName.trim());
    this.props.onApplied();
  }

  applyPort() {
    const [pin] = this.props.pins;
    setPort(this.props.board, pin, this.state.isPort, this.state.portName);
    this.props.onApplied();
  }

  /**
   * The button that commits a field's value, sitting inside the field itself.
   *
   * A field wide enough to type a name into, its own label, and a separate button do not fit across
   * the panel together. Naming the field with the input's own label and tucking the action inside it
   * leaves the whole width for the value.
   */
  renderApply(label: string, disabled: boolean, apply: () => void) {
    return (
      <InputAdornment position="end">
        <Tooltip title={label}>
          {/* A disabled button fires no events, so the tooltip needs a wrapper that still does. */}
          <span>
            <IconButton size="small" edge="end" aria-label={label}
                        disabled={disabled} onClick={apply}>
              <Check fontSize="small"/>
            </IconButton>
          </span>
        </Tooltip>
      </InputAdornment>
    );
  }

  renderNetName() {
    const editable = this.netEditable();
    const check = editable
      ? checkNetName(this.props.board, this.props.pins, this.state.netName.trim())
      : {error: "A net can only be driven by one output."};
    const unchanged = this.state.netName.trim() === (shared(this.props.pins, p => p.netName) ?? "");
    const warned = Boolean(check.warning) && !check.error;
    const cannotApply = !editable || Boolean(check.error) || unchanged;

    return (
      <>
        <TextField
          id={NET_NAME_FIELD}
          label="Net Name"
          size="small"
          variant="standard"
          fullWidth
          disabled={!editable}
          error={Boolean(check.error)}
          value={this.state.netName}
          placeholder={shared(this.props.pins, p => p.netName) === undefined ? MIXED : ""}
          onChange={e => this.setState({netName: e.target.value})}
          onKeyDown={applyOnEnter(cannotApply, () => this.applyNetName())}
          // A field has an error state but no warning one. MUI's way of colouring a field from the
          // rest of the palette is to name the colour and hold the field in its focused look, since
          // that look is the one the colour shows through.
          color={warned ? "warning" : undefined}
          focused={warned || undefined}
          InputProps={{
            endAdornment: this.renderApply(
              "Set net name", cannotApply, () => this.applyNetName()),
          }}/>
        {/* A clash with another output is worth saying but not worth blocking, and the colour alone
            does not say what is wrong with the value. */}
        {(check.error || check.warning) &&
          <Typography variant="caption" color={check.error ? "error" : "warning.main"}>
            {check.error ?? check.warning}
          </Typography>}
      </>
    );
  }

  renderPort() {
    const [pin] = this.props.pins;
    const problem = this.state.isPort
      ? checkPortName(this.props.board, pin, this.state.portName)
      : undefined;
    const unchanged = this.state.isPort === pin.isPort
      && this.state.portName.trim() === pin.portName;
    const cannotApply = Boolean(problem) || unchanged;

    return (
      <>
        {/* The checkbox belongs with the field it governs, rather than on a line of its own under a
            heading that would only repeat what the field is already labelled. */}
        <Stack direction="row" alignItems="flex-end" spacing={0.5}>
          <Checkbox size="small" checked={this.state.isPort}
                    inputProps={{"aria-label": "Port"}}
                    onChange={e => this.setState({isPort: e.target.checked})}/>
          <TextField
            id="pin-port-name"
            label="Port Name"
            size="small"
            variant="standard"
            fullWidth
            disabled={!this.state.isPort}
            error={Boolean(problem)}
            value={this.state.portName}
            onChange={e => this.setState({portName: e.target.value})}
            onKeyDown={applyOnEnter(cannotApply, () => this.applyPort())}
            InputProps={{
              endAdornment: this.renderApply(
                "Set port name", cannotApply, () => this.applyPort()),
            }}/>
        </Stack>
        {/* One line, saying whatever stands between this pin and being a port: what is missing, what
            clashes, or — when nothing does — the rule that has to keep holding. */}
        {this.state.isPort &&
          <Typography variant="caption" color={problem ? "error" : "text.secondary"}>
            {problem ?? "Port names must be unique across the board."}
          </Typography>}
      </>
    );
  }

  /**
   * Says how pins are wired without a wire.
   *
   * The panel can show a net once it has a name, but nothing on screen says how a set of pins is
   * turned into one in the first place, and a key nobody presses teaches nobody anything.
   */
  renderConnectHint() {
    return (
      <Tooltip title={CONNECT_HINT}>
        <InfoOutlined aria-label={CONNECT_HINT} tabIndex={0}
                      sx={{fontSize: 16, color: "text.secondary"}}/>
      </Tooltip>
    );
  }

  render() {
    const {pins} = this.props;
    const type = shared(pins, p => p.pinType);
    const width = shared(pins, p => p.width);

    return (
      <Box className="properties-body">
        <Row label="Type">
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography variant="body2" className="properties-value">Pin</Typography>
            {this.renderConnectHint()}
          </Stack>
        </Row>
        {pins.length > 1 &&
          <Typography variant="caption" color="text.secondary">
            {pins.length} pins selected
          </Typography>}
        <Divider/>
        {this.renderNetName()}
        <Row label="Pin Type">
          <Typography variant="body2" className="properties-value">
            {type === undefined ? MIXED : type === PinType.OUTPUT ? "Output" : "Input"}
          </Typography>
        </Row>
        {/* Set from the component the pin belongs to, not from here. */}
        <Row label="Bit Width">
          <Typography variant="body2" className="properties-value">
            {width === undefined ? MIXED : width}
          </Typography>
        </Row>
        {pins.length === 1 && this.renderPort()}
      </Box>
    );
  }
}

export {NET_NAME_FIELD, PinProperties};
