import React, { useState, useRef } from 'react';
import './ImportExport.css';

// LangFlow node type mapping to AAB node types
const LANGFLOW_TO_AAB_TYPE = {
    'ChatInput': 'input',
    'ChatOutput': 'output',
    'OpenAIModel': 'agent',
    'AnthropicModel': 'agent',
    'GoogleGenerativeAIModel': 'agent',
    'OllamaModel': 'agent',
    'ChatOpenAI': 'agent',
    'ChatAnthropic': 'agent',
    'LLMChain': 'agent',
    'TextInput': 'input',
    'TextOutput': 'output',
    'PromptTemplate': 'processor',
    'CustomComponent': 'processor',
    'PythonFunction': 'processor',
    'Chroma': 'rag',
    'FAISS': 'rag',
    'Pinecone': 'rag',
    'Weaviate': 'rag',
    'VectorStoreRetriever': 'rag',
    'ConditionalRouter': 'router',
    'FlowTool': 'tool',
    'APIRequest': 'tool',
    'WebhookComponent': 'tool',
    'Memory': 'memory',
    'ConversationBufferMemory': 'memory',
};

// AAB node type to LangFlow mapping
const AAB_TO_LANGFLOW_TYPE = {
    'input': 'ChatInput',
    'output': 'ChatOutput',
    'agent': 'OpenAIModel',
    'processor': 'CustomComponent',
    'rag': 'VectorStoreRetriever',
    'router': 'ConditionalRouter',
    'tool': 'APIRequest',
    'memory': 'Memory',
    'parallel': 'CustomComponent',
    'merge': 'CustomComponent',
};

// Framework templates
const TEMPLATES = [
    {
        id: 'simple-chain',
        name: 'Simple Chain',
        description: 'Basic input → agent → output chain',
        icon: '🔗',
        nodes: [
            { id: 'input-1', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
            { id: 'agent-1', type: 'agent', position: { x: 300, y: 200 }, data: { label: 'Agent', config: { model: 'anthropic/claude-3.5-sonnet', temperature: 0.7 } } },
            { id: 'output-1', type: 'output', position: { x: 500, y: 200 }, data: { label: 'Output' } }
        ],
        edges: [
            { id: 'e1', source: 'input-1', target: 'agent-1', type: 'smoothstep' },
            { id: 'e2', source: 'agent-1', target: 'output-1', type: 'smoothstep' }
        ]
    },
    {
        id: 'rag-pipeline',
        name: 'RAG Pipeline',
        description: 'Retrieval-augmented generation with vector search',
        icon: '📚',
        nodes: [
            { id: 'input-1', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Query' } },
            { id: 'rag-1', type: 'rag', position: { x: 280, y: 200 }, data: { label: 'Vector Search', config: { topK: 3 } } },
            { id: 'agent-1', type: 'agent', position: { x: 460, y: 200 }, data: { label: 'Generator', config: { model: 'anthropic/claude-3.5-sonnet', temperature: 0.5 } } },
            { id: 'output-1', type: 'output', position: { x: 640, y: 200 }, data: { label: 'Response' } }
        ],
        edges: [
            { id: 'e1', source: 'input-1', target: 'rag-1', type: 'smoothstep' },
            { id: 'e2', source: 'rag-1', target: 'agent-1', type: 'smoothstep' },
            { id: 'e3', source: 'agent-1', target: 'output-1', type: 'smoothstep' }
        ]
    },
    {
        id: 'parallel-agents',
        name: 'Parallel Agents',
        description: 'Multiple agents process simultaneously then merge',
        icon: '⚡',
        nodes: [
            { id: 'input-1', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
            { id: 'parallel-1', type: 'parallel', position: { x: 250, y: 200 }, data: { label: 'Split' } },
            { id: 'agent-1', type: 'agent', position: { x: 400, y: 100 }, data: { label: 'Agent A', config: { model: 'anthropic/claude-3.5-sonnet' } } },
            { id: 'agent-2', type: 'agent', position: { x: 400, y: 200 }, data: { label: 'Agent B', config: { model: 'openai/gpt-4o' } } },
            { id: 'agent-3', type: 'agent', position: { x: 400, y: 300 }, data: { label: 'Agent C', config: { model: 'google/gemini-flash-1.5' } } },
            { id: 'merge-1', type: 'merge', position: { x: 550, y: 200 }, data: { label: 'Merge' } },
            { id: 'output-1', type: 'output', position: { x: 700, y: 200 }, data: { label: 'Output' } }
        ],
        edges: [
            { id: 'e1', source: 'input-1', target: 'parallel-1' },
            { id: 'e2', source: 'parallel-1', target: 'agent-1' },
            { id: 'e3', source: 'parallel-1', target: 'agent-2' },
            { id: 'e4', source: 'parallel-1', target: 'agent-3' },
            { id: 'e5', source: 'agent-1', target: 'merge-1' },
            { id: 'e6', source: 'agent-2', target: 'merge-1' },
            { id: 'e7', source: 'agent-3', target: 'merge-1' },
            { id: 'e8', source: 'merge-1', target: 'output-1' }
        ]
    },
    {
        id: 'router-flow',
        name: 'Smart Router',
        description: 'Routes to different agents based on input classification',
        icon: '🔀',
        nodes: [
            { id: 'input-1', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
            { id: 'router-1', type: 'router', position: { x: 250, y: 200 }, data: { label: 'Classifier' } },
            { id: 'agent-1', type: 'agent', position: { x: 420, y: 100 }, data: { label: 'Technical', config: { model: 'anthropic/claude-3.5-sonnet' } } },
            { id: 'agent-2', type: 'agent', position: { x: 420, y: 300 }, data: { label: 'General', config: { model: 'openai/gpt-4o-mini' } } },
            { id: 'merge-1', type: 'merge', position: { x: 580, y: 200 }, data: { label: 'Merge' } },
            { id: 'output-1', type: 'output', position: { x: 720, y: 200 }, data: { label: 'Output' } }
        ],
        edges: [
            { id: 'e1', source: 'input-1', target: 'router-1' },
            { id: 'e2', source: 'router-1', target: 'agent-1', label: 'technical' },
            { id: 'e3', source: 'router-1', target: 'agent-2', label: 'general' },
            { id: 'e4', source: 'agent-1', target: 'merge-1' },
            { id: 'e5', source: 'agent-2', target: 'merge-1' },
            { id: 'e6', source: 'merge-1', target: 'output-1' }
        ]
    },
    {
        id: 'tool-agent',
        name: 'Tool-Augmented Agent',
        description: 'Agent with access to external tools and APIs',
        icon: '🔧',
        nodes: [
            { id: 'input-1', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
            { id: 'agent-1', type: 'agent', position: { x: 280, y: 200 }, data: { label: 'Planner', config: { model: 'anthropic/claude-3.5-sonnet' } } },
            { id: 'tool-1', type: 'tool', position: { x: 460, y: 100 }, data: { label: 'Web Search' } },
            { id: 'tool-2', type: 'tool', position: { x: 460, y: 300 }, data: { label: 'Calculator' } },
            { id: 'agent-2', type: 'agent', position: { x: 640, y: 200 }, data: { label: 'Synthesizer', config: { model: 'anthropic/claude-3.5-sonnet' } } },
            { id: 'output-1', type: 'output', position: { x: 820, y: 200 }, data: { label: 'Output' } }
        ],
        edges: [
            { id: 'e1', source: 'input-1', target: 'agent-1' },
            { id: 'e2', source: 'agent-1', target: 'tool-1' },
            { id: 'e3', source: 'agent-1', target: 'tool-2' },
            { id: 'e4', source: 'tool-1', target: 'agent-2' },
            { id: 'e5', source: 'tool-2', target: 'agent-2' },
            { id: 'e6', source: 'agent-2', target: 'output-1' }
        ]
    }
];

function ImportExport({ frameworks, onImport, onExport }) {
    const [activeTab, setActiveTab] = useState('templates');
    const [importText, setImportText] = useState('');
    const [exportFormat, setExportFormat] = useState('aab');
    const [selectedFramework, setSelectedFramework] = useState(null);
    const [gistUrl, setGistUrl] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const fileInputRef = useRef(null);

    // Convert LangFlow format to AAB format
    const convertFromLangFlow = (langflowData) => {
        try {
            const nodes = [];
            const edges = [];

            // Handle LangFlow structure
            const flowData = langflowData.data || langflowData;
            const lfNodes = flowData.nodes || [];
            const lfEdges = flowData.edges || [];

            // Convert nodes
            lfNodes.forEach((lfNode, index) => {
                const nodeType = lfNode.data?.type || lfNode.type || 'processor';
                const aabType = LANGFLOW_TO_AAB_TYPE[nodeType] || 'processor';

                nodes.push({
                    id: lfNode.id || `node-${index}`,
                    type: aabType,
                    position: lfNode.position || { x: 100 + index * 180, y: 200 },
                    data: {
                        label: lfNode.data?.node?.display_name || lfNode.data?.name || nodeType,
                        config: extractConfig(lfNode, aabType)
                    }
                });
            });

            // Convert edges
            lfEdges.forEach((lfEdge, index) => {
                edges.push({
                    id: lfEdge.id || `edge-${index}`,
                    source: lfEdge.source,
                    target: lfEdge.target,
                    type: 'smoothstep'
                });
            });

            return { nodes, edges };
        } catch (error) {
            throw new Error(`Failed to parse LangFlow format: ${error.message}`);
        }
    };

    // Extract config from LangFlow node
    const extractConfig = (lfNode, aabType) => {
        const config = {};

        if (aabType === 'agent') {
            const template = lfNode.data?.node?.template || {};
            config.model = template.model_name?.value || 'anthropic/claude-3.5-sonnet';
            config.temperature = template.temperature?.value || 0.7;
        }

        return config;
    };

    // Convert AAB format to LangFlow format
    const convertToLangFlow = (framework) => {
        // eslint-disable-next-line no-unused-vars
        const nodes = framework.nodes.map((node, index) => ({
            id: node.id,
            type: AAB_TO_LANGFLOW_TYPE[node.type] || 'CustomComponent',
            position: node.position,
            data: {
                type: AAB_TO_LANGFLOW_TYPE[node.type] || 'CustomComponent',
                node: {
                    display_name: node.data?.label || node.id,
                    template: node.data?.config || {}
                }
            }
        }));

        // eslint-disable-next-line no-unused-vars
        const edges = framework.edges.map((edge, index) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: null,
            targetHandle: null
        }));

        return {
            name: framework.name,
            description: framework.description,
            data: { nodes, edges }
        };
    };

    // Handle file import
    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const data = JSON.parse(content);

                // Detect format
                let framework;
                if (data.data?.nodes || data.nodes?.[0]?.data?.node) {
                    // LangFlow format
                    const converted = convertFromLangFlow(data);
                    framework = {
                        name: data.name || file.name.replace('.json', ''),
                        description: data.description || 'Imported from LangFlow',
                        ...converted,
                        metrics: { avgLatency: 0, successRate: 0, totalRuns: 0 }
                    };
                    setStatus({ type: 'success', message: 'Successfully imported from LangFlow format!' });
                } else {
                    // AAB format
                    framework = data;
                    setStatus({ type: 'success', message: 'Successfully imported AAB framework!' });
                }

                onImport(framework);
            } catch (error) {
                setStatus({ type: 'error', message: `Import failed: ${error.message}` });
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // Handle text import
    const handleTextImport = () => {
        try {
            const data = JSON.parse(importText);
            let framework;

            if (data.data?.nodes || data.nodes?.[0]?.data?.node) {
                const converted = convertFromLangFlow(data);
                framework = {
                    name: data.name || 'Imported Flow',
                    description: data.description || 'Imported from LangFlow',
                    ...converted,
                    metrics: { avgLatency: 0, successRate: 0, totalRuns: 0 }
                };
                setStatus({ type: 'success', message: 'Successfully imported from LangFlow format!' });
            } else {
                framework = data;
                setStatus({ type: 'success', message: 'Successfully imported AAB framework!' });
            }

            onImport(framework);
            setImportText('');
        } catch (error) {
            setStatus({ type: 'error', message: `Import failed: ${error.message}` });
        }
    };

    // Handle export
    const handleExport = (framework) => {
        let data;
        let filename;

        if (exportFormat === 'langflow') {
            data = convertToLangFlow(framework);
            filename = `${framework.name.replace(/\s+/g, '_')}_langflow.json`;
        } else {
            data = framework;
            filename = `${framework.name.replace(/\s+/g, '_')}.json`;
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStatus({ type: 'success', message: `Exported to ${filename}` });
    };

    // Handle GitHub Gist import
    const handleGistImport = async () => {
        try {
            const gistId = gistUrl.split('/').pop();
            const response = await fetch(`https://api.github.com/gists/${gistId}`);

            if (!response.ok) throw new Error('Failed to fetch Gist');

            const gist = await response.json();
            const file = Object.values(gist.files)[0];
            const data = JSON.parse(file.content);

            let framework;
            if (data.data?.nodes) {
                const converted = convertFromLangFlow(data);
                framework = { ...converted, name: gist.description || 'Gist Import', metrics: { avgLatency: 0, successRate: 0, totalRuns: 0 } };
            } else {
                framework = data;
            }

            onImport(framework);
            setGistUrl('');
            setStatus({ type: 'success', message: 'Successfully imported from GitHub Gist!' });
        } catch (error) {
            setStatus({ type: 'error', message: `Gist import failed: ${error.message}` });
        }
    };

    // Use template
    const applyTemplate = (template) => {
        const framework = {
            id: `template-${Date.now()}`,
            name: template.name,
            description: template.description,
            nodes: JSON.parse(JSON.stringify(template.nodes)),
            edges: JSON.parse(JSON.stringify(template.edges)),
            metrics: { avgLatency: 0, successRate: 0, totalRuns: 0 }
        };
        onImport(framework);
        setStatus({ type: 'success', message: `Created framework from "${template.name}" template!` });
    };

    return (
        <div className="import-export">
            <div className="ie-header">
                <h2>📦 Import / Export</h2>
                <p>Manage frameworks, use templates, and integrate with LangFlow</p>
            </div>

            <div className="ie-tabs">
                <button
                    className={activeTab === 'templates' ? 'active' : ''}
                    onClick={() => setActiveTab('templates')}
                >
                    📋 Templates
                </button>
                <button
                    className={activeTab === 'import' ? 'active' : ''}
                    onClick={() => setActiveTab('import')}
                >
                    📥 Import
                </button>
                <button
                    className={activeTab === 'export' ? 'active' : ''}
                    onClick={() => setActiveTab('export')}
                >
                    📤 Export
                </button>
                <button
                    className={activeTab === 'gist' ? 'active' : ''}
                    onClick={() => setActiveTab('gist')}
                >
                    🐙 GitHub Gist
                </button>
            </div>

            {status.message && (
                <div className={`status-message ${status.type}`}>
                    {status.type === 'success' ? '✅' : '❌'} {status.message}
                </div>
            )}

            <div className="ie-content">
                {activeTab === 'templates' && (
                    <div className="templates-grid">
                        {TEMPLATES.map(template => (
                            <div key={template.id} className="template-card">
                                <div className="template-icon">{template.icon}</div>
                                <h3>{template.name}</h3>
                                <p>{template.description}</p>
                                <div className="template-stats">
                                    <span>{template.nodes.length} nodes</span>
                                    <span>{template.edges.length} edges</span>
                                </div>
                                <button onClick={() => applyTemplate(template)}>
                                    Use Template
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'import' && (
                    <div className="import-section">
                        <div className="import-option">
                            <h3>📁 Import from File</h3>
                            <p>Upload a JSON file (AAB or LangFlow format)</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileImport}
                                style={{ display: 'none' }}
                            />
                            <button onClick={() => fileInputRef.current?.click()}>
                                Choose File
                            </button>
                        </div>

                        <div className="import-divider">or</div>

                        <div className="import-option">
                            <h3>📝 Paste JSON</h3>
                            <p>Paste AAB or LangFlow JSON directly</p>
                            <textarea
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                placeholder='{"name": "My Flow", "nodes": [...], "edges": [...]}'
                                rows={8}
                            />
                            <button onClick={handleTextImport} disabled={!importText.trim()}>
                                Import JSON
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'export' && (
                    <div className="export-section">
                        <div className="export-format">
                            <h3>Export Format</h3>
                            <div className="format-options">
                                <label className={exportFormat === 'aab' ? 'active' : ''}>
                                    <input
                                        type="radio"
                                        name="format"
                                        value="aab"
                                        checked={exportFormat === 'aab'}
                                        onChange={(e) => setExportFormat(e.target.value)}
                                    />
                                    <span className="format-icon">🔷</span>
                                    <span className="format-name">AAB Native</span>
                                </label>
                                <label className={exportFormat === 'langflow' ? 'active' : ''}>
                                    <input
                                        type="radio"
                                        name="format"
                                        value="langflow"
                                        checked={exportFormat === 'langflow'}
                                        onChange={(e) => setExportFormat(e.target.value)}
                                    />
                                    <span className="format-icon">🌊</span>
                                    <span className="format-name">LangFlow</span>
                                </label>
                            </div>
                        </div>

                        <div className="frameworks-export-list">
                            <h3>Select Framework to Export</h3>
                            {frameworks.length === 0 ? (
                                <p className="no-frameworks">No frameworks to export</p>
                            ) : (
                                <div className="export-framework-grid">
                                    {frameworks.map(framework => (
                                        <div
                                            key={framework.id}
                                            className={`export-framework-card ${selectedFramework?.id === framework.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedFramework(framework)}
                                        >
                                            <h4>{framework.name}</h4>
                                            <span>{framework.nodes?.length || 0} nodes</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button
                                className="export-btn"
                                onClick={() => selectedFramework && handleExport(selectedFramework)}
                                disabled={!selectedFramework}
                            >
                                📤 Export {exportFormat === 'langflow' ? 'to LangFlow' : 'AAB Native'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'gist' && (
                    <div className="gist-section">
                        <div className="gist-import">
                            <h3>🐙 Import from GitHub Gist</h3>
                            <p>Paste a public Gist URL containing a framework JSON</p>
                            <input
                                type="text"
                                value={gistUrl}
                                onChange={(e) => setGistUrl(e.target.value)}
                                placeholder="https://gist.github.com/username/gist-id"
                            />
                            <button onClick={handleGistImport} disabled={!gistUrl.trim()}>
                                Import from Gist
                            </button>
                        </div>

                        <div className="gist-info">
                            <h4>💡 How to share frameworks via Gist:</h4>
                            <ol>
                                <li>Export your framework as JSON</li>
                                <li>Create a new Gist at <a href="https://gist.github.com" target="_blank" rel="noopener noreferrer">gist.github.com</a></li>
                                <li>Paste the JSON and create the Gist</li>
                                <li>Share the Gist URL with others</li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ImportExport;
