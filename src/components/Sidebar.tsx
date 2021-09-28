import React from "react";
import "../css/Sidebar.css"

interface IProps {
  content: React.ReactElement | HTMLElement | string;
}
interface IState {
  open: boolean;
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
    }
  }

  render() {
    let sidebarClasses = ["sidebar"]
    if (!this.state.open) {
      sidebarClasses.push("collapsed")
    }
    return (
        <div className={sidebarClasses.join(' ')}
             onMouseLeave={(e) => this.handleMouseExit(e)}
        >
          <div className="floaty"
               onMouseEnter={(e) => this.handleMouseEnter(e)}
          />
          <div className="sidebar-content">
            {this.props.content}
          </div>
          <div className="divider">
            <button className="handle"
                    onClick={(e) => this.handleMouseDown(e)}
            >*</button>
          </div>
        </div>
    );
  }

  handleMouseEnter(e: React.MouseEvent<HTMLElement>) {
    this.setState({open: true});
  }

  handleMouseExit(e: React.MouseEvent<HTMLElement>) {
    this.setState({open: false});
  }

  handleMouseDown(e: React.MouseEvent<HTMLElement>) {
    this.setState((prevState, prevProps) => {
      return {
        open: !prevState.open
      }
    })
  }
}

export default Sidebar;