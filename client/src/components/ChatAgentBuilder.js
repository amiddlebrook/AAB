import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatAgentBuilder.css';

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
                messages: messages.filter(m => m.role !== 'system').concat(userMessage)
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
            // Demo mode fallback
            const demoResponse = generateDemoResponse(input);
            setMessages(prev => [...prev, { role: 'assistant', content: demoResponse.content }]);
            if (demoResponse.framework) {
                setGeneratedFramework(demoResponse.framework);
            }
        } finally {
            setLoading(false);
        }
    };

    const generateDemoResponse = (userInput) => {
        const lower = userInput.toLowerCase();

        if (lower.includes('summariz') || lower.includes('summary')) {
            return {
                content: `Great! I'll create a summarization pipeline for you.

**Architecture:**
1. **Input Node** - Receives the text to summarize
2. **Chunker Agent** - Breaks long text into chunks
3. **Summarizer Agent** - Summarizes each chunk
4. **Merger Agent** - Combines chunk summaries into final summary
5. **Output Node** - Returns the final summary

Click "Use This Framework" to add it to your frameworks!`,
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

        if (lower.includes('parallel') || lower.includes('multi') || lower.includes('debate')) {
            return {
                content: `I'll create a parallel multi-agent architecture for you.

**Architecture:**
1. **Input Node** - Receives the query
2. **Parallel Agents** - Multiple agents process simultaneously
3. **Merger** - Combines results using voting/consensus
4. **Output Node** - Returns the final result

Click "Use This Framework" to add it!`,
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

        return {
            content: `I understand you want to build something. Could you give me more details about:

1. **Input type** - What kind of data will flow in?
2. **Processing steps** - What should happen to the data?
3. **Output** - What should the final result look like?

Or try one of these examples:
- "Create a 3-stage summarization pipeline"
- "Build a parallel debate system with 3 agents"
- "Make a code review workflow"`
        };
    };

    const handleQuickGenerate = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${apiUrl}/chat/generate`, {
                description: input || 'A simple 2-agent sequential chain for text processing'
            });
            setGeneratedFramework(response.data.framework);
        } catch (err) {
            // Demo fallback
            const demo = generateDemoResponse(input || 'simple agent chain');
            if (demo.framework) {
                setGeneratedFramework(demo.framework);
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
                <h2>Chat Agent Builder</h2>
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
