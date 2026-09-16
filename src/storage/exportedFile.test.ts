import {GLOBAL_SCOPE} from '../Constants';
import {LogicBoard} from '../logic/LogicBoard';
import {PinType} from '../logic/LogicPin';
import {PackageComponent} from '../logic/PackageComponent';
import {Project} from '../logic/Project';
import {defineComponent} from '../logic/ComponentDefinition';
import {makeComponent} from '../logic/componentFactory';
import {setPort} from '../logic/nets';
import {packageForBoard} from '../logic/packageFromBoard';
import {serializeProjectBundle} from '../logic/projectFile';
import {boardText} from './boardStore';
import {componentText} from './componentStore';
import {readExported} from './exportedFile';
import {packageText} from './packageStore';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

/**
 * One door for everything exported.
 *
 * Each kind of file says what it is, so the reader finds out rather than being told.
 */

function reg8(): PackageComponent {
  const pkg = new PackageComponent({scope: GLOBAL_SCOPE, name: 'reg8'});
  pkg.declarePin({label: 'D', pinType: PinType.INPUT, width: 8});

  return pkg;
}

function andBoard(name = 'core'): LogicBoard {
  const board = new LogicBoard();
  board.name = name;
  const and = makeComponent({type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
  board.addComponent(and);
  setPort(board, and.outputPins[0], 'y');

  return board;
}

describe('reading whatever was exported', () => {
  test('knows a board', () => {
    const read = readExported(boardText(andBoard()), new Project());

    expect(read.kind).toBe('board');
    expect(read.kind === 'board' && read.board.name).toBe('core');
  });

  test('knows a component', () => {
    const board = andBoard();
    const made = defineComponent({name: 'and2', board, packaging: packageForBoard(board, 'p')});

    const read = readExported(componentText(made, new Project()), new Project());

    expect(read.kind).toBe('component');
    expect(read.kind === 'component' && read.definition.name).toBe('and2');
  });

  test('knows a package', () => {
    const read = readExported(packageText(reg8()), new Project());

    expect(read.kind).toBe('package');
    expect(read.kind === 'package' && read.pkg.name).toBe('reg8');
  });

  test('knows a whole project', () => {
    const project = new Project();
    project.name = 'ALU';
    const text = JSON.stringify(serializeProjectBundle(project));

    const read = readExported(text, new Project());

    expect(read.kind).toBe('project');
    expect(read.kind === 'project' && read.project.name).toBe('ALU');
  });

  test('refuses a file that says it is something else', () => {
    expect(() => readExported('{"format": "gates.wiring"}', new Project()))
        .toThrow(/not something Gates exported/);
  });

  test('refuses a file that says nothing', () => {
    expect(() => readExported('just text', new Project()))
        .toThrow(/not something Gates exported/);
  });
});
