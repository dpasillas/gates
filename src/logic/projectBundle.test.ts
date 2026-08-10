import {LogicBoard} from './LogicBoard';
import {Project} from './Project';
import {parseProjectBundle, serializeProjectBundle} from './projectFile';
import {makeComponent} from './componentFactory';
import {projectFromBundle} from '../storage/projectStore';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/** A project of two boards, the second with a gate on it. */
function project(): Project {
  const made = new Project();
  made.name = '4-bit ALU';
  made.mainBoard.name = 'alu_core';

  const second = made.addBoard('adder4');
  const gate = makeComponent(
      {type: PartType.GATE, subtype: GateType.AND, scope: second.scope, board: second});
  gate.geometry.position = new second.scope.Point(40, 40);
  second.addComponent(gate);

  return made;
}

/** The project as it comes back from travelling as one file. */
function roundTrip(made: Project): Project {
  return projectFromBundle(parseProjectBundle(JSON.stringify(serializeProjectBundle(made))));
}

describe('a project bundled into one file', () => {
  test('brings its name and its boards', () => {
    const reopened = roundTrip(project());

    expect(reopened.name).toBe('4-bit ALU');
    expect(reopened.boards.map(board => board.name)).toEqual(['alu_core', 'adder4']);
  });

  test('brings what is on each of them', () => {
    const reopened = roundTrip(project());

    expect(reopened.boards[0].components.size).toBe(0);
    expect(reopened.boards[1].components.size).toBe(1);
  });

  test('stays the same project, so bringing it back does not make a second one', () => {
    const made = project();

    expect(roundTrip(made).id).toBe(made.id);
  });

  test('keeps each board on the file it was written to', () => {
    const made = project();

    const reopened = roundTrip(made);

    expect(reopened.boards.map(board => board.id))
        .toEqual(made.boards.map(board => board.id));
  });

  test('opens every board it holds', () => {
    const reopened = roundTrip(project());

    expect(reopened.openBoards()).toHaveLength(2);
    expect(reopened.activeBoard).toBe(reopened.mainBoard);
  });

  test('leaves the boards of an empty project alone rather than showing none', () => {
    const empty = new Project(new LogicBoard());
    empty.boards = [];

    expect(roundTrip(empty).boards).toHaveLength(1);
  });
});

describe('reading something that is not a bundled project', () => {
  test('refuses text that is not JSON', () => {
    expect(() => parseProjectBundle('<html>')).toThrow(/not valid JSON/);
  });

  test('refuses a board, which is a different kind of file', () => {
    expect(() => parseProjectBundle('{"format": "gates.board", "version": 1}'))
        .toThrow(/not a Gates project/);
  });

  test('refuses a version this build does not know', () => {
    expect(() => parseProjectBundle('{"format": "gates.project.bundle", "version": 99}'))
        .toThrow(/different version/);
  });

  test('refuses one with its boards missing', () => {
    expect(() => parseProjectBundle('{"format": "gates.project.bundle", "version": 1}'))
        .toThrow(/damaged/);
  });
});
