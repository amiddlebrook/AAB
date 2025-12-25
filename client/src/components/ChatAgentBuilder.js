import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatAgentBuilder.css';

const AVAILABLE_MODELS = [
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
    { id: 'sophosympatheia/rogue-rose-103b-v0.2:free', name: 'Rogue Rose 103B (Creative)' }
];

function ChatAgentBuilder({ onFrameworkGenerated, apiUrl }) {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `Welcome to the AAB Chat Builder!

I can help you create agent frameworks through natural conversation. Just describe what you want to build:

**Examples:**
- "Create a summarization pipeline with 3 agents"
- "Build a multi-agent debate system"
- "Make a RAG pipeline with query rewriting"
- "Design a code review workflow with parallel reviewers"

What would you like to build today?`
        }
    ]);
    const [input, setInput] = useState('');
    const [apiKey, setApiKey] = useState(localStorage.getItem('aab_openrouter_key') || '');
    const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
    const [loading, setLoading] = useState(false);
    const [generatedFramework, setGeneratedFramework] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post(`${apiUrl}/chat`, {
                messages: messages.filter(m => m.role !== 'system').concat(userMessage),
                model: selectedModel,
                apiKey
            });

            const assistantMessage = {
                role: 'assistant',
                content: response.data.content
            };
            setMessages(prev => [...prev, assistantMessage]);

            // Check if a framework was generated
            if (response.data.framework) {
                setGeneratedFramework(response.data.framework);
            }
        } catch (err) {
            console.error('Chat error:', err);
            // Demo mode fallback with explicit notification
            const demoResponse = generateDemoResponse(input);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `[OFFLINE MODE - API ERROR: ${err.message || 'Unknown'}]\n\n` + demoResponse.content
            }]);
            if (demoResponse.framework) {
                setGeneratedFramework(demoResponse.framework);
            }
        } finally {
            setLoading(false);
        }
    };

    const generateDemoResponse = (userInput) => {
        const lower = userInput.toLowerCase();

        // 1. RAG / Retrieval Pattern
        if (lower.includes('rag') || lower.includes('retriev') || lower.includes('search') || lower.includes('knowledge')) {
            return {
                content: `I've designed a RAG (Retrieval-Augmented Generation) pipeline for you.
                
**Design Pattern:**
1. **Query Input** - Entry point
2. **Embedder** - Converts query to vectors
3. **Vector Search** - Retrieves relevant context
4. **Context Fusion** - combine query + context
5. **LLM Answer** - Generates informed response

This is ideal for Q&A over documents.`,
                framework: {
                    name: 'RAG Knowledge System',
                    description: 'Retrieval-augmented pipeline for grounded answers',
                    nodes: [
                        { id: 'in', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Query' } },
                        { id: 'embed', type: 'processor', position: { x: 280, y: 200 }, data: { label: 'Embedder' } },
                        { id: 'retrieve', type: 'tool', position: { x: 460, y: 150 }, data: { label: 'Vector DB', config: { tool: 'search' } } },
                        { id: 'llm', type: 'agent', position: { x: 640, y: 200 }, data: { label: 'Answer Gen', config: { model: 'anthropic/claude-3.5-sonnet' } } },
                        { id: 'out', type: 'output', position: { x: 820, y: 200 }, data: { label: 'Response' } }
                    ],
                    edges: [
                        { id: 'e1', source: 'in', target: 'embed', type: 'smoothstep' },
                        { id: 'e2', source: 'embed', target: 'retrieve', type: 'smoothstep' },
                        { id: 'e3', source: 'retrieve', target: 'llm', type: 'smoothstep' },
                        { id: 'e4', source: 'in', target: 'llm', type: 'smoothstep' },
                        { id: 'e5', source: 'llm', target: 'out', type: 'smoothstep' }
                    ]
                }
            };
        }

        // 2. Coding / Development Pattern
        if (lower.includes('code') || lower.includes('dev') || lower.includes('review') || lower.includes('software')) {
            return {
                content: `Here is a robust Code Engineering Workflow.

**Workflow:**
1. **Spec Input** - Feature requirements
2. **Architect** - Plans the implementation
3. **Developer** - Writes the code
4. **Reviewer** - Critiques and suggestions
5. **Refiner** - Applies fixes
6. **Final Output** - Production code`,
                framework: {
                    name: 'Code Engineering Flow',
                    description: 'Plan -> Code -> Review -> Fix cycle',
                    nodes: [
                        { id: 'spec', type: 'input', position: { x: 50, y: 250 }, data: { label: 'Spec' } },
                        { id: 'arch', type: 'agent', position: { x: 200, y: 250 }, data: { label: 'Architect', config: { model: 'anthropic/claude-3.5-sonnet' } } },
                        { id: 'dev', type: 'agent', position: { x: 400, y: 250 }, data: { label: 'Developer', config: { model: 'anthropic/claude-3.5-sonnet' } } },
                        { id: 'review', type: 'agent', position: { x: 400, y: 100 }, data: { label: 'Reviewer', config: { model: 'gpt-4o' } } },
                        { id: 'fix', type: 'agent', position: { x: 600, y: 250 }, data: { label: 'Refiner', config: { model: 'anthropic/claude-3.5-sonnet' } } },
                        { id: 'code', type: 'output', position: { x: 800, y: 250 }, data: { label: 'Final Code' } }
                    ],
                    edges: [
                        { id: 'e1', source: 'spec', target: 'arch', type: 'smoothstep' },
                        { id: 'e2', source: 'arch', target: 'dev', type: 'smoothstep' },
                        { id: 'e3', source: 'dev', target: 'review', type: 'smoothstep' },
                        { id: 'e4', source: 'review', target: 'fix', type: 'smoothstep' },
                        { id: 'e5', source: 'dev', target: 'fix', type: 'smoothstep' },
                        { id: 'e6', source: 'fix', target: 'code', type: 'smoothstep' }
                    ]
                }
            };
        }

        // 3. Summarization (Existing)
        if (lower.includes('summar') || lower.includes('digest') || lower.includes('shorten')) {
            return {
                content: `Great! I'll create a summarization pipeline for you.

**Architecture:**
1. **Input Node** - Receives the text to summarize
2. **Chunker Agent** - Breaks long text into chunks
3. **Summarizer Agent** - Summarizes each chunk
4. **Merger Agent** - Combines chunk summaries into final summary
5. **Output Node** - Returns the final summary`,
                framework: {
                    name: 'Summarization Pipeline',
                    description: 'Multi-stage summarization with chunking and merging',
                    nodes: [
                        { id: 'input', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
                        { id: 'chunker', type: 'agent', position: { x: 250, y: 200 }, data: { label: 'Chunker', config: { model: 'openai/gpt-4o-mini', temperature: 0.3 } } },
                        { id: 'summarizer', type: 'agent', position: { x: 400, y: 200 }, data: { label: 'Summarizer', config: { model: 'anthropic/claude-3.5-sonnet', temperature: 0.5 } } },
                        { id: 'merger', type: 'agent', position: { x: 550, y: 200 }, data: { label: 'Merger', config: { model: 'anthropic/claude-3.5-sonnet', temperature: 0.3 } } },
                        { id: 'output', type: 'output', position: { x: 700, y: 200 }, data: { label: 'Output' } }
                    ],
                    edges: [
                        { id: 'e1', source: 'input', target: 'chunker', type: 'smoothstep' },
                        { id: 'e2', source: 'chunker', target: 'summarizer', type: 'smoothstep' },
                        { id: 'e3', source: 'summarizer', target: 'merger', type: 'smoothstep' },
                        { id: 'e4', source: 'merger', target: 'output', type: 'smoothstep' }
                    ]
                }
            };
        }

        // 4. Parallel / Multi-Agent (Existing)
        if (lower.includes('parallel') || lower.includes('multi') || lower.includes('debate')) {
            return {
                content: `I'll create a parallel multi-agent architecture for you.

**Architecture:**
1. **Input Node** - Receives the query
2. **Parallel Agents** - Multiple agents process simultaneously
3. **Merger** - Combines results using voting/consensus
4. **Output Node** - Returns the final result`,
                framework: {
                    name: 'Parallel Multi-Agent System',
                    description: 'Multiple agents process in parallel, results merged',
                    nodes: [
                        { id: 'input', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
                        { id: 'agent1', type: 'agent', position: { x: 300, y: 100 }, data: { label: 'Agent A', config: { model: 'anthropic/claude-3.5-sonnet', temperature: 0.7 } } },
                        { id: 'agent2', type: 'agent', position: { x: 300, y: 200 }, data: { label: 'Agent B', config: { model: 'openai/gpt-4o', temperature: 0.7 } } },
                        { id: 'agent3', type: 'agent', position: { x: 300, y: 300 }, data: { label: 'Agent C', config: { model: 'google/gemini-flash-1.5', temperature: 0.7 } } },
                        { id: 'merger', type: 'processor', position: { x: 500, y: 200 }, data: { label: 'Merger' } },
                        { id: 'output', type: 'output', position: { x: 650, y: 200 }, data: { label: 'Output' } }
                    ],
                    edges: [
                        { id: 'e1', source: 'input', target: 'agent1', type: 'smoothstep' },
                        { id: 'e2', source: 'input', target: 'agent2', type: 'smoothstep' },
                        { id: 'e3', source: 'input', target: 'agent3', type: 'smoothstep' },
                        { id: 'e4', source: 'agent1', target: 'merger', type: 'smoothstep' },
                        { id: 'e5', source: 'agent2', target: 'merger', type: 'smoothstep' },
                        { id: 'e6', source: 'agent3', target: 'merger', type: 'smoothstep' },
                        { id: 'e7', source: 'merger', target: 'output', type: 'smoothstep' }
                    ]
                }
            };
        }

        // 5. Fallback
        return {
            content: `I've created a versatile **General Purpose Logic Chain** for your request ("${userInput}").

This architecture includes:
- **Planner**: Deconstructs the user request
- **Executor**: Performs the core task
- **Critic**: Validates the output

It's a solid starting point for many agentic workflows.`,
            framework: {
                name: 'General Purpose Agent Chain',
                description: 'Planner -> Executor -> Critic pattern',
                nodes: [
                    { id: 'in', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Request' } },
                    { id: 'plan', type: 'agent', position: { x: 280, y: 200 }, data: { label: 'Planner', config: { model: 'meta-llama/llama-3.2-90b-vision-instruct:free' } } },
                    { id: 'exec', type: 'agent', position: { x: 460, y: 200 }, data: { label: 'Executor', config: { model: 'anthropic/claude-3.5-sonnet' } } },
                    { id: 'crit', type: 'agent', position: { x: 640, y: 200 }, data: { label: 'Critic', config: { model: 'openai/gpt-4o' } } },
                    { id: 'out', type: 'output', position: { x: 820, y: 200 }, data: { label: 'Result' } }
                ],
                edges: [
                    { id: 'e1', source: 'in', target: 'plan', type: 'smoothstep' },
                    { id: 'e2', source: 'plan', target: 'exec', type: 'smoothstep' },
                    { id: 'e3', source: 'exec', target: 'crit', type: 'smoothstep' },
                    { id: 'e4', source: 'crit', target: 'out', type: 'smoothstep' }
                ]
            }
        };
    };

    const handleQuickGenerate = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${apiUrl}/chat/generate`, {
                description: input || 'A simple 2-agent sequential chain for text processing',
                model: selectedModel,
                apiKey
            });
            setGeneratedFramework(response.data.framework);
        } catch (err) {
            // Demo fallback
            console.error('Quick Gen error:', err);
            const demo = generateDemoResponse(input || 'simple agent chain');
            if (demo.framework) {
                setGeneratedFramework(demo.framework);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `[OFFLINE MODE - API ERROR: ${err.message}]\n\n` + demo.content
                }]);
            }
        } finally {
            setLoading(false);
        }
    };

    const useFramework = () => {
        if (generatedFramework) {
            onFrameworkGenerated(generatedFramework);
            setGeneratedFramework(null);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Framework added successfully. Switch to Visual Editor to customize or Test Runner to execute.'
            }]);
        }
    };

    return (
        <div className="chat-builder">
            <div className="chat-header">
                <div className="header-row">
                    <h2>Chat Agent Builder</h2>
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="model-select"
                    >
                        {AVAILABLE_MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <input
                        type="password"
                        placeholder="API Key (Optional)"
                        title="Enter OpenRouter API Key to override backend secret"
                        value={apiKey}
                        onChange={(e) => {
                            setApiKey(e.target.value);
                            localStorage.setItem('aab_openrouter_key', e.target.value);
                        }}
                        className="api-key-input"
                    />
                </div>
                <p>Describe what you want to build in natural language</p>
            </div>

            <div className="chat-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        <div className="message-avatar">
                            {msg.role === 'user' ? 'USER' : 'AI'}
                        </div>
                        <div className="message-content">
                            {msg.content.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="message assistant">
                        <div className="message-avatar">AI</div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {generatedFramework && (
                <div className="generated-preview">
                    <h3>Generated Framework: {generatedFramework.name}</h3>
                    <p>{generatedFramework.description}</p>
                    <div className="preview-stats">
                        <span>{generatedFramework.nodes?.length || 0} Nodes</span>
                        <span>{generatedFramework.edges?.length || 0} Edges</span>
                    </div>
                    <button className="use-framework-btn" onClick={useFramework}>
                        Use This Framework
                    </button>
                </div>
            )}

            <div className="chat-input-container">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe the agent architecture you want to build..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                    rows={2}
                />
                <div className="chat-actions">
                    <button onClick={sendMessage} disabled={loading || !input.trim()}>
                        Send Request
                    </button>
                    <button onClick={handleQuickGenerate} disabled={loading} className="quick-gen">
                        Quick Generate
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatAgentBuilder;
