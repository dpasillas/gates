import React from "react";
import {LogicConnection} from "../logic/LogicConnection";
import {diagonalRoute, orthogonalRoute, pathData} from "../util/orthogonalPath";
import {DEFAULT_WIRE_STYLE} from "../util/wireStyle";

interface IProps {
  connection: LogicConnection;
}

interface IState {}

/**
 * React Component implementation of LogicConnection
 *
 * As opposed to the logical implementation, this class is primarily concerned with mapping to the DOM, and handling
 * user interactions.
 * */
class Connection extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {}

    this.props.connection.updateSelf = () => this.setState({});
  }

  render() {

    const {source, sink} = this.props.connection;

    let [ianchor, idir] = source.anchor;
    let [oanchor, odir] = sink.anchor;

    ianchor = source.transform(ianchor);
    oanchor = sink.transform(oanchor);

    const dist = Math.min(ianchor.getDistance(oanchor), 30)

    const ic = ianchor.add(idir.multiply(dist));
    const oc = oanchor.add(odir.multiply(dist));

    const {x: ix, y: iy} = ianchor;
    const {x: ox, y: oy} = oanchor;

    // console.log(`Connection (${ix}, ${iy}) - (${ox}, ${oy})`)

    const {x: icx, y: icy} = ic;
    const {x: ocx, y: ocy} = oc;

    const r = 1
    // Render each endpoint of the connection as a circle.
    // Each endpoint is split into two half circles, as it's impossible to render a full circle with a single arc
    // command.
    const end1_1 = `M ${ix - r} ${iy} A ${r} ${r} 180 0 0 ${ix + r} ${iy} `
    const end1_2 = `A ${r} ${r} 180 0 0 ${ix - r} ${iy} `
    const end2_1 = `M ${ox - r} ${oy} A ${r} ${r} 180 0 0 ${ox + r} ${oy} `
    const end2_2 = `A ${r} ${r} 180 0 0 ${ox - r} ${oy} `
    // The path of a connection is both endpoints drawn as circles, connected by the wire itself.
    const ends = [{point: ianchor, direction: idir}, {point: oanchor, direction: odir}] as const;
    const route = this.props.connection.board?.wireStyle ?? DEFAULT_WIRE_STYLE;
    const wire = route === "bezier"
      ? `M ${ix} ${iy} C ${icx} ${icy} ${ocx} ${ocy} ${ox} ${oy}`
      : pathData(route === "diagonal" ? diagonalRoute(...ends) : orthogonalRoute(...ends));
    const d = `${end1_1} ${end1_2} ${wire} ${end2_1} ${end2_2}`;

    let fillClass;
    const state = this.props.connection.source.state;
    if (state.x) {
      fillClass = "error"
    } else if (state.z) {
      fillClass = "error"
    } else if (state.v) {
      fillClass = "on";
    } else {
      fillClass = "off"
    }

    /*
    The connection is drawn twice with different stroke widths:

    - First to draw the outline of the curve.
    - Second to draw the interior.

    This simulates the appearance the component was rendered as a single path with a normal fill and stroke.
    The alternative is to compute the path offset curve, which is difficult to compute.
    */
    return (
        <g className="connection">
          <path className="connection-outer" d={d}/>
          <path fillRule="nonzero"
              className={`connection-inner ${fillClass}`} d={d}/>
          { this.props.connection.source.width > 1 &&
            <path fillRule="nonzero" className="connection-inner bus" d={d}/>}
        </g>
    );
  }

}

export {Connection};