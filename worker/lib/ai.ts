import type { Env } from '../index';

export const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function infer(env: Env, messages: ChatMessage[], maxTokens = 512) {
  const response = await env.AI.run(MODEL, {
    messages: messages.map(m => ({ role: m.role, content: m.content.slice(0, 8000) })),
    max_tokens: Math.min(2048, Math.max(64, maxTokens)),
    temperature: 0.4
  }) as { response?: string; usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number } };
  if (typeof response.response !== 'string') throw new Error('Cloudflare Workers AI returned no text response');
  return { content: response.response, model: MODEL, tokens: response.usage?.total_tokens || 0 };
}

export function parseFramework(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model did not return a JSON framework. Please rephrase your request.');
  const graph = JSON.parse(match[0]);
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) ||
      graph.nodes.length < 2 || graph.nodes.length > 32 || graph.edges.length > 80) {
    throw new Error('Invalid graph: 2-32 nodes and up to 80 edges are required.');
  }
  const ids = new Set<string>();
  const nodes = graph.nodes.map((n: any, i: number) => {
    const id = String(n.id || 'node-' + i).slice(0, 80);
    if (ids.has(id)) throw new Error('Duplicate node IDs returned by model.');
    ids.add(id);
    const type = ['input', 'output', 'agent', 'processor', 'router', 'merge', 'parallel', 'tool', 'decision'].includes(n.type) ? n.type : 'agent';
    return {
      id, type,
      position: { x: Number(n.position?.x) || 160 + i * 170, y: Number(n.position?.y) || 180 },
      data: { label: String(n.data?.label || type).slice(0, 100), config: type === 'agent' ? { systemPrompt: String(n.data?.config?.systemPrompt || '') } : (n.data?.config || {}) }
    };
  });
  const edges = graph.edges.filter((e: any) => ids.has(String(e.source)) && ids.has(String(e.target)) && e.source !== e.target)
    .map((e: any, i: number) => ({ id: String(e.id || 'edge-' + i), source: String(e.source), target: String(e.target), type: 'smoothstep' }));
  return { name: String(graph.name || 'New architecture').slice(0, 120), description: String(graph.description || '').slice(0, 2000), nodes, edges };
}
