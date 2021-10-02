import paper from "paper";
import React from "react";

import '../css/Board.css';
import Part from "./Part";
import LogicComponent from "../logic/LogicComponent";
import {GateEventHandlers} from "./Component";
import LogicPin, {PinType} from "../logic/LogicPin";
import LogicBoard from "../logic/LogicBoard";


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
    /** The size and offset of our view onto the board. */
    viewBox: {
        left: number,
        top: number,
        width: number,
        height: number,
    },
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
    private ref: React.RefObject<any>;
    private resizeObserer?: ResizeObserver;
    private sPoint: paper.Point | undefined;
    private select: paper.Path | null;

    constructor(props: Readonly<IProps>) {
        super(props);

        this.select = null;
        // @ts-ignore
        this.state = {
            viewBox: {
                left: 0,
                top: 0,
                width: 800,
                height: 600,
            },
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
        let {width, height} = entries[0].contentRect;
        this.setState((state) => {
            return {
                viewPort: {
                    width: width,
                    height: height,
                },
                viewBox: {
                    left: state.viewBox.left,
                    top: state.viewBox.top,
                    width: width * state.scaleFactor,
                    height: height * state.scaleFactor,
                }
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
        this.setState({});
        let board = this.ref.current;
        this.resizeObserer = new ResizeObserver(this.onResize.bind(this));
        this.resizeObserer.observe(board)
    }

    /**
     * Called before this element will be removed from the DOM
     * <br>
     * Generally used to clean up any bindings set up in {@link componentDidMount}, and other stray bindings.
     * @see {@link https://reactjs.org/docs/react-component.html#componentwillunmount componentWillUnmount} */
    componentWillUnmount() {
        this.resizeObserer?.disconnect();
    }

    /** SVG definitions referenced by other svg elements. */
    defs() {
        return (
            <defs key="defs">
                <pattern id="grid" x={0} y={0} width={80} height={80} viewBox="0 0 80 80" patternUnits="userSpaceOnUse">
                    <path className="grid" d="M 0 0 L 0 80" strokeWidth="2"/>
                    <path className="grid" d="M 10 0 L 10 80" strokeWidth="0.5"/>
                    <path className="grid" d="M 20 0 L 20 80" strokeWidth="0.5"/>
                    <path className="grid" d="M 30 0 L 30 80" strokeWidth="0.5"/>
                    <path className="grid" d="M 40 0 L 40 80" strokeWidth="0.5"/>
                    <path className="grid" d="M 50 0 L 50 80" strokeWidth="0.5"/>
                    <path className="grid" d="M 60 0 L 60 80" strokeWidth="0.5"/>
                    <path className="grid" d="M 70 0 L 70 80" strokeWidth="0.5"/>
                    <path className="grid" d="M 80 0 L 80 80" strokeWidth="2"/>

                    <path className="grid" d="M 0 0 L 80 0" strokeWidth="2"/>
                    <path className="grid" d="M 0 10 L 80 10" strokeWidth="0.5"/>
                    <path className="grid" d="M 0 20 L 80 20" strokeWidth="0.5"/>
                    <path className="grid" d="M 0 30 L 80 30" strokeWidth="0.5"/>
                    <path className="grid" d="M 0 40 L 80 40" strokeWidth="0.5"/>
                    <path className="grid" d="M 0 50 L 80 50" strokeWidth="0.5"/>
                    <path className="grid" d="M 0 60 L 80 60" strokeWidth="0.5"/>
                    <path className="grid" d="M 0 70 L 80 70" strokeWidth="0.5"/>
                    <path className="grid" d="M 0 80 L 80 80" strokeWidth="2"/>
                </pattern>

                <pattern id="bus" x={0} y={0} width={3} height={3} viewBox="0 0 3 3" patternUnits="userSpaceOnUse">
                    <rect x={2} y={0} width={1} height={1} fill="black"/>
                    <rect x={1} y={1} width={1} height={1} fill="black"/>
                    <rect x={0} y={2} width={1} height={1} fill="black"/>
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
        const left = this.state.viewBox.left,
            width = this.state.viewBox.width,
            top = this.state.viewBox.top,
            height = this.state.viewBox.height;

        return <rect key="grid" x={left} y={top} width={width} height={height} fill="url(#grid)"/>;
    }

    render() {
        const left = this.state.viewBox.left,
            width = this.state.viewBox.width,
            top = this.state.viewBox.top,
            height = this.state.viewBox.height;

        let selectionBox = (this.select?.exportSVG() as SVGElement)?.getAttribute('d');

        let handlers: GateEventHandlers = {
            onGateMouseDown: this.handleGateMouseDown.bind(this),
            onGateMouseUp: this.handleGateMouseUp.bind(this),
            onGateContextMenu: this.handleGateContextMenu.bind(this),
            onPinMouseDown: this.handlePinMouseDown.bind(this),
        }

        let renderedConnections: JSX.Element[] = [];
        this.props.board.connections.forEach((c) => renderedConnections.push(c.render()));

        let renderedComponents: JSX.Element[] = [];
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
                     onWheel={(e)=> this.handleWheel(e)}
                     onMouseMove={(e) => this.handleMouseMove(e)}
                     onMouseDown={(e) => this.handleMouseDown(e)}
                     onMouseUp={(e) => this.handleMouseUp(e)}
                     onMouseLeave={(e) => this.handleMouseExit(e)}
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
                        <circle className={"origin"} x="0" y="0" r="40" fill="red"/>
                        {renderedConnections}
                        {renderedComponents}
                        {selectionBox &&
                        <path className="select" d={selectionBox} vectorEffect="non-scaling-stroke"/>
                        }
                    </svg>
                </svg>
            </div>
        );
    }

    /** Unselects all selected items */
    clearSelection() {
        for(let item of this.scope.project.selectedItems) {
            item.selected = false;
        }
    }

    /**  Maps a mouse event's position on the page to the viewBox coordinates */
    getViewCoordinates(e: React.MouseEvent<SVGSVGElement, MouseEvent>): MouseEventMapping {
        let rect = e.currentTarget.getBoundingClientRect();
        const l = rect.left,
            t = rect.top,
            w = rect.width,
            h = rect.height;

        const localX = e.pageX - l,
            localY = e.pageY - t;

        const dLocalX = e.movementX,
            dLocalY = e.movementY;

        const viewWidth = this.state.viewBox.width,
            viewHeight = this.state.viewBox.height;

        const viewRelativeX = localX / w,
            viewRelativeY = localY / h,
            viewX = this.state.viewBox.left + viewRelativeX * viewWidth,
            viewY = this.state.viewBox.top + viewRelativeY * viewHeight,
            dX = dLocalX / w * viewWidth,
            dY = dLocalY / h * viewHeight;

        return {
            x: viewX,
            y: viewY,
            rx: viewRelativeX,
            ry: viewRelativeY,
            dx: dX,
            dy: dY,
        }
    }

    /*
    Event handlers and associated helpers
     */
    enableDrag(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
        e.stopPropagation()
        this.setState({drag: true})
    }

    disableDrag(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
        e.stopPropagation()
        this.setState({drag: false})
    }

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
        let {x, y} = this.getViewCoordinates(e);
        let part = Part.data as Part;
        if (!part) {
            return
        }
        let component = part.make(this.props.board);
        component.geometry.translate(new paper.Point(x - 16, y - 16))

        this.props.board.addComponent(component);

        this.setState({})
    }

    handleMouseDown(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
        e.preventDefault();
        e.stopPropagation();
        // This is only called if neither a pin nor component is clicked.
        this.clearSelection();
        const {Path, Point, Rectangle, Size} = this.props.board.scope;
        // this.setState({pan: true});
        const {x, y} = this.getViewCoordinates(e);
        this.sPoint = new Point(x, y);
        let rect = new Rectangle(this.sPoint, new Size(0, 0))
        this.select = new Path.Rectangle(rect)
        this.setState({})
    }

    handleMouseUp(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
        e.preventDefault();
        e.stopPropagation();
        // this.setState({pan: false});
        if (this.select) {
            this.select.remove()
            this.select = null;
        }

        this.setState({pan: false, drag: false});
    }

    handleMouseExit(_e: React.MouseEvent<SVGSVGElement, MouseEvent>) {

        if (this.select) {
            this.select.remove()
            this.select = null;
        }
        this.setState({pan: false, drag: false})
    }

    isSelected(item: paper.Item): boolean {
        const select = this.select as paper.Item;
        const selectionRect = select.bounds;
        let clone = item.clone();
        clone.transform(item.parent.matrix)
        let isSelected = clone.intersects(select) || clone.isInside(selectionRect) || clone.contains(selectionRect.center)
        clone.remove()

        // let matrix = item.parent.matrix;
        // let imatrix = matrix.inverted();
        // item.transform(matrix)
        // let isSelected = item.intersects(select) || item.isInside(selectionRect) || item.contains(selectionRect.center)
        // item.transform(imatrix)
        return isSelected
    }

    handleMouseMove(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
        let {x, y, dx, dy} = this.getViewCoordinates(e)

        if (this.state.drag) {
            e.stopPropagation();
            e.preventDefault();

            let selected = this.props.board.scope.project.getItems({
                selected: true,
                data: {
                    type: 'Component',
                }
            });

            for (let s of selected) {
                let dp = new paper.Point(dx, dy);
                s.parent.translate(dp)
                // for (let c of s.parent.children) {
                //     c.translate(dp)
                // }
            }
            this.setState({});

        }

        if (this.select && this.sPoint) {
            let select = this.select;
            const [sx, sy] = [this.sPoint.x, this.sPoint.y]

            if (x === sx && y === sy) {
                for (let s of select.segments) {
                    s.point = this.sPoint;
                }
            }

            if (x <= sx) {
                select.segments[0].point.x = x
                select.segments[1].point.x = x
                select.segments[2].point.x = sx
                select.segments[3].point.x = sx
            }
            if (x >= sx) {
                select.segments[0].point.x = sx
                select.segments[1].point.x = sx
                select.segments[2].point.x = x
                select.segments[3].point.x = x
            }
            if (y <= sy) {
                select.segments[0].point.y = sy
                select.segments[1].point.y = y
                select.segments[2].point.y = y
                select.segments[3].point.y = sy
            }
            if (y >= sy) {
                select.segments[0].point.y = y
                select.segments[1].point.y = sy
                select.segments[2].point.y = sy
                select.segments[3].point.y = y
            }

            const {project} = this.props.board.scope;

            let components = project.getItems({
                data: {
                    type: 'Component'
                }
            })

            let sc = false;

            for (let component of components) {
                if (this.isSelected(component)) {
                    sc = true;
                    component.selected = true;
                } else {
                    component.selected = false;
                }
            }

            let pins = project.getItems({
                data: {
                    type: 'Pin'
                }
            })

            for (let pin of pins) {
                pin.selected = !sc && this.isSelected(pin);
            }

            this.setState({});
            this.forceUpdate();
        }

        if (this.state.pan) {
            this.setState({
                viewBox: {
                    top: this.state.viewBox.top - dy,
                    left: this.state.viewBox.left - dx,
                    width: this.state.viewBox.width,
                    height: this.state.viewBox.height,
                },
            });
        }
    }

    static between(a: number , b: number, c: number) {
        return Math.min(Math.max(a, b), c);
    }

    handleWheel(e: React.WheelEvent<SVGSVGElement>)  {
        let {x, y, rx, ry} = this.getViewCoordinates(e);

        const viewWidth = this.state.viewPort.width,
              viewHeight = this.state.viewPort.height;

        const MIN_SCALE = 1 / 16.0;
        const MAX_SCALE = 4.0;
        const {scaleFactor} = this.state;

        const newScaleFactor = Board.between(MIN_SCALE, Math.pow(2, e.deltaY / 1000) * scaleFactor, MAX_SCALE),
              newWidth = viewWidth * newScaleFactor,
              newHeight = viewHeight * newScaleFactor;

        const newViewBox = {
            left: x - rx * newWidth,
            top: y - ry * newHeight,
            width: newWidth,
            height: newHeight,
        };

        this.setState({
            scaleFactor: newScaleFactor,
            viewBox: newViewBox,
        });
    }


    handleGateMouseDown(logicComponent: LogicComponent, e: React.MouseEvent<SVGElement, MouseEvent>) {
        e.preventDefault();
        e.stopPropagation();

        console.log("Gate Down");
        let selected = this.props.board.scope.project.getItems({
            selected: true,
        })

        let body = logicComponent.body as paper.Item;

        if (!selected.includes(body)) {
            for (let component of selected) {
                component.selected = false;
            }
            body.selected = true;
        }

        this.setState({drag: true});
    }

    handleGateMouseUp(logicComponent: LogicComponent, e: React.MouseEvent<SVGElement, MouseEvent>) {
        e.preventDefault();
        console.log("up gate")
    }

    handleGateContextMenu(logicComponent: LogicComponent, e:React.MouseEvent<SVGElement, MouseEvent>) {
        if (e.shiftKey) {
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        console.log("context g!")
    }

    handlePinMouseDown(logicPin: LogicPin, e:React.MouseEvent<SVGElement, MouseEvent>) {
        e.stopPropagation();
        e.preventDefault();

        let {project} = this.props.board.scope;

        let pins = project.getItems({
            selected: true,
            data: {
                type: 'Pin'
            }
        }).map(p => p.data.logical) as LogicPin[];

        let numOutputs = pins.filter(p => p.pinType === PinType.OUTPUT).length;
        console.log(`Num outputs: ${numOutputs}`)
        if (numOutputs <= 1) {
            for(let pin of pins) {
                this.makeConnection(pin, logicPin);
            }
        }


    }

    makeConnection(a: LogicPin, b: LogicPin) {
        console.log("attempting connection")
        let connection = a.connectTo(b);
        if (connection) {
            this.props.board.addConnection(connection);
            this.setState({});
        }
    }

    get scope(): paper.PaperScope {
        return this.props.board.scope;
    }
}

export default Board;
