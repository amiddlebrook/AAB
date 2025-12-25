import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import type { Env } from '../index';

export const nodeTypeRoutes = new Hono<{ Bindings: Env }>();

// Default built-in node types
const BUILTIN_TYPES = [
    {
        id: 'input',
        name: 'Input',
        category: 'io',
        description: 'Entry point for data into the framework',
        inputSchema: null,
        outputSchema: { type: 'string' },
        configSchema: null,
        executeCode: 'return input;',
        builtin: true
    },
    {
        id: 'output',
        name: 'Output',
        category: 'io',
        description: 'Final output of the framework',
        inputSchema: { type: 'string' },
        outputSchema: { type: 'string' },
        configSchema: null,
        executeCode: 'return input;',
        builtin: true
    },
    {
        id: 'agent',
        name: 'Agent',
        category: 'agent',
        description: 'LLM-powered agent node',
        inputSchema: { type: 'string' },
        outputSchema: { type: 'string' },
        configSchema: {
            model: { type: 'string', default: 'anthropic/claude-3.5-sonnet' },
            temperature: { type: 'number', default: 0.7 },
            systemPrompt: { type: 'string', default: '' },
            maxTokens: { type: 'number', default: 1024 }
        },
        executeCode: null, // Uses LLM
        builtin: true
    },
    {
        id: 'processor',
        name: 'Processor',
        category: 'processor',
        description: 'Data transformation node with custom code',
        inputSchema: { type: 'any' },
        outputSchema: { type: 'any' },
        configSchema: null,
        executeCode: 'return input;',
        builtin: true
    },
    {
        id: 'decision',
        name: 'Decision',
        category: 'router',
        description: 'Conditional routing based on logic',
        inputSchema: { type: 'any' },
        outputSchema: { type: 'any' },
        configSchema: {
            conditions: { type: 'array', items: { condition: 'string', target: 'string' } }
        },
        executeCode: null, // Uses condition logic
        builtin: true
    },
    {
        id: 'parallel',
        name: 'Parallel',
        category: 'control',
        description: 'Execute multiple branches in parallel',
        inputSchema: { type: 'any' },
        outputSchema: { type: 'array' },
        configSchema: null,
        executeCode: null,
        builtin: true
    },
    {
        id: 'merge',
        name: 'Merge',
        category: 'control',
        description: 'Merge results from parallel branches',
        inputSchema: { type: 'array' },
        outputSchema: { type: 'any' },
        configSchema: {
            strategy: { type: 'string', enum: ['concat', 'first', 'vote', 'custom'] }
        },
        executeCode: 'return inputs.join("\\n");',
        builtin: true
    },
    {
        id: 'loop',
        name: 'Loop',
        category: 'control',
        description: 'Iterate with exit condition',
        inputSchema: { type: 'any' },
        outputSchema: { type: 'any' },
        configSchema: {
            maxIterations: { type: 'number', default: 10 },
            exitCondition: { type: 'string' }
        },
        executeCode: null,
        builtin: true
    },
    {
        id: 'retry',
        name: 'Retry',
        category: 'control',
        description: 'Retry with fallback on failure',
        inputSchema: { type: 'any' },
        outputSchema: { type: 'any' },
        configSchema: {
            maxRetries: { type: 'number', default: 3 },
            fallbackModel: { type: 'string' },
            onFailure: { type: 'string', enum: ['skip', 'abort', 'fallback'] }
        },
        executeCode: null,
        builtin: true
    }
];

// Get all node types (builtin + custom)
nodeTypeRoutes.get('/', async (c) => {
    const { results } = await c.env.DB.prepare(
        'SELECT * FROM node_types ORDER BY created_at DESC'
    ).all();

    const customTypes = results.map((t: any) => ({
        ...t,
        inputSchema: t.input_schema ? JSON.parse(t.input_schema) : null,
        outputSchema: t.output_schema ? JSON.parse(t.output_schema) : null,
        configSchema: t.config_schema ? JSON.parse(t.config_schema) : null,
        builtin: false
    }));

    return c.json([...BUILTIN_TYPES, ...customTypes]);
});

// Create custom node type
nodeTypeRoutes.post('/', async (c) => {
    const body = await c.req.json();
    const id = body.id || uuidv4();

    await c.env.DB.prepare(`
    INSERT INTO node_types (id, name, category, input_schema, output_schema, config_schema, execute_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
        id,
        body.name,
        body.category || 'custom',
        JSON.stringify(body.inputSchema || null),
        JSON.stringify(body.outputSchema || null),
        JSON.stringify(body.configSchema || null),
        body.executeCode || 'return input;'
    ).run();

    return c.json({ id, ...body }, 201);
});

// Update custom node type
nodeTypeRoutes.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();

    // Check if builtin
    if (BUILTIN_TYPES.some(t => t.id === id)) {
        return c.json({ error: 'Cannot modify builtin type' }, 400);
    }

    await c.env.DB.prepare(`
    UPDATE node_types SET name = ?, category = ?, input_schema = ?, output_schema = ?, config_schema = ?, execute_code = ?
    WHERE id = ?
  `).bind(
        body.name,
        body.category,
        JSON.stringify(body.inputSchema),
        JSON.stringify(body.outputSchema),
        JSON.stringify(body.configSchema),
        body.executeCode,
        id
    ).run();

    return c.json({ id, ...body });
});

// Delete custom node type
nodeTypeRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id');

    if (BUILTIN_TYPES.some(t => t.id === id)) {
        return c.json({ error: 'Cannot delete builtin type' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM node_types WHERE id = ?').bind(id).run();
    return c.body(null, 204);
});
