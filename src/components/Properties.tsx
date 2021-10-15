import React from "react"
import Draggable from "react-draggable"

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import Typography from "@mui/material/Typography";

import LogicBoard from "../logic/LogicBoard";
import "../css/Properties.css"
import SliderWithInput from "./SliderWithInput";
import NumberInputWithSideControls from "./NumberInputWithSideControls";
import Stack from "@mui/material/Stack";

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
    let width = 2;

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
              <Collapse in={this.state.open}>
                <CardContent className="properties-main" sx={{pt: 0, m: 1}}>
                  <Stack spacing={2}>
                    <SliderWithInput
                        min={1}
                        max={32}
                        value={undefined}
                        label="Width"
                        onChange={this.handleChangeWidth.bind(this)}/>
                    <SliderWithInput
                        min={1}
                        max={4}
                        value={this.state.numInputs}
                        label="Num Inputs"
                        onChange={this.handleChangeNumInputs.bind(this)}/>
                    <NumberInputWithSideControls
                        label="Propagation Delay"
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
    this.setState({width})
  }

  handleChangeNumInputs(numInputs: number) {
    this.setState({numInputs})
  }
}

export default Properties;