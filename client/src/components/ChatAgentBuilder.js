import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatAgentBuilder.css';
import { AVAILABLE_MODELS } from '../constants/models';

// Local model list removed in favor of constants/models.js

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
                model: selectedModel
            });

            const assistantMessage = {
                role: 'assistant',
                content: response.data.content
            };
            setMessages(prev => [...prev, assistantMessage]);

            // Check if a framework was generated
            if (response.data.framework) setGeneratedFramework(response.data.framework);
        } catch (err) {
            console.error('Chat error:', err);
            // Get actual error from backend if available
            let backendError = err.response?.data?.error || err.message || 'Unknown Error';

            // Check for specific OpenRouter Privacy/Data Policy error
            if (JSON.stringify(backendError).includes('data policy') || JSON.stringify(backendError).includes('Free model training')) {
                backendError += '\n\nAction Required: You must enable "Allow using my data for model training" in OpenRouter settings to use free models.\nVisit: https://openrouter.ai/settings/privacy';
            }

            setMessages(prev => [...prev, { role: 'assistant', content: 'Cloudflare AI request failed: ' + backendError }]);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickGenerate = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${apiUrl}/chat/generate`, {
                description: input || 'A simple 2-agent sequential chain for text processing',
                model: selectedModel
            });
            setGeneratedFramework(response.data.framework);
        } catch (err) {
            const backendError = err.response?.data?.error || err.message || 'AI unavailable';
            setMessages(prev => [...prev, { role: 'assistant', content: 'Framework generation failed: ' + backendError }]);
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
