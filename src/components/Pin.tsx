import React from "react";
import Tooltip from "@mui/material/Tooltip";

import {LogicPin, PinType} from "../logic/LogicPin";
import { MouseEventHandler, PinMouseEventHandler } from "../util/Types";

export interface PinEventHandlers<T = PinMouseEventHandler> {
    onPinMouseDown?: T;
    onPinMouseUp?: T;
    onPinMouseMove?: T;
    onPinContextMenu?: T;
}

export interface PinProps {
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

        this.props.pin.updateSelf = () => this.setState({});
    }
    render() {
        const data = this.props.pin.geometry!.data;
        this.props.pin.geometry!.data = {}
        //@ts-ignore
        const d = this.props.pin.geometry!.exportSVG().getAttribute('d')
        this.props.pin.geometry!.data = data;
        const pathAttributes = {
            d: d
        }

        const classNames = [
            'pin'
        ];

        if (this.props.pin.geometry?.selected) {
            classNames.push('selected');
        }

        const [anchor,] = this.props.pin.anchor;


        return (
            <Tooltip title={`Width: ${this.props.pin.width}`}>
                <g key={this.props.pin.uuid} className={classNames.join(' ')}
                    onMouseDown={this.props.handlers?.onPinMouseDown}
                    onMouseUp={this.props.handlers?.onPinMouseUp}
                    onContextMenu={this.props.handlers?.onPinContextMenu}
                >
                    <circle className="anchor" cx={anchor.x} cy={anchor.y} r={5} />
                    <path {...pathAttributes} />
                    {this.props.pin.width > 1 && <path className="wide" {...pathAttributes} />}
                </g>
            </Tooltip>
        );
    }
}

export {Pin};