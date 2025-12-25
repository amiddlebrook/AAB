import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { frameworkRoutes } from './routes/frameworks';
import { testRoutes } from './routes/tests';
import { chatRoutes } from './routes/chat';
import { nodeTypeRoutes } from './routes/node-types';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  OPENROUTER_API_KEY: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS for GitHub Pages
app.use('*', cors({
  origin: [
    'https://amiddlebrook.github.io',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT
  });
});

// Mount routes
app.route('/api/frameworks', frameworkRoutes);
app.route('/api/tests', testRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/node-types', nodeTypeRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ error: err.message }, 500);
});

export default app;
