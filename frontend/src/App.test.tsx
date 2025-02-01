import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders Cascade application', () => {
  const { container } = render(<App />);
  expect(container.querySelector('.App')).toBeInTheDocument();
});
