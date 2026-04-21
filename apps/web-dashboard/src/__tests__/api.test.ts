import { describe, it, expect } from 'vitest';
import { createApiClient } from '../api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });

describe('createApiClient', () => {
  it('scenarios() returns the scenarios array from the envelope', async () => {
    const fetchImpl = async (url: string): Promise<Response> => {
      expect(url).toBe('/api/scenarios');
      return jsonResponse({
        count: 2,
        scenarios: [
          { id: '001-bootstrap', title: 'Bootstrap', category: 'bootstrap', fixture: null },
          { id: '002-coverage', title: 'Coverage', category: 'coverage', fixture: 'low-coverage' }
        ]
      });
    };
    const client = createApiClient('/api', fetchImpl as typeof fetch);
    const scenarios = await client.scenarios();
    expect(scenarios).toHaveLength(2);
    expect(scenarios[0]?.id).toBe('001-bootstrap');
  });

  it('runs() forwards limit as a query string', async () => {
    let calledWith = '';
    const fetchImpl = async (url: string): Promise<Response> => {
      calledWith = url;
      return jsonResponse({ count: 0, runs: [] });
    };
    const client = createApiClient('/api', fetchImpl as typeof fetch);
    await client.runs({ limit: 10 });
    expect(calledWith).toBe('/api/runs?limit=10');
  });

  it('runs() with no options omits the query string', async () => {
    let calledWith = '';
    const fetchImpl = async (url: string): Promise<Response> => {
      calledWith = url;
      return jsonResponse({ count: 0, runs: [] });
    };
    const client = createApiClient('/api', fetchImpl as typeof fetch);
    await client.runs();
    expect(calledWith).toBe('/api/runs');
  });

  it('baseline() returns null on a 404', async () => {
    const fetchImpl = async (): Promise<Response> =>
      new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      });
    const client = createApiClient('/api', fetchImpl as typeof fetch);
    expect(await client.baseline()).toBeNull();
  });

  it('baseline() rethrows on other errors', async () => {
    const fetchImpl = async (): Promise<Response> =>
      new Response('oops', {
        status: 500,
        headers: { 'content-type': 'text/plain' }
      });
    const client = createApiClient('/api', fetchImpl as typeof fetch);
    await expect(client.baseline()).rejects.toThrow(/HTTP 500/);
  });

  it('normalises trailing slashes on the base URL', async () => {
    let calledWith = '';
    const fetchImpl = async (url: string): Promise<Response> => {
      calledWith = url;
      return jsonResponse({ count: 0, scenarios: [] });
    };
    const client = createApiClient('/api/', fetchImpl as typeof fetch);
    await client.scenarios();
    expect(calledWith).toBe('/api/scenarios');
  });
});
