/**
 * Carrying a board inside its own picture.
 *
 * An exported board is a PNG of what it looks like with the board's data in a chunk of its own, so
 * that the same file previews anywhere images preview and still opens as a circuit here. The data
 * goes in a chunk rather than after the end of the file because trailing bytes are dropped by
 * anything that rewrites the image, while an unknown chunk marked safe-to-copy is carried along.
 */

/** The eight bytes every PNG starts with. */
const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * The chunk a board is stored in.
 *
 * The case of each letter is meaningful: lower, lower, upper, lower says this is an ancillary,
 * private, safe-to-copy chunk — one a decoder may ignore and a rewriter should carry over.
 */
const BOARD_CHUNK = "gaTe";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let bit = 0; bit < 8; bit++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }

  return table;
})();

/** The CRC every PNG chunk ends with, taken over its type and its data together. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function isPng(bytes: Uint8Array): boolean {
  return SIGNATURE.every((byte, i) => bytes[i] === byte);
}

function typeAt(bytes: Uint8Array, at: number): string {
  return String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
}

/**
 * Walks the chunks, handing each one's type and extent to the caller.
 *
 * Every chunk is a length, a four-letter type, that many bytes, and a checksum, so the file can be
 * stepped through without understanding any of them.
 */
function* chunks(bytes: Uint8Array): Generator<{type: string, start: number, end: number}> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = SIGNATURE.length;

  while (at + 8 <= bytes.length) {
    const length = view.getUint32(at);
    const end = at + 12 + length;
    if (end > bytes.length) {
      return;
    }

    yield {type: typeAt(bytes, at + 4), start: at, end};

    at = end;
  }
}

/** The contents of the first chunk of this type, or nothing if the file has none. */
function readChunk(bytes: Uint8Array, type: string): Uint8Array | undefined {
  for (const chunk of chunks(bytes)) {
    if (chunk.type === type) {
      return bytes.subarray(chunk.start + 8, chunk.end - 4);
    }
  }

  return undefined;
}

function buildChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);

  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) {
    chunk[4 + i] = type.charCodeAt(i);
  }
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));

  return chunk;
}

/**
 * The same PNG with a chunk of this type added.
 *
 * Placed before the end marker, which has to stay last, and after everything else, so that a
 * decoder has read the whole image before it meets a chunk it does not know.
 */
function withChunk(bytes: Uint8Array, type: string, data: Uint8Array): Uint8Array {
  if (!isPng(bytes)) {
    throw new Error("That is not a PNG.");
  }

  let insertAt = bytes.length;
  for (const chunk of chunks(bytes)) {
    if (chunk.type === "IEND") {
      insertAt = chunk.start;
      break;
    }
  }

  const chunk = buildChunk(type, data);
  const combined = new Uint8Array(bytes.length + chunk.length);
  combined.set(bytes.subarray(0, insertAt), 0);
  combined.set(chunk, insertAt);
  combined.set(bytes.subarray(insertAt), insertAt + chunk.length);

  return combined;
}

export {crc32, isPng, readChunk, withChunk, BOARD_CHUNK};
