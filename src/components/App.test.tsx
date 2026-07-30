import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

const { ResizeObserver } = window;

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver;
  window.ResizeObserver = vi.fn().mockImplementation(function () {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  });

});

afterEach(() => {
  window.ResizeObserver = ResizeObserver;
  vi.restoreAllMocks();
});

it('should do my test', () => {
  // [...]
});
test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/Menu/i);
  expect(linkElement).toBeInTheDocument();
});
