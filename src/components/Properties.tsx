import React from "react"
import Draggable from "react-draggable"

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AlignHorizontalRight from "@mui/icons-material/AlignHorizontalRight";
import Close from "@mui/icons-material/Close";
import OpenInNew from "@mui/icons-material/OpenInNew";

import {LogicBoard} from "../logic/LogicBoard";
import {MergedProperty} from "../util/mergeProperties";
import {PinProperties} from "./PinProperties";
import {PropertiesIcon} from "./RailIcons";
import {RAIL_WIDTH, railTabSx, railLabelSx, railTextDownSx} from "./railStyle";
import "../css/Properties.css"

/** Shown in place of a value when the selection does not agree on one. */
const MIXED = "-";

interface IProps {
  board: LogicBoard;
}

interface IState {
  /** Held open by the rail tab, until the tab is used again. */
  open: boolean;
  floating: boolean;
  /**
   * Brought up by a right-click rather than by the tab.
   *
   * Lasts only as long as the selection it was opened to describe, so the panel gets out of the way
   * on its own once that selection is gone.
   */
  revealed: boolean;
}

interface RowProps {
  property: MergedProperty;
  /**
   * Called once an edit has been applied.
   *
   * These rows are controlled inputs reading straight off the components, so without a re-render
   * the field keeps showing the value from before the edit. Repeated nudges — the arrow keys or
   * the wheel — would then each be computed from that stale value and never get further than one
   * step from where they started.
   */
  onApplied: () => void;
}

/**
 * One property, rendered as a static value or an input depending on whether the whole selection
 * allows editing it.
 */
function PropertyRow({property, onApplied}: RowProps) {
  const {value, precision} = property;
  const display = value === undefined ? MIXED : value.toFixed(precision ?? 0);

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
      <Typography variant="body2" color="text.secondary">{property.label}</Typography>
      {property.kind === "boolean"
        // A checkbox can show all three states the merge can produce: on, off, and a selection that
        // disagrees, which becomes the indeterminate mark rather than a silent default.
        ? <Checkbox
            size="small"
            checked={value === 1}
            indeterminate={value === undefined}
            disabled={!property.editable}
            // The indeterminate prop only changes the icon. Spelling the mixed state out in
            // aria-checked is what makes it reach anyone not looking at the icon.
            inputProps={{
              "aria-label": property.label,
              "aria-checked": value === undefined ? "mixed" : value === 1,
            }}
            onChange={(e) => {
              property.apply(e.target.checked ? 1 : 0);
              onApplied();
            }}/>
        : property.editable
        ? <TextField
            type="number"
            size="small"
            variant="standard"
            value={value ?? ""}
            placeholder={MIXED}
            inputProps={{min: property.min, max: property.max, "aria-label": property.label}}
            sx={{width: "7ch", "& input": {textAlign: "right"}}}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              // Ignore entries which are incomplete or outside the range every selected component
              // accepts, rather than clamping and surprising the user mid-keystroke.
              if (e.target.value === "" || isNaN(parsed)) {
                return;
              }
              if ((property.min !== undefined && parsed < property.min) ||
                  (property.max !== undefined && parsed > property.max)) {
                return;
              }
              property.apply(parsed);
              onApplied();
            }}/>
        : <Typography variant="body2" className="properties-value">{display}</Typography>}
    </Stack>
  );
}

/**
 * Panel showing the properties of the current selection.
 *
 * Opens from a tab on the right rail, mirroring the parts and project panels on the left, and can
 * be undocked into a floating card.
 */
class Properties extends React.Component<IProps, IState> {
  /** The floating panel's node, for Draggable to move without reaching into the DOM itself. */
  private floating = React.createRef<HTMLDivElement>();

  constructor(props: Readonly<IProps>) {
    super(props);
    this.state = {
      open: false,
      floating: false,
      revealed: false,
    }
  }

  componentDidMount() {
    this.props.board.updateProperties = () => this.setState({});
    this.props.board.revealProperties = () => this.setState({revealed: true});
  }

  componentWillUnmount() {
    this.props.board.updateProperties = () => {};
    this.props.board.revealProperties = () => {};
  }

  /** Whether anything is selected for the panel to describe. */
  hasSelection(): boolean {
    const {selectedComponents, selectedPins} = this.props.board;

    return selectedComponents.size > 0 || selectedPins.size > 0;
  }

  /**
   * Whether the panel is on screen, however it got there.
   *
   * A reveal only counts while its selection lasts; clearing the selection puts the panel away
   * again unless the tab is holding it open.
   */
  visible(): boolean {
    return this.state.open || (this.state.revealed && this.hasSelection());
  }

  /** Puts the panel away, whichever of the two things was keeping it up. */
  hide() {
    this.setState({open: false, revealed: false});
  }

  /** The selection's shared type name, or a placeholder when it is mixed. */
  selectionType(): string {
    const labels = new Set([...this.props.board.selectedComponents].map(c => c.label));
    if (labels.size === 0) {
      return "";
    }

    return labels.size === 1 ? [...labels][0] : MIXED;
  }

  renderBody() {
    const components = [...this.props.board.selectedComponents];
    const pins = [...this.props.board.selectedPins];

    if (components.length === 0 && pins.length === 0) {
      return (
        <Box className="properties-body">
          <Typography variant="body2" color="text.secondary">No selection</Typography>
        </Box>
      );
    }

    // Pins carry a fixed set of properties of their own. Keyed by the selection so that the fields,
    // which hold what has been typed but not yet applied, start afresh when the selection changes.
    if (components.length === 0) {
      return (
        <PinProperties key={pins.map(p => p.uuid).sort().join(",")}
                       board={this.props.board}
                       pins={pins}
                       onApplied={() => this.setState({})}/>
      );
    }

    const properties = this.props.board.selectionProperties();

    return (
      <Box className="properties-body">
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="text.secondary">Type</Typography>
          <Typography variant="body2" className="properties-value">{this.selectionType()}</Typography>
        </Stack>
        {components.length > 1 &&
          <Typography variant="caption" color="text.secondary">
            {components.length} components selected
          </Typography>}
        <Divider/>
        {properties.map(property => (
          <PropertyRow key={property.key} property={property} onApplied={() => this.setState({})}/>
        ))}
      </Box>
    );
  }

  renderHeader() {
    const {floating} = this.state;

    return (
      <Stack id="properties-handle" direction="row" alignItems="center" justifyContent="space-between"
             className={floating ? "properties-header draggable" : "properties-header"}>
        <Typography variant="subtitle2">Properties</Typography>
        <Stack direction="row" alignItems="center">
          <Tooltip title={floating ? "Dock panel" : "Float panel"}>
            <IconButton size="small" aria-label={floating ? "Dock panel" : "Float panel"}
                        onClick={() => this.setState({floating: !floating})}>
              {/* An edge to sit against rather than a pin: the panel is being put back into the
                  side of the window, not fastened where it is. */}
              {floating ? <AlignHorizontalRight fontSize="small"/> : <OpenInNew fontSize="small"/>}
            </IconButton>
          </Tooltip>
          {/* Floating, the rail tab is out of the way, so the panel carries its own way out. */}
          {floating &&
            <Tooltip title="Hide panel">
              <IconButton size="small" aria-label="Hide panel" onClick={() => this.hide()}>
                <Close fontSize="small"/>
              </IconButton>
            </Tooltip>}
        </Stack>
      </Stack>
    );
  }

  render() {
    const {floating} = this.state;
    const visible = this.visible();

    const panel = (
      <Paper className="properties-content" elevation={floating ? 8 : 0} sx={{pointerEvents: "auto"}}>
        {this.renderHeader()}
        <Divider/>
        {this.renderBody()}
      </Paper>
    );

    return (
      <>
        {/* Docked and floating are two places to put one panel, not two panels: whether it is shown
            is the same question either way, and the rail tab answers it in both. */}
        <div className="properties-dock">
          <div className={visible && !floating
            ? "properties-panel"
            : "properties-panel properties-collapsed"}>
            {!floating && panel}
          </div>
        </div>
        {visible && floating &&
          // Handed the node directly, rather than letting Draggable look it up with findDOMNode,
          // which React has deprecated and warns about every time the panel is shown.
          <Draggable handle="#properties-handle" bounds="parent" nodeRef={this.floating}>
            <div ref={this.floating} className="properties-floating">{panel}</div>
          </Draggable>}
        <Divider orientation="vertical" sx={{zIndex: 'drawer'}}/>
        {/*
          * A toggle rather than a tab: this rail holds one control which turns a panel on and off,
          * so ToggleButton's pressed semantics describe it accurately and expose aria-pressed,
          * where a tab would claim to select among siblings that do not exist.
          */}
        <Box sx={{borderLeft: 1, borderColor: 'divider', flexShrink: 0, width: `${RAIL_WIDTH}px`,
                  display: 'flex', flexDirection: 'column'}}>
          <ToggleButton
            value="properties"
            selected={visible}
            onChange={() => visible ? this.hide() : this.setState({open: true})}
            aria-label="Properties panel"
            sx={{
              ...railTabSx,
              borderRadius: 0,
              borderWidth: 0,
              // Reserved up front so selecting the tab does not shift its contents.
              borderLeft: '3px solid transparent',
              textTransform: 'uppercase',
              fontSize: '0.875rem',
              fontWeight: 500,
              letterSpacing: '0.02857em',
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
                bgcolor: 'action.selected',
                borderLeftColor: 'primary.main',
              },
              '&.Mui-selected:hover': {bgcolor: 'action.selected'},
            }}>
            {/* Icon first so it sits above the downward-reading label, keeping it on the label's
                left from the reader's point of view. */}
            <Box sx={railLabelSx}>
              <PropertiesIcon/>
              <Box sx={railTextDownSx}>Properties</Box>
            </Box>
          </ToggleButton>
        </Box>
      </>
    );
  }
}

export {Properties};
