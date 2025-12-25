import React, { useCallback, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './FrameworkEditor.css';

const nodeTypes = {
  agent: { color: '#667eea', label: 'Agent' },
  input: { color: '#4CAF50', label: 'Input' },
  output: { color: '#f44336', label: 'Output' },
  processor: { color: '#ff9800', label: 'Processor' },
  decision: { color: '#2196F3', label: 'Decision' },
};

function FrameworkEditor({ framework, onUpdate }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(framework.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(framework.edges);
  const [frameworkName, setFrameworkName] = useState(framework.name);
  const [frameworkDescription, setFrameworkDescription] = useState(framework.description);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  const addNode = (type) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 500 + 100, y: Math.random() * 300 + 100 },
      data: { 
        label: `${nodeTypes[type].label} ${nodes.length + 1}`,
        config: type === 'agent' ? { model: 'gpt-4', temperature: 0.7 } : {}
      },
      style: { 
        background: nodeTypes[type].color,
        color: 'white',
        padding: 10,
        borderRadius: 5,
        border: '2px solid #fff',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setShowNodeEditor(false);
    setSelectedNode(null);
  };

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
    setShowNodeEditor(true);
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
  };

  const saveFramework = () => {
    onUpdate(framework.id, {
      name: frameworkName,
      description: frameworkDescription,
      nodes,
      edges,
    });
    alert('Framework saved successfully!');
  };

  return (
    <div className="framework-editor">
      <div className="editor-sidebar">
        <h2>Framework Editor</h2>
        
        <div className="editor-section">
          <label>Name:</label>
          <input
            type="text"
            value={frameworkName}
            onChange={(e) => setFrameworkName(e.target.value)}
            placeholder="Framework name"
          />
        </div>

        <div className="editor-section">
          <label>Description:</label>
          <textarea
            value={frameworkDescription}
            onChange={(e) => setFrameworkDescription(e.target.value)}
            placeholder="Framework description"
            rows={3}
          />
        </div>

        <div className="editor-section">
          <label>Add Nodes:</label>
          <div className="node-buttons">
            {Object.entries(nodeTypes).map(([type, info]) => (
              <button
                key={type}
                onClick={() => addNode(type)}
                style={{ backgroundColor: info.color }}
              >
                + {info.label}
              </button>
            ))}
          </div>
        </div>

        {showNodeEditor && selectedNode && (
          <div className="editor-section node-editor">
            <h3>Edit Node: {selectedNode.data.label}</h3>
            <label>Label:</label>
            <input
              type="text"
              value={selectedNode.data.label}
              onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
            />
            
            {selectedNode.data.config && (
              <>
                <label>Model:</label>
                <select
                  value={selectedNode.data.config.model || 'gpt-4'}
                  onChange={(e) => updateNode(selectedNode.id, { 
                    config: { ...selectedNode.data.config, model: e.target.value }
                  })}
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3">Claude 3</option>
                  <option value="llama-2">Llama 2</option>
                </select>

                <label>Temperature:</label>
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
                <span>{selectedNode.data.config.temperature || 0.7}</span>
              </>
            )}

            <button 
              className="delete-node-btn"
              onClick={() => deleteNode(selectedNode.id)}
            >
              Delete Node
            </button>
          </div>
        )}

        <div className="editor-section">
          <button className="save-btn" onClick={saveFramework}>
            💾 Save Framework
          </button>
        </div>

        <div className="editor-stats">
          <p>Nodes: {nodes.length}</p>
          <p>Edges: {edges.length}</p>
        </div>
      </div>

      <div className="editor-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default FrameworkEditor;
