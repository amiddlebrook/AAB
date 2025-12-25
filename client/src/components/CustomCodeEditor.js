import React, { useState, useEffect } from 'react';
import './CustomCodeEditor.css';

// Templates for common node patterns
const CODE_TEMPLATES = {
    passthrough: {
        name: 'Passthrough',
        description: 'Simply pass input to output',
        code: `// Passthrough - no transformation
return input;`
    },
    transform: {
        name: 'Transform',
        description: 'Transform the input data',
        code: `// Transform input
const result = input.toUpperCase();
return result;`
    },
    jsonParse: {
        name: 'JSON Parse',
        description: 'Parse JSON input',
        code: `// Parse JSON input
const data = JSON.parse(input);
return JSON.stringify(data, null, 2);`
    },
    split: {
        name: 'Text Splitter',
        description: 'Split text into chunks',
        code: `// Split text into chunks
const chunkSize = 1000;
const chunks = [];
for (let i = 0; i < input.length; i += chunkSize) {
  chunks.push(input.slice(i, i + chunkSize));
}
return JSON.stringify(chunks);`
    },
    merge: {
        name: 'Merger',
        description: 'Merge multiple inputs',
        code: `// Merge multiple inputs (input is array-like)
const parts = input.split('\\n---\\n');
const merged = parts.join('\\n\\n');
return merged;`
    },
    filter: {
        name: 'Filter',
        description: 'Filter content based on condition',
        code: `// Filter content
const lines = input.split('\\n');
const filtered = lines.filter(line => line.trim().length > 0);
return filtered.join('\\n');`
    },
    extract: {
        name: 'Extract',
        description: 'Extract specific information',
        code: `// Extract key information
const match = input.match(/key: (.+)/i);
return match ? match[1] : 'Not found';`
    },
    conditional: {
        name: 'Conditional',
        description: 'Route based on condition',
        code: `// Conditional routing
if (input.length > 100) {
  return { route: 'long', data: input };
}
return { route: 'short', data: input };`
    }
};

function CustomCodeEditor({ framework, onUpdate }) {
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [code, setCode] = useState('');
    const [testInput, setTestInput] = useState('Hello World');
    const [testOutput, setTestOutput] = useState('');
    const [error, setError] = useState(null);
    const [showTemplates, setShowTemplates] = useState(false);

    useEffect(() => {
        if (selectedNodeId && framework) {
            const node = framework.nodes?.find(n => n.id === selectedNodeId);
            if (node) {
                setCode(node.data?.customCode || 'return input;');
            }
        }
    }, [selectedNodeId, framework]);

    const runTest = () => {
        setError(null);
        try {
            // eslint-disable-next-line no-new-func
            const fn = new Function('input', code);
            const result = fn(testInput);
            setTestOutput(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
        } catch (e) {
            setError(e.message);
            setTestOutput('');
        }
    };

    const saveCode = () => {
        if (!selectedNodeId || !framework) return;

        const updatedNodes = framework.nodes.map(node => {
            if (node.id === selectedNodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        customCode: code
                    }
                };
            }
            return node;
        });

        onUpdate(framework.id, { ...framework, nodes: updatedNodes });
    };

    const applyTemplate = (templateKey) => {
        setCode(CODE_TEMPLATES[templateKey].code);
        setShowTemplates(false);
    };

    const nodes = framework?.nodes || [];
    const customizableNodes = nodes.filter(n =>
        n.type === 'processor' || n.type === 'custom' || n.type === 'default'
    );

    return (
        <div className="code-editor">
            <div className="editor-sidebar">
                <h2>💻 Custom Code Editor</h2>
                <p>Write custom logic for processor nodes</p>

                <div className="node-selector">
                    <h3>Select Node</h3>
                    {customizableNodes.length === 0 ? (
                        <p className="no-nodes">
                            No customizable nodes found. Add a Processor or Custom node to your framework.
                        </p>
                    ) : (
                        <div className="node-list">
                            {customizableNodes.map(node => (
                                <button
                                    key={node.id}
                                    className={`node-item ${selectedNodeId === node.id ? 'active' : ''}`}
                                    onClick={() => setSelectedNodeId(node.id)}
                                >
                                    <span className="node-icon">⚙️</span>
                                    <span className="node-label">{node.data?.label || node.id}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="templates-section">
                    <button
                        className="templates-toggle"
                        onClick={() => setShowTemplates(!showTemplates)}
                    >
                        📚 {showTemplates ? 'Hide' : 'Show'} Templates
                    </button>

                    {showTemplates && (
                        <div className="templates-list">
                            {Object.entries(CODE_TEMPLATES).map(([key, template]) => (
                                <button
                                    key={key}
                                    className="template-item"
                                    onClick={() => applyTemplate(key)}
                                >
                                    <strong>{template.name}</strong>
                                    <span>{template.description}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="editor-main">
                {selectedNodeId ? (
                    <>
                        <div className="code-section">
                            <div className="code-header">
                                <h3>Code for: {nodes.find(n => n.id === selectedNodeId)?.data?.label || selectedNodeId}</h3>
                                <button className="save-btn" onClick={saveCode}>💾 Save</button>
                            </div>
                            <textarea
                                className="code-textarea"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Write your JavaScript code here...
                
The 'input' variable contains the data from previous nodes.
Return the processed data."
                                spellCheck={false}
                            />
                        </div>

                        <div className="test-section">
                            <h3>Test Your Code</h3>
                            <div className="test-grid">
                                <div className="test-input">
                                    <label>Test Input:</label>
                                    <textarea
                                        value={testInput}
                                        onChange={(e) => setTestInput(e.target.value)}
                                        placeholder="Enter test input..."
                                    />
                                </div>
                                <div className="test-controls">
                                    <button onClick={runTest}>▶️ Run Test</button>
                                </div>
                                <div className="test-output">
                                    <label>Output:</label>
                                    {error ? (
                                        <div className="error-output">{error}</div>
                                    ) : (
                                        <pre>{testOutput || 'Run a test to see output'}</pre>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="no-selection">
                        <div className="no-selection-content">
                            <span className="big-icon">👈</span>
                            <h3>Select a Node</h3>
                            <p>Choose a processor or custom node from the sidebar to edit its code.</p>
                            {!framework && (
                                <p className="hint">First, select a framework from the Frameworks tab.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CustomCodeEditor;
