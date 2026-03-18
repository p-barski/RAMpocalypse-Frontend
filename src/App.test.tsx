import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders request matchmaking button', () => {
  render(<App />);
  const linkElement = screen.getByText(/Request Matchmaking/i);
  expect(linkElement).toBeInTheDocument();
});
