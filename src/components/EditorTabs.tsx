import React from "react";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Add from "@mui/icons-material/Add";
import Close from "@mui/icons-material/Close";

import {LogicBoard} from "../logic/LogicBoard";
import {Project} from "../logic/Project";
import {parkForDragImage, releaseDragImage} from "../util/dragImage";
import "../css/EditorTabs.css";

/**
 * What a dragged tab puts on the clipboard.
 *
 * A type of its own so that a part being dragged out of the parts panel and across the tab strip is
 * not mistaken for a tab being reordered.
 */
const TAB_DRAG_TYPE = "application/x-gates-tab";

/** How solid the tab under the cursor is while it is being carried. */
const DRAG_IMAGE_OPACITY = "0.5";

interface IProps {
  project: Project;
  onSelect: (board: LogicBoard) => void;
  onClose: (board: LogicBoard) => void;
  onAdd: () => void;
  onReorder: (moved: LogicBoard, index: number) => void;
}

interface IState {
  /** The tab being dragged, while one is. */
  dragging?: string;
  /** Where in the remaining tabs it would land, while the cursor is over the row. */
  dropIndex?: number;
  /** How wide the gap held open for it should be. */
  gap?: number;
}

/**
 * The row of boards the editor has open.
 *
 * A tab is a board being looked at, not a board existing: closing one leaves it in the project,
 * where the project panel still lists it. The last tab has no close control, since the editor has
 * nothing to show without one.
 *
 * Dragging one lifts it out of the row and holds a gap open where it would land, so the row always
 * shows what it is about to become.
 */
class EditorTabs extends React.Component<IProps, IState> {
  /**
   * The row itself, which is what the drag is tracked against.
   *
   * Tracking the row rather than each tab keeps the gap still: a pointer crossing from a tab onto
   * its own label or close button leaves and re-enters that tab, and an indicator driven by those
   * comings and goings flickers as the cursor moves.
   */
  private readonly strip = React.createRef<HTMLDivElement>();

  constructor(props: IProps) {
    super(props);
    this.state = {};
  }

  private board(id: string): LogicBoard | undefined {
    return this.props.project.boards.find(board => board.id === id);
  }

  /** Whether the row is currently showing a gap in place of the tab being carried. */
  private get lifted(): boolean {
    return this.state.dragging !== undefined && this.state.dropIndex !== undefined;
  }

  /**
   * Where in the row the cursor is pointing, counting only the tabs still in it.
   *
   * The lifted tab is out of the row and the gap holding its width is not a tab, so the tabs
   * measured here are exactly the ones the drop index counts.
   */
  private indexAt(x: number): number {
    const tabs = [...(this.strip.current?.querySelectorAll(".editor-tab:not(.lifted)") ?? [])];
    const at = tabs.findIndex(tab => {
      const {left, width} = tab.getBoundingClientRect();

      return x < left + width / 2;
    });

    return at < 0 ? tabs.length : at;
  }

  /**
   * A faded copy of the tab to carry under the cursor.
   *
   * The row's own background is painted onto it: a tab that is not the one in front draws no
   * background of its own, and the picture is taken against whatever happens to be behind it.
   */
  private dragImage(tab: HTMLElement): HTMLElement {
    const copy = tab.cloneNode(true) as HTMLElement;
    const {width, height} = tab.getBoundingClientRect();

    // Sized to what was measured, padding and border included, so the copy is the same size as the
    // tab it was taken from and stays under the point it was grabbed by.
    copy.style.boxSizing = "border-box";
    copy.style.width = `${width}px`;
    copy.style.height = `${height}px`;
    copy.style.opacity = DRAG_IMAGE_OPACITY;
    if (this.strip.current) {
      copy.style.backgroundColor = getComputedStyle(this.strip.current).backgroundColor;
    }

    return parkForDragImage(copy);
  }

  private handleDragStart(board: LogicBoard, e: React.DragEvent<HTMLElement>) {
    e.dataTransfer.setData(TAB_DRAG_TYPE, board.id);
    e.dataTransfer.effectAllowed = "move";

    const tab = e.currentTarget;
    const {left, top, width} = tab.getBoundingClientRect();
    const carried = this.dragImage(tab);
    e.dataTransfer.setDragImage(carried, e.clientX - left, e.clientY - top);
    releaseDragImage(carried);

    this.setState({dragging: board.id, gap: width});
  }

  private handleDragOver(e: React.DragEvent<HTMLElement>) {
    if (!e.dataTransfer.types.includes(TAB_DRAG_TYPE)) {
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const dropIndex = this.indexAt(e.clientX);
    if (dropIndex !== this.state.dropIndex) {
      this.setState({dropIndex});
    }
  }

  /**
   * Puts the tab back in the row when the cursor leaves it.
   *
   * Only when the cursor has left the row itself: moving between the tabs inside it is not leaving.
   */
  private handleDragLeave(e: React.DragEvent<HTMLElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      this.setState({dropIndex: undefined});
    }
  }

  private handleDrop(e: React.DragEvent<HTMLElement>) {
    if (!e.dataTransfer.types.includes(TAB_DRAG_TYPE)) {
      return;
    }

    e.preventDefault();
    const moved = this.board(e.dataTransfer.getData(TAB_DRAG_TYPE));
    const index = this.state.dropIndex ?? this.indexAt(e.clientX);
    this.setState({dragging: undefined, dropIndex: undefined, gap: undefined});

    if (moved) {
      this.props.onReorder(moved, index);
    }
  }

  renderTab(board: LogicBoard, closable: boolean, lifted: boolean) {
    const {project} = this.props;
    const active = board.id === project.activeBoardId;

    return (
      <Box key={board.id}
           className={`editor-tab${active ? " active" : ""}${lifted ? " lifted" : ""}`}
           role="tab"
           draggable
           aria-selected={active}
           sx={{
             bgcolor: active ? "action.selected" : "transparent",
             borderColor: "divider",
             color: active ? "text.primary" : "text.secondary",
           }}
           onClick={() => this.props.onSelect(board)}
           onDragStart={e => this.handleDragStart(board, e)}
           onDragEnd={() => this.setState({dragging: undefined, dropIndex: undefined, gap: undefined})}>
        <span className="editor-tab-name">{board.name}</span>
        {board.id === project.mainBoard.id &&
          <Box component="span" className="editor-tab-badge"
               sx={{color: "primary.main", borderColor: "primary.main"}}>MAIN</Box>}
        {closable &&
          <IconButton className="editor-tab-close" size="small"
                      aria-label={`Close ${board.name}`}
                      onClick={e => {e.stopPropagation(); this.props.onClose(board)}}>
            <Close fontSize="inherit"/>
          </IconButton>}
      </Box>
    );
  }

  /** The space the carried tab would drop into, the width of the tab itself. */
  renderGap() {
    return (
      <Box key="gap" className="editor-tab-gap"
           style={{width: `${this.state.gap ?? 0}px`}}
           sx={{borderColor: "divider"}}/>
    );
  }

  /** The row, with the carried tab taken out of it and a gap opened where it would land. */
  renderRow(): React.ReactNode[] {
    const open = this.props.project.openBoards();
    const closable = open.length > 1;
    const row: React.ReactNode[] = [];
    let placed = 0;

    for (const board of open) {
      const lifted = this.lifted && board.id === this.state.dragging;
      if (!lifted && placed === this.state.dropIndex) {
        row.push(this.renderGap());
      }
      row.push(this.renderTab(board, closable, lifted));
      if (!lifted) {
        placed++;
      }
    }

    if (this.lifted && placed === this.state.dropIndex) {
      row.push(this.renderGap());
    }

    return row;
  }

  render() {
    return (
      <Box className="editor-tabs" role="tablist" aria-label="Open boards"
           ref={this.strip}
           sx={{bgcolor: "background.paper", borderColor: "divider"}}
           onDragOver={e => this.handleDragOver(e)}
           onDragLeave={e => this.handleDragLeave(e)}
           onDrop={e => this.handleDrop(e)}>
        {this.renderRow()}
        <Tooltip title="New board">
          <IconButton className="editor-tab-add" size="small" aria-label="New board"
                      onClick={this.props.onAdd}>
            <Add fontSize="inherit"/>
          </IconButton>
        </Tooltip>
      </Box>
    );
  }
}

export {EditorTabs};
