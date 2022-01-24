import React from "react"
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

interface IProps {
  min: number,
  max: number,
  value: number | '-' | undefined,
  label?: string,
  disabled?: boolean,
  onChange: (value: number) => void,
}
interface IState {
  empty: boolean,
}

class SliderWithInput extends React.Component<IProps, IState>{
  constructor(props: Readonly<IProps>) {
    super(props);
    this.state = {
      empty: false,
    }
  }

  render() {
    let {min, max} = this.props;
    max = max ?? Number.MAX_SAFE_INTEGER;

    let textProps = {};

    if (this.props.value === undefined) {
      textProps = {
        color: 'text.disabled'
      }
    }

    return (
        <Box>
          <Typography variant="subtitle1" {...textProps}>{this.props.label}</Typography>
          <Grid container spacing={2} alignItems="center" columns={2} paddingX={2}>
            <Grid item xs>
              <Slider step={1}
                      disabled={this.props.value === undefined}
                      value={this.props.value == '-' ? -1 : this.props.value}
                      marks
                      min={min}
                      max={max}
                      onChange={(e, v) => this.handleChangeSlider(e, v)}/>
            </Grid>
            <Grid item>
               <TextField
                   sx={{
                     "& input[type=number]" : {
                       width: "4ch",
                       textAlign: "right",
                       marginLeft: 1,
                     },
                   }}
                   variant="standard"
                   type="number"
                   disabled={this.props.value === undefined}
                   value={this.state.empty ? "" : this.props.value}
                   onChange={(e) => this.handleChangeInput(e)}
                   inputProps={{
                     step:1,
                     min: min,
                     max: max,
                   }}
                   />
            </Grid>
          </Grid>
        </Box>
    );
  }

  handleChangeSlider(e: Event, v: number | number[]) {
    if (this.state.empty) {
      this.setState({empty: false})
    }
    let valueString = (v as number).toString();
    // The number array comes from sliders with more than one thumb, which is not being used here.
    this.handleChange(v as number, valueString);
  }

  handleChangeInput(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement> ) {
    let valueString = e.target.value;

    if (valueString.length === 0 && !this.state.empty) {
      this.setState({empty: true});
      return;
    } else if (valueString.length !== 0 && this.state.empty) {
      this.setState({empty: false});
    }

    let value = parseInt(e.target.value);
    let {min, max} = this.props

    if (!isNaN(value) && value >= min && value <= max) {
      this.handleChange(value, valueString)
    }
  }

  handleChange(value: number, valueString: string) {
    let {min, max} = this.props;
    let clippedNumber = Math.min(Math.max(value, min), max ?? Number.MAX_SAFE_INTEGER)

    this.props.onChange(value)
  }
}

export default SliderWithInput