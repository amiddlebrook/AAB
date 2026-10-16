import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { frameworkRoutes } from './routes/frameworks';
import { testRoutes } from './routes/tests';
import { chatRoutes } from './routes/chat';
import { nodeTypeRoutes } from './routes/node-types';

export interface Env {
  DB: D1Database;
  AI: Ai;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  AAB_ADMIN_TOKEN?: string;
}

const app = new Hono<{ Bindings: Env }>();
app.use('/api/*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

// Never expose saved prompts, framework graphs, or AI quota to anonymous visitors.
// Local Wrangler development remains usable without an owner secret.
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS' || c.req.path === '/api/health') return next();
  const secret = c.env.AAB_ADMIN_TOKEN;
  if (!secret && c.env.ENVIRONMENT === 'development') return next();
  if (!secret) return c.json({ error: 'AAB_ADMIN_TOKEN is not configured on this Worker.' }, 503);
  const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  let diff = token.length ^ secret.length;
  for (let i = 0; i < Math.max(token.length, secret.length); i++) {
    diff |= (token.charCodeAt(i) || 0) ^ (secret.charCodeAt(i) || 0);
  }
  if (diff !== 0) return c.json({ error: 'Invalid or missing owner access token.' }, 401);
  return next();
});

app.get('/api/health', (c) => c.json({
  status: 'ok',
  service: 'AAB',
  ai: 'Cloudflare Workers AI',
  timestamp: new Date().toISOString()
}));

app.route('/api/frameworks', frameworkRoutes);
app.route('/api/tests', testRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/node-types', nodeTypeRoutes);
app.notFound(async c => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'API endpoint not found' }, 404);
  return c.env.ASSETS.fetch(c.req.raw);
});
app.onError((err, c) => {
  console.error('AAB request failed', err);
  return c.json({ error: 'Request failed. Check the Worker logs.' }, 500);
});
export default app;
