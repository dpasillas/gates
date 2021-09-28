import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

const { ResizeObserver } = window;

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

});

afterEach(() => {
  window.ResizeObserver = ResizeObserver;
  jest.restoreAllMocks();
});

it('should do my test', () => {
  // [...]
});
test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/Menu/i);
  expect(linkElement).toBeInTheDocument();
});
