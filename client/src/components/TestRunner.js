import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './TestRunner.css';

function TestRunner({ framework, apiUrl, onUpdate }) {
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
    setStreamOutput('Executing workflow on Cloudflare Workers…');
    setLatestResult(null);
    setExecutionState(Object.fromEntries(framework.nodes.map(n => [n.id, 'running'])));
    try {
      const response = await axios.post(API_URL + '/tests/' + framework.id + '/run', { testInput });
      const result = response.data;
      setLatestResult(result);
      setTestResults(prev => [result, ...prev]);
      setExecutionState(Object.fromEntries(framework.nodes.map(n => [n.id, result.nodeTimings?.[n.id] !== undefined ? 'completed' : 'pending'])));
      setStreamOutput((result.logs || []).map(log =>
        (log.error ? '✕ ' : '✓ ') + (framework.nodes.find(n => n.id === log.nodeId)?.data?.label || log.nodeId) +
        ': ' + (log.error || log.output.slice(0, 500))
      ).join('\n') + '\n\n' + (result.success ? 'Execution completed.' : result.output));
      if (onUpdate) {
        // Metrics are calculated from persisted D1 results; do not overwrite the saved graph with synthetic metrics.
      }
    } catch (error) {
      setStreamOutput('Execution failed: ' + (error.response?.data?.error || error.message));
      setExecutionState({});
    } finally { setLoading(false); }
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
