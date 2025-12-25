import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import type { Env } from '../index';
import { callOpenRouter } from '../lib/openrouter';

export const chatRoutes = new Hono<{ Bindings: Env }>();

const SYSTEM_PROMPT = `You are an expert AI architect assistant for AAB (Agentic Architecture Benchmarks).
Your role is to help users build agent frameworks through natural conversation.

When a user describes what they want to build, you should:
1. Understand their requirements
2. Generate a framework structure with nodes and edges
3. Suggest appropriate models and configurations

You can generate frameworks in JSON format when asked. The structure should include:
- nodes: Array of {id, type, position: {x, y}, data: {label, config}}
- edges: Array of {id, source, target, type}

Node types available:
- input: Entry point for data
- output: Final result
- agent: LLM-powered agent with model and temperature config
- processor: Data transformation
- decision: Conditional routing
- custom: User-defined with custom code

Be creative and help users build novel architectures. You can suggest patterns like:
- Sequential chains
- Parallel processing with merge
- Retry/fallback patterns
- Conditional routing
- Loops with exit conditions

Always explain your reasoning and offer alternatives.`;

// Chat with the builder agent
chatRoutes.post('/', async (c) => {
    const body = await c.req.json();
    const { messages, generateFramework } = body;

    if (!messages || !Array.isArray(messages)) {
        return c.json({ error: 'Messages array required' }, 400);
    }

    // Add system prompt
    const fullMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
    ];

    // If user wants to generate a framework, add instruction
    if (generateFramework) {
        fullMessages.push({
            role: 'user',
            content: 'Please generate the framework JSON structure based on our conversation. Output only the JSON.'
        });
    }

    try {
        const response = await callOpenRouter(
            fullMessages,
            c.env.OPENROUTER_API_KEY,
            {
                model: 'anthropic/claude-3.5-sonnet',
                temperature: 0.7,
                maxTokens: 4096
            }
        );

        // Try to extract framework JSON if present
        let framework = null;
        if (generateFramework || response.content.includes('"nodes"')) {
            try {
                const jsonMatch = response.content.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/);
                if (jsonMatch) {
                    framework = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                // Not valid JSON, that's ok
            }
        }

        return c.json({
            id: uuidv4(),
            role: 'assistant',
            content: response.content,
            framework,
            usage: response.usage
        });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Generate framework from description
chatRoutes.post('/generate', async (c) => {
    const body = await c.req.json();
    const { description } = body;

    if (!description) {
        return c.json({ error: 'Description required' }, 400);
    }

    const prompt = `Generate a framework for the following description:

"${description}"

Respond with ONLY a valid JSON object containing:
{
  "name": "Framework name",
  "description": "Brief description",
  "nodes": [...],
  "edges": [...]
}

Make sure positions are spread out (x: 100-700, y: 100-400).
Use appropriate node types and connect them logically.`;

    try {
        const response = await callOpenRouter(
            [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ],
            c.env.OPENROUTER_API_KEY,
            {
                model: 'anthropic/claude-3.5-sonnet',
                temperature: 0.5,
                maxTokens: 2048
            }
        );

        // Extract JSON
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return c.json({ error: 'Failed to generate valid framework' }, 500);
        }

        const framework = JSON.parse(jsonMatch[0]);

        return c.json({
            framework,
            usage: response.usage
        });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});
