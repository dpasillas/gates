import React from "react";

import LogicComponent, {LogicComponentParams} from "./LogicComponent";
import LogicPin, {PinOrientation, PinType} from "./LogicPin";
import PartType from "../enums/PartType";
import LogicState from "./LogicState";

interface IParams extends Omit<LogicComponentParams, "flags" | "type"> {}

class Adder extends LogicComponent {

    constructor(params: IParams) {
        super({...params, type: PartType.COMPOSITE_BUILT_IN, flags: 0, delay: 1});
    }

    operate(): void {
        if (this.subtype === 0) {

            // Half-adder
            let a = this.inputPins[0].state;
            let b = this.inputPins[1].state;
            if (a.x === 0 && a.z === 0 && b.x === 0 && b.z === 0) {
                // No input related errors
                let cout = (a.v & b.v );
                let sum  = (a.v ^ b.v);

                this.postEvent(new LogicState({v: sum}), this.outputPins[0])
                this.postEvent(new LogicState({v: cout}), this.outputPins[1])
            } else {
                this.postEvent(new LogicState({x: 1}), this.outputPins[0])
                this.postEvent(new LogicState({x: 1}), this.outputPins[1])
            }
        } else {

            // Adder
            let a = this.inputPins[0].state;
            let b = this.inputPins[1].state;
            let cin = this.inputPins[2].state;
            let sum = a.v + b.v + cin.v;
            let cout = sum >> this.width;
            let error = a.x | b.x | cin.x | a.z | b.z | cin.z

            for (let i = 0; i < this.width; i++) {
                if ((error >> i) & 1) {
                    // Input related error, set everything else to x
                    error = -1 & ~this.bitMask(i + 1) & this.bitMask();
                    break;
                }
            }

            sum &= ~error & this.bitMask();

            this.postEvent(new LogicState({v: sum, x: error}), this.outputPins[0]);
            if (error) {
                this.postEvent( new LogicState({x: 1}), this.outputPins[1]);
            } else {
                this.postEvent(new LogicState({v: cout}), this.outputPins[1]);
            }
        }
    }

    setUpBody(fieldWidth: number): paper.Item {
        let {Path, Point, Size} = this.scope;
        return new Path.Rectangle(new Point(0, 0), new Size(48, 32));

    }

    setUpOutputPins(fieldWidth: number): LogicPin[] {
        let sum = new LogicPin({
            parent: this,
            pinType: PinType.OUTPUT,
            orientation: PinOrientation.UP,
            board: this.board,
            width: this.width
        });

        let cout = new LogicPin({
            parent: this,
            pinType: PinType.OUTPUT,
            orientation: PinOrientation.LEFT,
            board: this.board
        });

        sum.updateGeometry(new this.scope.Point(24, 0));
        cout.updateGeometry(new this.scope.Point(0, 16));

        return [sum, cout];
    }

    setUpInputPins(fieldWidth: number): LogicPin[] {
        let a = new LogicPin({
            parent: this,
            pinType: PinType.INPUT,
            orientation: PinOrientation.DOWN,
            board: this.board,
            width: this.width
        });
        a.updateGeometry(new this.scope.Point(16, 32));

        let b = new LogicPin({
            parent: this,
            pinType: PinType.INPUT,
            orientation: PinOrientation.DOWN,
            board: this.board,
            width: this.width
        });
        b.updateGeometry(new this.scope.Point(32, 32));

        if (this.subtype === 0) {
            // Half Adder does not have a carry in
            return [a, b];
        }

        let cin = new LogicPin({
            parent: this,
            pinType: PinType.INPUT,
            orientation: PinOrientation.RIGHT,
            board: this.board
        });
        cin.updateGeometry(new this.scope.Point(48, 16));

        return [a, b, cin];
    }

    extraRender(): React.ReactElement[] {
        return [
            <>
                <text className="top" x={24} y={0}>S</text>
                <text className="left" x={0} y={16}>C<tspan>out</tspan></text>
                <text className="bottom" x={16} y={32}>A</text>
                <text className="bottom" x={32} y={32}>B</text>
                {this.subtype === 1 && <text className="right" x={48} y={16}>C<tspan>in</tspan></text>}
            </>
        ];
    }

    reset() {
    }
}

export default Adder;