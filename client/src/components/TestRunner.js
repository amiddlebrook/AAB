import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './TestRunner.css';

function TestRunner({ framework, apiUrl }) {
  const [testInput, setTestInput] = useState('Sample test input for the framework');
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [executionState, setExecutionState] = useState({});
  const [streamOutput, setStreamOutput] = useState('');
  const outputRef = useRef(null);

  const API_URL = apiUrl || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8787/api');

  useEffect(() => {
    loadTestResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framework.id]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [streamOutput]);

  const loadTestResults = async () => {
    try {
      const response = await axios.get(`${API_URL}/tests/${framework.id}/results`);
      setTestResults(response.data);
    } catch (error) {
      console.error('Error loading test results:', error);
    }
  };

  const runTest = async () => {
    setLoading(true);
    setStreamOutput('');
    setLatestResult(null);

    // Initialize execution state for all nodes
    const initialState = {};
    framework.nodes.forEach(node => {
      initialState[node.id] = 'pending';
    });
    setExecutionState(initialState);

    try {
      // Simulate streaming execution with demo mode fallback
      const result = await simulateStreamingExecution();
      setLatestResult(result);
      setTestResults([result, ...testResults]);
    } catch (error) {
      console.error('Error running test:', error);
      const demoResult = simulateExecution();
      setLatestResult(demoResult);
      setTestResults([demoResult, ...testResults]);
    } finally {
      setLoading(false);
    }
  };

  const simulateStreamingExecution = async () => {
    const nodeTimings = {};
    const nodeOutputs = {};
    let totalLatency = 0;
    let totalTokens = 0;
    let totalCost = 0;

    // Sort nodes by connection order (simplified)
    const sortedNodes = [...framework.nodes];

    for (const node of sortedNodes) {
      // Update state to running
      setExecutionState(prev => ({ ...prev, [node.id]: 'running' }));
      setStreamOutput(prev => prev + `\n▶ Executing ${node.data?.label || node.id}...`);

      // Simulate processing time
      const timing = Math.random() * 800 + 200;
      await new Promise(r => setTimeout(r, timing));

      // Generate simulated output based on node type
      let output = '';
      let tokens = 0;
      let cost = 0;

      switch (node.type) {
        case 'agent':
          output = `[${node.data?.config?.model || 'unknown'}] Generated response for: "${testInput.slice(0, 30)}..."`;
          tokens = Math.floor(Math.random() * 300) + 100;
          cost = tokens * 0.00002;
          break;
        case 'processor':
          output = `Processed input through custom logic`;
          break;
        case 'rag':
          output = `Retrieved 3 relevant documents with similarity > 0.85`;
          tokens = 50;
          cost = tokens * 0.00001;
          break;
        case 'router':
          output = `Routed to path: ${Math.random() > 0.5 ? 'primary' : 'fallback'}`;
          break;
        case 'tool':
          output = `Tool response: { status: "success", data: {...} }`;
          break;
        default:
          output = `Node ${node.id} completed`;
      }

      nodeTimings[node.id] = timing;
      nodeOutputs[node.id] = output;
      totalLatency += timing;
      totalTokens += tokens;
      totalCost += cost;

      setStreamOutput(prev => prev + `\n  ✓ ${output}`);
      setExecutionState(prev => ({ ...prev, [node.id]: 'completed' }));
    }

    setStreamOutput(prev => prev + `\n\n✨ Execution completed in ${(totalLatency / 1000).toFixed(2)}s`);

    return {
      id: `exec-${Date.now()}`,
      frameworkId: framework.id,
      timestamp: new Date().toISOString(),
      testInput,
      status: 'completed',
      success: true,
      latency: totalLatency / 1000,
      totalTokens,
      totalCost,
      output: `Framework execution completed successfully.\nProcessed ${framework.nodes.length} nodes in ${(totalLatency / 1000).toFixed(2)}s`,
      nodeTimings,
      nodeOutputs
    };
  };

  const simulateExecution = () => {
    const nodeTimings = {};
    const nodeOutputs = {};
    let totalLatency = 0;

    framework.nodes.forEach(node => {
      const timing = Math.random() * 500 + 100;
      nodeTimings[node.id] = timing;
      nodeOutputs[node.id] = `Processed by ${node.data?.label || node.id}`;
      totalLatency += timing;
    });

    return {
      id: `demo-${Date.now()}`,
      frameworkId: framework.id,
      timestamp: new Date().toISOString(),
      testInput,
      status: 'completed',
      success: true,
      latency: totalLatency / 1000,
      totalTokens: Math.floor(Math.random() * 500) + 100,
      totalCost: Math.random() * 0.01,
      output: `Demo output for: ${testInput.slice(0, 50)}...`,
      nodeTimings,
      nodeOutputs
    };
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getNodeLabel = (nodeId) => {
    const node = framework.nodes.find(n => n.id === nodeId);
    return node?.data?.label || nodeId;
  };

  return (
    <div className="test-runner">
      <div className="runner-left">
        <div className="input-panel">
          <h2>▶️ Test Runner</h2>
          <p className="subtitle">Test: {framework.name}</p>

          <div className="test-input-section">
            <label>Test Input</label>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Enter test input..."
              rows={4}
            />
          </div>

          <button
            className={`run-btn ${loading ? 'running' : ''}`}
            onClick={runTest}
            disabled={loading}
          >
            {loading ? '⏳ Running...' : '▶️ Run Execution'}
          </button>
        </div>

        {/* Execution Visualization */}
        <div className="execution-panel">
          <h3>🔄 Execution Flow</h3>
          <div className="execution-nodes">
            {framework.nodes.map((node, idx) => (
              <div
                key={node.id}
                className={`execution-node ${executionState[node.id] || 'idle'}`}
              >
                <span className="node-status">
                  {executionState[node.id] === 'running' && '🔄'}
                  {executionState[node.id] === 'completed' && '✅'}
                  {executionState[node.id] === 'pending' && '⏳'}
                  {!executionState[node.id] && '⬡'}
                </span>
                <span className="node-label">{node.data?.label || node.id}</span>
                {latestResult?.nodeTimings?.[node.id] && (
                  <span className="node-timing">
                    {latestResult.nodeTimings[node.id].toFixed(0)}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Streaming Output */}
        {streamOutput && (
          <div className="stream-panel">
            <h3>📜 Execution Log</h3>
            <pre ref={outputRef} className="stream-output">{streamOutput}</pre>
          </div>
        )}
      </div>

      <div className="runner-right">
        {/* Latest Result */}
        {latestResult && (
          <div className={`result-panel ${latestResult.success ? 'success' : 'failure'}`}>
            <h3>📊 Latest Result</h3>
            <div className="result-metrics">
              <div className="result-metric">
                <span className="metric-value">{latestResult.success ? '✅' : '❌'}</span>
                <span className="metric-label">Status</span>
              </div>
              <div className="result-metric">
                <span className="metric-value">{latestResult.latency?.toFixed(2)}s</span>
                <span className="metric-label">Latency</span>
              </div>
              <div className="result-metric">
                <span className="metric-value">{latestResult.totalTokens || 0}</span>
                <span className="metric-label">Tokens</span>
              </div>
              <div className="result-metric">
                <span className="metric-value">${(latestResult.totalCost || 0).toFixed(4)}</span>
                <span className="metric-label">Cost</span>
              </div>
            </div>

            <div className="result-output">
              <label>Output:</label>
              <pre>{latestResult.output}</pre>
            </div>

            {latestResult.nodeTimings && Object.keys(latestResult.nodeTimings).length > 0 && (
              <div className="node-breakdown">
                <label>Node Breakdown:</label>
                {Object.entries(latestResult.nodeTimings).map(([nodeId, timing]) => (
                  <div key={nodeId} className="node-row">
                    <span className="node-name">{getNodeLabel(nodeId)}</span>
                    <div className="timing-bar">
                      <div
                        className="timing-fill"
                        style={{
                          width: `${(timing / Math.max(...Object.values(latestResult.nodeTimings))) * 100}%`
                        }}
                      />
                    </div>
                    <span className="timing-value">{timing.toFixed(0)}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="history-panel">
          <h3>📜 History ({testResults.length})</h3>
          <div className="history-list">
            {testResults.slice(0, 10).map((result) => (
              <div key={result.id} className={`history-item ${result.success ? 'success' : 'failure'}`}>
                <span className="history-status">{result.success ? '✅' : '❌'}</span>
                <span className="history-time">{formatTimestamp(result.timestamp)}</span>
                <span className="history-latency">{result.latency?.toFixed(2)}s</span>
                <span className="history-tokens">{result.totalTokens || 0} tokens</span>
              </div>
            ))}
            {testResults.length === 0 && (
              <div className="no-history">No test runs yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestRunner;
