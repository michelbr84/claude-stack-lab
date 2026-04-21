import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import type { EvidenceStore } from './store.js';
import type { RunnerBridge } from './runner-bridge.js';

export interface ServerOptions {
  store: EvidenceStore;
  scenarios: Array<{ id: string; title: string; category: string; fixture: string | null }>;
  runnerBridge?: RunnerBridge;
  logger?: boolean;
}

export function buildServer(opts: ServerOptions): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  app.get('/scenarios', async () => ({
    count: opts.scenarios.length,
    scenarios: opts.scenarios.map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      fixture: s.fixture
    }))
  }));

  app.get<{ Querystring: { limit?: string; offset?: string } }>('/runs', async (req) => {
    const limit = clampInt(req.query.limit, 1, 200, 50);
    const offset = clampInt(req.query.offset, 0, 1_000_000, 0);
    const runs = await opts.store.listRuns({ limit, offset });
    return { count: runs.length, runs };
  });

  app.get<{ Params: { runId: string } }>('/runs/:runId', async (req, reply) => {
    try {
      const report = await opts.store.getRun(req.params.runId);
      if (!report) return notFound(reply, `run "${req.params.runId}" not found`);
      return report;
    } catch (e) {
      return badRequest(reply, (e as Error).message);
    }
  });

  app.get<{ Params: { runId: string } }>('/runs/:runId/markdown', async (req, reply) => {
    try {
      const md = await opts.store.getMarkdown(req.params.runId);
      if (!md) return notFound(reply, `no markdown for run "${req.params.runId}"`);
      reply.header('content-type', 'text/markdown; charset=utf-8');
      return md;
    } catch (e) {
      return badRequest(reply, (e as Error).message);
    }
  });

  app.get('/baseline', async (_req, reply) => {
    const report = await opts.store.getBaseline();
    if (!report) return notFound(reply, 'no baseline committed');
    return report;
  });

  if (opts.runnerBridge) {
    const bridge = opts.runnerBridge;

    app.post<{ Body?: { target?: string } }>('/runs', async (req, reply) => {
      const body = req.body ?? {};
      const target = typeof body.target === 'string' ? body.target : '';
      try {
        const result = await bridge.trigger(target);
        reply.code(result.accepted ? 202 : 409);
        return result;
      } catch (e) {
        return badRequest(reply, (e as Error).message);
      }
    });

    app.get('/runs/active', async () => {
      const active = bridge.activeRun();
      return active === null ? { active: null } : { active };
    });
  } else {
    app.post('/runs', async (_req, reply) => {
      reply.code(501);
      return {
        error: 'not_implemented',
        message: 'POST /runs disabled on this instance (no RunnerBridge configured)'
      };
    });
  }

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: 'not_found', path: req.url });
  });

  return app;
}

function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function notFound(reply: FastifyReply, message: string): { error: string; message: string } {
  reply.code(404);
  return { error: 'not_found', message };
}

function badRequest(reply: FastifyReply, message: string): { error: string; message: string } {
  reply.code(400);
  return { error: 'bad_request', message };
}
