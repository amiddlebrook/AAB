import React, { useCallback, useState, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './FrameworkEditor.css';

// Node type definitions with icons and colors
const NODE_TYPES_CONFIG = {
  input: {
    icon: '📥',
    color: '#238636',
    label: 'Input',
    description: 'Entry point for data'
  },
  output: {
    icon: '📤',
    color: '#da3633',
    label: 'Output',
    description: 'Final output node'
  },
  agent: {
    icon: '🤖',
    color: '#8b5cf6',
    label: 'Agent',
    description: 'LLM agent node',
    hasConfig: true
  },
  processor: {
    icon: '⚙️',
    color: '#f97316',
    label: 'Processor',
    description: 'Custom code processor',
    hasCode: true
  },
  rag: {
    icon: '📚',
    color: '#0ea5e9',
    label: 'RAG',
    description: 'Retrieval Augmented Generation'
  },
  router: {
    icon: '🔀',
    color: '#ec4899',
    label: 'Router',
    description: 'Conditional routing'
  },
  tool: {
    icon: '🔧',
    color: '#eab308',
    label: 'Tool',
    description: 'External API/function call'
  },
  memory: {
    icon: '🧠',
    color: '#14b8a6',
    label: 'Memory',
    description: 'Persistent state storage'
  },
  parallel: {
    icon: '⚡',
    color: '#6366f1',
    label: 'Parallel',
    description: 'Parallel execution splitter'
  },
  merge: {
    icon: '🔗',
    color: '#a855f7',
    label: 'Merge',
    description: 'Combine parallel outputs'
  },
};

// OpenRouter FREE models only
const MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', provider: 'Meta' },
  { id: 'google/gemini-2.5-pro-exp-03-25:free', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek Chat V3', provider: 'DeepSeek' },
  { id: 'deepseek/deepseek-r1-zero:free', name: 'DeepSeek R1 Zero', provider: 'DeepSeek' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 24B', provider: 'Mistral' },
  { id: 'nvidia/llama-3.1-nemotron-nano-8b-v1:free', name: 'Nemotron Nano 8B', provider: 'NVIDIA' },
  { id: 'qwen/qwen3-coder-480b-a35b:free', name: 'Qwen3 Coder 480B', provider: 'Qwen' },
];

// Custom Node Component
function CustomNode({ data, type }) {
  const config = NODE_TYPES_CONFIG[type] || NODE_TYPES_CONFIG.processor;

  return (
    <div className={`custom-node node-${type}`} style={{ '--node-color': config.color }}>
      <Handle type="target" position={Position.Left} />
      <div className="node-header">
        <span className="node-icon">{config.icon}</span>
        <span className="node-label">{data.label}</span>
      </div>
      {data.config?.model && (
        <div className="node-model">
          {MODELS.find(m => m.id === data.config.model)?.name || data.config.model}
        </div>
      )}
      {data.config?.temperature !== undefined && (
        <div className="node-temp">T: {data.config.temperature}</div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// Create node types for ReactFlow
const createNodeTypes = () => {
  const types = {};
  Object.keys(NODE_TYPES_CONFIG).forEach(type => {
    types[type] = (props) => <CustomNode {...props} type={type} />;
  });
  return types;
};

function FrameworkEditor({ framework, onUpdate }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    framework.nodes.map(node => ({
      ...node,
      type: node.type || 'processor',
    }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(framework.edges);
  const [frameworkName, setFrameworkName] = useState(framework.name);
  const [frameworkDescription, setFrameworkDescription] = useState(framework.description);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [saved, setSaved] = useState(true);

  const nodeTypes = useMemo(() => createNodeTypes(), []);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#58a6ff' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#58a6ff' }
      }, eds));
      setSaved(false);
    },
    [setEdges]
  );

  const addNode = (type) => {
    const config = NODE_TYPES_CONFIG[type];
    const nodeConfig = type === 'agent' ? {
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      temperature: 0.7,
      maxTokens: 2048
    } : {};

    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: `${config.label} ${nodes.filter(n => n.type === type).length + 1}`,
        config: nodeConfig
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSaved(false);
  };

  const deleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setShowNodeEditor(false);
    setSelectedNode(null);
    setSaved(false);
  };

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
    setShowNodeEditor(true);
  };

  const onPaneClick = () => {
    setShowNodeEditor(false);
    setSelectedNode(null);
  };

  const updateNode = (nodeId, updates) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...updates } };
        }
        return node;
      })
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode(prev => ({ ...prev, data: { ...prev.data, ...updates } }));
    }
    setSaved(false);
  };

  const saveFramework = () => {
    onUpdate(framework.id, {
      name: frameworkName,
      description: frameworkDescription,
      nodes,
      edges,
    });
    setSaved(true);
  };

  const duplicateNode = (node) => {
    const newNode = {
      ...node,
      id: `${node.type}-${Date.now()}`,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      data: { ...node.data, label: `${node.data.label} (copy)` }
    };
    setNodes((nds) => [...nds, newNode]);
    setSaved(false);
  };

  return (
    <div className="framework-editor">
      <div className="editor-sidebar">
        <div className="sidebar-header">
          <h2>🔧 Visual Editor</h2>
          <span className={`save-status ${saved ? 'saved' : 'unsaved'}`}>
            {saved ? '✓ Saved' : '● Unsaved'}
          </span>
        </div>

        <div className="editor-section">
          <label>Framework Name</label>
          <input
            type="text"
            value={frameworkName}
            onChange={(e) => { setFrameworkName(e.target.value); setSaved(false); }}
            placeholder="Framework name"
          />
        </div>

        <div className="editor-section">
          <label>Description</label>
          <textarea
            value={frameworkDescription}
            onChange={(e) => { setFrameworkDescription(e.target.value); setSaved(false); }}
            placeholder="What does this framework do?"
            rows={2}
          />
        </div>

        <div className="editor-section">
          <label>Add Nodes</label>
          <div className="node-palette">
            {Object.entries(NODE_TYPES_CONFIG).map(([type, config]) => (
              <button
                key={type}
                className="palette-node"
                onClick={() => addNode(type)}
                title={config.description}
                style={{ '--node-color': config.color }}
              >
                <span className="node-icon">{config.icon}</span>
                <span className="node-name">{config.label}</span>
              </button>
            ))}
          </div>
        </div>

        {showNodeEditor && selectedNode && (
          <div className="editor-section node-editor">
            <div className="node-editor-header">
              <h3>
                <span>{NODE_TYPES_CONFIG[selectedNode.type]?.icon || '⚙️'}</span>
                Edit Node
              </h3>
              <button className="close-btn" onClick={() => setShowNodeEditor(false)}>×</button>
            </div>

            <label>Label</label>
            <input
              type="text"
              value={selectedNode.data.label}
              onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
            />

            {selectedNode.type === 'agent' && selectedNode.data.config && (
              <>
                <label>Model</label>
                <select
                  value={selectedNode.data.config.model || 'meta-llama/llama-3.3-70b-instruct:free'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, model: e.target.value }
                  })}
                >
                  {MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </option>
                  ))}
                </select>

                <label>Temperature: {selectedNode.data.config.temperature || 0.7}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedNode.data.config.temperature || 0.7}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, temperature: parseFloat(e.target.value) }
                  })}
                />

                <label>System Prompt</label>
                <textarea
                  value={selectedNode.data.config.systemPrompt || ''}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, systemPrompt: e.target.value }
                  })}
                  placeholder="Optional system prompt..."
                  rows={3}
                />
              </>
            )}

            {selectedNode.type === 'tool' && (
              <>
                <label>Tool Type</label>
                <select
                  value={selectedNode.data.config?.toolType || 'http'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, toolType: e.target.value }
                  })}
                >
                  <option value="http">HTTP Request</option>
                  <option value="calculator">Calculator</option>
                  <option value="search">Web Search</option>
                  <option value="code">Code Execution</option>
                  <option value="database">Database Query</option>
                </select>

                <label>API Endpoint / Query</label>
                <input
                  type="text"
                  value={selectedNode.data.config?.endpoint || ''}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, endpoint: e.target.value }
                  })}
                  placeholder="https://api.example.com/..."
                />

                <label>HTTP Method</label>
                <select
                  value={selectedNode.data.config?.method || 'GET'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, method: e.target.value }
                  })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>

                <label>Headers (JSON)</label>
                <textarea
                  value={selectedNode.data.config?.headers || '{}'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, headers: e.target.value }
                  })}
                  placeholder='{"Authorization": "Bearer ..."}'
                  rows={2}
                />
              </>
            )}

            {selectedNode.type === 'rag' && (
              <>
                <label>Vector Store</label>
                <select
                  value={selectedNode.data.config?.vectorStore || 'memory'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, vectorStore: e.target.value }
                  })}
                >
                  <option value="memory">In-Memory (D1)</option>
                  <option value="pinecone">Pinecone</option>
                  <option value="weaviate">Weaviate</option>
                  <option value="qdrant">Qdrant</option>
                  <option value="chroma">ChromaDB</option>
                </select>

                <label>Embedding Model</label>
                <select
                  value={selectedNode.data.config?.embeddingModel || 'text-embedding-3-small'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, embeddingModel: e.target.value }
                  })}
                >
                  <option value="text-embedding-3-small">OpenAI Small (1536)</option>
                  <option value="text-embedding-3-large">OpenAI Large (3072)</option>
                  <option value="bge-large-en">BGE Large</option>
                  <option value="cf-bge-small-en">Cloudflare BGE Small</option>
                </select>

                <label>Top K Results: {selectedNode.data.config?.topK || 3}</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={selectedNode.data.config?.topK || 3}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, topK: parseInt(e.target.value) }
                  })}
                />

                <label>Similarity Threshold: {selectedNode.data.config?.threshold || 0.7}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedNode.data.config?.threshold || 0.7}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, threshold: parseFloat(e.target.value) }
                  })}
                />

                <label>Chunk Size</label>
                <input
                  type="number"
                  value={selectedNode.data.config?.chunkSize || 512}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, chunkSize: parseInt(e.target.value) }
                  })}
                  placeholder="512"
                />
              </>
            )}

            {selectedNode.type === 'router' && (
              <>
                <label>Routing Strategy</label>
                <select
                  value={selectedNode.data.config?.strategy || 'llm'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, strategy: e.target.value }
                  })}
                >
                  <option value="llm">LLM-Based (Semantic)</option>
                  <option value="keyword">Keyword Matching</option>
                  <option value="regex">Regex Rules</option>
                  <option value="similarity">Similarity Score</option>
                  <option value="random">Random (Load Balance)</option>
                </select>

                <label>Routes (JSON Array)</label>
                <textarea
                  value={selectedNode.data.config?.routes || '[\n  {"name": "technical", "condition": "code or programming"},\n  {"name": "creative", "condition": "story or art"}\n]'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, routes: e.target.value }
                  })}
                  placeholder='[{"name": "route1", "condition": "..."}]'
                  rows={4}
                />

                <label>Default Route</label>
                <input
                  type="text"
                  value={selectedNode.data.config?.defaultRoute || ''}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, defaultRoute: e.target.value }
                  })}
                  placeholder="fallback"
                />
              </>
            )}

            {selectedNode.type === 'memory' && (
              <>
                <label>Memory Type</label>
                <select
                  value={selectedNode.data.config?.memoryType || 'conversation'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, memoryType: e.target.value }
                  })}
                >
                  <option value="conversation">Conversation Buffer</option>
                  <option value="summary">Summary Memory</option>
                  <option value="kv">Key-Value Store (KV)</option>
                  <option value="vector">Vector Memory</option>
                  <option value="entity">Entity Memory</option>
                </select>

                <label>Storage</label>
                <select
                  value={selectedNode.data.config?.storage || 'session'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, storage: e.target.value }
                  })}
                >
                  <option value="session">Session (Ephemeral)</option>
                  <option value="kv">Cloudflare KV</option>
                  <option value="d1">Cloudflare D1</option>
                  <option value="durable">Durable Object</option>
                </select>

                <label>Max Messages: {selectedNode.data.config?.maxMessages || 20}</label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={selectedNode.data.config?.maxMessages || 20}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, maxMessages: parseInt(e.target.value) }
                  })}
                />

                <label>Memory Key</label>
                <input
                  type="text"
                  value={selectedNode.data.config?.memoryKey || ''}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, memoryKey: e.target.value }
                  })}
                  placeholder="user_session_123"
                />
              </>
            )}

            {selectedNode.type === 'processor' && (
              <>
                <label>Processor Type</label>
                <select
                  value={selectedNode.data.config?.processorType || 'javascript'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, processorType: e.target.value }
                  })}
                >
                  <option value="javascript">JavaScript Code</option>
                  <option value="json">JSON Transform</option>
                  <option value="template">Template String</option>
                  <option value="regex">Regex Extract</option>
                  <option value="filter">Filter/Validate</option>
                </select>

                <label>Code / Transform</label>
                <textarea
                  value={selectedNode.data.config?.code || 'return input;'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, code: e.target.value }
                  })}
                  placeholder="// JavaScript code&#10;return input.toUpperCase();"
                  rows={5}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />

                <label>Output Format</label>
                <select
                  value={selectedNode.data.config?.outputFormat || 'string'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, outputFormat: e.target.value }
                  })}
                >
                  <option value="string">String</option>
                  <option value="json">JSON Object</option>
                  <option value="array">Array</option>
                  <option value="number">Number</option>
                </select>
              </>
            )}

            {selectedNode.type === 'parallel' && (
              <>
                <label>Parallel Strategy</label>
                <select
                  value={selectedNode.data.config?.strategy || 'all'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, strategy: e.target.value }
                  })}
                >
                  <option value="all">Wait for All</option>
                  <option value="race">First Response Wins</option>
                  <option value="any">Any N Responses</option>
                  <option value="timeout">Timeout Fallback</option>
                </select>

                <label>Timeout (ms): {selectedNode.data.config?.timeout || 30000}</label>
                <input
                  type="range"
                  min="1000"
                  max="120000"
                  step="1000"
                  value={selectedNode.data.config?.timeout || 30000}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, timeout: parseInt(e.target.value) }
                  })}
                />

                <label>Max Concurrent</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={selectedNode.data.config?.maxConcurrent || 5}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, maxConcurrent: parseInt(e.target.value) }
                  })}
                />
              </>
            )}

            {selectedNode.type === 'merge' && (
              <>
                <label>Merge Strategy</label>
                <select
                  value={selectedNode.data.config?.strategy || 'concat'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, strategy: e.target.value }
                  })}
                >
                  <option value="concat">Concatenate All</option>
                  <option value="best">Best Quality (LLM Judge)</option>
                  <option value="vote">Majority Vote</option>
                  <option value="first">First Non-Empty</option>
                  <option value="custom">Custom Code</option>
                </select>

                <label>Separator</label>
                <input
                  type="text"
                  value={selectedNode.data.config?.separator || '\\n---\\n'}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, separator: e.target.value }
                  })}
                  placeholder="\n---\n"
                />

                {selectedNode.data.config?.strategy === 'custom' && (
                  <>
                    <label>Merge Code</label>
                    <textarea
                      value={selectedNode.data.config?.mergeCode || 'return inputs.join("\\n");'}
                      onChange={(e) => updateNode(selectedNode.id, {
                        config: { ...selectedNode.data.config, mergeCode: e.target.value }
                      })}
                      placeholder="// inputs is array&#10;return inputs[0];"
                      rows={3}
                      style={{ fontFamily: 'monospace', fontSize: '12px' }}
                    />
                  </>
                )}
              </>
            )}

            <div className="node-actions">
              <button className="action-btn" onClick={() => duplicateNode(selectedNode)}>
                📋 Duplicate
              </button>
              <button className="delete-btn" onClick={() => deleteNode(selectedNode.id)}>
                🗑️ Delete
              </button>
            </div>
          </div>
        )}

        <div className="editor-section">
          <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={saveFramework}>
            💾 {saved ? 'Saved' : 'Save Framework'}
          </button>
        </div>

        <div className="editor-stats">
          <div className="stat">
            <span className="stat-value">{nodes.length}</span>
            <span className="stat-label">Nodes</span>
          </div>
          <div className="stat">
            <span className="stat-value">{edges.length}</span>
            <span className="stat-label">Connections</span>
          </div>
        </div>
      </div>

      <div className="editor-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) => { onNodesChange(changes); setSaved(false); }}
          onEdgesChange={(changes) => { onEdgesChange(changes); setSaved(false); }}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
          }}
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => NODE_TYPES_CONFIG[node.type]?.color || '#666'}
            maskColor="rgba(0, 0, 0, 0.8)"
          />
          <Background variant="dots" gap={20} size={1} color="#30363d" />
        </ReactFlow>
      </div>
    </div>
  );
}

export default FrameworkEditor;
