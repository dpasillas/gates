import {LogicPin} from "./LogicPin";
import { v4 as uuidv4 } from 'uuid';
import {Connection} from "../components/Connection";
import {LogicBoard} from "./LogicBoard";

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
  /**
   * Callback which triggers a re-render on the rendered object
   */
  updateSelf?: () => void;

  constructor(params: IParams) {
    this.uuid = params.uuid ?? uuidv4();
    this.source = params.source;
    this.sink = params.sink;
    this.hidden = params.hidden ?? false;
    this.board = params.board;
  }

  remove() {
    this.source.connections.delete(this.sink.uuid);
    this.sink.connections.delete(this.source.uuid);
    this.board?.removeConnection(this.uuid);

    // Nothing drives the far end any more, so it falls back to high impedance and its component
    // works out what that means. Left alone it keeps the last value it was handed and goes on
    // behaving as though the wire were still there.
    this.sink.reset();
  }

  render() {
    return (
      <Connection key={this.uuid} connection={this} />
    );

  }

  /** Triggers a re-render */
  update() {
    this.updateSelf && this.updateSelf();
  }
}

export {LogicConnection};