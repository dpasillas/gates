import {
  forgetProject,
  mostRecentProject,
  readSettings,
  rememberProject,
  writeSettings,
  RECENT_PROJECT_LIMIT,
} from './settings';
import {DEFAULT_WIRE_STYLE} from '../util/wireStyle';

beforeEach(() => {
  window.localStorage.clear();
});

describe('settings kept in the browser', () => {
  test('start at their defaults', () => {
    expect(readSettings().wireStyle).toBe(DEFAULT_WIRE_STYLE);
    expect(readSettings().recentProjects).toEqual([]);
    expect(readSettings().snapMode).toBe('off');
  });

  test('offer connect-on-click from the first visit', () => {
    // On until someone turns it off: a way of working nobody meets is one nobody has.
    expect(readSettings().connectOnClick).toBe(true);
  });

  test('keep connect-on-click off once it has been turned off', () => {
    writeSettings({connectOnClick: false});

    expect(readSettings().connectOnClick).toBe(false);
  });

  test('come back as they were left', () => {
    writeSettings({wireStyle: 'orthogonal'});

    expect(readSettings().wireStyle).toBe('orthogonal');
  });

  test('leave alone what was not changed', () => {
    rememberProject({name: 'ALU', id: 'a'});
    writeSettings({wireStyle: 'diagonal'});

    expect(readSettings().recentProjects).toHaveLength(1);
  });

  test('fall back when storage holds something that is not settings', () => {
    window.localStorage.setItem('gates.settings', 'not json');

    expect(readSettings().wireStyle).toBe(DEFAULT_WIRE_STYLE);
  });

  test('fall back on a wire style this build does not have', () => {
    window.localStorage.setItem('gates.settings', '{"wireStyle": "spiral"}');

    expect(readSettings().wireStyle).toBe(DEFAULT_WIRE_STYLE);
  });

  test('drop recent entries that are not shaped like projects', () => {
    window.localStorage.setItem('gates.settings', '{"recentProjects": [{"name": "ALU"}, 7]}');

    expect(readSettings().recentProjects).toEqual([]);
  });
});

describe('the recent projects list', () => {
  test('offers the one opened last', () => {
    rememberProject({name: 'ALU', id: 'a'});
    rememberProject({name: 'Counter', id: 'b'});

    expect(mostRecentProject()?.name).toBe('Counter');
  });

  test('moves a project already on it to the front rather than repeating it', () => {
    rememberProject({name: 'ALU', id: 'a'});
    rememberProject({name: 'Counter', id: 'b'});
    rememberProject({name: 'ALU', id: 'a'});

    expect(readSettings().recentProjects.map(p => p.name)).toEqual(['ALU', 'Counter']);
  });

  test('forgets one that can no longer be reached', () => {
    rememberProject({name: 'ALU', id: 'a'});

    forgetProject('a');

    expect(mostRecentProject()).toBeUndefined();
  });

  test('holds only so many', () => {
    for (let i = 0; i <= RECENT_PROJECT_LIMIT; i++) {
      rememberProject({name: `Project ${i}`, id: `${i}`});
    }

    expect(readSettings().recentProjects).toHaveLength(RECENT_PROJECT_LIMIT);
    expect(mostRecentProject()?.name).toBe(`Project ${RECENT_PROJECT_LIMIT}`);
  });
});
