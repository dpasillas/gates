import React from "react"
import Draggable from "react-draggable"

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import OpenInNew from "@mui/icons-material/OpenInNew";
import PushPin from "@mui/icons-material/PushPin";

import {LogicBoard} from "../logic/LogicBoard";
import {mergeProperties, MergedProperty} from "../util/mergeProperties";
import {PropertiesIcon} from "./RailIcons";
import {RAIL_WIDTH, railTabSx, railLabelSx, railTextDownSx} from "./railStyle";
import "../css/Properties.css"

/** Shown in place of a value when the selection does not agree on one. */
const MIXED = "-";

interface IProps {
  board: LogicBoard;
}

interface IState {
  open: boolean;
  floating: boolean;
}

interface RowProps {
  property: MergedProperty;
}

/**
 * One property, rendered as a static value or an input depending on whether the whole selection
 * allows editing it.
 */
function PropertyRow({property}: RowProps) {
  const {value, precision} = property;
  const display = value === undefined ? MIXED : value.toFixed(precision ?? 0);

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
      <Typography variant="body2" color="text.secondary">{property.label}</Typography>
      {property.editable
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
  constructor(props: Readonly<IProps>) {
    super(props);
    this.state = {
      open: false,
      floating: false,
    }
  }

  componentDidMount() {
    this.props.board.updateProperties = () => this.setState({});
  }

  componentWillUnmount() {
    this.props.board.updateProperties = () => {};
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

    if (components.length === 0) {
      return (
        <Box className="properties-body">
          <Typography variant="body2" color="text.secondary">No selection</Typography>
        </Box>
      );
    }

    const properties = mergeProperties(components.map(c => c.properties()));

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
        {properties.map(property => <PropertyRow key={property.key} property={property}/>)}
      </Box>
    );
  }

  renderHeader() {
    const {floating} = this.state;

    return (
      <Stack id="properties-handle" direction="row" alignItems="center" justifyContent="space-between"
             className={floating ? "properties-header draggable" : "properties-header"}>
        <Typography variant="subtitle2">Properties</Typography>
        <Tooltip title={floating ? "Dock panel" : "Float panel"}>
          <IconButton size="small" aria-label={floating ? "Dock panel" : "Float panel"}
                      onClick={() => this.setState({floating: !floating})}>
            {floating ? <PushPin fontSize="small"/> : <OpenInNew fontSize="small"/>}
          </IconButton>
        </Tooltip>
      </Stack>
    );
  }

  render() {
    const {open, floating} = this.state;

    const panel = (
      <Paper className="properties-content" elevation={floating ? 8 : 0} sx={{pointerEvents: "auto"}}>
        {this.renderHeader()}
        <Divider/>
        {this.renderBody()}
      </Paper>
    );

    return (
      <>
        {/* Floating panels are detached from the rail, so the rail only reflects the docked state. */}
        <div className="properties-dock">
          <div className={open && !floating ? "properties-panel" : "properties-panel properties-collapsed"}>
            {!floating && panel}
          </div>
        </div>
        {floating &&
          <Draggable handle="#properties-handle" bounds="parent">
            <div className="properties-floating">{panel}</div>
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
            selected={open}
            onChange={() => this.setState({open: !open})}
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
