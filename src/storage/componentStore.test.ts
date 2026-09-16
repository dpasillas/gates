import {LogicBoard} from '../logic/LogicBoard';
import {Project} from '../logic/Project';
import {SubComponent} from '../logic/SubComponent';
import {defineComponent} from '../logic/ComponentDefinition';
import type {ComponentDefinition} from '../logic/ComponentDefinition';
import {parseComponentFile} from '../logic/componentFile';
import {makeComponent} from '../logic/componentFactory';
import {setPort} from '../logic/nets';
import {packageForBoard} from '../logic/packageFromBoard';
import {componentText, exportComponent, readComponent, COMPONENT_SUFFIX} from './componentStore';
import {downloadBytes} from './files';
import {GateType} from '../enums/GateType';
import {PartType} from '../enums/PartType';

vi.mock('./files', () => ({downloadBytes: vi.fn(), uploadFile: vi.fn()}));
// The picture is drawn and tested elsewhere; here it only has to be a PNG for the data to ride in.
vi.mock('../util/packageSnapshot', () => ({
  symbolPng: vi.fn(async () => new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ])),
}));

/**
 * A component leaving its project and coming back.
 *
 * It already carries its board and package; what it can only name is another component placed on
 * that board, which the file takes along the way a board's export does.
 */

function and2(name = 'and2'): ComponentDefinition {
  const board = new LogicBoard();
  const and = makeComponent({type: PartType.GATE, subtype: GateType.AND, scope: board.scope, board});
  board.addComponent(and);
  setPort(board, and.inputPins[0], 'a');
  setPort(board, and.inputPins[1], 'b');
  setPort(board, and.outputPins[0], 'y');

  return defineComponent({name, board, packaging: packageForBoard(board, `${name}_pkg`)});
}

/** A project holding `and2` and a component with `and2` placed inside it. */
function nested(): {project: Project, inner: ComponentDefinition, outer: ComponentDefinition} {
  const project = new Project();
  const inner = project.addComponent(and2());
  const board = project.addBoard('middle');
  const part = new SubComponent({scope: board.scope, board, definition: inner});
  board.addComponent(part);
  setPort(board, part.inputPins[0], 'p');
  setPort(board, part.outputPins[0], 'r');
  const outer = project.addComponent(
      defineComponent({name: 'outer', board, packaging: packageForBoard(board, 'outer_pkg')}));

  return {project, inner, outer};
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('a component written out on its own', () => {
  test('is offered under its name with the kind spelled out', async () => {
    const project = new Project();
    const made = project.addComponent(and2('half adder'));

    const name = await exportComponent(made, project);

    expect(name).toBe(`half adder${COMPONENT_SUFFIX}`);
    expect(downloadBytes).toHaveBeenCalledWith(name, expect.anything(), 'image/png');
  });

  test('carries nothing extra when it places nothing', () => {
    const project = new Project();
    const made = project.addComponent(and2());

    expect(parseComponentFile(componentText(made, project)).library).toBeUndefined();
  });

  test('carries the components placed inside it', () => {
    const {project, inner, outer} = nested();

    const data = parseComponentFile(componentText(outer, project));

    expect(data.library?.map(entry => entry.id)).toEqual([inner.uuid]);
  });
});

describe('a component read back', () => {
  test('is the component the file names', () => {
    const project = new Project();
    const made = and2();

    const {definition} = readComponent(componentText(made, new Project()), project);

    expect(definition.uuid).toBe(made.uuid);
    expect(definition.name).toBe('and2');
  });

  test('brings what it carried, ready to be placed', () => {
    const {project, inner, outer} = nested();

    const {components} = readComponent(componentText(outer, project), new Project());

    expect(components.map(made => made.uuid)).toEqual([inner.uuid]);
  });

  test('is a copy under a new identity when the project already holds that one', () => {
    const project = new Project();
    const made = project.addComponent(and2());

    const {definition} = readComponent(componentText(made, project), project);

    expect(definition.uuid).not.toBe(made.uuid);
    expect(definition.name).toBe('and2 copy');
  });
});
