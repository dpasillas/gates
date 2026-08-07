import React from "react";
import {PinEventHandlers} from "./Pin";
import paper from 'paper';
import {GateType} from "../enums/GateType";
import {ComponentMouseEventHandler, MouseEventHandler} from "../util/Types";
import {LogicComponent} from "../logic/LogicComponent";

export interface GateEventHandlers<T = ComponentMouseEventHandler> extends PinEventHandlers {
    onGateMouseDown?: T;
    onGateMouseUp?: T;
    onGateMouseMove?: T;
    onGateContextMenu?: T;
}

export interface GateProps {
    scope?: paper.PaperScope,
    handlers: GateEventHandlers<MouseEventHandler>,
    type: GateType,
    logicComponent: LogicComponent,
}

interface IState {}

/**
 * React Component implementation of LogicComponent
 *
 * As opposed to the logical implementation, this class is primarily concerned with mapping to the DOM, and handling
 * user interactions.
 * */
class Component extends React.Component<GateProps, IState> {
    constructor(props: Readonly<GateProps>) {
        super(props);

        this.state = {};
        this.props.logicComponent.updateSelf = () => this.setState({});
    }

    /**
     * Gets the transform placing this component's local coordinates on the board.
     *
     * Taken from the geometry's matrix rather than rebuilt from position and rotation: the
     * component is anchored at the centre of its body, so `position` is that centre and is not
     * where the local origin lands.
     */
    getTransforms() {
        const [a, b, c, d, tx, ty] = this.props.logicComponent.geometry.matrix.values;
        return `matrix(${a} ${b} ${c} ${d} ${tx} ${ty})`;
    }

    render() {
        const {onGateMouseDown, onGateMouseUp, onGateContextMenu, ...handlers} = this.props.handlers;

        const logicPins = this.props.logicComponent.pins();
        const pins = logicPins.map(p => p.render(handlers))

        const gate = this.props.logicComponent;
        const body = gate.body as paper.Item;

        const classNames = ['component']

        if (body.selected) {
            classNames.push('selected')
        }

        return (
            <g className={classNames.join(' ')}
               data-ctype={gate.subtype}
               data-uuid={gate.uuid}
               transform={this.getTransforms()}
            >
                <g
                    onMouseDown={this.props.handlers.onGateMouseDown}
                    onMouseUp={this.props.handlers.onGateMouseUp}
                    onMouseMove={this.props.handlers.onGateMouseMove}
                    onContextMenu={this.props.handlers.onGateContextMenu}
                >
                    <path d={gate.d}
                    />
                    {gate.extraRender()}
                </g>
                {this.props.logicComponent.pins().map((p, i) => p.renderLabel(i))}
                {pins}
            </g>
        );
    }
}

export {Component};