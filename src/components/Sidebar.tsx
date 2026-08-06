import React from "react";
import Box from "@mui/material/Box"
import List from "@mui/material/List"
import ListSubheader from "@mui/material/ListSubheader"
import Paper from "@mui/material/Paper"
import Tab from "@mui/material/Tab"
import Tabs from "@mui/material/Tabs"
import {Part} from "./Part";

import {PartsDrawer} from "./PartsDrawer";
import {ProjectIcon, PartsIcon} from "./RailIcons";
import {RAIL_WIDTH, railTabSx, railLabelSx, railTextUpSx} from "./railStyle";
import "../css/Sidebar.css"
import Divider from "@mui/material/Divider";


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
    const sidebarClasses = ["sidebar"]
    if (!this.state.activeTab) {
      sidebarClasses.push("collapsed");
    }
    const classNames = sidebarClasses.join(' ');
    return (
        <Box className={classNames}>
          <Paper classes={{root: "sidebar-content"}}/>
        </Box>
    );
  }

  renderPartsView() {
    const sidebarClasses = ["sidebar"]
    if ("Parts".localeCompare(this.state.activeTab || "")) {
      sidebarClasses.push("collapsed");
    }
    const classNames = sidebarClasses.join(' ');
    return (
        <Box className={classNames}>
          <Paper classes={{root: "sidebar-content"}} sx={{pointerEvents: "auto"}}>
            <List
                subheader={<ListSubheader>Parts</ListSubheader>}
            >
              {[...this.props.parts.entries()].map(([label, parts]) => (
                <PartsDrawer key={label} label={label} parts={parts}/>
                ))}
            </List>
          </Paper>
        </Box>
    );
  }

  renderProjectView() {
    const sidebarClasses = ["sidebar"]
    if ("Project".localeCompare(this.state.activeTab || "")) {
      sidebarClasses.push("collapsed");
    }
    const classNames = sidebarClasses.join(' ');
    return (
      <Box className={classNames}>
        <Paper classes={{root: "sidebar-content"}} sx={{pointerEvents: "auto"}}>
          [Project View Placeholder]
        </Paper>
      </Box>
    );
  }

  renderTab(label: string, index: number, icon: React.ReactElement) {
    return (
    <Tab label={
      <Box sx={railLabelSx}>
        <Box sx={railTextUpSx}>{label}</Box>
        {icon}
      </Box>}
         value={label} {...a11yProps(index)}
         sx={railTabSx}
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
              sx={{ borderRight: 1, borderColor: 'divider', flexShrink: 0, minWidth: `${RAIL_WIDTH}px`,
                    width: `${RAIL_WIDTH}px`}}
          >
            {this.renderTab("Project", 0, <ProjectIcon/>)}
            <Divider/>
            {this.renderTab("Parts", 1, <PartsIcon/>)}
            <Divider/>
          </Tabs>
          <Divider orientation="vertical" sx={{zIndex: 'drawer'}}/>
          {/* Anchored on both edges rather than sized at 100%: a full-width box offset by the rail
              runs past the right edge of the page and adds horizontal scroll. */}
          <div style={{position: "absolute", left: `${RAIL_WIDTH}px`, right: 0, height: "100%", overflow: "hidden", pointerEvents: "none"}}>
            {this.renderUnderlay()}
            {this.renderProjectView()}
            {this.renderPartsView()}
          </div>
        </>
    );
  }

  handleTabClick(value: string, _e: React.MouseEvent<HTMLElement>) {
    if (value.localeCompare(this.state.activeTab || "") === 0) {
      this.setState({activeTab: false})
    }
  }

  handleTabChange(e: React.SyntheticEvent, newValue: string) {
    this.setState({activeTab: newValue})
  }

  handleMouseEnter(_e: React.MouseEvent<HTMLElement>) {
    this.setState({open: true});
  }
}

export {Sidebar};