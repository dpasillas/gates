import React from "react"
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Add from "@mui/icons-material/Add";
import Remove from "@mui/icons-material/Remove";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

interface IProps {
  label: string;
  value?: number;
  onChange: (value: number) => void;
}

interface IState {}

class NumberInputWithSideControls extends React.Component<IProps, IState> {
  constructor(props: Readonly<IProps>) {
    super(props);
  }

  render() {
    return (
        <Box>
          <Typography variant="subtitle1">{this.props.label}</Typography>
          <Grid container>
            <Grid item xs={1}/>
            <Grid item>
              <IconButton><Add/></IconButton>
            </Grid>
            <Grid item xs>
              <TextField
                  variant="standard"
                  sx={{
                    "& input": {
                      textAlign: 'center'
                    }
                  }}
              />
            </Grid>
            <Grid item>
              <IconButton><Remove/></IconButton>
            </Grid>
            <Grid item xs={1}/>
          </Grid>
        </Box>
    );
  }
}

export default NumberInputWithSideControls