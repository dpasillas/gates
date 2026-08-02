import LogicComponent, {LogicComponentParams, UpdateGeometryParams} from "./LogicComponent";
import LogicPin, {PinOrientation, PinType} from "./LogicPin";
import PartType from "../enums/PartType";
import LogicState from "./LogicState";

interface IParams extends Omit<LogicComponentParams, "type"> {}

class Adder extends LogicComponent {

    constructor(params: IParams) {
        super({
            ...params,
            type: PartType.COMPOSITE_BUILT_IN,
            delay: 1});
    }

    operate(): void {
        if (this.subtype === 0) {

            // Half-adder
            const a = this.inputPins[0].state;
            const b = this.inputPins[1].state;
            if (a.x === 0 && a.z === 0 && b.x === 0 && b.z === 0) {
                // No input related errors
                const cout = (a.v & b.v );
                const sum  = (a.v ^ b.v);

                this.postEvent(new LogicState({v: sum}), this.outputPins[0])
                this.postEvent(new LogicState({v: cout}), this.outputPins[1])
            } else {
                this.postEvent(new LogicState({x: 1}), this.outputPins[0])
                this.postEvent(new LogicState({x: 1}), this.outputPins[1])
            }
        } else {

            // Adder
            const a = this.inputPins[0].state;
            const b = this.inputPins[1].state;
            const cin = this.inputPins[2].state;
            let sum = a.v + b.v + cin.v;
            const cout = sum >> this.width;
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

    setUpBody(): paper.Item {
        const {Path, Point, Size} = this.scope;
        return new Path.Rectangle(new Point(0, 0), new Size(48, 32));

    }

    setUpOutputPins({width}: UpdateGeometryParams): LogicPin[] {
        const sum = new LogicPin({
            parent: this,
            pinType: PinType.OUTPUT,
            orientation: PinOrientation.UP,
            board: this.board,
            width: width,
            label: 'S',
        });

        const cout = new LogicPin({
            parent: this,
            pinType: PinType.OUTPUT,
            orientation: PinOrientation.LEFT,
            board: this.board,
            label: "C__out",
        });

        sum.updateGeometry(new this.scope.Point(24, 0));
        cout.updateGeometry(new this.scope.Point(0, 16));

        return [sum, cout];
    }

    setUpInputPins({width}: UpdateGeometryParams): LogicPin[] {
        const a = new LogicPin({
            parent: this,
            pinType: PinType.INPUT,
            orientation: PinOrientation.DOWN,
            board: this.board,
            width: width,
            label: 'A',
        });
        a.updateGeometry(new this.scope.Point(16, 32));

        const b = new LogicPin({
            parent: this,
            pinType: PinType.INPUT,
            orientation: PinOrientation.DOWN,
            board: this.board,
            width: width,
            label: 'B',
        });
        b.updateGeometry(new this.scope.Point(32, 32));

        if (this.subtype === 0) {
            // Half Adder does not have a carry in
            return [a, b];
        }

        const cin = new LogicPin({
            parent: this,
            pinType: PinType.INPUT,
            orientation: PinOrientation.RIGHT,
            board: this.board,
            label: "C__in",
        });
        cin.updateGeometry(new this.scope.Point(48, 16));

        return [a, b, cin];
    }
}

export default Adder;