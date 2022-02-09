import React from "react";
import {PinEventHandlers} from "./Pin";
import paper from 'paper';
import GateType from "../enums/GateType";
import {ComponentMouseEventHandler, MouseEventHandler} from "../util/Types";
import LogicComponent from "../logic/LogicComponent";

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
     * Gets the translation and rotation transforms of the component.
     */
    getTransforms() {
        let {x, y} = this.props.logicComponent.geometry.position
        let offset_transform = `translate(${x} ${y})`
        let rotate_transform = `rotate(${this.props.logicComponent.geometry.rotation})`
        return [offset_transform, rotate_transform].join(' ')
    }

    render() {
        let {onGateMouseDown, onGateMouseUp, onGateContextMenu, ...handlers} = this.props.handlers;

        let logicPins = this.props.logicComponent.pins();
        let pins = logicPins.map(p => p.render(handlers))

        let gate = this.props.logicComponent;
        let body = gate.body as paper.Item;

        let classNames = ['component']

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

export default Component;