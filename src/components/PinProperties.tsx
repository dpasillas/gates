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

/** Exported so the board can put the caret in it. */
const NET_NAME_FIELD = "pin-net-name";

const CONNECT_HINT = "Select an output and the inputs it should drive, then press Space to wire "
    + "them together and name the net.";

/** Commits on Enter, reading the same disabled state as the button so the two cannot disagree. */
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
  onApplied: () => void;
}

interface IState {
  netName: string;
  portName: string;
  isPort: boolean;
  /** What the pins said when the fields were last filled, telling a draft from an outside change. */
  taken: Values;
}

interface Values {
  netName: string;
  portName: string;
  isPort: boolean;
}

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

/** Matches the component properties layout, which sits alongside this. */
function Row({label, children}: {label: string, children: React.ReactNode}) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {children}
    </Stack>
  );
}

/** Net and port names are applied on commit, not as typed: both rewire or rename things elsewhere. */
class PinProperties extends React.Component<IProps, IState> {
  constructor(props: Readonly<IProps>) {
    super(props);

    const taken = valuesOf(props.pins);
    this.state = {...taken, taken};
  }

  /**
   * Wiring a pin up moves its net, which the fields have to pick up.
   *
   * Only a value that moved on the pins replaces one being typed.
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
          // MUI fields have no warning state; the colour only shows through the focused look.
          color={warned ? "warning" : undefined}
          focused={warned || undefined}
          InputProps={{
            endAdornment: this.renderApply(
              "Set net name", cannotApply, () => this.applyNetName()),
          }}/>
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
        {this.state.isPort &&
          <Typography variant="caption" color={problem ? "error" : "text.secondary"}>
            {problem ?? "Inputs may share a port name. An output port takes its name alone."}
          </Typography>}
      </>
    );
  }

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
