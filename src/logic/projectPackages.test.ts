import {LogicBoard} from './LogicBoard';
import {PinType} from './LogicPin';
import {GLOBAL_SCOPE} from '../Constants';
import {PackageComponent} from './PackageComponent';
import {Project} from './Project';
import {parseProjectBundle, serializeProjectBundle} from './projectFile';
import {projectFromBundle, readProject, writeInto} from '../storage/projectStore';
import {asDirectoryHandle, FakeDirectory} from '../test/fakeFileSystem';

function reg8(): PackageComponent {
  const pkg = new PackageComponent({scope: GLOBAL_SCOPE, name: 'reg8_std'});
  [
    {label: 'D', pinType: PinType.INPUT, width: 8},
    {label: 'CLK', pinType: PinType.INPUT, clock: true},
    {label: 'Q', pinType: PinType.OUTPUT, width: 8},].forEach(pin => pkg.declarePin(pin));

  return pkg;
}

/** A project holding one package beside its board. */
function project(): {project: Project, pkg: PackageComponent} {
  const made = new Project(new LogicBoard());
  made.name = '4-bit ALU';
  made.mainBoard.name = 'alu_core';
  const pkg = made.addPackage(reg8());

  return {project: made, pkg};
}

describe('a project holding packages', () => {
  test('starts with none', () => {
    expect(new Project().packages).toEqual([]);
  });

  test('lists them in the order they were added', () => {
    const {project: made} = project();
    made.addPackage(new PackageComponent({scope: GLOBAL_SCOPE, name: 'mux2'}));

    expect(made.packages.map(pkg => pkg.name)).toEqual(['reg8_std', 'mux2']);
  });

  test('lets one be taken out without touching the others', () => {
    const {project: made, pkg} = project();
    made.addPackage(new PackageComponent({scope: GLOBAL_SCOPE, name: 'mux2'}));

    made.removePackage(pkg);

    expect(made.packages.map(pkg => pkg.name)).toEqual(['mux2']);
  });

  test('takes out the one named, not one that merely looks like it', () => {
    const {project: made, pkg} = project();
    const twin = made.addPackage(reg8());

    made.removePackage(pkg);

    expect(made.packages).toEqual([twin]);
  });
});

describe('a project written to its directory', () => {
  test('gives each package a file of its own, named by identity', async () => {
    const home = new FakeDirectory('a-project-id');
    const {project: made, pkg} = project();

    await writeInto(made, asDirectoryHandle(home));

    expect(home.paths()).toContain(`packages/${pkg.uuid}.json`);
  });

  test('writes no packages directory when there are none to put in it', async () => {
    const home = new FakeDirectory('a-project-id');

    await writeInto(new Project(new LogicBoard()), asDirectoryHandle(home));

    expect(home.paths().some(path => path.startsWith('packages/'))).toBe(false);
  });

  test('brings them back when it is read again', async () => {
    const home = new FakeDirectory('a-project-id');
    const {project: made, pkg} = project();
    await writeInto(made, asDirectoryHandle(home));

    const reopened = await readProject(asDirectoryHandle(home));

    expect(reopened.packages.map(back => back.name)).toEqual(['reg8_std']);
    expect(reopened.packages[0].interfaceHash).toBe(pkg.interfaceHash);
    expect(reopened.packages[0].uuid).toBe(pkg.uuid);
  });

  test('names them in the manifest, so a renamed package overwrites its own file', async () => {
    const home = new FakeDirectory('a-project-id');
    const {project: made, pkg} = project();
    await writeInto(made, asDirectoryHandle(home));

    pkg.name = 'reg8_min';
    await writeInto(made, asDirectoryHandle(home));

    expect(home.paths().filter(path => path.startsWith('packages/'))).toHaveLength(1);
    expect((await readProject(asDirectoryHandle(home))).packages[0].name).toBe('reg8_min');
  });
});

describe('a project travelling as one file', () => {
  const roundTrip = (made: Project) =>
      projectFromBundle(parseProjectBundle(JSON.stringify(serializeProjectBundle(made))));

  test('carries its packages with it', () => {
    const {project: made, pkg} = project();

    const reopened = roundTrip(made);

    expect(reopened.packages).toHaveLength(1);
    expect(reopened.packages[0].interfaceHash).toBe(pkg.interfaceHash);
  });

  test('carries which pin is which, so a binding survives the trip', () => {
    const {project: made, pkg} = project();

    expect(roundTrip(made).packages[0].declared.map(pin => pin.uuid))
        .toEqual(pkg.declared.map(pin => pin.uuid));
  });

  test('opens a bundle written before packages existed', () => {
    const {project: made} = project();
    const bundle = JSON.parse(JSON.stringify(serializeProjectBundle(made)));
    delete bundle.packages;
    delete bundle.project.packages;

    expect(projectFromBundle(parseProjectBundle(JSON.stringify(bundle))).packages).toEqual([]);
  });
});
