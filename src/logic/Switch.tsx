import React from "react";

import {LogicComponent, LogicComponentParams, UpdateGeometryParams} from "./LogicComponent";
import {LogicPin, PinOrientation, PinType} from "./LogicPin";
import {PartType} from "../enums/PartType";
import {LogicState} from "./LogicState";

/** Width of the body, and the minimum height. */
const BODY_WIDTH = 32;
/** Smallest the body gets, however few bits it carries. */
const MIN_BODY_HEIGHT = 32;
/** Vertical space taken by one toggle. */
const ROW_HEIGHT = 16;

/** Geometry of a single toggle within its row, in the style of a switch control. */
const TRACK_LEFT = 6;
const TRACK_WIDTH = 20;
const TRACK_HEIGHT = 6.7;
const THUMB_RADIUS = 6;
/** How far the thumb travels between off and on. */
const THUMB_TRAVEL = TRACK_WIDTH - 2 * THUMB_RADIUS + 4;

interface IParams extends Omit<LogicComponentParams, "type"> {}

/**
 * A bank of manual toggles, one per bit.
 *
 * Each bit gets its own pin so that a switch can drive unrelated lines, and the bank can be
 * collapsed onto a single bus when it is standing in for a word instead.
 */
class Switch extends LogicComponent {
    constructor(params: IParams) {
        super({
            ...params,
            label: "Switch",
            type: PartType.INPUT,
            adjustableWidth: true,
            canMerge: true,
            hasDelay: false,
        });
    }

    /** Intentionally no-op */
    operate(): void {}

    /** Height needed for the current number of toggles, never less than the minimum. */
    private get bodyHeight(): number {
        return Math.max(MIN_BODY_HEIGHT, ROW_HEIGHT * this.width);
    }

    /**
     * Centre line of the toggle for the given bit.
     *
     * The stack is centred in the body so that a single toggle sits in the middle of the minimum
     * square, and the least significant bit is at the bottom — matching the channel order of the
     * bus components, so a switch bank wires straight across to a joiner without crossing.
     */
    private rowCentre(bit: number, width: number, height: number): number {
        const top = (height - ROW_HEIGHT * width) / 2;
        return top + (width - 1 - bit + 0.5) * ROW_HEIGHT;
    }

    setUpBody({width}: UpdateGeometryParams): paper.Item {
        const {Path, Point, Size} = this.scope;
        const height = Math.max(MIN_BODY_HEIGHT, ROW_HEIGHT * width);

        return new Path.Rectangle(new Point(0, 0), new Size(BODY_WIDTH, height));
    }

    setUpOutputPins({width}: UpdateGeometryParams): LogicPin[] {
        // Merging changes both how many pins there are and how wide they are, so none survive it.
        this.outputPins.forEach(pin => pin.remove());

        const height = Math.max(MIN_BODY_HEIGHT, ROW_HEIGHT * width);

        const pin = (bitWidth: number, y: number) => {
            const created = new LogicPin({
                parent: this,
                pinType: PinType.OUTPUT,
                orientation: PinOrientation.RIGHT,
                board: this.board,
                width: bitWidth,
            });
            created.updateGeometry(new this.scope.Point(BODY_WIDTH, y));

            return created;
        };

        if (this.isMerged) {
            return [pin(width, height / 2)];
        }

        return Array.from({length: width},
                          (_, bit) => pin(1, this.rowCentre(bit, width, height)));
    }

    /** Whether the toggle for the given bit is on. */
    private isOn(bit: number): boolean {
        const pin = this.isMerged ? this.outputPins[0] : this.outputPins[bit];
        if (!pin) {
            return false;
        }

        return (this.isMerged ? (pin.state.v >> bit) : pin.state.v) % 2 === 1;
    }

    extraRender(): React.ReactElement {
        const height = this.bodyHeight;
        const toggles = [];

        for (let bit = 0; bit < this.width; bit++) {
            const y = this.rowCentre(bit, this.width, height);
            const on = this.isOn(bit);
            const state = on ? " on" : "";
            const thumbX = TRACK_LEFT + THUMB_RADIUS - 2 + (on ? THUMB_TRAVEL : 0);

            toggles.push(
                // Only the track and the thumb are drawn, so those two shapes are also the whole
                // interaction area: a row responds where the control actually is, not across the
                // blank width of the body beside it.
                //
                // Swallowing mousedown keeps the click from reaching the component beneath, which
                // would otherwise select it and begin a drag on the way to flipping a bit.
                <g key={bit} className={`switch${state}`}
                   onMouseDown={(e: React.MouseEvent<SVGElement>) => e.stopPropagation()}
                   onClick={this.handleClick.bind(this, bit)}>
                    <rect className="switch-track"
                          x={TRACK_LEFT} y={y - TRACK_HEIGHT / 2}
                          width={TRACK_WIDTH} height={TRACK_HEIGHT}
                          rx={TRACK_HEIGHT / 2}/>
                    <circle className="switch-thumb" cx={thumbX} cy={y} r={THUMB_RADIUS}/>
                </g>
            );
        }

        return <>{toggles}</>;
    }

    handleClick(bit: number) {
        if (this.isMerged) {
            const [pin] = this.outputPins;
            pin.setLogicState(new LogicState({v: pin.state.v ^ (1 << bit)}));
        } else {
            const pin = this.outputPins[bit];
            pin.setLogicState(new LogicState({v: pin.state.v ^ 1}));
        }

        this.update();
    }

    /** Reset but keep prior state */
    reset(): void {
        const states = this.outputPins.map(pin => pin.state);
        super.reset();
        this.outputPins.forEach((pin, i) => {
            if (states[i]) {
                pin.setLogicState(states[i]);
            }
        });
    }
}

export {Switch};
