import React from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Check from "@mui/icons-material/Check";
import ChevronRight from "@mui/icons-material/ChevronRight";

import "../css/MenuBar.css";

/**
 * One line of a menu.
 *
 * An item with neither something to run nor a submenu is one the app does not do yet. They are
 * listed anyway, and disabled: the shape of what the app will do is easier to read whole than
 * discovered a line at a time, and an item appearing later in a place nobody has looked before is
 * worse than one that has been sitting there greyed out.
 */
interface MenuItemSpec {
  label: string;
  /** Shown right-aligned. Only describes the key: binding it is the caller's business. */
  shortcut?: string;
  run?: () => void;
  items?: MenuItemSpec[];
  /** Shown ticked, for the options that are settings rather than actions. */
  checked?: boolean;
  /** Drawn in the error colour, for the ones that destroy something. */
  danger?: boolean;
  /** Draws a rule above this item, grouping what follows. */
  separated?: boolean;
}

interface MenuSpec {
  label: string;
  items: MenuItemSpec[];
}

interface IProps {
  menus: MenuSpec[];
  /** What is being worked on, shown beside the menus. */
  title: string;
}

/**
 * Whether there is anything behind the item.
 *
 * A submenu counts only if something inside it does: one that opens onto nothing but greyed-out
 * lines wastes the click it took to find that out.
 */
function isEnabled(item: MenuItemSpec): boolean {
  return Boolean(item.run) || (item.items?.some(isEnabled) ?? false);
}

/** The label, its tick and its shortcut, laid out the same whichever menu the item is in. */
function itemContents(item: MenuItemSpec) {
  return (
    <>
      <Box className="menu-tick">{item.checked && <Check fontSize="inherit"/>}</Box>
      <ListItemText primaryTypographyProps={{variant: "body2"}}>{item.label}</ListItemText>
      {item.shortcut &&
        <Typography className="menu-shortcut" variant="body2">{item.shortcut}</Typography>}
    </>
  );
}

/** An item that opens another menu beside it. */
function SubMenu({item, onDone}: {item: MenuItemSpec, onDone: () => void}) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  return (
    <>
      <MenuItem className="menu-item"
                disabled={!isEnabled(item)}
                onClick={e => setAnchor(e.currentTarget)}>
        {itemContents(item)}
        <ChevronRight className="menu-chevron" fontSize="small"/>
      </MenuItem>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
            anchorOrigin={{vertical: "top", horizontal: "right"}}
            transformOrigin={{vertical: "top", horizontal: "left"}}>
        {menuItems(item.items ?? [], () => {setAnchor(null); onDone()})}
      </Menu>
    </>
  );
}

/**
 * A menu's contents, as a flat list.
 *
 * Flat rather than a rule and an item wrapped together, because these are the children of a list
 * and anything but a list item or a rule among them is neither valid markup nor navigable.
 */
function menuItems(items: MenuItemSpec[], onDone: () => void): React.ReactNode[] {
  return items.flatMap((item, i) => {
    const rendered = item.items
      ? <SubMenu key={`item-${i}`} item={item} onDone={onDone}/>
      : (
        <MenuItem key={`item-${i}`} className="menu-item"
                  disabled={!isEnabled(item)}
                  sx={item.danger ? {color: "error.main"} : undefined}
                  onClick={() => {item.run?.(); onDone()}}>
          {itemContents(item)}
        </MenuItem>
      );

    return item.separated ? [<Divider key={`rule-${i}`}/>, rendered] : [rendered];
  });
}

/**
 * The row of menus above the toolbar.
 *
 * Everything the toolbar can do appears here too, so that there is one place to look for an action
 * and one place that shows what it is bound to.
 */
class MenuBar extends React.Component<IProps, {open: string | null, anchor: HTMLElement | null}> {
  constructor(props: IProps) {
    super(props);
    this.state = {open: null, anchor: null};
  }

  close() {
    this.setState({open: null, anchor: null});
  }

  render() {
    return (
      <Box className="menu-bar"
           sx={{bgcolor: "background.paper", borderBottom: 1, borderColor: "divider"}}>
        {this.props.menus.map(menu => (
          <Box key={menu.label} component="span">
            <Button className="menu-button" color="inherit" size="small"
                    aria-haspopup="menu"
                    aria-expanded={this.state.open === menu.label}
                    onClick={e => this.setState({open: menu.label, anchor: e.currentTarget})}>
              {menu.label}
            </Button>
            <Menu anchorEl={this.state.anchor}
                  open={this.state.open === menu.label}
                  onClose={this.close.bind(this)}
                  anchorOrigin={{vertical: "bottom", horizontal: "left"}}
                  transformOrigin={{vertical: "top", horizontal: "left"}}>
              {menuItems(menu.items, this.close.bind(this))}
            </Menu>
          </Box>
        ))}
        {/* A spacer rather than a margin on the title: the title is a themed component, and its own
            styles are applied after this file's and would reset one. */}
        <Box sx={{flexGrow: 1}}/>
        <Typography className="menu-title" variant="body2" sx={{color: "text.secondary"}}>
          {this.props.title}
        </Typography>
      </Box>
    );
  }
}

export {MenuBar};
export type {MenuItemSpec, MenuSpec};
