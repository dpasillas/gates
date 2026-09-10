import React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import {PackageDialog, Symbol} from "./PackageDialog";
import {LogicBoard} from "../logic/LogicBoard";
import {PackageComponent} from "../logic/PackageComponent";
import {PinType} from "../logic/LogicPin";
import {bindByName, boardHash, defineComponent, usesComponent} from "../logic/ComponentDefinition";
import {boardPorts} from "../logic/packageFromBoard";
import {copyOf} from "../logic/packageFile";
import {packageForBoard} from "../logic/packageFromBoard";
import type {BoardPort} from "../logic/packageFromBoard";
import type {ComponentDefinition, PortBinding} from "../logic/ComponentDefinition";
import "../css/ComponentDialog.css";

/**
 * Binding a board's ports to a package's pins, which is what makes a component.
 *
 * The package is chosen rather than drawn here: authoring one is its own editor, and the two were
 * split because defining packaging and defining a mapping in one dialog read as confusing. **Auto**
 * is the way out of choosing at all — it derives a package from the board's own ports, by the same
 * defaults the packaging editor starts from.
 *
 * What is shown is the real symbol, drawn by the same component the board draws.
 */

/** The option that stands for a package derived from the board rather than chosen. */
const AUTO = "auto";

/** The option that opens the packaging editor instead of picking something already made. */
const NEW = "new";

/** A pin, the port bound to it, and anything wrong with the pair. */
interface Row {
  id: string;
  label: string;
  type: PinType;
  width: number;
  port: string;
  problem?: string;
}

interface IProps {
  /** The board to start on: the one in front for a new component, its own for one being edited. */
  board: LogicBoard;
  /** The boards to choose between. */
  boards: LogicBoard[];
  packages: PackageComponent[];
  /** The component being changed, when this is not a new one. */
  existing?: ComponentDefinition;
  onCancel: () => void;
  onSave: (definition: ComponentDefinition) => void;
  /** Takes a package authored from here into the project, so that it outlives this dialog. */
  onCreatePackage: (pkg: PackageComponent) => void;
}

interface IState {
  name: string;
  /** Which board is behind the component. */
  boardId: string;
  /**
   * Whether a fresh copy of the board is to be taken when this is saved.
   *
   * Off by default when editing: binding a component differently is not a reason to take a new copy
   * of the board behind it, so the copy it already holds is kept until an update is asked for.
   */
  refreshing: boolean;
  /** Which package, or {@link AUTO}. */
  choice: string;
  /** The chosen package, copied, so that changing nothing here changes nothing in the project. */
  packaging: PackageComponent;
  /** Package pin id to board port name. Empty means the pin has nothing bound to it. */
  binding: Map<string, string>;
  /** The package being authored over this dialog, while the editor is up. */
  authoring?: PackageComponent;
  /**
   * A package authored from here.
   *
   * Offered alongside the project's own until the project's list catches up, so that the dropdown
   * can show what was just made rather than going blank waiting to be told about it.
   */
  authored?: PackageComponent;
}

/** The package a choice stands for, always a copy of it. */
function packageFor(choice: string, board: LogicBoard, packages: PackageComponent[],
                    name: string): PackageComponent {
  const chosen = packages.find(pkg => pkg.uuid === choice);

  return chosen ? copyOf(chosen) : packageForBoard(board, name);
}

function ports(board: LogicBoard): BoardPort[] {
  return boardPorts(board);
}

class ComponentDialog extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    const existing = props.existing;
    const name = existing?.name ?? props.board.name;
    const packaging = existing ? copyOf(existing.packaging) : packageForBoard(props.board, name);

    this.state = {
      name,
      boardId: props.board.id,
      refreshing: !existing,
      // Only a package the project still offers can be the selection. One derived by auto belongs
      // to the component rather than the project, so it is never in the list and reads as auto.
      choice: props.packages.some(pkg => pkg.uuid === existing?.source.packageId)
          ? existing!.source.packageId
          : AUTO,
      packaging,
      binding: existing
          ? new Map(existing.ports)
          : plain(bindByName(packaging, props.board)),
    };
  }

  /** The board the component is being built on, which is the one the dropdown names. */
  private board(): LogicBoard {
    return this.props.boards.find(board => board.id === this.state.boardId) ?? this.props.board;
  }

  /**
   * Puts the component on a different board.
   *
   * A different board is a different set of ports, so what is bound carries over only where the
   * name still exists there, and a packaging derived by auto is derived again. It is also a new
   * copy to take, since the one held was of the board being left.
   */
  private chooseBoard(boardId: string) {
    this.setState({boardId, refreshing: boardId !== this.props.existing?.source.boardId},
                  () => this.choose(this.state.choice));
  }

  /**
   * Asks for a fresh copy of the board, which is not taken until this is saved.
   *
   * Kept apart from every other edit here: a component holds its board, and quietly re-taking that
   * copy whenever anything else was changed is the thing embedding exists to avoid.
   */
  private refresh() {
    this.setState({refreshing: true}, () => this.choose(this.state.choice));
  }

  /**
   * Takes a different package, keeping every binding that still names a port on it.
   *
   * `offered` is the list to look the choice up in, which is the project's unless a package has
   * just been authored here and the project has not yet been told about it.
   */
  private choose(choice: string, offered: PackageComponent[] = this.offered()) {
    const packaging = packageFor(choice, this.board(), offered, this.state.name);
    const carried = new Map<string, string>();
    for (const pin of packaging.declared) {
      const was = this.state.packaging.declared.find(other => other.label === pin.label);
      const port = was ? this.state.binding.get(was.uuid) : undefined;
      if (port) {
        carried.set(pin.uuid, port);
      }
    }

    this.setState({
      choice,
      packaging,
      // Nothing carried over means this is the first look at the package, so start from the obvious
      // binding rather than from nothing.
      binding: carried.size > 0 ? carried : plain(bindByName(packaging, this.board())),
    });
  }

  /**
   * Opens the packaging editor without disturbing the choice behind it.
   *
   * Cancelling leaves the dropdown showing what it showed before, since nothing was chosen; saving
   * puts the package in the project and selects it, which is what asking for a new one meant.
   */
  private authorPackage() {
    this.setState({
      authoring: new PackageComponent(
          {scope: this.board().scope, name: `${this.state.name || "component"} package`}),
    });
  }

  private tookPackage(saved: PackageComponent) {
    this.props.onCreatePackage(saved);
    this.setState({authoring: undefined, authored: saved});
    this.choose(saved.uuid, this.offered(saved));
  }

  /** The packages to choose between: the project's, and one authored here it has yet to hold. */
  private offered(extra: PackageComponent | undefined = this.state.authored): PackageComponent[] {
    return extra && !this.props.packages.some(pkg => pkg.uuid === extra.uuid)
        ? [...this.props.packages, extra]
        : this.props.packages;
  }

  private bind(pin: string, port: string) {
    const binding = new Map(this.state.binding);
    if (port) {
      binding.set(pin, port);
    } else {
      binding.delete(pin);
    }
    this.setState({binding});
  }

  /**
   * Every pin, what is bound to it, and what is wrong with that.
   *
   * A pin with no port does nothing on the board, and a pin narrower or wider than its port cannot
   * carry it, so both are refused rather than saved and puzzled over later.
   */
  private rows(): Row[] {
    const found = ports(this.board());
    const taken = new Map<string, number>();
    for (const port of this.state.binding.values()) {
      taken.set(port, (taken.get(port) ?? 0) + 1);
    }

    return this.state.packaging.declared.map(pin => {
      const port = this.state.binding.get(pin.uuid) ?? "";
      const bound = found.find(other => other.name === port);
      const row: Row = {
        id: pin.uuid,
        label: pin.label || "unnamed pin",
        type: pin.pinType,
        width: pin.width,
        port,
      };

      if (!port) {
        row.problem = "No port bound";
      } else if (!bound) {
        row.problem = `The board has no port "${port}"`;
      } else if (bound.width !== pin.width) {
        row.problem = `${bound.width} bits wide on the board, ${pin.width} here`;
      } else if ((taken.get(port) ?? 0) > 1) {
        row.problem = "Two pins bound to one port";
      }

      return row;
    });
  }

  /** Ports the board offers that no pin takes, which is a component leaving something behind. */
  private unused(): string[] {
    const bound = new Set(this.state.binding.values());

    return ports(this.board()).filter(port => !bound.has(port.name)).map(port => port.name);
  }

  /** Whether the board has moved on since the copy this component holds was taken. */
  private behind(): boolean {
    const existing = this.props.existing;

    return Boolean(existing)
        && this.state.boardId === existing!.source.boardId
        && boardHash(this.board()) !== existing!.source.boardHash;
  }

  /** What the chosen board would make this component contain, which must not be itself. */
  private circular(): boolean {
    return Boolean(this.props.existing)
        && usesComponent(this.board(), this.props.existing!.uuid);
  }

  private save() {
    const binding = new Map<string, PortBinding>(
        [...this.state.binding].map(([pin, port]) => [pin, {port}]));
    const packaging = this.state.packaging;
    packaging.name = packaging.name || this.state.name;
    const existing = this.props.existing;

    const made = defineComponent({
      name: this.state.name,
      board: this.board(),
      packaging,
      binding,
      // The copy it already holds, unless a new one was asked for or it is a different board now.
      held: existing && !this.state.refreshing
          ? {contents: existing.contents, boardHash: existing.source.boardHash}
          : undefined,
    });
    if (existing) {
      made.uuid = existing.uuid;
    }
    this.props.onSave(made);
  }

  private renderRow(row: Row) {
    const found = ports(this.board()).filter(port => port.type === row.type);

    return (
      <div className="component-row" key={row.id}>
        <span className="component-row-pin">
          <span className="component-row-name">{row.label}</span>
          <span className="component-row-kind">
            {row.type === PinType.INPUT ? "input" : "output"}
            {row.width > 1 && ` · ${row.width} bits`}
          </span>
        </span>
        <Select className="component-row-port" size="small" variant="outlined"
                displayEmpty
                value={found.some(port => port.name === row.port) ? row.port : ""}
                onChange={e => this.bind(row.id, e.target.value as string)}
                inputProps={{"aria-label": `Port for ${row.label}`}}>
          <MenuItem value="">
            <em>Not bound</em>
          </MenuItem>
          {found.map(port => (
            <MenuItem key={port.name} value={port.name}>
              {port.name}{port.width > 1 && ` [${port.width}]`}
            </MenuItem>
          ))}
        </Select>
        <span className="component-row-problem">{row.problem}</span>
      </div>
    );
  }

  render() {
    const rows = this.rows();
    const problems = rows.filter(row => row.problem);
    const unused = this.unused();
    const named = this.state.name.trim();
    const circular = this.circular();
    const behind = this.behind();

    return (
      <Dialog open onClose={this.props.onCancel} maxWidth="md" fullWidth
              className="component-dialog"
              PaperProps={{className: "component-dialog-paper"}}>
        <DialogTitle>
          {this.props.existing ? "Edit Component" : "Create Component from Board"}
          <Typography variant="body2" color="text.secondary">
            A component is a board put behind a packaging. Bind each pin of the packaging to one of
            the board's ports; Auto derives a packaging from those ports.
          </Typography>
        </DialogTitle>
        <DialogContent dividers className="component-dialog-body">
          <div className="component-symbol-pane">
            <Typography className="component-section" variant="caption">Symbol</Typography>
            <Symbol pkg={this.state.packaging}/>
          </div>
          <div className="component-form-pane">
            <TextField label="Component name" size="small" fullWidth
                       value={this.state.name}
                       inputProps={{"aria-label": "Component name"}}
                       onChange={e => this.setState({name: e.target.value})}/>

            <div className="component-board-row">
              <FormControl className="component-board" size="small" fullWidth>
                <InputLabel id="component-board-label">Board</InputLabel>
                <Select labelId="component-board-label" label="Board"
                        value={this.state.boardId}
                        onChange={e => this.chooseBoard(e.target.value as string)}>
                  {this.props.boards.map(board => (
                    <MenuItem key={board.id} value={board.id}>{board.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* Kept as its own action: a component holds a copy of its board, and taking a new
                  one is a decision rather than a side effect of any other edit here. */}
              {this.props.existing &&
                <Button size="small" variant="outlined"
                        disabled={!behind || this.state.refreshing}
                        onClick={this.refresh.bind(this)}>
                  {this.state.refreshing ? "Will update" : "Update"}
                </Button>}
            </div>
            {this.props.existing && behind && !this.state.refreshing &&
              <Typography className="component-warning" variant="body2">
                This board has changed since the component was built from it. Saving keeps the copy
                it holds; Update takes a new one.
              </Typography>}
            {circular &&
              <Typography className="component-problem" variant="body2" color="error">
                {this.board().name} has this component on it, so building from it would make the
                component contain itself.
              </Typography>}

            <FormControl className="component-packaging" size="small" fullWidth>
              <InputLabel id="component-packaging-label">Packaging</InputLabel>
              <Select labelId="component-packaging-label" label="Packaging"
                      value={this.state.choice}
                      onChange={e => e.target.value === NEW
                          ? this.authorPackage()
                          : this.choose(e.target.value as string)}>
                <MenuItem value={AUTO}>Auto — from this board's ports</MenuItem>
                {this.offered().map(pkg => (
                  <MenuItem key={pkg.uuid} value={pkg.uuid}>
                    {pkg.name || "untitled package"}
                  </MenuItem>
                ))}
                <MenuItem value={NEW}>New package…</MenuItem>
              </Select>
            </FormControl>

            <Typography className="component-section" variant="caption">Pins</Typography>
            {rows.length === 0
              ? <Typography variant="body2" color="text.secondary">
                  This packaging declares no pins.
                </Typography>
              : rows.map(row => this.renderRow(row))}

            {unused.length > 0 &&
              <Typography className="component-warning" variant="body2">
                Not bound to anything: {unused.join(", ")}. The component will not expose{" "}
                {unused.length > 1 ? "them" : "it"}.
              </Typography>}
          </div>
        </DialogContent>
        <DialogActions>
          <Typography className="component-problem" variant="body2" color="error">
            {problems.length > 0 &&
              `${problems.length} pin${problems.length > 1 ? "s" : ""} still to bind`}
          </Typography>
          <Button onClick={this.props.onCancel}>Cancel</Button>
          <Button variant="contained"
                  disabled={problems.length > 0 || rows.length === 0 || !named || circular}
                  onClick={this.save.bind(this)}>
            Save Component
          </Button>
        </DialogActions>
        {this.state.authoring &&
          <PackageDialog package={this.state.authoring}
                         onCancel={() => this.setState({authoring: undefined})}
                         onSave={this.tookPackage.bind(this)}/>}
      </Dialog>
    );
  }
}

/** The port names alone, which is all this dialog binds — a channel is not yet offered. */
function plain(binding: Map<string, PortBinding>): Map<string, string> {
  return new Map([...binding].map(([pin, bound]) => [pin, bound.port]));
}

export {ComponentDialog};
