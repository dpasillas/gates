import React from "react";

import LogicComponent, {LogicComponentParams} from "./LogicComponent";
import LogicPin, {PinOrientation, PinType} from "./LogicPin";
import PartType from "../enums/PartType";
import LogicState from "./LogicState";

interface IParams extends Omit<LogicComponentParams, "flags" | "type"> {}

class Switch extends LogicComponent {
    constructor(params: IParams) {
        super({...params, type: PartType.INPUT, flags: 0});
    }

    /** Intentionally no-op */
    operate(): void {}

    setUpBody(fieldWidth: number): paper.Item {
        let {Path, Point, Size} = this.scope;
        return new Path.Rectangle(new Point(0, 0), new Size(32 * this.width, 32));
    }

    setUpOutputPins(fieldWidth: number): LogicPin[] {
        let pin = new LogicPin({
            parent: this,
            pinType: PinType.OUTPUT,
            orientation: PinOrientation.RIGHT,
            board: this.board,
            width: this.width,
        });

        pin.updateGeometry(new this.scope.Point(32*this.width, 16));

        return [pin];
    }

    extraRender(): React.ReactElement {
        let [pin] = this.outputPins
        let extras = []
        for (let i = 0; i < this.width; i++) {
            let classnames = ["switch"]
            let stateString = "0"
            if ((pin.state.v >> i) & 1) {
                classnames.push("on")
                stateString = "1"
            }

            let x = 16 + 32 * (this.width - i - 1);
            let y = 16;

            // TODO: Pass mouse events over the button to the parent element
            extras.push(
                <circle key={2*i}
                        className={classnames.join(' ')}
                        cx={x}
                        cy={y}
                        r={12}
                        onClick={this.handleClick.bind(this, i)}/>
            )
            extras.push(
                <text key={2*i + 1} className="center" x={x} y={y}>
                    {stateString}
                </text>
            )
        }
        return <>{extras}</>

    }

    handleClick(i: number) {
        let [pin] = this.outputPins;
        let v = (pin.state.v ^ (1 << i));
        pin.setLogicState(new LogicState({
            v: v
        }));
        this.update();
    }

    /** Reset but keep prior state */
    reset(): void {
        let [output] = this.outputPins;
        let s = output.state;
        super.reset();
        output.setLogicState(s);
    }
}

export default Switch;