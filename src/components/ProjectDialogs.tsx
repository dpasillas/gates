import React from "react";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import {ProjectSummary} from "../storage/projectStore";

/**
 * Asks for a name.
 *
 * Projects are stored where the user cannot browse to them, so there is no file dialog to name one
 * in and the app has to ask outright.
 *
 * Rendered only while it is being asked, so that each time it opens it starts from what is current
 * rather than from whatever was typed into it last.
 */
function NameDialog(
    {title, label, initial, confirm, onCancel, onSubmit}: {
      title: string,
      label: string,
      initial: string,
      confirm: string,
      onCancel: () => void,
      onSubmit: (name: string) => void,
    }) {
  const [name, setName] = React.useState(initial);
  const trimmed = name.trim();

  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={e => {e.preventDefault(); if (trimmed) {onSubmit(trimmed)}}}>
        <DialogContent>
          {/* Named explicitly so the label is tied to the field it labels, which is what a screen
              reader and a test both go looking for. */}
          <TextField autoFocus fullWidth variant="standard"
                     id="name-dialog-field"
                     label={label}
                     value={name}
                     onChange={e => setName(e.target.value)}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={!trimmed}>{confirm}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** When a project was last open here, in the reader's own format. */
function lastOpened(at?: number): string {
  return at ? `Last opened ${new Date(at).toLocaleDateString()}` : "Not opened here yet";
}

/** The projects in storage, to pick one from. */
function OpenProjectDialog(
    {open, projects, onCancel, onOpen}: {
      open: boolean,
      projects: ProjectSummary[],
      onCancel: () => void,
      onOpen: (id: string) => void,
    }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Open Project</DialogTitle>
      <DialogContent dividers>
        {projects.length === 0
          ? <Typography variant="body2" color="text.secondary">
              There are no saved projects yet.
            </Typography>
          : <List disablePadding>
              {projects.map(project => (
                <ListItemButton key={project.id} onClick={() => onOpen(project.id)}>
                  <ListItemText primary={project.name} secondary={lastOpened(project.openedAt)}/>
                </ListItemButton>
              ))}
            </List>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Something that can be picked out of a list by name. */
interface Pickable {
  id: string;
  name: string;
}

/**
 * Picks one thing out of the project's things of a kind.
 *
 * A board is exported from the editor, where one is always in front; a component or a package has
 * no such place, so the one to write out has to be asked for.
 */
function PickDialog(
    {title, items, confirm, onCancel, onPick}: {
      title: string,
      items: Pickable[],
      confirm: string,
      onCancel: () => void,
      onPick: (id: string) => void,
    }) {
  const [chosen, setChosen] = React.useState<string | undefined>(
      items.length === 1 ? items[0].id : undefined);

  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <List disablePadding>
          {items.map(item => (
            <ListItemButton key={item.id} selected={item.id === chosen}
                            onClick={() => setChosen(item.id)}
                            onDoubleClick={() => onPick(item.id)}>
              <ListItemText primary={item.name}/>
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button disabled={chosen === undefined} onClick={() => chosen && onPick(chosen)}>
          {confirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export {NameDialog, OpenProjectDialog, PickDialog};
export type {Pickable};
