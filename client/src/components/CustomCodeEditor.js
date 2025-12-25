import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
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
    llmPrompt: {
        name: 'LLM Prompt Builder',
        description: 'Build a structured prompt',
        code: `// Build structured LLM prompt
const systemPrompt = "You are a helpful assistant.";
const userContent = input;

return JSON.stringify({
  system: systemPrompt,
  user: userContent,
  format: "markdown"
});`
    },
    router: {
        name: 'Router',
        description: 'Route based on content analysis',
        code: `// Route based on input content
const lower = input.toLowerCase();

if (lower.includes('urgent') || lower.includes('critical')) {
  return { route: 'high_priority', data: input };
}
if (lower.includes('question') || lower.includes('?')) {
  return { route: 'qa', data: input };
}
return { route: 'default', data: input };`
    },
    extract: {
        name: 'Data Extractor',
        description: 'Extract structured data',
        code: `// Extract structured data from text
const patterns = {
  email: /[\\w.-]+@[\\w.-]+\\.\\w+/g,
  phone: /\\d{3}[-.]?\\d{3}[-.]?\\d{4}/g,
  url: /https?:\\/\\/[^\\s]+/g
};

const extracted = {};
for (const [key, regex] of Object.entries(patterns)) {
  const matches = input.match(regex);
  if (matches) extracted[key] = matches;
}
return JSON.stringify(extracted, null, 2);`
    }
};

// Custom completions for the code editor
const CUSTOM_COMPLETIONS = [
    { label: 'input', kind: 'Variable', detail: 'The input data from previous nodes' },
    { label: 'JSON.parse(input)', kind: 'Function', detail: 'Parse JSON input' },
    { label: 'JSON.stringify(data, null, 2)', kind: 'Function', detail: 'Format as JSON' },
    { label: 'return', kind: 'Keyword', detail: 'Return processed data' },
    { label: 'input.split("\\n")', kind: 'Method', detail: 'Split by newlines' },
    { label: 'input.toLowerCase()', kind: 'Method', detail: 'Convert to lowercase' },
    { label: 'input.match(/pattern/g)', kind: 'Method', detail: 'Match regex pattern' },
];

function CustomCodeEditor({ framework, onUpdate, apiUrl }) {
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [code, setCode] = useState('');
    const [testInput, setTestInput] = useState('Hello World');
    const [testOutput, setTestOutput] = useState('');
    const [error, setError] = useState(null);
    const [showTemplates, setShowTemplates] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [saved, setSaved] = useState(true);
    const editorRef = useRef(null);

    useEffect(() => {
        if (selectedNodeId && framework) {
            const node = framework.nodes?.find(n => n.id === selectedNodeId);
            if (node) {
                setCode(node.data?.customCode || 'return input;');
                setSaved(true);
            }
        }
    }, [selectedNodeId, framework]);

    const handleEditorMount = (editor, monaco) => {
        editorRef.current = editor;

        // Register custom completions
        monaco.languages.registerCompletionItemProvider('javascript', {
            provideCompletionItems: () => ({
                suggestions: CUSTOM_COMPLETIONS.map(item => ({
                    label: item.label,
                    kind: monaco.languages.CompletionItemKind[item.kind],
                    insertText: item.label,
                    detail: item.detail,
                }))
            })
        });

        // Add keyboard shortcut for save
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            saveCode();
        });

        // Add keyboard shortcut for run test
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            runTest();
        });
    };

    const runTest = async () => {
        setError(null);
        setIsRunning(true);
        try {
            // eslint-disable-next-line no-new-func
            const fn = new Function('input', code);
            const result = fn(testInput);
            setTestOutput(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
        } catch (e) {
            setError(e.message);
            setTestOutput('');
        } finally {
            setIsRunning(false);
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
        setSaved(true);
    };

    const handleCodeChange = (value) => {
        setCode(value);
        setSaved(false);
    };

    const applyTemplate = (templateKey) => {
        setCode(CODE_TEMPLATES[templateKey].code);
        setSaved(false);
        setShowTemplates(false);
    };

    const formatCode = () => {
        if (editorRef.current) {
            editorRef.current.getAction('editor.action.formatDocument').run();
        }
    };

    const nodes = framework?.nodes || [];
    const customizableNodes = nodes.filter(n =>
        n.type === 'processor' || n.type === 'custom' || n.type === 'default' || n.type === 'agent'
    );

    return (
        <div className="code-editor">
            <div className="editor-sidebar">
                <h2>💻 Code Editor</h2>
                <p>Professional JavaScript editing</p>

                <div className="node-selector">
                    <h3>📌 Select Node</h3>
                    {customizableNodes.length === 0 ? (
                        <p className="no-nodes">
                            No customizable nodes found. Add a Processor or Agent node to your framework.
                        </p>
                    ) : (
                        <div className="node-list">
                            {customizableNodes.map(node => (
                                <button
                                    key={node.id}
                                    className={`node-item ${selectedNodeId === node.id ? 'active' : ''}`}
                                    onClick={() => setSelectedNodeId(node.id)}
                                >
                                    <span className="node-icon">
                                        {node.type === 'agent' ? '🤖' : '⚙️'}
                                    </span>
                                    <span className="node-label">{node.data?.label || node.id}</span>
                                    <span className="node-type">{node.type}</span>
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

                <div className="shortcuts-section">
                    <h3>⌨️ Shortcuts</h3>
                    <div className="shortcut-list">
                        <div className="shortcut"><kbd>Ctrl+S</kbd> Save</div>
                        <div className="shortcut"><kbd>Ctrl+Enter</kbd> Run Test</div>
                        <div className="shortcut"><kbd>Ctrl+Z</kbd> Undo</div>
                        <div className="shortcut"><kbd>Ctrl+Space</kbd> Autocomplete</div>
                    </div>
                </div>
            </div>

            <div className="editor-main">
                {selectedNodeId ? (
                    <>
                        <div className="code-section">
                            <div className="code-header">
                                <div className="header-left">
                                    <h3>
                                        {nodes.find(n => n.id === selectedNodeId)?.data?.label || selectedNodeId}
                                        {!saved && <span className="unsaved-indicator">●</span>}
                                    </h3>
                                </div>
                                <div className="header-actions">
                                    <button className="action-btn" onClick={formatCode} title="Format Code">
                                        🎨 Format
                                    </button>
                                    <button
                                        className={`action-btn save-btn ${saved ? 'saved' : ''}`}
                                        onClick={saveCode}
                                    >
                                        {saved ? '✓ Saved' : '💾 Save'}
                                    </button>
                                </div>
                            </div>
                            <div className="monaco-wrapper">
                                <Editor
                                    height="100%"
                                    defaultLanguage="javascript"
                                    value={code}
                                    onChange={handleCodeChange}
                                    onMount={handleEditorMount}
                                    theme="vs-dark"
                                    options={{
                                        minimap: { enabled: true, scale: 0.8 },
                                        fontSize: 14,
                                        lineNumbers: 'on',
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        tabSize: 2,
                                        wordWrap: 'on',
                                        suggestOnTriggerCharacters: true,
                                        quickSuggestions: true,
                                        folding: true,
                                        bracketPairColorization: { enabled: true },
                                        renderLineHighlight: 'all',
                                        cursorBlinking: 'smooth',
                                        smoothScrolling: true,
                                        padding: { top: 10 }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="test-section">
                            <div className="test-header">
                                <h3>🧪 Test Console</h3>
                                <button
                                    className={`run-btn ${isRunning ? 'running' : ''}`}
                                    onClick={runTest}
                                    disabled={isRunning}
                                >
                                    {isRunning ? '⏳ Running...' : '▶️ Run Test'}
                                </button>
                            </div>
                            <div className="test-grid">
                                <div className="test-input">
                                    <label>Input:</label>
                                    <textarea
                                        value={testInput}
                                        onChange={(e) => setTestInput(e.target.value)}
                                        placeholder="Enter test input..."
                                    />
                                </div>
                                <div className="test-output">
                                    <label>Output:</label>
                                    {error ? (
                                        <div className="error-output">
                                            <span className="error-icon">❌</span>
                                            {error}
                                        </div>
                                    ) : (
                                        <pre className={testOutput ? 'has-output' : ''}>
                                            {testOutput || 'Run a test to see output'}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="no-selection">
                        <div className="no-selection-content">
                            <span className="big-icon">📝</span>
                            <h3>Select a Node to Edit</h3>
                            <p>Choose a processor or agent node from the sidebar to customize its behavior with JavaScript.</p>
                            {!framework && (
                                <p className="hint">First, select a framework from the Frameworks tab.</p>
                            )}
                            <div className="features-preview">
                                <h4>Editor Features:</h4>
                                <ul>
                                    <li>✨ Syntax highlighting</li>
                                    <li>🔍 IntelliSense autocomplete</li>
                                    <li>🗺️ Code minimap</li>
                                    <li>🎨 Code formatting</li>
                                    <li>⌨️ Keyboard shortcuts</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CustomCodeEditor;
