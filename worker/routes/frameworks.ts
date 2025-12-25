import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import type { Env } from '../index';

export const frameworkRoutes = new Hono<{ Bindings: Env }>();

// Get all frameworks
frameworkRoutes.get('/', async (c) => {
    const { results } = await c.env.DB.prepare(`
    SELECT f.*, 
      (SELECT COUNT(*) FROM nodes WHERE framework_id = f.id) as node_count,
      (SELECT COUNT(*) FROM edges WHERE framework_id = f.id) as edge_count,
      (SELECT COUNT(*) FROM test_results WHERE framework_id = f.id) as total_runs,
      (SELECT AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) FROM test_results WHERE framework_id = f.id) as success_rate,
      (SELECT AVG(latency_ms) FROM test_results WHERE framework_id = f.id) as avg_latency
    FROM frameworks f
    ORDER BY f.updated_at DESC
  `).all();

    // Fetch nodes and edges for each framework
    const frameworks = await Promise.all(results.map(async (f: any) => {
        const nodes = await c.env.DB.prepare(
            'SELECT * FROM nodes WHERE framework_id = ?'
        ).bind(f.id).all();

        const edges = await c.env.DB.prepare(
            'SELECT * FROM edges WHERE framework_id = ?'
        ).bind(f.id).all();

        return {
            id: f.id,
            name: f.name,
            description: f.description,
            nodes: nodes.results.map((n: any) => ({
                id: n.id,
                type: n.type,
                position: { x: n.position_x, y: n.position_y },
                data: {
                    label: n.label,
                    config: n.config ? JSON.parse(n.config) : {},
                    customCode: n.custom_code
                }
            })),
            edges: edges.results.map((e: any) => ({
                id: e.id,
                source: e.source_id,
                target: e.target_id,
                type: e.edge_type,
                label: e.label,
                data: e.condition ? { condition: JSON.parse(e.condition) } : {}
            })),
            metrics: {
                totalRuns: f.total_runs || 0,
                successRate: f.success_rate || 0,
                avgLatency: (f.avg_latency || 0) / 1000 // Convert to seconds
            }
        };
    }));

    return c.json(frameworks);
});

// Get single framework
frameworkRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');

    const framework = await c.env.DB.prepare(
        'SELECT * FROM frameworks WHERE id = ?'
    ).bind(id).first();

    if (!framework) {
        return c.json({ error: 'Framework not found' }, 404);
    }

    const nodes = await c.env.DB.prepare(
        'SELECT * FROM nodes WHERE framework_id = ?'
    ).bind(id).all();

    const edges = await c.env.DB.prepare(
        'SELECT * FROM edges WHERE framework_id = ?'
    ).bind(id).all();

    return c.json({
        ...framework,
        nodes: nodes.results.map((n: any) => ({
            id: n.id,
            type: n.type,
            position: { x: n.position_x, y: n.position_y },
            data: {
                label: n.label,
                config: n.config ? JSON.parse(n.config) : {},
                customCode: n.custom_code
            }
        })),
        edges: edges.results.map((e: any) => ({
            id: e.id,
            source: e.source_id,
            target: e.target_id,
            type: e.edge_type
        }))
    });
});

// Create framework
frameworkRoutes.post('/', async (c) => {
    const body = await c.req.json();
    const id = uuidv4();

    await c.env.DB.prepare(`
    INSERT INTO frameworks (id, name, description)
    VALUES (?, ?, ?)
  `).bind(id, body.name || 'Untitled Framework', body.description || '').run();

    // Insert nodes
    for (const node of (body.nodes || [])) {
        await c.env.DB.prepare(`
      INSERT INTO nodes (id, framework_id, type, position_x, position_y, label, config, custom_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
            node.id,
            id,
            node.type || 'default',
            node.position?.x || 0,
            node.position?.y || 0,
            node.data?.label || 'Node',
            JSON.stringify(node.data?.config || {}),
            node.data?.customCode || null
        ).run();
    }

    // Insert edges
    for (const edge of (body.edges || [])) {
        await c.env.DB.prepare(`
      INSERT INTO edges (id, framework_id, source_id, target_id, edge_type, label)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
            edge.id,
            id,
            edge.source,
            edge.target,
            edge.type || 'smoothstep',
            edge.label || null
        ).run();
    }

    return c.json({ id, name: body.name, description: body.description }, 201);
});

// Update framework
frameworkRoutes.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();

    await c.env.DB.prepare(`
    UPDATE frameworks SET name = ?, description = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.name, body.description, id).run();

    // Delete existing nodes and edges
    await c.env.DB.prepare('DELETE FROM nodes WHERE framework_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM edges WHERE framework_id = ?').bind(id).run();

    // Re-insert nodes
    for (const node of (body.nodes || [])) {
        await c.env.DB.prepare(`
      INSERT INTO nodes (id, framework_id, type, position_x, position_y, label, config, custom_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
            node.id,
            id,
            node.type || 'default',
            node.position?.x || 0,
            node.position?.y || 0,
            node.data?.label || 'Node',
            JSON.stringify(node.data?.config || {}),
            node.data?.customCode || null
        ).run();
    }

    // Re-insert edges
    for (const edge of (body.edges || [])) {
        await c.env.DB.prepare(`
      INSERT INTO edges (id, framework_id, source_id, target_id, edge_type)
      VALUES (?, ?, ?, ?, ?)
    `).bind(edge.id, id, edge.source, edge.target, edge.type || 'smoothstep').run();
    }

    return c.json({ id, ...body });
});

// Delete framework
frameworkRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM frameworks WHERE id = ?').bind(id).run();
    return c.body(null, 204);
});
