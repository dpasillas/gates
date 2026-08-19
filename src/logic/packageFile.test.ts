import {GLOBAL_SCOPE} from '../Constants';
import {PinOrientation, PinType} from './LogicPin';
import {CornerMark, PackageDivider, PackageGroup, PackageShape} from '../enums/Packaging';
import {PackageComponent} from './PackageComponent';
import {copyOf, packageFrom, parsePackageFile, serializePackage} from './packageFile';

/** A package using every setting there is, so a round trip has something to lose. */
function full(): PackageComponent {
  const pkg = new PackageComponent({scope: GLOBAL_SCOPE, name: 'reg8'});
  pkg.shape = PackageShape.TRAPEZOID;
  pkg.facing = PinOrientation.DOWN;
  pkg.divider = PackageDivider.HORIZONTAL;
  pkg.cornerMark = CornerMark.BOTTOM_RIGHT;
  pkg.declarePin({label: 'D', pinType: PinType.INPUT, width: 8, orientation: PinOrientation.UP});
  pkg.declarePin({label: 'CLR', pinType: PinType.INPUT, not: true});
  pkg.declarePin({label: 'CLK', pinType: PinType.INPUT, showLabel: false, labelBold: true});
  pkg.declarePin({label: 'Q', pinType: PinType.OUTPUT, width: 8, group: PackageGroup.SECOND});
  pkg.setClockPin(pkg.declared[2]);
  pkg.rebuild();

  return pkg;
}

/** What comes back from writing a package out and reading it in again. */
function roundTrip(pkg: PackageComponent): PackageComponent {
  return packageFrom(parsePackageFile(JSON.stringify(serializePackage(pkg))));
}

describe('writing a package and reading it back', () => {
  test('is the same package, by the measure that decides that', () => {
    expect(roundTrip(full()).interfaceHash).toBe(full().interfaceHash);
  });

  test('keeps which package it is, so a component still finds it', () => {
    const original = full();

    expect(roundTrip(original).uuid).toBe(original.uuid);
  });

  test('keeps which pin is which, so a binding still finds it', () => {
    const original = full();

    expect(roundTrip(original).declared.map(pin => pin.uuid))
        .toEqual(original.declared.map(pin => pin.uuid));
  });

  test('keeps every setting on every pin', () => {
    const original = full();
    const said = (pkg: PackageComponent) => pkg.declared.map(pin =>
        [pin.label, pin.pinType, pin.width, pin.orientation, pin.not, pin.clock, pin.showLabel,
         pin.labelBold, pin.group]);

    expect(said(roundTrip(original))).toEqual(said(original));
  });

  test('keeps the outline and what is drawn on it', () => {
    const back = roundTrip(full());

    expect(back.name).toBe('reg8');
    expect(back.shape).toBe(PackageShape.TRAPEZOID);
    expect(back.facing).toBe(PinOrientation.DOWN);
    expect(back.divider).toBe(PackageDivider.HORIZONTAL);
    expect(back.cornerMark).toBe(CornerMark.BOTTOM_RIGHT);
  });

  test('comes back drawn, rather than as data waiting to be drawn', () => {
    expect(roundTrip(full()).d).toBe(full().d);
  });

  test('leaves out what is already the default, rather than writing it every time', () => {
    const original = full();

    expect(serializePackage(original).pins[0]).toEqual(
        {id: original.declared[0].uuid, label: 'D', type: PinType.INPUT, width: 8,
         side: PinOrientation.UP});
  });
});

describe('reading a package file that is not one', () => {
  test('refuses text that is not JSON', () => {
    expect(() => parsePackageFile('{')).toThrow(/not valid JSON/);
  });

  test('refuses a file of some other kind', () => {
    expect(() => parsePackageFile('{"format": "gates.board", "version": 1}'))
        .toThrow(/not a Gates package/);
  });

  test('refuses a version it does not know', () => {
    expect(() => parsePackageFile('{"format": "gates.package", "version": 99}'))
        .toThrow(/different version/);
  });
});

describe('reading a package file that has been damaged', () => {
  test('drops a pin with no identity, which nothing could bind to', () => {
    const written = serializePackage(full());
    // @ts-expect-error — a file can hold anything, which is the point of the check.
    delete written.pins[1].id;

    expect(packageFrom(parsePackageFile(JSON.stringify(written))).declared.map(pin => pin.label))
        .toEqual(['D', 'CLK', 'Q']);
  });

  test('puts a pin on an edge that exists when the file names one that does not', () => {
    const written = serializePackage(full());
    written.pins[0].side = 99;

    expect(packageFrom(parsePackageFile(JSON.stringify(written))).declared[0].orientation)
        .toBe(PinOrientation.LEFT);
  });

  test('keeps one clock when the file marks two, a part having only one', () => {
    const written = serializePackage(full());
    written.pins[0].clock = true;

    const back = packageFrom(parsePackageFile(JSON.stringify(written)));

    expect(back.declared.filter(pin => pin.clock).map(pin => pin.label)).toEqual(['D']);
  });

  test('reads a shape it does not know as a rectangle', () => {
    const written = serializePackage(full());
    written.shape = 42;

    expect(packageFrom(parsePackageFile(JSON.stringify(written))).shape)
        .toBe(PackageShape.RECTANGLE);
  });

  test('reads a width that is not one as a single bit', () => {
    const written = serializePackage(full());
    written.pins[0].width = 0;

    expect(packageFrom(parsePackageFile(JSON.stringify(written))).declared[0].width).toBe(1);
  });
});

describe('a working copy', () => {
  test('is the same package, drawn the same way', () => {
    const original = full();
    const copy = copyOf(original);

    expect(copy.uuid).toBe(original.uuid);
    expect(copy.interfaceHash).toBe(original.interfaceHash);
  });

  test('is edited without the original moving', () => {
    const original = full();
    const copy = copyOf(original);

    copy.declared[0].label = 'DIN';
    copy.rebuild();

    expect(original.declared[0].label).toBe('D');
  });
});
