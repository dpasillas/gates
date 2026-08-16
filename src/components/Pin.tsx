import React from "react";
import Tooltip from "@mui/material/Tooltip";

import {LogicPin, PinOrientation, PinType} from "../logic/LogicPin";
import { MouseEventHandler, PinMouseEventHandler } from "../util/Types";

/**
 * Matches the anchor circle the mark is drawn behind.
 *
 * Anything wider collides with the mark on the pin next door: the closest components space their
 * pins barely more than this apart. Read when called rather than held in a constant, since this
 * module and LogicPin import each other and the class is not there yet as this one is evaluated.
 */
function markRadius(): number {
    return LogicPin.ANCHOR_RADIUS;
}

/** The notch cut from an input port's ring, in degrees. */
const PORT_MARK_NOTCH = 45;

/**
 * Which way the pin points on its own component, in degrees, clockwise from east.
 *
 * A function rather than a table: this module and LogicPin import each other, so a table built as
 * this module is evaluated would read the orientations before they exist.
 */
function outwardAngle(orientation: PinOrientation): number {
    switch (orientation) {
        case PinOrientation.UP:
            return -90;
        case PinOrientation.DOWN:
            return 90;
        case PinOrientation.LEFT:
            return 180;
        default:
            return 0;
    }
}

/**
 * A ring around the anchor with a notch cut out of the far side.
 *
 * The notch is where the wire arrives, so the mark opens rather than crossing it, and points the
 * way the pin faces. Drawn in the component's own frame, so turning the component turns it too.
 */
function notchedRing(cx: number, cy: number, facing: number): string {
    const radius = markRadius();
    const at = (degrees: number) => {
        const radians = degrees * Math.PI / 180;
        return `${cx + radius * Math.cos(radians)} ${cy + radius * Math.sin(radians)}`;
    };

    // The long way round, from one lip of the notch to the other.
    const lip = PORT_MARK_NOTCH / 2;

    return `M ${at(facing + lip)} A ${radius} ${radius} 0 1 1 ${at(facing - lip)}`;
}

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
    /** A filled disc for the one pin that drives the port, a notched ring for those it drives. */
    renderPortMark(anchor: {x: number, y: number}) {
        const pin = this.props.pin;

        return pin.pinType === PinType.OUTPUT
            ? <circle className="port-mark" cx={anchor.x} cy={anchor.y} r={markRadius()}/>
            : <path className="port-mark"
                    d={notchedRing(anchor.x, anchor.y, outwardAngle(pin.orientation))}/>;
    }

    render() {
        const pin = this.props.pin;
        const pathAttributes = {
            d: pin.d
        }

        const classNames = [
            'pin'
        ];

        if (pin.geometry?.selected) {
            classNames.push('selected');
        }
        if (pin.isPort) {
            // Marked whether or not ports are being highlighted, so the stylesheet decides when it
            // shows rather than the renderer deciding whether to say so.
            classNames.push('port');
            if (pin.pinType === PinType.OUTPUT) {
                classNames.push('driver');
            }
        }

        const [anchor,] = pin.anchor;

        return (
            <Tooltip title={`Width: ${pin.width}`}>
                <g key={pin.uuid} className={classNames.join(' ')}
                    onMouseDown={this.props.handlers?.onPinMouseDown}
                    onMouseUp={this.props.handlers?.onPinMouseUp}
                    onContextMenu={this.props.handlers?.onPinContextMenu}
                >
                    {/* Behind everything, so the pin stays drawn over its own decoration and the
                        anchor above it can still show the pin is hovered. Invisible unless the board
                        is highlighting ports, which keeps it out of an exported picture. */}
                    {pin.isPort && this.renderPortMark(anchor)}
                    {/* The drawn circle is the drop target: same radius the drop is tested against. */}
                    <circle className="anchor" cx={anchor.x} cy={anchor.y} r={LogicPin.ANCHOR_RADIUS} />
                    <path {...pathAttributes} />
                    {pin.width > 1 && <path className="wide" {...pathAttributes} />}
                </g>
            </Tooltip>
        );
    }
}

export {Pin};