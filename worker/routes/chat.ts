import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import type { Env } from '../index';
import { callOpenRouter } from '../lib/openrouter';

export const chatRoutes = new Hono<{ Bindings: Env }>();

const SYSTEM_PROMPT = `You are the Senior Agentic Systems Architect (SASA) for the AAB platform.
Your goal is to design world-class, robust, and scalable multi-agent frameworks.

### CORE OPERATING RULES:
1. **Intellectual Excellence**: Maintain a high standard of reasoning. Never provide generic or "lazy" responses.
2. **Chain of Thought**: Before generating the JSON, briefly analyze the user's request. Consider edge cases, necessary components, and data flow.
3. **Structured Output**: You MUST generate valid JSON for the framework when requested.

### ARCHITECTURAL STANDARDS:
- **Agents**: Use specific models (e.g., 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o') in config.
- **Tools**: Suggest real tools (e.g., 'web_search', 'code_interpreter', 'retrieval').
- **Flow**: Ensure logical progression (Input -> Processing -> Output). Use 'router' nodes for conditional logic.
- **Retry Logic**: Implement loops for robustness where appropriate.

### JSON STRUCTURE:
{
  "name": "Framework Name",
  "description": "Brief technical description",
  "nodes": [
    { "id": "node1", "type": "agent", "position": { "x": 100, "y": 100 }, "data": { "label": "Agent Name", "config": { "model": "..." } } }
  ],
  "edges": [
    { "id": "e1", "source": "node1", "target": "node2", "type": "smoothstep" }
  ]
}

### NODE TYPES:
- **input**: Entry point.
- **output**: Exit point.
- **agent**: LLM Agent. Config: { "model": "string", "temperature": number, "system_prompt": "string" }
- **processor**: Code/Transform. Config: { "code": "string" }
- **router**: Logic Branching.
- **tool**: External Tool. Config: { "tool": "search" | "calculator" | "api" }

Be creative. Impress the user with your architectural insight.`;

// Chat with the builder agent
chatRoutes.post('/', async (c) => {
    const body = await c.req.json();
    const { messages, generateFramework, model, apiKey } = body;

    if (!messages || !Array.isArray(messages)) {
        return c.json({ error: 'Messages array required' }, 400);
    }

    // Determine API Key (Client override -> AAB Secret -> Standard Secret)
    const activeApiKey = apiKey || c.env.AAB_OPENROUTER_API_KEY || c.env.OPENROUTER_API_KEY;

    // Check for API key
    if (!activeApiKey) {
        console.error('Missing API Key');
        return c.json({ error: 'Missing API Key: Set AAB_OPENROUTER_API_KEY in backend or provide key in frontend settings.' }, 500);
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
            activeApiKey,
            {
                model: model || 'meta-llama/llama-3.3-70b-instruct:free',
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

    // Determine API Key (Client override -> AAB Secret -> Standard Secret)
    const activeApiKey = body.apiKey || c.env.AAB_OPENROUTER_API_KEY || c.env.OPENROUTER_API_KEY;

    // Check for API key
    if (!activeApiKey) {
        console.error('Missing API Key');
        return c.json({ error: 'Missing API Key: Set AAB_OPENROUTER_API_KEY (or OPENROUTER_API_KEY) in backend.' }, 500);
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
            activeApiKey,
            {
                model: 'meta-llama/llama-3.3-70b-instruct:free',
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
