import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {ThemeProvider} from '@mui/material/styles';

import {MenuBar} from './MenuBar';
import type {MenuSpec} from './MenuBar';
import {DarkTheme, LightTheme} from '../Themes';

/**
 * An open menu follows the pointer along the bar, and down into its submenus.
 *
 * The open menu covers the page with a sheet that catches the dismissing click, so the bar's
 * buttons never hear the pointer arrive. What is under the pointer is asked of the document
 * instead, which jsdom cannot answer — so here it is told.
 */

const MENUS: MenuSpec[] = [
  {label: 'File', items: [
    {label: 'Save', run: () => {}},
    {label: 'Export', items: [{label: 'Board...', run: () => {}}]},
  ]},
  {label: 'Edit', items: [{label: 'Undo', run: () => {}}]},
];

/** Moves the pointer over the topmost sheet, with the given element beneath it. */
function roamOver(target: Element) {
  document.elementsFromPoint = () => [target];
  const sheets = document.querySelectorAll('.MuiBackdrop-root');
  fireEvent.mouseMove(sheets[sheets.length - 1]);
}

const button = (name: string) => screen.getByRole('button', {name, hidden: true});

afterEach(() => {
  // @ts-ignore
  delete document.elementsFromPoint;
});

describe('an open menu', () => {
  test('gives way to the menu the pointer moves onto', () => {
    render(<MenuBar menus={MENUS} title=""/>);
    fireEvent.click(button('File'));

    roamOver(button('Edit'));

    expect(button('Edit')).toHaveAttribute('aria-expanded', 'true');
    expect(button('File')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  test('stays as it is while the pointer is over nothing of the bar', () => {
    render(<MenuBar menus={MENUS} title=""/>);
    fireEvent.click(button('File'));

    roamOver(document.body);

    expect(button('File')).toHaveAttribute('aria-expanded', 'true');
  });

  test('stays shut until it is asked for, however the pointer moves', () => {
    render(<MenuBar menus={MENUS} title=""/>);

    fireEvent.mouseEnter(button('Edit'));

    expect(button('Edit')).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('a submenu', () => {
  const line = (label: string) => screen.getByText(label).closest('[role="menuitem"]')!;

  test('opens when the pointer reaches its line', () => {
    render(<MenuBar menus={MENUS} title=""/>);
    fireEvent.click(button('File'));

    fireEvent.mouseEnter(line('Export'));

    expect(screen.getByText('Board...')).toBeInTheDocument();
  });

  test('closes when the pointer moves to another line of the menu it opened from', () => {
    render(<MenuBar menus={MENUS} title=""/>);
    fireEvent.click(button('File'));
    fireEvent.mouseEnter(line('Export'));

    roamOver(line('Save'));

    expect(screen.queryByText('Board...')).not.toBeVisible();
  });

  test('gives way, with its menu, to another menu on the bar', () => {
    render(<MenuBar menus={MENUS} title=""/>);
    fireEvent.click(button('File'));
    fireEvent.mouseEnter(line('Export'));

    roamOver(button('Edit'));

    expect(button('Edit')).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('the menu bar\'s text', () => {
  const colour = () => getComputedStyle(document.querySelector('.menu-bar')!).color;

  test('follows the theme, so it can be read in the dark', () => {
    const {unmount} = render(
        <ThemeProvider theme={LightTheme}><MenuBar menus={MENUS} title=""/></ThemeProvider>);
    const light = colour();
    unmount();

    render(<ThemeProvider theme={DarkTheme}><MenuBar menus={MENUS} title=""/></ThemeProvider>);

    expect(colour()).not.toBe(light);
    expect(colour()).toBe('rgb(255, 255, 255)');
  });
});
