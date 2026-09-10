/**
 * FNV-1a over text, as eight hex digits.
 *
 * Identity for content rather than a guard against tampering: all it has to do is change when what
 * it summarises changes, and agree for two copies of one thing.
 */
function digest(text: string): string {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }

  return (value >>> 0).toString(16).padStart(8, "0");
}

export {digest};
