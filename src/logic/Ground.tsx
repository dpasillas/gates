import LogicComponent, {LogicComponentParams} from "./LogicComponent";
import LogicPin, {PinOrientation, PinType} from "./LogicPin";
import PartType from "../enums/PartType";
import LogicState from "./LogicState";

interface IParams extends Omit<LogicComponentParams, "flags" | "type" | "width"> {}

class Ground extends LogicComponent {
    constructor(params: IParams ) {
        super({...params, flags: 0, type: PartType.INPUT});
    }

    operate(): void {
        this.outputPins[0].setLogicState(new LogicState({}))
    }

    reset(): void {
    }

    setUpBody(fieldWidth: number): paper.Item {
        let {Path, Point, Size} = this.scope;
        return new Path.Rectangle(new Point(0, 0), new Size(32, 32));
    }

    setUpOutputPins(): LogicPin[] {
        let pin = new LogicPin({
            parent: this,
            pinType: PinType.OUTPUT,
            orientation: PinOrientation.RIGHT,
            board: this.board,
        })
        pin.updateGeometry(new this.scope.Point(32, 16))
        return [pin];
    }

    extraRender(): React.ReactElement[] {
        return [
             <path d="
                M16,6.5 v12
                M10,19.5 h12
                M12,22.5 h8
                M14,25.5 h4
            "/>
        ];
    }
}

export default Ground