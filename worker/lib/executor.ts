import { infer } from './ai';
import type { Env } from '../index';

export interface FrameworkGraph { id: string; name: string; nodes: any[]; edges: any[]; }
export interface ExecutionLog {
  nodeId: string; input: string; output: string; model?: string; tokens?: number;
  latencyMs: number; error?: string;
}
export interface ExecutionResult {
  status: 'completed' | 'failed'; success: boolean; output: string; totalTokens: number;
  totalCost: number; nodeTimings: Record<string, number>; nodeOutputs: Record<string, string>;
  logs: ExecutionLog[];
}

// Executes the actual DAG. Never evaluates arbitrary user-supplied JavaScript.
// Unsupported capabilities fail explicitly instead of returning fabricated results.
export async function executeFramework(graph: FrameworkGraph, text: string, env: Env): Promise<ExecutionResult> {
  const logs: ExecutionLog[] = [];
  const nodeTimings: Record<string, number> = {};
  const nodeOutputs: Record<string, string> = {};
  let totalTokens = 0;
  const failed = (message: string): ExecutionResult => ({
    status: 'failed', success: false, output: message, totalTokens, totalCost: 0,
    nodeTimings, nodeOutputs, logs
  });
  if (graph.nodes.length < 1 || graph.nodes.length > 32 || graph.edges.length > 80) return failed('Graph exceeds the safe execution limits.');
  if (text.length > 8000) return failed('Test input must be 8000 characters or fewer.');

  const nodes = new Map<string, any>();
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const node of graph.nodes) {
    if (nodes.has(node.id)) return failed('Duplicate node ID.');
    nodes.set(node.id, node);
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  }
  for (const edge of graph.edges) {
    const source = edge.source_id || edge.source;
    const target = edge.target_id || edge.target;
    if (!nodes.has(source) || !nodes.has(target) || source === target) return failed('Invalid graph edge.');
    incoming.get(target)!.push(source);
    outgoing.get(source)!.push(target);
  }

  const pending = new Map([...incoming].map(([id, deps]) => [id, deps.length]));
  let ready = [...pending].filter(([, degree]) => degree === 0).map(([id]) => id);
  let completed = 0;

  while (ready.length) {
    // All nodes in this layer have their dependencies resolved; run independent branches concurrently.
    const layer = ready;
    ready = [];
    await Promise.all(layer.map(async id => {
      const node = nodes.get(id);
      const parents = incoming.get(id)!;
      const input = parents.length ? parents.map(p => nodeOutputs[p] || '').join('\n---\n') : text;
      const config = typeof node.config === 'string' ? JSON.parse(node.config || '{}') : (node.data?.config || {});
      const start = Date.now();
      try {
        let output = input, model: string | undefined, tokens = 0;
        switch (node.type) {
          case 'input': case 'output': case 'parallel': case 'router': case 'decision':
          case 'retry': case 'loop': case 'memory': break;
          case 'merge': output = parents.map(p => nodeOutputs[p] || '').join('\n---\n'); break;
          case 'processor': {
            if (node.custom_code || node.data?.customCode || config.code) throw new Error('Custom JavaScript execution is disabled for security. Choose a built-in transform.');
            const transform = config.transform || 'passthrough';
            if (transform === 'uppercase') output = input.toUpperCase();
            else if (transform === 'lowercase') output = input.toLowerCase();
            else if (transform === 'trim') output = input.trim();
            else if (transform === 'word-count') output = String(input.trim().split(/\s+/).filter(Boolean).length);
            else if (transform !== 'passthrough') throw new Error('Unknown processor transform: ' + transform);
            break;
          }
          case 'agent': case 'default': {
            const response = await infer(env, [
              { role: 'system', content: String(config.systemPrompt || config.system_prompt || 'You are a useful, precise AI assistant.').slice(0, 2000) },
              { role: 'user', content: input }
            ], Math.min(Number(config.maxTokens) || 512, 1024));
            output = response.content; model = response.model; tokens = response.tokens; break;
          }
          case 'tool':
            if (config.tool === 'word-count') output = String(input.trim().split(/\s+/).filter(Boolean).length);
            else if (config.tool === 'echo' || !config.tool) output = input;
            else throw new Error('External tool not connected: ' + config.tool);
            break;
          case 'rag': throw new Error('RAG requires an explicit connected retrieval source.');
          default: throw new Error('Unsupported node type: ' + node.type);
        }
        const latencyMs = Date.now() - start;
        nodeTimings[id] = latencyMs;
        nodeOutputs[id] = output;
        totalTokens += tokens;
        logs.push({ nodeId: id, input, output, model, tokens, latencyMs });
      } catch (e: any) {
        const latencyMs = Date.now() - start;
        nodeTimings[id] = latencyMs;
        logs.push({ nodeId: id, input, output: '', latencyMs, error: e?.message || 'Execution error' });
      }
    }));
    completed += layer.length;
    if (logs.some(l => l.error)) break;
    for (const id of layer) for (const target of outgoing.get(id)!) {
      pending.set(target, pending.get(target)! - 1);
      if (pending.get(target) === 0) ready.push(target);
    }
  }
  if (logs.some(l => l.error)) return failed('Node failed: ' + logs.find(l => l.error)!.error);
  if (completed !== nodes.size) return failed('Cycle detected. Graphs must be acyclic.');
  const final = graph.nodes.filter(n => n.type === 'output').at(-1)?.id || graph.nodes.at(-1)?.id;
  return { status: 'completed', success: true, output: nodeOutputs[final] || '',
    totalTokens, totalCost: 0, nodeTimings, nodeOutputs, logs };
}
