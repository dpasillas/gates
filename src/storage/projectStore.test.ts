import {readProject, writeInto, MANIFEST} from './projectStore';
import {asDirectoryHandle, FakeDirectory} from '../test/fakeFileSystem';
import {LogicBoard} from '../logic/LogicBoard';
import {Project} from '../logic/Project';
import {parseProjectFile} from '../logic/projectFile';
import {makeComponent} from '../logic/componentFactory';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/** A project with one board holding one gate, so that saving it has something to write. */
function project(name = 'Untitled Project', boardName = 'main'): Project {
  const board = new LogicBoard();
  board.name = boardName;
  const gate = makeComponent({type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
  gate.geometry.position = new board.scope.Point(60, 40);
  board.addComponent(gate);

  const made = new Project(board);
  made.name = name;

  return made;
}

function directory(): FakeDirectory {
  return new FakeDirectory('a-project-id');
}

describe('writing a project to its directory', () => {
  test('leaves a manifest and a file per board', async () => {
    const home = directory();
    const saved = project();

    await writeInto(saved, asDirectoryHandle(home));

    expect(home.paths().sort())
        .toEqual([`boards/${saved.activeBoard.id}.json`, MANIFEST]);
  });

  test('names board files by identity, so renaming one moves nothing', async () => {
    const home = directory();
    const saved = project('ALU', 'alu_core');

    await writeInto(saved, asDirectoryHandle(home));
    saved.activeBoard.name = 'renamed';
    await writeInto(saved, asDirectoryHandle(home));

    expect(home.paths()).toHaveLength(2);
    expect(parseProjectFile(home.read(MANIFEST)!).boards[0].name).toBe('renamed');
  });

  test('names the boards in the manifest', async () => {
    const home = directory();
    const saved = project('4-bit ALU', 'alu_core');

    await writeInto(saved, asDirectoryHandle(home));

    const manifest = parseProjectFile(home.read(MANIFEST)!);
    expect(manifest.name).toBe('4-bit ALU');
    expect(manifest.boards).toEqual([{
      id: saved.activeBoard.id,
      name: 'alu_core',
      file: `boards/${saved.activeBoard.id}.json`,
    }]);
  });

  test('leaves the lists for what does not exist yet empty rather than absent', async () => {
    const home = directory();

    await writeInto(project(), asDirectoryHandle(home));

    const manifest = parseProjectFile(home.read(MANIFEST)!);
    expect(manifest.components).toEqual([]);
    expect(manifest.interfaces).toEqual([]);
    expect(manifest.tests).toEqual([]);
  });

  test('counts as saved once it has been written', async () => {
    const saved = project();
    expect(saved.saved).toBe(false);

    await writeInto(saved, asDirectoryHandle(directory()));

    expect(saved.saved).toBe(true);
  });
});

describe('reading a project back', () => {
  test('brings back its name and its boards', async () => {
    const home = directory();
    await writeInto(project('4-bit ALU', 'alu_core'), asDirectoryHandle(home));

    const reopened = await readProject(asDirectoryHandle(home));

    expect(reopened.name).toBe('4-bit ALU');
    expect(reopened.boards).toHaveLength(1);
    expect(reopened.activeBoard.name).toBe('alu_core');
    expect(reopened.activeBoard.components.size).toBe(1);
  });

  test('is the same project it was, not a new one', async () => {
    const home = directory();
    const saved = project();
    await writeInto(saved, asDirectoryHandle(home));

    const reopened = await readProject(asDirectoryHandle(home));

    expect(reopened.id).toBe(saved.id);
  });

  test('gives each board back the identity its file is named after', async () => {
    // A board that came back as a new board would be saved to a new file, leaving its old one
    // behind in the project directory every time the project was opened and saved.
    const home = directory();
    const saved = project();
    await writeInto(saved, asDirectoryHandle(home));

    const reopened = await readProject(asDirectoryHandle(home));
    await writeInto(reopened, asDirectoryHandle(home));

    expect(reopened.activeBoard.id).toBe(saved.activeBoard.id);
    expect(home.paths()).toHaveLength(2);
  });

  test('shows every board it read', async () => {
    const home = directory();
    const saved = project();
    saved.addBoard('second');
    await writeInto(saved, asDirectoryHandle(home));

    const reopened = await readProject(asDirectoryHandle(home));

    expect(reopened.boards.map(board => board.name)).toEqual(['main', 'second']);
    expect(reopened.openBoardIds).toHaveLength(2);
    expect(reopened.activeBoard).toBe(reopened.mainBoard);
  });

  test('refuses a directory that is not a project', async () => {
    await expect(readProject(asDirectoryHandle(directory()))).rejects.toThrow();
  });

  test('refuses a manifest naming a file outside the project', async () => {
    const home = directory();
    const manifest = await home.getFileHandle(MANIFEST, {create: true});
    manifest.contents = JSON.stringify({
      format: 'gates.project',
      version: 1,
      id: 'x',
      name: 'Sneaky',
      boards: [{id: 'escape', name: 'escape', file: '../../elsewhere.json'}],
    });

    await expect(readProject(asDirectoryHandle(home)))
        .rejects.toThrow(/outside itself/);
  });

  test('still shows a board when the manifest names none', async () => {
    const home = directory();
    const manifest = await home.getFileHandle(MANIFEST, {create: true});
    manifest.contents = JSON.stringify({
      format: 'gates.project', version: 1, id: 'x', name: 'Empty', boards: [],
    });

    const reopened = await readProject(asDirectoryHandle(home));

    expect(reopened.boards).toHaveLength(1);
  });
});
