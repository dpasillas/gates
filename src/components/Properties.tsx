import React from "react"
import Draggable from "react-draggable"

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

import LogicBoard from "../logic/LogicBoard";
import "../css/Properties.css"
import SliderWithInput from "./SliderWithInput";
import NumberInputWithSideControls from "./NumberInputWithSideControls";
import Stack from "@mui/material/Stack";
import FluentIterable from "../util/FluentIterable";

interface IProps {
  board: LogicBoard;
}
interface IState {
  open: boolean;
  width: number;
  numInputs: number;
}

class Properties extends React.Component<IProps, IState> {
  constructor(props: Readonly<IProps>) {
    super(props);
    this.state = {
      open: true,
      width: 1,
      numInputs: 2,
    }
  }

  componentDidMount() {
    this.props.board.updateProperties = () => this.setState({});
  }

  componentWillUnmount() {
    this.props.board.updateProperties = () => {};
  }

  render() {
    let components = this.props.board.selectedComponents;
    let open = components.size !== 0;
    let adjustableWidth = FluentIterable
        .from(components)
        .map(c => c.adjustableWidth)
        .reduce((prev, current) => prev && current, true)

    let widths = FluentIterable
        .from(components)
        .map(c => c.width)
        .reduce((values, current) => values.add(current), new Set<number>());

    let width: number | '-' | undefined = undefined;
    if (widths.size > 1) {
      width = '-';
    } else {
      widths.forEach(v => width = v);
    }

    let adjustableNumInputs = FluentIterable
        .from(components)
        .map(c => c.adjustableFieldWidth)
        .reduce((prev, current) => prev && current, true)

    let numInputss = FluentIterable
        .from(components)
        .map(c => c.fieldWidth)
        .reduce((values, current) => values.add(current), new Set<number>());

    let numInputs: number | '-' | undefined = undefined;
    if (numInputss.size > 1) {
      numInputs = '-';
    } else {
      numInputss.forEach(v => numInputs = v);
    }

    return (
        <>
          <Draggable
              handle="#handle"
              bounds="body"
          >
            <Card className="properties-root" sx={{borderColor: "divider"}}>
              <CardContent id="handle" sx={{px: 3}}>
                <Typography>Properties</Typography>
              </CardContent>
              <Divider/>
              <Collapse in={open}>
                <CardContent className="properties-main" sx={{pt: 0, m: 1}}>
                  <Stack spacing={2}>
                    <SliderWithInput
                        min={1}
                        max={32}
                        value={adjustableWidth ? width : undefined}
                        label="Width"
                        onChange={this.handleChangeWidth.bind(this)}/>
                    <SliderWithInput
                        min={2}
                        max={4}
                        value={adjustableNumInputs ? numInputs : undefined}
                        label="Num Inputs"
                        onChange={this.handleChangeNumInputs.bind(this)}/>
                    <NumberInputWithSideControls
                        label="Propagation Delay"
                        onChange={this.handleChangePropagationDelay.bind(this)}
                    />
                  </Stack>
                </CardContent>
              </Collapse>
            </Card>
          </Draggable>
        </>
    );
  }

  handleChangeWidth(width: number) {
    let components = this.props.board.selectedComponents;

    for (let component of components) {
      if (component.adjustableWidth) {
        component.width = width;
      }
    }

    this.setState({width})
  }

  handleChangeNumInputs(numInputs: number) {
    let components = this.props.board.selectedComponents;

    for (let component of components) {
      if (component.adjustableFieldWidth) {
        component.fieldWidth = Math.min(component.maxFieldWidth, Math.max(component.minFieldWidth, numInputs))
      }
    }
    this.setState({numInputs})
  }

  handleChangePropagationDelay(delay: number) {
    let components = this.props.board.selectedComponents;

    for (let component of components) {
      if (component.hasDelay) {
        component.delay = delay
      }
    }
  }
}

export default Properties;