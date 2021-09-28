import React from "react";
import "../css/PartsDrawer.css"
import Part from "./Part";

interface IProps {
  parts: Array<Part>,
}
interface IState {}

/**
 * A container which renders multiple parts together, and enables parts to be dragged and dropped onto a board
 *
 * For organizational purposes, a full suite of components may consist of multiple drawers.
 * */
class PartsDrawer extends React.Component<IProps, IState> {

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
        <div className="part"
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
        </div>
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
        <div className="drawer">
          {this.props.parts.map(this.renderPart.bind(this))}
        </div>
    )
  }

}

export default PartsDrawer;