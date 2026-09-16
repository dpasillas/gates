import {symbolBounds, symbolSvg} from './packageSnapshot';
import {snapshotSize, PADDING} from './boardSnapshot';
import {GLOBAL_SCOPE} from '../Constants';
import {PinType} from '../logic/LogicPin';
import {PackageComponent} from '../logic/PackageComponent';

const {ResizeObserver} = window;

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = vi.fn().mockImplementation(function () {
    return {observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn()};
  });
});

afterEach(() => {
  window.ResizeObserver = ResizeObserver;
  vi.restoreAllMocks();
});

function reg8(): PackageComponent {
  const pkg = new PackageComponent({scope: GLOBAL_SCOPE, name: 'reg8'});
  pkg.declarePin({label: 'D', pinType: PinType.INPUT, width: 8});
  pkg.declarePin({label: 'CLK', pinType: PinType.INPUT, clock: true});
  pkg.declarePin({label: 'Q', pinType: PinType.OUTPUT, width: 8});

  return pkg;
}

function draw(pkg: PackageComponent, label = 'PACKAGE · reg8'): SVGSVGElement {
  const bounds = symbolBounds(pkg);

  return symbolSvg(pkg, bounds, snapshotSize(bounds), label);
}

describe('the area a symbol picture covers', () => {
  test('is the symbol with room around it', () => {
    const pkg = reg8();
    const box = pkg.geometry.bounds;

    const bounds = symbolBounds(pkg);

    expect(bounds.left).toBeCloseTo(box.left - PADDING);
    expect(bounds.width).toBeCloseTo(box.width + 2 * PADDING);
  });
});

describe('drawing a symbol for export', () => {
  test('holds the symbol and its pins', () => {
    const svg = draw(reg8());

    expect(svg.querySelectorAll('g.component')).toHaveLength(1);
    expect(svg.querySelectorAll('g.pin')).toHaveLength(3);
  });

  test('is drawn against the area that fits it', () => {
    const pkg = reg8();
    const bounds = symbolBounds(pkg);

    expect(draw(pkg).getAttribute('viewBox'))
        .toBe(`${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`);
  });

  test('carries the styles of both a component and a package', () => {
    const style = draw(reg8()).querySelector('style')?.textContent ?? '';

    expect(style).toMatch(/\.component/);
    expect(style).toMatch(/\.package-clock/);
  });

  test('says what the picture holds', () => {
    // The badge is drawn last, over the symbol; the pins carry text of their own.
    expect(draw(reg8(), 'COMPONENT · reg8').lastElementChild?.querySelector('text')?.textContent)
        .toBe('COMPONENT · reg8');
  });

  test('leaves out the pin the dialog was editing', () => {
    const pkg = reg8();
    pkg.pins()[0].selected = true;

    expect(draw(pkg).querySelectorAll('.selected')).toHaveLength(0);
  });

  test('can be drawn for a package that is nowhere on the page', () => {
    expect(draw(reg8()).querySelectorAll('g.component')).toHaveLength(1);
  });
});
