import LogicPin from "./LogicPin";
import {v4 as uuidv4} from 'uuid';
import Connection from "../components/Connection";
import LogicBoard from "./LogicBoard";

interface IParams {
  uuid?: string;
  source: LogicPin;
  sink: LogicPin;
  board?: LogicBoard;
  hidden?: boolean;
}

/**
 * Class representing a connection between two pins
 *
 * Rendering is optional
 * */
class LogicConnection {
  uuid: string;
  source: LogicPin;
  sink: LogicPin;
  hidden: boolean;
  board?: LogicBoard;

  constructor(params: IParams) {
    this.uuid = params.uuid ?? uuidv4();
    this.source = params.source;
    this.sink = params.sink;
    this.hidden = params.hidden ?? false;
    this.board = params.board;
  }

  remove() {
    this.source.connections.delete(this.uuid);
    this.sink.connections.delete(this.uuid);
    this.board?.removeConnection(this.uuid);
  }

  render() {
    let [ianchor, idir] = this.source.anchor;
    let [oanchor, odir] = this.sink.anchor;

    ianchor = this.source.transform(ianchor);
    oanchor = this.sink.transform(oanchor);

    let d = Math.min(ianchor.getDistance(oanchor), 30)

    let ic = ianchor.add(idir.multiply(d));
    let oc = oanchor.add(odir.multiply(d));

    return (
        <Connection key={this.uuid}
                    connection={this}
                    state={this.source.state}
                    width={this.source.width}
                    i={ianchor}
                    o={oanchor}
                    ic={ic}
                    oc={oc}
        />
    );

  }
}

export default LogicConnection;