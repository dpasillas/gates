import React from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Check from "@mui/icons-material/Check";

import {ExportIcon} from "./PanelIcons";
import {EXPORT_KINDS, ExportKind, exportKindLabel} from "../util/exportKind";
import "../css/MenuBar.css";

/** How long a press is held before it is a request for the menu rather than an export. */
const HOLD_MS = 500;

interface IProps {
  kind: ExportKind;
  /** The kinds that can be written out today; the others are listed but cannot be chosen. */
  available: ExportKind[];
  onExport: (kind: ExportKind) => void;
  onChooseKind: (kind: ExportKind) => void;
}

interface IState {
  /** The button, while the menu is open under it. */
  anchor?: HTMLElement;
}

/**
 * The toolbar's export button: one press writes out the kind it shows, and holding it or
 * right-clicking opens the menu that changes which kind that is.
 */
class ExportButton extends React.Component<IProps, IState> {
  state: IState = {};

  private hold?: ReturnType<typeof setTimeout>;

  /** Whether the press in progress opened the menu, so the click that ends it exports nothing. */
  private held = false;

  componentWillUnmount() {
    this.cancelHold();
  }

  private open(anchor: HTMLElement) {
    this.setState({anchor});
  }

  private close() {
    this.setState({anchor: undefined});
  }

  private cancelHold() {
    if (this.hold) {
      clearTimeout(this.hold);
      this.hold = undefined;
    }
  }

  private onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }
    const button = event.currentTarget;
    this.held = false;
    this.cancelHold();
    this.hold = setTimeout(() => {
      this.hold = undefined;
      this.held = true;
      this.open(button);
    }, HOLD_MS);
  }

  private onClick() {
    this.cancelHold();
    if (this.held) {
      this.held = false;
      return;
    }
    this.props.onExport(this.props.kind);
  }

  private onContextMenu(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    this.cancelHold();
    // A long touch raises this as well as the hold, and the menu is already up.
    if (!this.state.anchor) {
      this.open(event.currentTarget);
    }
  }

  private choose(kind: ExportKind) {
    this.close();
    if (kind !== this.props.kind) {
      this.props.onChooseKind(kind);
    }
  }

  render() {
    const {kind, available} = this.props;
    const label = exportKindLabel(kind);
    const cancel = this.cancelHold.bind(this);

    return (
      <>
        <Tooltip title={`${label} (hold or right-click for other kinds)`}>
          <IconButton className="export-button" aria-label={label} aria-haspopup="menu"
                      onPointerDown={this.onPointerDown.bind(this)}
                      onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
                      onClick={this.onClick.bind(this)}
                      onContextMenu={this.onContextMenu.bind(this)}>
            <ExportIcon kind={kind} className="export-icon"/>
          </IconButton>
        </Tooltip>
        <Menu anchorEl={this.state.anchor} open={Boolean(this.state.anchor)}
              onClose={this.close.bind(this)}
              anchorOrigin={{vertical: "bottom", horizontal: "left"}}>
          {EXPORT_KINDS.map(option =>
            <MenuItem key={option} className="menu-item" dense
                      selected={option === kind}
                      disabled={!available.includes(option)}
                      onClick={() => this.choose(option)}>
              <Box className="menu-tick">{option === kind && <Check fontSize="inherit"/>}</Box>
              <ListItemText primaryTypographyProps={{variant: "body2"}}>
                {exportKindLabel(option)}
              </ListItemText>
            </MenuItem>)}
        </Menu>
      </>
    );
  }
}

export {ExportButton, HOLD_MS};
