import React from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";

import {GLOBAL_SCOPE} from "../Constants";
import {LogicPin, PinOrientation, PinType} from "../logic/LogicPin";
import {CornerMark, PackageDivider, PackageGroup, PackageShape} from "../enums/Packaging";
import {PackageComponent} from "../logic/PackageComponent";
import {copyOf} from "../logic/packageFile";
import "../css/PackageDialog.css";

/**
 * Authoring a package.
 *
 * Where a symbol and the contract it draws are declared: the outline, and the pins on it with their
 * names, widths and places. It says nothing about a board — binding one comes later, in the dialog
 * that makes a component — so the same package can be authored once and put in front of several.
 *
 * Edited on a copy, so that cancelling leaves the package exactly as it was found.
 */

/** What an edge is called, which is not what the direction a pin on it points is called. */
const EDGE_NAMES = {
  [PinOrientation.UP]: "Top",
  [PinOrientation.RIGHT]: "Right",
  [PinOrientation.DOWN]: "Bottom",
  [PinOrientation.LEFT]: "Left",
  [PinOrientation.UNKNOWN]: "Left",
};

/** How wide a pin may be, which is what a bus on one can carry. */
const MIN_WIDTH = 1;
const MAX_WIDTH = 64;

/** The colour an edge is picked out in, which is what the symbol marks the chosen pin with. */
const HIGHLIGHT = "#f9a825";

/**
 * A square with one edge picked out in the colour the symbol uses for the pin being edited.
 *
 * The same icon says which edge a pin is on in its row and which edge a button would move it to,
 * so the two read as the same thing rather than two conventions.
 */
function EdgeIcon({side}: {side: PinOrientation}) {
  const edge = {
    [PinOrientation.LEFT]: [4, 4, 4, 16],
    [PinOrientation.RIGHT]: [16, 4, 16, 16],
    [PinOrientation.UP]: [4, 4, 16, 4],
    [PinOrientation.DOWN]: [4, 16, 16, 16],
  }[side as PinOrientation.LEFT] ?? [4, 4, 4, 16];

  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
      <rect x="4" y="4" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"
            opacity="0.5"/>
      <line x1={edge[0]} y1={edge[1]} x2={edge[2]} y2={edge[3]} stroke={HIGHLIGHT}
            strokeWidth="2.6"/>
    </svg>
  );
}

/**
 * The smallest body of a given shape, drawn to fit the icon box.
 *
 * Built as the package it stands for, so an icon is a picture of what picking it produces rather
 * than a hand-drawn impression that can drift from it.
 */
function OutlineIcon({shape, orientation}: {shape: PackageShape, orientation?: PinOrientation}) {
  const smallest = new PackageComponent({scope: GLOBAL_SCOPE});
  smallest.shape = shape;
  if (orientation !== undefined) {
    smallest.facing = orientation;
  }
  smallest.rebuild();
  const {width, height} = smallest.body.bounds;
  const margin = Math.max(width, height) * 0.12;

  return (
    <svg viewBox={`${-margin} ${-margin} ${width + 2 * margin} ${height + 2 * margin}`}
         width="20" height="20" fill="none" preserveAspectRatio="xMidYMid meet">
      {/* Drawn in screen units, so the line stays the same weight however far the body is scaled
          down to fit the box. */}
      <path d={smallest.d} fill="none" stroke="currentColor" strokeWidth="1.3"
            strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

/**
 * The package as it will be drawn on a board.
 *
 * Rendered through the component's own renderer rather than a second one written for the dialog,
 * so what is being authored is what will be placed.
 */
function Symbol({pkg, onPick}: {pkg: PackageComponent, onPick: (pin: LogicPin) => void}) {
  // Framed on the middle of the body rather than on everything drawn, so that adding a pin to one
  // side grows the frame on both and the body stays where the eye left it.
  const body = pkg.body.bounds;
  const all = pkg.geometry.bounds;
  const margin = 16;
  const across = Math.max(body.center.x - all.left, all.right - body.center.x) + margin;
  const down = Math.max(body.center.y - all.top, all.bottom - body.center.y) + margin;

  return (
    <svg className="package-symbol" width="100%" height={200}
         viewBox={`${body.center.x - across} ${body.center.y - down} `
                + `${2 * across} ${2 * down}`}
         preserveAspectRatio="xMidYMid meet">
      {pkg.render({onPinMouseDown: pin => onPick(pin)})}
    </svg>
  );
}

function DividerIcon({divider}: {divider: PackageDivider}) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
      <rect x="4" y="4" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"
            opacity="0.5"/>
      {divider === PackageDivider.VERTICAL &&
        <line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" strokeWidth="1.8"/>}
      {divider === PackageDivider.HORIZONTAL &&
        <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1.8"/>}
    </svg>
  );
}

function CornerIcon({corner}: {corner: CornerMark}) {
  const at = {
    [CornerMark.TOP_LEFT]: [6.5, 6.5],
    [CornerMark.TOP_RIGHT]: [13.5, 6.5],
    [CornerMark.BOTTOM_LEFT]: [6.5, 13.5],
    [CornerMark.BOTTOM_RIGHT]: [13.5, 13.5],
  }[corner as CornerMark.TOP_LEFT];

  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
      <rect x="4" y="4" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"
            opacity="0.5"/>
      {at && <circle cx={at[0]} cy={at[1]} r="1.8" fill="currentColor"/>}
    </svg>
  );
}

/** What each mark on the symbol means, since none of them carries its own caption. */
function Legend() {
  return (
    <div className="package-legend">
      <span>
        <svg width="22" height="12" viewBox="0 0 22 12">
          <path d="M1,2.8 L17.5,2.8 L20,6 L17.5,9.2 L1,9.2" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M8,10 L12,2" stroke="currentColor" strokeWidth="1.25" fill="none"/>
        </svg>
        Bus (multi-bit)
      </span>
      <span>
        <svg width="16" height="14" viewBox="0 0 16 14">
          <path d="M4,3 L11,7 L4,11" stroke="currentColor" strokeWidth="1.6" fill="none"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Clock indicator
      </span>
      <span>
        <svg width="12" height="12" viewBox="0 0 12 12">
          <circle cx="6" cy="6" r="3.5" fill="#c62828"/>
        </svg>
        Needs label
      </span>
      <span>
        <svg width="22" height="10" viewBox="0 0 22 10">
          <line x1="1" y1="5" x2="21" y2="5" stroke={HIGHLIGHT} strokeWidth="3"
                strokeLinecap="round"/>
        </svg>
        Selected
      </span>
    </div>
  );
}

/** A row of buttons, one of which is chosen. */
function Picker<T>({value, options, onChange, label}: {
  value: T,
  options: {value: T, title: string, icon: React.ReactNode}[],
  onChange: (value: T) => void,
  label: string,
}) {
  return (
    <>
      <Typography className="package-field-label" variant="caption">{label}</Typography>
      <ToggleButtonGroup exclusive size="small" value={value}
                         onChange={(_, picked) => picked !== null && onChange(picked as T)}>
        {options.map(option => (
          <ToggleButton key={String(option.value)} value={option.value as never}
                        title={option.title} aria-label={option.title}>
            {option.icon}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </>
  );
}

interface IProps {
  /** The package to author. Left alone: what is edited is a copy of it. */
  package: PackageComponent;
  title?: string;
  confirm?: string;
  onCancel: () => void;
  onSave: (pkg: PackageComponent) => void;
}

interface IState {
  package: PackageComponent;
  /** Which pin the editor below the columns is showing. */
  selectedId?: string;
}

class PackageDialog extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    const working = copyOf(props.package);
    this.state = {package: working, selectedId: working.declared[0]?.uuid};
  }

  private get selected(): LogicPin | undefined {
    return this.state.package.declared.find(pin => pin.uuid === this.state.selectedId);
  }

  /**
   * Runs a change against the working copy, which is what the symbol is drawn from.
   *
   * A clock mark is dropped if the change leaves it on a slanted edge: the chevron points out of
   * the body, and an edge that meets no other at a right angle gives it no direction to point in.
   */
  private edit(change: (pkg: PackageComponent) => void) {
    const working = this.state.package;
    change(working);
    working.declared.forEach(pin => {
      if (pin.clock && working.isSlanted(pin.orientation)) {
        pin.clock = false;
      }
    });
    working.rebuild();
    this.setState({});
  }

  private editSelected(change: (pin: LogicPin) => void) {
    const id = this.state.selectedId;
    this.edit(pkg => {
      const pin = pkg.declared.find(other => other.uuid === id);
      if (pin) {
        change(pin);
      }
    });
  }

  private addPin(type: PinType) {
    const pin = this.state.package.declarePin({pinType: type});
    this.edit(() => {});
    this.setState({selectedId: pin.uuid});
  }

  /**
   * Takes a pin off the package.
   *
   * The editor moves to whatever is left rather than emptying, so that removing several in a row
   * does not mean picking the next one out of the columns each time.
   */
  private removePin(pin: LogicPin) {
    const remaining = this.state.package.declared.filter(other => other !== pin);
    const at = this.state.package.declared.indexOf(pin);
    this.edit(pkg => pkg.removePin(pin));
    if (this.state.selectedId === pin.uuid) {
      this.setState({selectedId: (remaining[at] ?? remaining[at - 1])?.uuid});
    }
  }

  private renderColumn(type: PinType, heading: string) {
    const pins = this.state.package.declared.filter(pin => pin.pinType === type);
    const kind = type === PinType.INPUT ? "input" : "output";

    return (
      <div className={`package-pin-column ${kind}`}>
        <div className="package-pin-column-head">
          <span className="package-pin-column-name">{heading}</span>
          <Button size="small" className="package-pin-add"
                  aria-label={`Add ${kind}`} title={`Add ${kind}`}
                  onClick={() => this.addPin(type)}>+</Button>
        </div>
        {pins.length === 0 &&
          <div className="package-pin-empty">No {kind}s</div>}
        {pins.map(pin => (
          <Box key={pin.uuid}
               className={`package-pin-row${pin.uuid === this.state.selectedId ? " selected" : ""}`}
               role="button" tabIndex={0}
               onClick={() => this.setState({selectedId: pin.uuid})}>
            <span className="package-pin-name">
              {pin.label?.trim()
                ? pin.label
                : <em className="package-pin-unnamed">needs label</em>}
              {pin.width > 1 && <span className="package-pin-width">[{pin.width}]</span>}
            </span>
            <EdgeIcon side={pin.orientation}/>
            <Button size="small" className="package-pin-remove"
                    aria-label={`Remove ${pin.label?.trim() || "pin"}`}
                    onClick={e => {e.stopPropagation(); this.removePin(pin)}}>×</Button>
          </Box>
        ))}
      </div>
    );
  }

  /**
   * What one side of the divider is called for the pin being edited.
   *
   * A line down the body splits the edges it crosses into a left run and a right one; a line across
   * it splits them into a top run and a bottom one. Naming the run by where it is beats naming it
   * "group one", which says nothing about where the pin would land.
   */
  private groupName(group: PackageGroup): string {
    const first = this.state.package.divider === PackageDivider.VERTICAL ? "Left" : "Top";
    const second = this.state.package.divider === PackageDivider.VERTICAL ? "Right" : "Bottom";

    return group === PackageGroup.FIRST ? first : second;
  }

  private renderSelectedPin() {
    const pin = this.selected;
    if (!pin) {
      return (
        <div className="package-selected empty">
          <Typography variant="body2" color="text.secondary">
            Add a pin, or pick one to edit it.
          </Typography>
        </div>
      );
    }

    const slanted = this.state.package.isSlanted(pin.orientation);
    const divided = this.state.package.isDivided(pin.orientation);

    return (
      <div className="package-selected">
        <Typography className="package-section" variant="caption">Selected pin</Typography>
        <div className="package-fields">
          <Typography className="package-field-label" variant="caption">Label</Typography>
          <TextField size="small" variant="outlined" fullWidth
                     id="package-pin-label" inputProps={{"aria-label": "Pin label"}}
                     value={pin.label ?? ""}
                     onChange={e => this.editSelected(edited => {edited.label = e.target.value})}/>

          <Picker label="Role" value={pin.pinType}
                  onChange={type => this.editSelected(edited => {edited.pinType = type})}
                  options={[
                    {value: PinType.INPUT, title: "Input", icon: <span>Input</span>},
                    {value: PinType.OUTPUT, title: "Output", icon: <span>Output</span>},
                  ]}/>

          <Typography className="package-field-label" variant="caption">Width</Typography>
          <div className="package-width">
            <TextField size="small" variant="outlined" type="number"
                       id="package-pin-width"
                       inputProps={{min: MIN_WIDTH, max: MAX_WIDTH, "aria-label": "Pin width"}}
                       value={pin.width}
                       onChange={e => this.editSelected(edited => {
                         const width = Math.round(Number(e.target.value));
                         edited.width = Math.min(Math.max(width || MIN_WIDTH, MIN_WIDTH), MAX_WIDTH);
                       })}/>
            <span className="package-hint-inline">bits</span>
          </div>

          <Picker label="Side" value={pin.orientation}
                  onChange={side => this.editSelected(edited => {edited.orientation = side})}
                  options={[PinOrientation.UP, PinOrientation.RIGHT,
                            PinOrientation.DOWN, PinOrientation.LEFT].map(side => ({
                    value: side,
                    title: `${EDGE_NAMES[side]} edge`,
                    icon: <EdgeIcon side={side}/>,
                  }))}/>

          {divided && <Picker label="Group" value={pin.group}
                              onChange={group => this.editSelected(edited => {
                                edited.group = group;
                              })}
                              options={[PackageGroup.FIRST, PackageGroup.SECOND].map(group => ({
                                value: group,
                                title: this.groupName(group),
                                icon: <span>{this.groupName(group)}</span>,
                              }))}/>}

          <Typography className="package-field-label" variant="caption">Clock</Typography>
          <div className="package-inline">
            <FormControlLabel
                label="Clock-edge marker"
                control={<Checkbox size="small" checked={pin.clock} disabled={slanted}
                                   onChange={e => this.edit(pkg => pkg.setClockPin(
                                       e.target.checked
                                           ? pkg.declared.find(other => other.uuid === pin.uuid)
                                           : undefined))}/>}/>
            <span className="package-hint-inline">
              {slanted ? "(not on a slanted edge)" : "(one pin only)"}
            </span>
          </div>

          <Typography className="package-field-label" variant="caption">Active low</Typography>
          <div className="package-inline">
            <FormControlLabel
                label="Bubble on the pin"
                control={<Checkbox size="small" checked={pin.not}
                                   onChange={e => this.editSelected(edited => {
                                     edited.not = e.target.checked;
                                   })}/>}/>
          </div>

          <Typography className="package-field-label" variant="caption">Label</Typography>
          <div className="package-inline">
            <FormControlLabel
                label="Show label"
                control={<Checkbox size="small" checked={pin.showLabel}
                                   onChange={e => this.editSelected(edited => {
                                     edited.showLabel = e.target.checked;
                                   })}/>}/>
            <ToggleButton className="package-bold" size="small" value="bold"
                          selected={pin.labelBold} disabled={!pin.showLabel}
                          title="Bold" aria-label="Bold"
                          onChange={() => this.editSelected(edited => {
                            edited.labelBold = !edited.labelBold;
                          })}>B</ToggleButton>
          </div>
        </div>
      </div>
    );
  }

  private renderShape() {
    const pkg = this.state.package;

    return (
      <div className="package-fields">
        <Typography className="package-field-label" variant="caption">Name</Typography>
        <TextField size="small" variant="outlined" fullWidth
                   id="package-name" inputProps={{"aria-label": "Package name"}}
                   value={pkg.name}
                   onChange={e => this.edit(working => {working.name = e.target.value})}/>

        <Picker label="Shape" value={pkg.shape}
                onChange={shape => this.edit(working => {working.shape = shape})}
                options={[PackageShape.RECTANGLE, PackageShape.TRAPEZOID].map(shape => ({
                  value: shape,
                  title: shape === PackageShape.RECTANGLE ? "Rectangle" : "Trapezoid",
                  icon: <OutlineIcon shape={shape} orientation={pkg.facing}/>,
                }))}/>

        {pkg.shape === PackageShape.TRAPEZOID
          ? <Picker label="Points" value={pkg.facing}
                    onChange={orientation => this.edit(working => {
                      working.facing = orientation;
                    })}
                    options={[PinOrientation.UP, PinOrientation.RIGHT,
                              PinOrientation.DOWN, PinOrientation.LEFT].map(orientation => ({
                      value: orientation,
                      title: `Points ${EDGE_NAMES[orientation].toLowerCase()}`,
                      icon: <OutlineIcon shape={PackageShape.TRAPEZOID} orientation={orientation}/>,
                    }))}/>
          : <>
              <Picker label="Divider" value={pkg.divider}
                      onChange={divider => this.edit(working => {working.divider = divider})}
                      options={[PackageDivider.NONE, PackageDivider.VERTICAL,
                                PackageDivider.HORIZONTAL].map(divider => ({
                        value: divider,
                        title: PackageDivider[divider].toLowerCase(),
                        icon: <DividerIcon divider={divider}/>,
                      }))}/>
              <Picker label="Corner mark" value={pkg.cornerMark}
                      onChange={corner => this.edit(working => {working.cornerMark = corner})}
                      options={[CornerMark.NONE, CornerMark.TOP_LEFT, CornerMark.TOP_RIGHT,
                                CornerMark.BOTTOM_LEFT, CornerMark.BOTTOM_RIGHT].map(corner => ({
                        value: corner,
                        title: CornerMark[corner].toLowerCase().replace("_", " "),
                        icon: <CornerIcon corner={corner}/>,
                      }))}/>
            </>}
      </div>
    );
  }

  /**
   * Marks the pin the editor is showing, so the symbol says which one is being changed.
   *
   * Set on the pins themselves, which is what the renderer reads, rather than passed down beside
   * them: a pin already knows how to draw itself selected.
   */
  private markSelection() {
    this.state.package.declared.forEach(pin => {
      if (pin.geometry) {
        pin.geometry.selected = pin.uuid === this.state.selectedId;
      }
    });
  }

  render() {
    const pkg = this.state.package;
    const problems = pkg.problems;
    this.markSelection();
    const {title = "Author interface", confirm = "Save interface"} = this.props;

    return (
      <Dialog open onClose={this.props.onCancel} maxWidth="md" fullWidth
              className="package-dialog"
              PaperProps={{className: "package-dialog-paper"}}>
        <DialogTitle>
          {title}
          <Typography variant="body2" color="text.secondary">
            Declare each pin, its width, and where it sits. Saving adds this as a reusable package
            you then bind a board's ports to.
          </Typography>
        </DialogTitle>
        <DialogContent dividers className="package-dialog-body">
          <div className="package-symbol-pane">
            <Typography className="package-section" variant="caption">Symbol</Typography>
            <Symbol pkg={pkg} onPick={pin => this.setState({selectedId: pin.uuid})}/>
            <Typography className="package-hint" variant="caption">
              Grows to fit pins · min padding kept
            </Typography>
            <Legend/>
            {this.renderShape()}
          </div>
          <div className="package-pins-pane">
            <Typography className="package-section" variant="caption">Pins</Typography>
            <div className="package-pin-columns">
              {this.renderColumn(PinType.INPUT, "Input")}
              {this.renderColumn(PinType.OUTPUT, "Output")}
            </div>
            {this.renderSelectedPin()}
          </div>
        </DialogContent>
        <DialogActions className="package-dialog-actions">
          <span className="package-problems">
            {problems.length > 0 &&
              <Typography variant="body2" color="warning.main">⚠ {problems[0]}</Typography>}
          </span>
          <Button onClick={this.props.onCancel}>Cancel</Button>
          <Button variant="contained" disabled={problems.length > 0}
                  onClick={() => this.props.onSave(pkg)}>{confirm}</Button>
        </DialogActions>
      </Dialog>
    );
  }
}

export {PackageDialog};
