import {crc32, isPng, readChunk, withChunk, BOARD_CHUNK} from './png';

/** The smallest thing that counts as a PNG: the signature and the end marker. */
function emptyPng(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

describe('the checksum every chunk carries', () => {
  test('matches the one the format itself publishes', () => {
    // The end marker is fixed by the specification, checksum included, so it is a known answer.
    expect(crc32(bytes('IEND'))).toBe(0xae426082);
  });

  test('changes when the data does', () => {
    expect(crc32(bytes('gaTeA'))).not.toBe(crc32(bytes('gaTeB')));
  });
});

describe('recognising a PNG', () => {
  test('accepts one', () => {
    expect(isPng(emptyPng())).toBe(true);
  });

  test('rejects anything else', () => {
    expect(isPng(bytes('{"format": "gates.board"}'))).toBe(false);
  });
});

describe('carrying a board inside a picture', () => {
  test('comes back out as it went in', () => {
    const board = '{"format":"gates.board","version":1}';

    const carried = withChunk(emptyPng(), BOARD_CHUNK, bytes(board));

    expect(text(readChunk(carried, BOARD_CHUNK)!)).toBe(board);
  });

  test('leaves the end marker last, where the format requires it', () => {
    const carried = withChunk(emptyPng(), BOARD_CHUNK, bytes('data'));

    expect([...carried.subarray(-12)]).toEqual([...emptyPng().subarray(-12)]);
  });

  test('leaves the file a PNG', () => {
    expect(isPng(withChunk(emptyPng(), BOARD_CHUNK, bytes('data')))).toBe(true);
  });

  test('survives a second chunk being added beside it', () => {
    const once = withChunk(emptyPng(), BOARD_CHUNK, bytes('first'));

    const twice = withChunk(once, 'teXt', bytes('unrelated'));

    expect(text(readChunk(twice, BOARD_CHUNK)!)).toBe('first');
    expect(text(readChunk(twice, 'teXt')!)).toBe('unrelated');
  });

  test('finds nothing in a picture that is only a picture', () => {
    expect(readChunk(emptyPng(), BOARD_CHUNK)).toBeUndefined();
  });

  test('refuses to write into something that is not a PNG', () => {
    expect(() => withChunk(bytes('not a png'), BOARD_CHUNK, bytes('data'))).toThrow(/not a PNG/);
  });

  test('reads nothing out of a truncated file rather than running off the end', () => {
    const carried = withChunk(emptyPng(), BOARD_CHUNK, bytes('data'));

    expect(readChunk(carried.subarray(0, 14), BOARD_CHUNK)).toBeUndefined();
  });
});
