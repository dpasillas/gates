import React from "react";
import LogicPin, {PinType} from "../logic/LogicPin";
import {MouseEventHandler, PinMouseEventHandler} from "../util/Types";

export interface PinEventHandlers<T = PinMouseEventHandler> {
    onPinMouseDown?: T;
    onPinMouseUp?: T;
    onPinMouseMove?: T;
    onPinContextMenu?: T;
}

export interface PinProps {
    // @ts-ignore
    pin: LogicPin,
    type: PinType,
    handlers: PinEventHandlers<MouseEventHandler>
}

interface IState {

}

/**
 * React Component implementation of LogicPin
 *
 * As opposed to the logical implementation, this class is primarily concerned with mapping to the DOM, and handling
 * user interactions.
 * */
class Pin extends React.Component<PinProps, IState> {
    constructor(props: PinProps) {
        super(props);
        this.state = {};
    }
    render() {
        let data = this.props.pin.geometry!.data;
        this.props.pin.geometry!.data = {}
        //@ts-ignore
        let d = this.props.pin.geometry!.exportSVG().getAttribute('d')
        this.props.pin.geometry!.data = data;
        let pathAttributes = {
            d: d
        }

        let classNames = [
            'pin'
        ];

        if (this.props.pin.geometry?.selected) {
            classNames.push('selected')
        }

        let [anchor, ] = this.props.pin.anchor;


        return (
            <g key={this.props.pin.uuid} className={classNames.join(' ')}
               onMouseDown={this.props.handlers?.onPinMouseDown}
               onMouseUp={this.props.handlers?.onPinMouseUp}
               onContextMenu={() => console.log("context p!")}
            >
                <circle className="anchor" cx={anchor.x} cy={anchor.y} r={5}/>
                <path {...pathAttributes}/>
            </g>
        );
    }
}

export default Pin;