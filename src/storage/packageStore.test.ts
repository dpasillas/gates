import {GLOBAL_SCOPE} from '../Constants';
import {PinType} from '../logic/LogicPin';
import {PackageComponent} from '../logic/PackageComponent';
import {Project} from '../logic/Project';
import {exportPackage, packageText, readPackage, PACKAGE_SUFFIX} from './packageStore';
import {downloadBytes} from './files';

vi.mock('./files', () => ({downloadBytes: vi.fn(), uploadFile: vi.fn()}));
// The picture is drawn and tested elsewhere; here it only has to be a PNG for the data to ride in.
vi.mock('../util/packageSnapshot', () => ({
  symbolPng: vi.fn(async () => new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ])),
}));

function reg8(): PackageComponent {
  const pkg = new PackageComponent({scope: GLOBAL_SCOPE, name: 'reg8'});
  pkg.declarePin({label: 'D', pinType: PinType.INPUT, width: 8});
  pkg.declarePin({label: 'Q', pinType: PinType.OUTPUT, width: 8});

  return pkg;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('a package written out on its own', () => {
  test('is offered under its name with the kind spelled out', async () => {
    const name = await exportPackage(reg8());

    expect(name).toBe(`reg8${PACKAGE_SUFFIX}`);
    expect(downloadBytes).toHaveBeenCalledWith(name, expect.anything(), 'image/png');
  });
});

describe('a package read back', () => {
  test('is the package the file names, pins and all', () => {
    const pkg = reg8();

    const back = readPackage(packageText(pkg), new Project());

    expect(back.uuid).toBe(pkg.uuid);
    expect(back.declared.map(pin => pin.label)).toEqual(['D', 'Q']);
  });

  test('is a copy under a new identity when the project already holds that one', () => {
    const project = new Project();
    const pkg = project.addPackage(reg8());

    const back = readPackage(packageText(pkg), project);

    expect(back.uuid).not.toBe(pkg.uuid);
    expect(back.name).toBe('reg8 copy');
  });
});
