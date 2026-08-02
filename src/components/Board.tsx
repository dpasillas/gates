import paper from "paper";
import React from "react";

import '../css/Board.css';
import Part from "./Part";
import LogicComponent from "../logic/LogicComponent";
import { GateEventHandlers } from "./Component";
import LogicBoard from "../logic/LogicBoard";
import MouseManager from "../util/MouseManager";

// import Properties from "./Properties";


interface MouseEventMapping {
    /** The x-coordinate in svg coordinates */
    x: number,
    /** The y-coordinate in svg coordinates */
    y: number,
    /**
     * The x-coordinate as the relative position within the viewBox
     * <br>
     * 0 is the left side of the viewBox, and 1 is the right side of the viewBox
     * */
    rx: number,
    /**
     * The y-coordinate as the relative position within the viewBox
     * <br>
     * 0 is the top side of the viewBox, and 1 is the bottom side of the viewBox
     * */
    ry: number,
    /** The horizontal distance moved in svg coordinate space since the last mouse event */
    dx: number,
    /** The vertical distance moved in svg coordinate space since the last mouse event */
    dy: number,
}

interface IProps {
    board: LogicBoard;
}

interface IState {
    /** The size on the page of the board */
    viewPort: {
        width: number,
        height: number,
    },
    scaleFactor: number,
    pan: boolean,
    drag: boolean,
}

/**
 * React Component implementation of LogicBoard
 *
 * As opposed to the logical implementation, this class is primarily concerned with mapping to the DOM, and handling
 * user interactions.
 * */
class Board extends React.Component<IProps, IState> {
    private mouseManager: MouseManager = new MouseManager();
    private ref: React.RefObject<any>;
    private resizeObserver?: ResizeObserver;

    constructor(props: Readonly<IProps>) {
        super(props);

        // @ts-ignore
        this.state = {
            viewPort: {
                width: 0,
                height: 0,
            },
            scaleFactor: 1,
            pan: false,
            drag: false,
        }

        this.ref = React.createRef();
    }

    /** Resize handler to make sure the board doesn't scale up when the window is resized */
    onResize(entries: ResizeObserverEntry[]) {
        const { width, height } = entries[0].contentRect;

        const board = this.props.board;
        this.setState((state) => {
            board.viewBox = {
                left: board.viewBox.left,
                top: board.viewBox.top,
                width: width * state.scaleFactor,
                height: height * state.scaleFactor,
            }

            return {
                viewPort: {
                    width: width,
                    height: height,
                },
            }
        });
    }

    /**
     * Called after this component is rendered to the DOM
     * <br>
     * This is useful to perform initialization which requires this component or it's children to have been rendered.
     * @see {@link https://reactjs.org/docs/react-component.html#componentdidmount componentDidMount}
     * */
    componentDidMount() {
        this.props.board.update = () => this.setState({})
        this.setState({});
        const board = this.ref.current;
        this.resizeObserver = new ResizeObserver(this.onResize.bind(this));
        this.resizeObserver.observe(board)
        this.mouseManager.getViewCoordinates = this.getViewCoordinates.bind(this);
    }

    /**
     * Called before this element will be removed from the DOM
     * <br>
     * Generally used to clean up any bindings set up in {@link componentDidMount}, and other stray bindings.
     * @see {@link https://reactjs.org/docs/react-component.html#componentwillunmount componentWillUnmount} */
    componentWillUnmount() {
        this.resizeObserver?.disconnect();
        this.mouseManager.reset(this.props.board);
    }

    /** SVG definitions referenced by other svg elements. */
    defs() {
        return (
            <defs key="defs">
                <pattern id="grid" x={0} y={0} width={80} height={80} viewBox="0 0 80 80" patternUnits="userSpaceOnUse">
                    <path className="grid" d="M 0 0 L 0 80" strokeWidth="2" />
                    <path className="grid" d="M 10 0 L 10 80" strokeWidth="0.5" />
                    <path className="grid" d="M 20 0 L 20 80" strokeWidth="0.5" />
                    <path className="grid" d="M 30 0 L 30 80" strokeWidth="0.5" />
                    <path className="grid" d="M 40 0 L 40 80" strokeWidth="0.5" />
                    <path className="grid" d="M 50 0 L 50 80" strokeWidth="0.5" />
                    <path className="grid" d="M 60 0 L 60 80" strokeWidth="0.5" />
                    <path className="grid" d="M 70 0 L 70 80" strokeWidth="0.5" />
                    <path className="grid" d="M 80 0 L 80 80" strokeWidth="2" />

                    <path className="grid" d="M 0 0 L 80 0" strokeWidth="2" />
                    <path className="grid" d="M 0 10 L 80 10" strokeWidth="0.5" />
                    <path className="grid" d="M 0 20 L 80 20" strokeWidth="0.5" />
                    <path className="grid" d="M 0 30 L 80 30" strokeWidth="0.5" />
                    <path className="grid" d="M 0 40 L 80 40" strokeWidth="0.5" />
                    <path className="grid" d="M 0 50 L 80 50" strokeWidth="0.5" />
                    <path className="grid" d="M 0 60 L 80 60" strokeWidth="0.5" />
                    <path className="grid" d="M 0 70 L 80 70" strokeWidth="0.5" />
                    <path className="grid" d="M 0 80 L 80 80" strokeWidth="2" />
                </pattern>

                <pattern id="bus" x={0} y={0} width={3} height={3} viewBox="0 0 3 3" patternUnits="userSpaceOnUse">
                    <rect x={2} y={0} width={1} height={1} fill="black" />
                    <rect x={1} y={1} width={1} height={1} fill="black" />
                    <rect x={0} y={2} width={1} height={1} fill="black" />
                </pattern>

                <radialGradient id="bulb-glow">
                    <stop offset="0%" stopColor="rgb(255, 255, 128)" />
                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                </radialGradient>
            </defs>
        );
    }

    /** Draws the grid background as a repeated pattern on a rectangle which exactly fills the viewBox */
    renderGrid() {
        const { left, top, width, height } = this.props.board.viewBox;

        return <rect key="grid" x={left} y={top} width={width} height={height} fill="url(#grid)" />;
    }

    render() {
        const { left, top, width, height } = this.props.board.viewBox;

        const selectionBox = (this.mouseManager.selectBox?.exportSVG() as SVGElement)?.getAttribute('d');

        const mm = this.mouseManager;

        const handlers: GateEventHandlers = {
            onGateMouseDown: mm.handleGateMouseDown.bind(mm, this.props.board),
            onGateContextMenu: this.handleGateContextMenu.bind(this),
            onPinMouseDown: mm.handlePinMouseDown.bind(mm, this.props.board),
        }

        const renderedConnections: JSX.Element[] = [];
        this.props.board.connections.forEach((c) => renderedConnections.push(c.render()));

        const renderedComponents: JSX.Element[] = [];
        this.props.board.components.forEach((c) => renderedComponents.push(c.render(handlers)));

        // Nested svgs is a hack to allow resizing the viewPort without scaling the contents.
        // When the viewport is resized, the inner svg's viewBox is updated so it exactly fits the outer SVG's viewport.
        // Normally, an svg element with a defined viewBox is forced to fit the aspect ratio of its viewbox.
        return (
            <div
                ref={this.ref}
                style={{
                    width: "100%",
                    height: "100%"
                }}
            >
                <svg className="board-wrapper" style={this.state.viewPort}
                    xmlns="http://www.w3.org/2000/svg"
                    onWheel={(e) => this.handleWheel(e)}
                    onMouseDown={mm.handleBoardMouseDown.bind(mm, this.props.board)}
                    onDragEnter={this.handleDragEnter.bind(this)}
                    onDragOver={(e) => this.handleDragOver(e)}
                    onDrop={(e) => this.handleDrop(e)}
                >
                    <svg className="board"
                        preserveAspectRatio="xMinYMin slice"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox={`${left} ${top} ${width} ${height}`}
                        onScroll={() => console.log("scroll")}
                    >
                        {this.defs()}
                        {this.renderGrid()}
                        <circle className={"origin"} x="0" y="0" r="40" fill="red" />
                        {renderedConnections}
                        {this.props.board.temporaryConnection && (() => {
                            const { source, currentPos } = this.props.board.temporaryConnection;
                            const [ianchor, idir] = source.anchor;
                            const start = source.transform(ianchor);

                            const dist = Math.min(start.getDistance(currentPos), 30);
                            const ic = start.add(idir.multiply(dist));

                            // For the mouse end, we don't have a direction, so we'll just use a small offset
                            // or better yet, make it look like it's coming from nowhere for now.
                            // Actually, let's just make it a simple curve towards the mouse.
                            const oc = currentPos;

                            const d = `M ${start.x} ${start.y} C ${ic.x} ${ic.y} ${oc.x} ${oc.y} ${currentPos.x} ${currentPos.y}`;

                            let fillClass;
                            const state = source.state;
                            if (state.x || state.z) {
                                fillClass = "error"
                            } else if (state.v) {
                                fillClass = "on";
                            } else {
                                fillClass = "off"
                            }

                            return (
                                <g className="connection">
                                    <path className="connection-outer" d={d} />
                                    <path className={`connection-inner ${fillClass}`} d={d} />
                                    {source.width > 1 &&
                                        <path fillRule="nonzero" className="connection-inner bus" d={d} />}
                                </g>
                            );
                        })()}
                        {renderedComponents}
                        {selectionBox &&
                            <path className="select" d={selectionBox} vectorEffect="non-scaling-stroke" />
                        }
                    </svg>
                </svg>
                {/*<Properties board={this.props.board}/>*/}
            </div>
        );
    }

    /** Unselects all selected items */
    clearSelection() {
        this.props.board.clearSelection();
    }

    /**  Maps a mouse event's position on the page to the viewBox coordinates */
    getViewCoordinates(e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent): MouseEventMapping {
        const rect = this.ref.current.getBoundingClientRect();
        const l = rect.left,
            t = rect.top,
            w = rect.width,
            h = rect.height;


        const localX = e.pageX - l,
            localY = e.pageY - t;

        const { left: viewLeft, top: viewTop, width: viewWidth, height: viewHeight } = this.props.board.viewBox;

        const viewRelativeX = localX / w,
            viewRelativeY = localY / h,
            viewX = viewLeft + viewRelativeX * viewWidth,
            viewY = viewTop + viewRelativeY * viewHeight;

        return {
            x: viewX,
            y: viewY,
            rx: viewRelativeX,
            ry: viewRelativeY,
            dx: 0,
            dy: 0,
        }
    }

    /* Event handlers and associated helpers. */
    handleDragEnter(e: React.DragEvent<SVGSVGElement>) {
        e.preventDefault();
        e.dataTransfer.effectAllowed = "move";
    }

    handleDragOver(e: React.DragEvent<SVGSVGElement>) {
        e.preventDefault();
        e.dataTransfer.effectAllowed = "move";
    }

    handleDrop(e: React.DragEvent<SVGSVGElement>) {
        e.preventDefault();
        const { x, y } = this.getViewCoordinates(e);
        const part = Part.data as Part;
        if (!part) {
            return
        }
        const component = part.make(this.props.board);
        // TODO: Compute offset when dropping components to make drag point more consistent.
        component.geometry.translate(new paper.Point(x - 16, y - 16))

        this.props.board.addComponent(component);

        this.setState({})
    }

    static between(a: number, b: number, c: number) {
        return Math.min(Math.max(a, b), c);
    }

    handleWheel(e: React.WheelEvent<SVGSVGElement>) {
        const { x, y, rx, ry } = this.getViewCoordinates(e);

        const viewWidth = this.state.viewPort.width,
            viewHeight = this.state.viewPort.height;

        const MIN_SCALE = 1 / 16.0;
        const MAX_SCALE = 4.0;
        const { scaleFactor } = this.state;

        const newScaleFactor = Board.between(MIN_SCALE, Math.pow(2, e.deltaY / 1000) * scaleFactor, MAX_SCALE),
            newWidth = viewWidth * newScaleFactor,
            newHeight = viewHeight * newScaleFactor;

        this.props.board.viewBox = {
            left: x - rx * newWidth,
            top: y - ry * newHeight,
            width: newWidth,
            height: newHeight,
        };

        this.setState({
            scaleFactor: newScaleFactor,
        });
    }

    handleGateContextMenu(logicComponent: LogicComponent, e: React.MouseEvent<SVGElement, MouseEvent> | MouseEvent) {
        if (e.shiftKey) {
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        console.log("context g!")
    }

}

export default Board;
