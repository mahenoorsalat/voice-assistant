// frontend/src/App.test.js (FIX)
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders voice chat heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/Speak to Your AI Agent/i);
  expect(headingElement).toBeInTheDocument();
});