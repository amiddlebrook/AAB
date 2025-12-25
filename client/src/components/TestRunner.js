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
      <div className="test-sidebar">
        <div className="sidebar-header">
          <h2>Test Execution</h2>
          <span className="subtitle">{framework.name}</span>
        </div>

        <div className="test-control-panel">
          <label>Test Input</label>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter test input..."
            rows={5}
            disabled={loading}
          />
          <button
            className={`run-btn ${loading ? 'running' : ''}`}
            onClick={runTest}
            disabled={loading}
          >
            {loading ? 'Running...' : 'Run Test'}
          </button>
        </div>

        <div className="history-panel">
          <h3>History ({testResults.length})</h3>
          <div className="history-list">
            {testResults.slice(0, 50).map((result) => (
              <div
                key={result.id}
                className={`history-item ${latestResult?.id === result.id ? 'active' : ''}`}
                onClick={() => setLatestResult(result)}
              >
                <div className={`status-indicator ${result.success ? 'success' : 'failure'}`} />
                <div className="history-info">
                  <span className="history-time">{new Date(result.timestamp).toLocaleTimeString()}</span>
                  <span className="history-meta">{result.latency?.toFixed(2)}s • {result.totalTokens} tks</span>
                </div>
              </div>
            ))}
            {testResults.length === 0 && (
              <div className="empty-history">No runs recorded</div>
            )}
          </div>
        </div>
      </div>

      <div className="test-main-content">
        <div className="execution-monitor">
          <div className="monitor-header">
            <h3>Execution Trace</h3>
            {executionState && Object.values(executionState).some(s => s === 'running') && (
              <span className="live-badge">LIVE</span>
            )}
          </div>

          <div className="execution-nodes">
            {framework.nodes.map((node) => (
              <div
                key={node.id}
                className={`execution-node ${executionState[node.id] || 'idle'}`}
              >
                <div className="node-status-bar" />
                <span className="node-type">{node.type}</span>
                <span className="node-label">{node.data?.label || node.id}</span>
                {latestResult?.nodeTimings?.[node.id] && (
                  <span className="node-timing">
                    {latestResult.nodeTimings[node.id].toFixed(0)}ms
                  </span>
                )}
              </div>
            ))}
          </div>

          {streamOutput && (
            <div className="stream-panel">
              <div className="stream-header">System Log</div>
              <pre ref={outputRef} className="stream-output">{streamOutput}</pre>
            </div>
          )}
        </div>

        {latestResult && (
          <div className="result-panel">
            <div className="result-header">
              <h3>Run Results</h3>
              <span className={`result-badge ${latestResult.success ? 'success' : 'failure'}`}>
                {latestResult.success ? 'SUCCESS' : 'FAILED'}
              </span>
            </div>

            <div className="result-metrics">
              <div className="metric-box">
                <span className="label">Latency</span>
                <span className="value">{latestResult.latency?.toFixed(2)}s</span>
              </div>
              <div className="metric-box">
                <span className="label">Tokens</span>
                <span className="value">{latestResult.totalTokens || 0}</span>
              </div>
              <div className="metric-box">
                <span className="label">Cost</span>
                <span className="value">${(latestResult.totalCost || 0).toFixed(4)}</span>
              </div>
            </div>

            <div className="result-details">
              <label>Output</label>
              <pre className="output-display">{latestResult.output}</pre>
            </div>
          </div>
        )}

        {!latestResult && !loading && (
          <div className="empty-state">
            <h3>Ready to Execute</h3>
            <p>Configure input and run a test to see results</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TestRunner;
