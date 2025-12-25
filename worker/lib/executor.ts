import { callOpenRouter } from './openrouter';

export interface FrameworkGraph {
    id: string;
    name: string;
    nodes: any[];
    edges: any[];
}

export interface ExecutionLog {
    nodeId: string;
    input: string;
    output: string;
    model?: string;
    tokens?: number;
    latencyMs: number;
    error?: string;
}

export interface ExecutionResult {
    status: 'completed' | 'failed' | 'partial';
    success: boolean;
    output: string;
    totalTokens: number;
    totalCost: number;
    nodeTimings: Record<string, number>;
    nodeOutputs: Record<string, string>;
    logs: ExecutionLog[];
}

// Build adjacency list and find execution order (topological sort)
function buildExecutionOrder(nodes: any[], edges: any[]): string[] {
    const inDegree: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {};

    // Initialize
    for (const node of nodes) {
        inDegree[node.id] = 0;
        adjacency[node.id] = [];
    }

    // Build graph
    for (const edge of edges) {
        adjacency[edge.source_id || edge.source].push(edge.target_id || edge.target);
        inDegree[edge.target_id || edge.target]++;
    }

    // Topological sort (Kahn's algorithm)
    const queue: string[] = [];
    for (const nodeId of Object.keys(inDegree)) {
        if (inDegree[nodeId] === 0) {
            queue.push(nodeId);
        }
    }

    const order: string[] = [];
    while (queue.length > 0) {
        const current = queue.shift()!;
        order.push(current);

        for (const neighbor of adjacency[current]) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) {
                queue.push(neighbor);
            }
        }
    }

    return order;
}

// Execute a single node
async function executeNode(
    node: any,
    input: string,
    apiKey: string
): Promise<{ output: string; tokens: number; cost: number; model?: string }> {
    const nodeType = node.type;
    const config = node.config ? JSON.parse(node.config) : {};
    const customCode = node.custom_code;

    // Input/Output nodes just pass through
    if (nodeType === 'input' || nodeType === 'output') {
        return { output: input, tokens: 0, cost: 0 };
    }

    // Processor with custom code
    if (nodeType === 'processor' || (nodeType === 'default' && customCode)) {
        try {
            // Safe eval with input context
            const fn = new Function('input', customCode || 'return input;');
            const output = fn(input);
            return { output: String(output), tokens: 0, cost: 0 };
        } catch (e: any) {
            return { output: `Error: ${e.message}`, tokens: 0, cost: 0 };
        }
    }

    // Agent node - call LLM
    if (nodeType === 'agent' || nodeType === 'default') {
        const model = config.model || 'meta-llama/llama-3.3-70b-instruct:free';
        const temperature = config.temperature ?? 0.7;
        const systemPrompt = config.systemPrompt || 'You are a helpful assistant.';
        const maxTokens = config.maxTokens || 1024;

        const messages = [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: input }
        ];

        const response = await callOpenRouter(messages, apiKey, {
            model,
            temperature,
            maxTokens
        });

        return {
            output: response.content,
            tokens: response.usage.totalTokens,
            cost: response.usage.cost,
            model: response.model
        };
    }

    // Default passthrough
    return { output: input, tokens: 0, cost: 0 };
}

// Main execution function
export async function executeFramework(
    framework: FrameworkGraph,
    testInput: string,
    apiKey: string,
    db: D1Database
): Promise<ExecutionResult> {
    const logs: ExecutionLog[] = [];
    const nodeTimings: Record<string, number> = {};
    const nodeOutputs: Record<string, string> = {};
    let totalTokens = 0;
    let totalCost = 0;

    try {
        // Get execution order
        const executionOrder = buildExecutionOrder(framework.nodes, framework.edges);

        // Build edge lookup for finding inputs
        const edgesByTarget: Record<string, string[]> = {};
        for (const edge of framework.edges) {
            const target = edge.target_id || edge.target;
            const source = edge.source_id || edge.source;
            if (!edgesByTarget[target]) edgesByTarget[target] = [];
            edgesByTarget[target].push(source);
        }

        // Execute in order
        for (const nodeId of executionOrder) {
            const node = framework.nodes.find(n => n.id === nodeId);
            if (!node) continue;

            // Gather input from previous nodes or use test input
            let input: string;
            const sourceNodes = edgesByTarget[nodeId] || [];
            if (sourceNodes.length === 0) {
                // No incoming edges - use test input
                input = testInput;
            } else if (sourceNodes.length === 1) {
                input = nodeOutputs[sourceNodes[0]] || testInput;
            } else {
                // Multiple inputs - concatenate
                input = sourceNodes.map(s => nodeOutputs[s] || '').join('\n---\n');
            }

            // Execute node
            const startTime = Date.now();
            try {
                const result = await executeNode(node, input, apiKey);
                const endTime = Date.now();

                nodeTimings[nodeId] = endTime - startTime;
                nodeOutputs[nodeId] = result.output;
                totalTokens += result.tokens;
                totalCost += result.cost;

                logs.push({
                    nodeId,
                    input,
                    output: result.output,
                    model: result.model,
                    tokens: result.tokens,
                    latencyMs: endTime - startTime
                });
            } catch (error: any) {
                const endTime = Date.now();
                nodeTimings[nodeId] = endTime - startTime;
                nodeOutputs[nodeId] = `Error: ${error.message}`;

                logs.push({
                    nodeId,
                    input,
                    output: '',
                    latencyMs: endTime - startTime,
                    error: error.message
                });
            }
        }

        // Find output nodes and get final output
        const outputNodes = framework.nodes.filter(n =>
            n.type === 'output' || n.label?.toLowerCase().includes('output')
        );
        const finalOutput = outputNodes.length > 0
            ? nodeOutputs[outputNodes[0].id]
            : nodeOutputs[executionOrder[executionOrder.length - 1]];

        return {
            status: 'completed',
            success: true,
            output: finalOutput || '',
            totalTokens,
            totalCost,
            nodeTimings,
            nodeOutputs,
            logs
        };
    } catch (error: any) {
        return {
            status: 'failed',
            success: false,
            output: `Execution failed: ${error.message}`,
            totalTokens,
            totalCost,
            nodeTimings,
            nodeOutputs,
            logs
        };
    }
}
