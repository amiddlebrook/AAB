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

// OpenRouter models
const MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', provider: 'Google' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
  { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', provider: 'Mistral' },
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
      model: 'anthropic/claude-3.5-sonnet',
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
                  value={selectedNode.data.config.model || 'anthropic/claude-3.5-sonnet'}
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
                <label>API Endpoint</label>
                <input
                  type="text"
                  value={selectedNode.data.config?.endpoint || ''}
                  onChange={(e) => updateNode(selectedNode.id, {
                    config: { ...selectedNode.data.config, endpoint: e.target.value }
                  })}
                  placeholder="https://api.example.com/..."
                />
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
