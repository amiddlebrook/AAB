export interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OpenRouterOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
}

export interface OpenRouterResponse {
    content: string;
    model: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        cost: number;
    };
}

// Free model pricing (all free - $0)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'meta-llama/llama-3.3-70b-instruct:free': { input: 0, output: 0 },
    'google/gemini-2.5-pro-exp-03-25:free': { input: 0, output: 0 },
    'deepseek/deepseek-chat-v3-0324:free': { input: 0, output: 0 },
    'deepseek/deepseek-r1-zero:free': { input: 0, output: 0 },
    'mistralai/mistral-small-3.1-24b-instruct:free': { input: 0, output: 0 },
    'nvidia/llama-3.1-nemotron-nano-8b-v1:free': { input: 0, output: 0 },
    'qwen/qwen3-coder-480b-a35b:free': { input: 0, output: 0 },
};

export async function callOpenRouter(
    messages: OpenRouterMessage[],
    apiKey: string,
    options: OpenRouterOptions = {}
): Promise<OpenRouterResponse> {
    const model = options.model || 'meta-llama/llama-3.3-70b-instruct:free';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://amiddlebrook.github.io/AAB',
            'X-Title': 'AAB - Agentic Architecture Benchmarks'
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1024,
            top_p: options.topP ?? 1
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter error: ${error}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};

    // Calculate cost
    const pricing = MODEL_PRICING[model] || { input: 1, output: 2 };
    const cost = (
        (usage.prompt_tokens || 0) * pricing.input / 1_000_000 +
        (usage.completion_tokens || 0) * pricing.output / 1_000_000
    );

    return {
        content,
        model: data.model || model,
        usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
            cost
        }
    };
}

// Race multiple models and return fastest
export async function raceModels(
    messages: OpenRouterMessage[],
    apiKey: string,
    models: string[],
    options: Omit<OpenRouterOptions, 'model'> = {}
): Promise<OpenRouterResponse> {
    const promises = models.map(model =>
        callOpenRouter(messages, apiKey, { ...options, model })
            .then(result => ({ result, model }))
    );

    const { result } = await Promise.race(promises);
    return result;
}
