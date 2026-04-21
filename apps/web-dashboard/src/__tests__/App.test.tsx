import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../App.js';
import type { ApiClient } from '../api.js';

const fakeClient = (overrides: Partial<ApiClient> = {}): ApiClient => ({
  scenarios: async () => [
    { id: '001-bootstrap', title: 'Bootstrap', category: 'bootstrap', fixture: null }
  ],
  runs: async () => [],
  baseline: async () => null,
  ...overrides
});

describe('App', () => {
  it('renders the header and three section headings', async () => {
    render(<App apiBase="/api" apiClient={fakeClient()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('claude-stack-lab');
    expect(screen.getByRole('heading', { name: /Scenarios/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Recent runs/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Baseline/ })).toBeInTheDocument();
  });

  it('loads scenarios through the injected client', async () => {
    render(<App apiBase="/api" apiClient={fakeClient()} />);
    await waitFor(() => expect(screen.getByText('001-bootstrap')).toBeInTheDocument());
  });

  it('surfaces API failures as a visible error banner', async () => {
    const broken = fakeClient({
      scenarios: async () => {
        throw new Error('boom');
      }
    });
    render(<App apiBase="/api" apiClient={broken} />);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to reach API: boom/)
    );
  });
});
