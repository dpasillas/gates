import React from "react";
import Button from "@mui/material/Button"
import Collapse from "@mui/material/Collapse"
import Divider from "@mui/material/Divider"
import ListItem from "@mui/material/ListItem"
import Paper from "@mui/material/Paper"
import {faChevronRight} from "@fortawesome/free-solid-svg-icons/faChevronRight";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import Part from "./Part";
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
    let component = part.component;
    let element = component.render();
    let {label} = part
    let {left, top, width, height} = component.geometry.bounds;
    left -= 2;
    top -= 2;
    width += 4;
    height += 4;

    let id = label.replace(' ', '_');
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

    let elem = document.getElementById(id) as HTMLElement;

    let {x, y} = part.component.geometry.bounds.center;

    e.dataTransfer.setDragImage(elem, x+2, y+2);
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

export default PartsDrawer;