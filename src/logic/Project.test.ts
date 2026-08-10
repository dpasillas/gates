import {LogicBoard} from './LogicBoard';
import {Project} from './Project';

/** A project with three boards, only the first of which has a tab open. */
function withBoards(): Project {
  const project = new Project();
  project.mainBoard.name = 'main';
  project.addBoard('second');
  project.addBoard('third');
  project.openBoardIds = [project.mainBoard.id];
  project.activeBoardId = project.mainBoard.id;

  return project;
}

describe('a new project', () => {
  test('has one board, open and in front', () => {
    const project = new Project();

    expect(project.boards).toHaveLength(1);
    expect(project.openBoards()).toEqual(project.boards);
    expect(project.activeBoard).toBe(project.boards[0]);
  });

  test('is not saved anywhere yet', () => {
    expect(new Project().saved).toBe(false);
  });
});

describe('showing a board', () => {
  test('opens a tab for one that had none', () => {
    const project = withBoards();
    const second = project.boards[1];

    project.show(second);

    expect(project.openBoards()).toEqual([project.mainBoard, second]);
    expect(project.activeBoard).toBe(second);
  });

  test('brings a board that is already open to the front without opening it twice', () => {
    const project = withBoards();
    project.show(project.boards[1]);

    project.show(project.mainBoard);

    expect(project.openBoards()).toHaveLength(2);
    expect(project.activeBoard).toBe(project.mainBoard);
  });
});

describe('adding a board', () => {
  test('puts it in the project and in front', () => {
    const project = new Project();

    const added = project.addBoard('scratch');

    expect(project.boards).toContain(added);
    expect(added.name).toBe('scratch');
    expect(project.activeBoard).toBe(added);
  });

  test('takes a board that already exists, for one read out of a file', () => {
    const project = new Project();
    const brought = new LogicBoard();

    project.addBoard('imported', brought);

    expect(project.activeBoard).toBe(brought);
  });

  test('leaves the first board the main one', () => {
    const project = new Project();
    const first = project.mainBoard;

    project.addBoard('second');

    expect(project.mainBoard).toBe(first);
  });
});

describe('closing a tab', () => {
  test('leaves the board in the project', () => {
    const project = withBoards();
    const second = project.boards[1];
    project.show(second);

    project.closeBoard(second);

    expect(project.openBoards()).not.toContain(second);
    expect(project.boards).toContain(second);
  });

  test('moves to the neighbour the closed tab was in front of', () => {
    const project = withBoards();
    project.show(project.boards[1]);
    project.show(project.boards[2]);
    project.activeBoardId = project.boards[1].id;

    project.closeBoard(project.boards[1]);

    expect(project.activeBoard).toBe(project.boards[2]);
  });

  test('leaves the front tab alone when another one closes', () => {
    const project = withBoards();
    project.show(project.boards[1]);
    project.show(project.boards[2]);

    project.closeBoard(project.boards[1]);

    expect(project.activeBoard).toBe(project.boards[2]);
  });

  test('refuses to close the last one, since the editor needs a board', () => {
    const project = new Project();

    project.closeBoard(project.mainBoard);

    expect(project.openBoards()).toHaveLength(1);
  });
});

/** A project with all three boards' tabs open, in the order they were added. */
function withTabs(): Project {
  const project = withBoards();
  project.show(project.boards[1]);
  project.show(project.boards[2]);

  return project;
}

/** The names of the tabs, in tab order. */
function tabs(project: Project): string[] {
  return project.openBoards().map(board => board.name);
}

describe('dragging a tab into a new place', () => {
  test('drops it at the front of the row', () => {
    const project = withTabs();

    project.moveTabTo(project.boards[2], 0);

    expect(tabs(project)).toEqual(['third', 'main', 'second']);
  });

  test('drops it at the end of the row', () => {
    const project = withTabs();

    project.moveTabTo(project.boards[0], 2);

    expect(tabs(project)).toEqual(['second', 'third', 'main']);
  });

  test('drops it between two others', () => {
    const project = withTabs();

    project.moveTabTo(project.boards[2], 1);

    expect(tabs(project)).toEqual(['main', 'third', 'second']);
  });

  test('leaves it where it was when it lands back in its own place', () => {
    const project = withTabs();

    project.moveTabTo(project.boards[1], 1);

    expect(tabs(project)).toEqual(['main', 'second', 'third']);
  });

  test('holds an index past the end to the end', () => {
    const project = withTabs();

    project.moveTabTo(project.boards[0], 99);

    expect(tabs(project)).toEqual(['second', 'third', 'main']);
  });

  test('does nothing to a board that has no tab open', () => {
    const project = withBoards();

    project.moveTabTo(project.boards[2], 0);

    expect(tabs(project)).toEqual(['main']);
  });

  test('leaves the front tab in front, wherever it has moved to', () => {
    const project = withTabs();
    const front = project.activeBoard;

    project.moveTabTo(front, 0);

    expect(project.activeBoard).toBe(front);
  });

  test('says nothing about the project, which keeps its order and its main board', () => {
    const project = withTabs();
    const main = project.mainBoard;

    project.moveTabTo(project.boards[2], 0);

    expect(project.boards.map(board => board.name)).toEqual(['main', 'second', 'third']);
    expect(project.mainBoard).toBe(main);
  });
});

describe('deleting a board', () => {
  test('takes it out of the project and closes its tab', () => {
    const project = withTabs();
    const second = project.boards[1];

    project.removeBoard(second);

    expect(project.boards).not.toContain(second);
    expect(tabs(project)).toEqual(['main', 'third']);
  });

  test('will not take the main board, which the project is named for', () => {
    const project = withTabs();

    expect(project.canRemove(project.mainBoard)).toBe(false);

    project.removeBoard(project.mainBoard);

    expect(project.boards).toHaveLength(3);
  });

  test('offers every other board', () => {
    const project = withTabs();

    expect(project.boards.filter(board => project.canRemove(board)).map(board => board.name))
        .toEqual(['second', 'third']);
  });

  test('moves off a board that was in front when it went', () => {
    const project = withTabs();
    project.show(project.boards[1]);

    project.removeBoard(project.boards[1]);

    expect(project.activeBoard.name).toBe('third');
    expect(project.boards).toContain(project.activeBoard);
  });

  test('opens the main board rather than leaving the editor with nothing', () => {
    // Only the board being deleted was open, so closing its tab would leave no tab at all.
    const project = withBoards();
    project.openBoardIds = [project.boards[1].id];
    project.activeBoardId = project.boards[1].id;

    project.removeBoard(project.boards[1]);

    expect(tabs(project)).toEqual(['main']);
    expect(project.activeBoard).toBe(project.mainBoard);
  });

  test('leaves a board that was not open out of the tabs it was never in', () => {
    const project = withBoards();

    project.removeBoard(project.boards[2]);

    expect(tabs(project)).toEqual(['main']);
    expect(project.boards.map(board => board.name)).toEqual(['main', 'second']);
  });
});
