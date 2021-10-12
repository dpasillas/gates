import React from "react";
import "../css/Sidebar.css"
import {Box, List, ListSubheader, Paper, Tab, Tabs} from "@mui/material";
import Part from "./Part";
import PartsDrawer from "./PartsDrawer";


function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`,
  };
}


interface IProps {
  parts: Map<string, Part[]>;
}
interface IState {
  open: boolean;
  activeTab: string | false;
}

/**
 * Generic container which expands to show contents on mouse hover
 *
 * Needs work, and may be replaced.
 */
class Sidebar extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      open: false,
      activeTab: false,
    }
  }

  renderUnderlay() {
    let sidebarClasses = ["sidebar"]
    if (!this.state.activeTab) {
      sidebarClasses.push("collapsed");
    }
    let classNames = sidebarClasses.join(' ');
    return (
        <Box className={classNames}>
          <Paper classes={{root: "sidebar-content"}}/>
        </Box>
    );
  }

  renderPartsView() {
    let sidebarClasses = ["sidebar"]
    if ("Parts".localeCompare(this.state.activeTab || "")) {
      sidebarClasses.push("collapsed");
    }
    let classNames = sidebarClasses.join(' ');
    return (
        <Box className={classNames}>
          <Paper classes={{root: "sidebar-content"}} sx={{pointerEvents: "auto"}}>
            <List
                subheader={<ListSubheader>Parts</ListSubheader>}
            >
              <PartsDrawer label="Input" parts={this.props.parts.get("Input")!}/>
              <PartsDrawer label="Output" parts={this.props.parts.get("Output")!}/>
              <PartsDrawer label="Gates" parts={this.props.parts.get("Gates")!}/>
            </List>
          </Paper>
        </Box>
    );
  }

  renderProjectView() {
    let sidebarClasses = ["sidebar"]
    if ("Project".localeCompare(this.state.activeTab || "")) {
      sidebarClasses.push("collapsed");
    }
    let classNames = sidebarClasses.join(' ');
    return (
      <Box className={classNames}>
        <Paper classes={{root: "sidebar-content"}} sx={{pointerEvents: "auto"}}>
          [Project View Placeholder]
        </Paper>
      </Box>
    );
  }

  renderTab(label: string, index: number) {
    return (
    <Tab label={
      <Box sx={{
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        transform: "rotate(180deg)"}}>{label}</Box>}
         value={label} {...a11yProps(index)}
         sx={{minWidth: "48px"}}
         onClick={this.handleTabClick.bind(this, label)}/>
    );
  }

  render() {
    return (
        <>
          <Tabs
              orientation="vertical"
              variant="scrollable"
              value={this.state.activeTab}
              onChange={this.handleTabChange.bind(this)}
              aria-label="Side Controls"
              sx={{ borderRight: 1, borderColor: 'divider', flexShrink: 0, minWidth: '48px'}}
          >
            {this.renderTab("Project", 0)}
            {this.renderTab("Parts", 1)}
          </Tabs>
          <div style={{position: "absolute", left: "50px", width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none"}}>
            {this.renderUnderlay()}
            {this.renderProjectView()}
            {this.renderPartsView()}
          </div>
        </>
    );
  }

  handleTabClick(value: string, e: React.MouseEvent<HTMLElement>) {
    if (value.localeCompare(this.state.activeTab || "") === 0) {
      this.setState({activeTab: false})
    }
  }

  handleTabChange(e: React.SyntheticEvent, newValue: string) {
    this.setState({activeTab: newValue})
  }

  handleMouseEnter(e: React.MouseEvent<HTMLElement>) {
    this.setState({open: true});
  }
}

export default Sidebar;