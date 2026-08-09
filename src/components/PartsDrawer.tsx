import React from "react";
import Box from "@mui/material/Box"
import Collapse from "@mui/material/Collapse"
import {faChevronRight} from "@fortawesome/free-solid-svg-icons/faChevronRight";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {Part} from "./Part";
import {dragImageHotspot, makeDragGhost, PREVIEW_PADDING} from "../util/partPreview";
import "../css/PartsDrawer.css"

/** Height of a tile's drawing, in pixels. */
const TILE_IMAGE_HEIGHT = 30;

interface IProps {
  label: string,
  parts: Array<Part>,
  /** Held open by the panel while a filter is narrowing the list. */
  forceOpen?: boolean,
  /** Called with the part a drag started from. */
  onPartDragStart?: (part: Part) => void,
}
interface IState {
  open: boolean,
}

/** The area a preview draws, in board units: the component's bounds plus the padding around it. */
function previewBox(part: Part) {
  const {left, top, width, height} = part.component.geometry.bounds;

  return {
    left: left - PREVIEW_PADDING,
    top: top - PREVIEW_PADDING,
    width: width + 2 * PREVIEW_PADDING,
    height: height + 2 * PREVIEW_PADDING,
  };
}

/** One part, drawn to a fixed size and draggable onto the board. */
function PartTile({part, onDragStart}: {part: Part, onDragStart?: (part: Part) => void}) {
  const image = React.useRef<SVGSVGElement>(null);
  const {left, top, width, height} = previewBox(part);
  const box = `${left} ${top} ${width} ${height}`;
  const drawing = part.component.render();

  const handleDragStart = (e: React.DragEvent<HTMLElement>) => {
    Part.data = part;

    if (image.current) {
      const {x, y} = dragImageHotspot(part.component);
      const ghost = makeDragGhost(image.current, width, height);
      e.dataTransfer.setDragImage(ghost, x, y);
      window.setTimeout(() => ghost.remove(), 0);
    }
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(part);
  };

  return (
    <Box className="part"
         draggable
         sx={{bgcolor: "background.paper", border: 1, borderColor: "divider"}}
         onDragStart={handleDragStart}
         onDragEnd={() => {Part.data = undefined}}>
      {/* Scaled to the tile rather than drawn at board size: the parts vary by several times in
          extent, and a grid of tiles sized to their contents does not read as a grid. */}
      <span className="part-image">
        <svg ref={image} viewBox={box} width="100%" height={TILE_IMAGE_HEIGHT}
             preserveAspectRatio="xMidYMid meet">
          {drawing}
        </svg>
      </span>
      <Box component="span" className="part-label" sx={{color: "text.secondary"}}>{part.label}</Box>
      {part.userDefined &&
        <Box component="span" className="part-user-chip" title="User-defined part"
             sx={{color: "primary.main", borderColor: "primary.main"}}>U</Box>}
    </Box>
  );
}

/**
 * One category of parts: a header that opens and closes it, over a grid of its parts.
 *
 * A full suite of components is split across several of these.
 * */
class PartsDrawer extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      open: false,
    }
  }

  /** Whether the parts are on show, by the section's own state or because a filter is on. */
  isOpen(): boolean {
    return this.props.forceOpen || this.state.open;
  }

  render() {
    const open = this.isOpen();
    const userDefined = this.props.parts.length > 0 && this.props.parts.every(p => p.userDefined);

    return (
        <>
          <Box component="button" type="button" className="parts-section-header"
               aria-expanded={open}
               sx={{color: "text.secondary", "&:hover": {bgcolor: "action.hover"}}}
               onClick={this.handleClick.bind(this)}>
            <Box component="span" className="parts-section-label"
                 sx={{color: open ? "primary.main" : "text.secondary"}}>
              {this.props.label}
            </Box>
            {userDefined &&
              <Box component="span" className="part-user-chip" title="User-defined parts"
                   sx={{position: "static", color: "primary.main", borderColor: "primary.main"}}>
                U
              </Box>}
            <FontAwesomeIcon className="parts-section-chevron"
                             icon={faChevronRight}
                             rotation={open ? 90 : undefined}/>
          </Box>

          {/* Unmounted while closed: every tile draws a real component, and the closed sections
              outnumber the open one. */}
          <Collapse in={open} timeout="auto" unmountOnExit>
            <div className="parts-grid">
              {this.props.parts.map(part => (
                <PartTile key={part.component.uuid} part={part}
                          onDragStart={this.props.onPartDragStart}/>
              ))}
            </div>
          </Collapse>
        </>
  )
  }

  handleClick() {
    this.setState((state) => {
      return {
        open: !state.open,
      }
    })
  }
}

export {PartsDrawer};
