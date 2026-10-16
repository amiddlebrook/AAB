import { Hono } from 'hono';
import type { Env } from '../index';
import { infer, parseFramework } from '../lib/ai';

export const chatRoutes = new Hono<{ Bindings: Env }>();
const system = 'You are AAB, an expert agent systems architect. Explain design tradeoffs accurately. Prefer acyclic workflows with Input, Agent, Processor and Output nodes. All model execution is native Cloudflare Workers AI, so do not promise external model providers or tools.';

chatRoutes.post('/', async c => {
  const body = await c.req.json().catch(() => ({})) as any;
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 20 ||
      body.messages.some((m: any) => typeof m.content !== 'string' || m.content.length > 4000)) {
    return c.json({ error: 'Provide 1-20 short messages.' }, 400);
  }
  try {
    const messages = body.messages.filter((m: any) => ['user', 'assistant'].includes(m.role))
      .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const result = await infer(c.env, [{ role: 'system', content: system }, ...messages], 1024);
    return c.json({ id: crypto.randomUUID(), role: 'assistant', content: result.content,
      framework: null, usage: { totalTokens: result.tokens, cost: 0 }, model: result.model });
  } catch (e: any) {
    return c.json({ error: e?.message || 'Workers AI unavailable' }, 502);
  }
});

chatRoutes.post('/generate', async c => {
  const body = await c.req.json().catch(() => ({})) as any;
  if (typeof body.description !== 'string' || !body.description.trim() || body.description.length > 4000)
    return c.json({ error: 'A description of up to 4000 characters is required.' }, 400);
  try {
    const prompt = 'Return ONLY valid JSON for an acyclic agent architecture matching this request: ' +
      body.description + '\nFormat: {"name":"...","description":"...","nodes":[{"id":"in","type":"input","position":{"x":100,"y":180},"data":{"label":"Input"}},{"id":"agent","type":"agent","position":{"x":330,"y":180},"data":{"label":"Agent","config":{"systemPrompt":"..."} }},{"id":"out","type":"output","position":{"x":560,"y":180},"data":{"label":"Output"}}],"edges":[{"id":"e1","source":"in","target":"agent"},{"id":"e2","source":"agent","target":"out"}]}. Use supported input, output, agent, processor, merge, parallel, tool, router nodes. Only use native Cloudflare AI for agent nodes.';
    const result = await infer(c.env, [{ role: 'system', content: system }, { role: 'user', content: prompt }], 1800);
    return c.json({ framework: parseFramework(result.content), usage: { totalTokens: result.tokens, cost: 0 } });
  } catch (e: any) {
    return c.json({ error: e?.message || 'Framework generation failed' }, 502);
  }
});
