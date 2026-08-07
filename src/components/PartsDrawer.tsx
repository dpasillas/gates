import React from "react";
import Button from "@mui/material/Button"
import Collapse from "@mui/material/Collapse"
import Divider from "@mui/material/Divider"
import ListItem from "@mui/material/ListItem"
import Paper from "@mui/material/Paper"
import {faChevronRight} from "@fortawesome/free-solid-svg-icons/faChevronRight";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {Part} from "./Part";
import {dragImageHotspot, PREVIEW_PADDING} from "../util/partPreview";
import "../css/PartsDrawer.css"

interface IProps {
  label: string,
  parts: Array<Part>,
}
interface IState {
  collapsed: boolean,
}

/**
 * A container which renders multiple parts together, and enables parts to be dragged and dropped onto a board
 *
 * For organizational purposes, a full suite of components may consist of multiple drawers.
 * */
class PartsDrawer extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      collapsed: true,
    }
  }

  renderPart(part: Part) {
    const component = part.component;
    const element = component.render();
    const {label} = part
    let {left, top, width, height} = component.geometry.bounds;
    left -= PREVIEW_PADDING;
    top -= PREVIEW_PADDING;
    width += 2 * PREVIEW_PADDING;
    height += 2 * PREVIEW_PADDING;

    const id = label.replace(' ', '_');
    return (
        <Paper
            elevation={3}
            classes={{root: 'part'}}
            key={component.uuid}
            draggable
            onDragStart={this.handleDragStart.bind(this, id, part)}
            onDragEnd={this.handleDragEnd.bind(this)}
        >
          <div className="part-image-container">
            <svg className="part-image" id={id} viewBox={`${left} ${top} ${width} ${height}`} width={width} height={height}>
              {element}
            </svg>
          </div>
          <div className="part-label">{label}</div>
        </Paper>
    )
  }

  handleDragStart(id: string, part: Part, e: React.DragEvent<HTMLElement>) {
    Part.data = part;

    const elem = document.getElementById(id) as HTMLElement;

    // Where the cursor sits within the drag image: the same point the drop places the component by,
    // its body centre, converted from board coordinates into pixels within the preview.
    //
    // The preview's own origin is its padded top-left, not the board origin, so that has to be
    // subtracted. Skipping it left the ghost a pin's length adrift on every component whose pins
    // extend to the left of its body.
    const {x, y} = dragImageHotspot(part.component);

    e.dataTransfer.setDragImage(elem, x, y);
    e.dataTransfer.effectAllowed = "move";

  }

  handleDragEnd() {
    Part.data = undefined;
  }

  render() {
    return (
        <>
          <ListItem dense>
            <Button sx={{width: '100%', borderRadius: '10px'}}
                    variant={'contained'}
                    classes={{endIcon: 'drawer-handle-icon-container'}}
                    onClick={this.handleClick.bind(this)}
                    endIcon={
                      <FontAwesomeIcon className={'drawer-handle-icon'}
                                       icon={faChevronRight}
                                       rotation={!this.state.collapsed ? 90 : undefined}/>
                    }>
              <span style={{flexGrow: 1}}>{this.props.label}</span>
            </Button>
          </ListItem>

          <Collapse classes={{wrapperInner: "drawer-contents"}} in={!this.state.collapsed} timeout="auto">
            {this.props.parts.map(this.renderPart.bind(this))}
          </Collapse>
          <Divider/>
        </>
  )
  }

  handleClick() {
    this.setState((state) => {
      return {
        collapsed: !state.collapsed,
      }
    })
  }
}

export {PartsDrawer};