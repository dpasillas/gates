import {checkFileName, sanitizeFileName, MAX_LENGTH} from './fileName';

/** The error a name is refused with, or nothing if it is accepted. */
function refusal(name: string): string | undefined {
  return checkFileName(name).error;
}

describe('names that can be written to disk', () => {
  test.each([
    'main',
    'adder4',
    'alu core',
    '4-bit ALU',
    'reg8_std',
    'v1.2',
    'счётчик',
  ])('%s is accepted', name => {
    expect(refusal(name)).toBeUndefined();
  });
});

describe('names that cannot', () => {
  test('an empty name', () => {
    expect(refusal('')).toMatch(/required/);
  });

  test.each(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])(
    'a name containing %s', character => {
      expect(refusal(`board${character}one`)).toMatch(/cannot contain/);
    });

  test('a name containing a control character', () => {
    expect(refusal(`board${String.fromCharCode(7)}one`)).toMatch(/cannot contain/);
  });

  test.each([' main', 'main ', ' '])('a name padded with spaces: "%s"', name => {
    expect(refusal(name)).toMatch(/space/);
  });

  test('a name ending in a dot, which Windows would drop', () => {
    expect(refusal('main.')).toMatch(/dot/);
  });

  test.each(['.', '..'])('the directory name %s', name => {
    expect(refusal(name)).toMatch(/reserved/);
  });

  test.each(['CON', 'con', 'NUL', 'com1', 'LPT9', 'aux.board'])(
    '%s, which Windows reserves for a device', name => {
      expect(refusal(name)).toMatch(/reserved device/);
    });

  test('a name longer than a path component may be', () => {
    expect(refusal('a'.repeat(MAX_LENGTH + 1))).toMatch(/at most/);
  });

  test('one exactly as long as a path component may be', () => {
    expect(refusal('a'.repeat(MAX_LENGTH))).toBeUndefined();
  });
});

describe('making a name legal rather than refusing it', () => {
  test('replaces what it cannot keep', () => {
    expect(sanitizeFileName('4-bit ALU: mk/II')).toBe('4-bit ALU mk II');
  });

  test('trims the padding that would be refused', () => {
    expect(sanitizeFileName('  main  ')).toBe('main');
  });

  test('drops a trailing dot', () => {
    expect(sanitizeFileName('main...')).toBe('main');
  });

  test('falls back when nothing usable is left', () => {
    expect(sanitizeFileName('///', 'untitled project')).toBe('untitled project');
  });

  test('falls back rather than producing a reserved name', () => {
    expect(sanitizeFileName('CON')).toBe('untitled');
  });

  test('always produces something that would be accepted', () => {
    expect(refusal(sanitizeFileName('<<>>'))).toBeUndefined();
  });
});
