import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import type { Env } from '../index';
import { executeFramework } from '../lib/executor';

export const testRoutes = new Hono<{ Bindings: Env }>();

// Run a test on a framework
testRoutes.post('/:frameworkId/run', async (c) => {
    const frameworkId = c.req.param('frameworkId');
    const body = await c.req.json();

    // Get framework with nodes and edges
    const framework = await c.env.DB.prepare(
        'SELECT * FROM frameworks WHERE id = ?'
    ).bind(frameworkId).first();

    if (!framework) {
        return c.json({ error: 'Framework not found' }, 404);
    }

    const nodes = await c.env.DB.prepare(
        'SELECT * FROM nodes WHERE framework_id = ?'
    ).bind(frameworkId).all();

    const edges = await c.env.DB.prepare(
        'SELECT * FROM edges WHERE framework_id = ?'
    ).bind(frameworkId).all();

    // Execute the framework
    const startTime = Date.now();
    const result = await executeFramework(
        {
            id: frameworkId,
            name: framework.name as string,
            nodes: nodes.results,
            edges: edges.results
        },
        body.testInput || '',
        c.env.OPENROUTER_API_KEY,
        c.env.DB
    );
    const endTime = Date.now();

    // Store result
    const resultId = uuidv4();
    await c.env.DB.prepare(`
    INSERT INTO test_results (id, framework_id, test_input, status, success, latency_ms, total_tokens, total_cost, output, node_timings, node_outputs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
        resultId,
        frameworkId,
        body.testInput,
        result.status,
        result.success ? 1 : 0,
        endTime - startTime,
        result.totalTokens,
        result.totalCost,
        result.output,
        JSON.stringify(result.nodeTimings),
        JSON.stringify(result.nodeOutputs)
    ).run();

    // Store execution logs
    for (const log of result.logs) {
        await c.env.DB.prepare(`
      INSERT INTO execution_logs (id, result_id, node_id, input, output, model, tokens, latency_ms, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
            uuidv4(),
            resultId,
            log.nodeId,
            log.input,
            log.output,
            log.model,
            log.tokens,
            log.latencyMs,
            log.error
        ).run();
    }

    return c.json({
        id: resultId,
        frameworkId,
        timestamp: new Date().toISOString(),
        testInput: body.testInput,
        status: result.status,
        success: result.success,
        latency: (endTime - startTime) / 1000,
        totalTokens: result.totalTokens,
        totalCost: result.totalCost,
        output: result.output,
        nodeTimings: result.nodeTimings,
        nodeOutputs: result.nodeOutputs,
        logs: result.logs
    });
});

// Get test results for a framework
testRoutes.get('/:frameworkId/results', async (c) => {
    const frameworkId = c.req.param('frameworkId');

    const { results } = await c.env.DB.prepare(`
    SELECT * FROM test_results WHERE framework_id = ? ORDER BY created_at DESC LIMIT 50
  `).bind(frameworkId).all();

    return c.json(results.map((r: any) => ({
        id: r.id,
        frameworkId: r.framework_id,
        timestamp: r.created_at,
        testInput: r.test_input,
        status: r.status,
        success: r.success === 1,
        latency: r.latency_ms / 1000,
        totalTokens: r.total_tokens,
        totalCost: r.total_cost,
        output: r.output,
        nodeTimings: JSON.parse(r.node_timings || '{}'),
        nodeOutputs: JSON.parse(r.node_outputs || '{}')
    })));
});

// Get single result with detailed logs
testRoutes.get('/result/:resultId', async (c) => {
    const resultId = c.req.param('resultId');

    const result = await c.env.DB.prepare(
        'SELECT * FROM test_results WHERE id = ?'
    ).bind(resultId).first();

    if (!result) {
        return c.json({ error: 'Result not found' }, 404);
    }

    const logs = await c.env.DB.prepare(
        'SELECT * FROM execution_logs WHERE result_id = ? ORDER BY created_at'
    ).bind(resultId).all();

    return c.json({
        ...result,
        logs: logs.results
    });
});
