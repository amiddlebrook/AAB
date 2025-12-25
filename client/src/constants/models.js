export const AVAILABLE_MODELS = [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Fast / Smart)' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Reliable / Logic)' },
    { id: 'deepseek/deepseek-r1-distill-llama-70b:free', name: 'DeepSeek R1 Distill (Reasoning)' },
    { id: 'microsoft/phi-4:free', name: 'Phi-4 (Strong Small Model)' },
    { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder (Coding Expert)' },
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct:free', name: 'Nvidia Nemotron 70B (Instruction)' },
    { id: 'mistralai/mistral-small-24b-instruct-2501:free', name: 'Mistral Small 3 (Balanced)' },
    { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Llama 3.2 11B (Fast)' },
    { id: 'huggingfaceh4/zephyr-7b-beta:free', name: 'Zephyr 7B Beta (Chat / Roleplay)' },
    { id: 'liquid/lfm-40b:free', name: 'Liquid LFM 40B (Novel Architecture)' },
    { id: 'sophosympatheia/rogue-rose-103b-v0.2:free', name: 'Rogue Rose 103B (Creative)' },

    // Standard Models (Uses Credits - No Rate Limits)
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (Standard / Fast)' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (Standard / Smart)' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Premium)' },
    { id: 'openai/gpt-4o', name: 'GPT-4o (Premium)' }
];

export const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
