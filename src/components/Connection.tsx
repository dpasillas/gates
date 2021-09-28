import React from "react";
import LogicConnection from "../logic/LogicConnection";

interface Point {
  x: number,
  y: number
}

interface IProps {
  connection: LogicConnection;
  /** The first endpoint of this connection */
  i: Point;
  /** The second endpoint of this connection */
  o: Point;
  /** The first control point, as required to render this connection as a bezier curve */
  ic: Point;
  /** The second control point, as required to render this connection as a bezier curve */
  oc: Point;

}

interface IState {}

/**
 * React Component implementation of LogicConnection
 *
 * As opposed to the logical implementation, this class is primarily concerned with mapping to the DOM, and handling
 * user interactions.
 * */
class Connection extends React.Component<IProps, IState> {
  render() {

    let {x: ix, y: iy} = this.props.i;
    let {x: ox, y: oy} = this.props.o;

    let {x: icx, y: icy} = this.props.ic;
    let {x: ocx, y: ocy} = this.props.oc;

    let r = 1
    // Render each endpoint of the connection as a circle.
    // Each endpoint is split into two half circles, as it's impossible to render a full circle with a single arc
    // command.
    let end1_1 = `M ${ix - r} ${iy} A ${r} ${r} 180 0 0 ${ix + r} ${iy} `
    let end1_2 = `A ${r} ${r} 180 0 0 ${ix - r} ${iy} `
    let end2_1 = `M ${ox - r} ${oy} A ${r} ${r} 180 0 0 ${ox + r} ${oy} `
    let end2_2 = `A ${r} ${r} 180 0 0 ${ox - r} ${oy} `
    // The path of a connection is both endpoints drawn as circles, connected by a bezier curve.
    let d = `${end1_1} ${end1_2} M ${ix} ${iy} C ${icx} ${icy} ${ocx} ${ocy} ${ox} ${oy} ${end2_1} ${end2_2}`;

    /*
    The connection is drawn twice with different stroke widths:

    - First to draw the outline of the curve.
    - Second to draw the interior.

    This simulates the appearance the component was rendered as a single path with a normal fill and stroke.
    The alternative is to compute the path offset curve, which is difficult to compute.
    */
    return (
        <g>
          <path className="connection-outer" d={d}/>
          <path fillRule="nonzero"
              className="connection-inner error" d={d}/>
          <path fillRule="nonzero"
              className="connection-inner bus" d={d}/>
        </g>
    );
  }

}

export default Connection;