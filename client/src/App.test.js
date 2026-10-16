import { render, screen } from '@testing-library/react';
import axios from 'axios';
import App from './App';
jest.mock('axios', () => ({ get: jest.fn(), defaults: { headers: { common: {} } } }));
test('renders empty state from real API response', async () => {
  axios.get.mockResolvedValue({ data: [] });
  render(<App />);
  expect(await screen.findByText('No frameworks yet')).toBeInTheDocument();
});
